// Policy is code, not a prompt. Deterministic rules; every decision is written to the ledger and emitted as policy.decision.
import type { PlanStep, PolicyDecision } from '@darby/contracts';
import path from 'node:path';
import { isRegistered, riskOf } from '../tools/registry';

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const URL_RE = /\bhttps?:\/\/[^\s"'<>)]+/gi;
/** Normalise before comparing so case tricks, full-width characters, zero-width characters and percent-encoding cannot hide a tainted value. */
const norm = (s: string): string => {
  let t = s;
  try { t = decodeURIComponent(t); } catch { /* not percent-encoded */ }
  return t.normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g, '').trim().toLowerCase();
};

/** Remembers which concrete values came out of untrusted pages. Values (emails, URLs, strings) are tainted forever for this run. */
export class TaintTracker {
  private tokens = new Set<string>();
  /** Record every email/URL a page mentions and the whole string itself (page text is not retained, only tokens). */
  addPageText(text: string): void {
    const t = text.normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g, '');
    for (const m of t.matchAll(EMAIL_RE)) this.tokens.add(norm(m[0]));
    for (const m of t.matchAll(URL_RE)) this.tokens.add(norm(m[0].replace(/[.,;]+$/, '')));
  }
  addValue(v: unknown): void {
    if (typeof v === 'string' && v.trim()) this.tokens.add(norm(v));
  }
  isTainted(v: unknown): boolean {
    if (typeof v !== 'string') return false;
    const n = norm(v);
    if (!n) return false;
    if (this.tokens.has(n)) return true;
    for (const m of n.matchAll(EMAIL_RE)) if (this.tokens.has(m[0])) return true;
    for (const m of n.matchAll(URL_RE)) if (this.tokens.has(m[0].replace(/[.,;]+$/, ''))) return true;
    // a bare domain / host that appears inside a tainted email or URL is tainted too (evil.test inside attacker@evil.test)
    for (const t of this.tokens) if (t.length >= 5 && (t.endsWith('@' + n) || t.includes('//' + n))) return true;
    return false;
  }
  get size(): number { return this.tokens.size; }
}

/** Argument names whose value decides WHERE something goes or WHAT runs. A tainted value there is never acceptable. */
const SENSITIVE_KEYS = /^(to|cc|bcc|recipient|recipients|email|emails|address|url|urls|endpoint|href|link|command|cmd|shell|exec|script|tool|toolname|target|repo|branch)$/i;
const PATH_KEYS = /^(path|file|filepath|filename|dir|directory|destination|dest|output|outfile)$/i;
const FORBIDDEN_KEYS = /^(command|cmd|shell|exec|script|password|passwd|credential|credentials|secret|apikey|api_key|token)$/i;

function* walk(value: unknown, key = ''): Generator<[string, unknown]> {
  if (Array.isArray(value)) for (const v of value) yield* walk(v, key);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value as Record<string, unknown>)) yield* walk(v, k);
  else yield [key, value];
}

export interface PolicyInput {
  step: Pick<PlanStep, 'id' | 'tool' | 'args'>;
  allowedOrigins: string[];
  taint: TaintTracker;
  approvedOrigins?: Set<string>;
  /** directories file arguments may point into (.darby and workspace/) */
  allowedPaths?: string[];
}

const decision = (action: PolicyDecision['action'], ruleId: string, risk: PolicyDecision['risk'], reason: string): PolicyDecision => ({ action, ruleId, risk, reason });

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const { step, allowedOrigins, taint } = input;

  // FORB-003: unregistered tools, shell/credential arguments
  if (!isRegistered(step.tool)) return decision('block', 'FORB-003-unregistered-tool', 'forbidden', `"${step.tool}" is not a registered tool`);
  for (const [k, v] of walk(step.args)) {
    if (FORBIDDEN_KEYS.test(k) && v !== undefined && v !== null && v !== '') return decision('block', 'FORB-003-forbidden-argument', 'forbidden', `argument "${k}" (shell / credentials) is never allowed`);
  }

  // FORB-003: file access outside .darby / workspace
  if (input.allowedPaths) {
    for (const [k, v] of walk(step.args)) {
      if (PATH_KEYS.test(k) && typeof v === 'string' && v) {
        const abs = path.resolve(v);
        if (!input.allowedPaths.some((d) => !path.relative(d, abs).startsWith('..') && !path.isAbsolute(path.relative(d, abs)))) {
          return decision('block', 'FORB-003-file-outside-workspace', 'forbidden', `"${v}" is outside the Darby workspace`);
        }
      }
    }
  }

  // TAINT-002: a value that came from a page may not decide a recipient, URL, command or tool name
  for (const [k, v] of walk(step.args)) {
    if (SENSITIVE_KEYS.test(k) && taint.isTainted(v)) {
      return decision('block', 'TAINT-002-no-tainted-recipient', riskOf(step.tool), `"${String(v)}" came from an untrusted page and cannot be used as ${k}`);
    }
  }

  const risk = riskOf(step.tool);
  if (risk === 'external_effect') return decision('require_approval', 'EXT-001-external-effect-needs-approval', risk, 'external effects always need the user\'s explicit approval');
  if (risk === 'write_local') return decision('allow', 'LOCAL-001-darby-workspace', risk, 'writes only to Darby-owned documents in the workspace');

  // READ-001: reads on allowlisted origins are allowed; a new origin needs approval
  const urls = [...walk(step.args)].filter(([k, v]) => /^urls?$/i.test(k) && typeof v === 'string').map(([, v]) => String(v));
  for (const u of urls) {
    let origin = '';
    try { origin = new URL(u).origin; } catch { return decision('block', 'FORB-003-bad-url', risk, `"${u}" is not a valid URL`); }
    if (!allowedOrigins.includes(origin) && !input.approvedOrigins?.has(origin)) return decision('require_approval', 'READ-001-new-origin-needs-approval', risk, `${origin} is not on the allowlist`);
  }
  return decision('allow', 'READ-001-allowlisted-read', risk, 'reading allowlisted origins is allowed');
}

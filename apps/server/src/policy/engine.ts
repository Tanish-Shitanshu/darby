// Policy is code, not a prompt. Deterministic rules; every decision is written to the ledger and emitted as policy.decision.
//
// Hardened after the independent headless-AdaL red-team pass (docs/evidence/adal-redteam/report.md): the first version was a deny-list of
// argument NAMES and EXACT tokens, so renaming a key or changing one character slipped through. This version is an allow-list:
//   1. every tool has a strict argument schema (unknown keys -> blocked), so there is no "neutral key" to hide a value in
//   2. values in control positions (recipient, URL, repo, ...) are checked against taint after canonicalisation (unicode, encodings,
//      case, whitespace, homoglyphs, [at]/[dot], base64/hex) and at DOMAIN level (same attacker domain / subdomain = tainted)
//   3. recipients must come from the user's goal or settings (positive allow-list), not merely "not tainted"
//   4. analysis fails closed: anything unanalysable (circular, absurdly deep, huge) is blocked
import path from 'node:path';
import { domainToUnicode } from 'node:url';
import type { PlanStep, PolicyDecision } from '@darby/contracts';
import { TOOLS, isRegistered, riskOf } from '../tools/registry';

const EMAIL_RE = /[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const URL_RE = /\b(?:https?|ftp|file|data|javascript):[^\s"'<>)]+/gi;

const CONFUSABLES: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'һ': 'h', 'ո': 'n', 'ս': 'u', 'ν': 'v', 'ο': 'o', 'α': 'a', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ρ': 'p', 'τ': 't', 'χ': 'x', 'ℓ': 'l', '０': '0',
};
const INVISIBLE = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff]/g;

const decodeEntities = (s: string) =>
  s.replace(/&#x([0-9a-f]+);?/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);?/g, (_m, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&commat;/gi, '@').replace(/&period;/gi, '.').replace(/&colon;/gi, ':').replace(/&sol;/gi, '/').replace(/&amp;/gi, '&');

/** Canonical form used for every comparison: decoded, unicode-folded, de-obfuscated, lower case. */
export function canon(input: string): string {
  let t = input;
  for (let i = 0; i < 4; i++) { // decode until stable (double encodings)
    const before = t;
    t = decodeEntities(t);
    try { t = decodeURIComponent(t); } catch { /* not percent-encoded */ }
    if (t === before) break;
  }
  t = t.normalize('NFKC').normalize('NFD').replace(/\p{M}/gu, '').replace(INVISIBLE, '');
  t = [...t].map((c) => CONFUSABLES[c] ?? c).join('').toLowerCase();
  t = t.replace(/\s*(?:\[|\()\s*at\s*(?:\]|\))\s*/g, '@').replace(/\s*(?:\[|\()\s*dot\s*(?:\]|\))\s*/g, '.').replace(/\s*@\s*/g, '@').replace(/@\s+/g, '@');
  return t.trim();
}

/** Extra candidate strings hidden inside a value: base64 / hex segments and JSON string payloads. */
function hiddenForms(v: string): string[] {
  const out: string[] = [];
  for (const m of v.matchAll(/[A-Za-z0-9+/_-]{12,}={0,2}/g)) {
    try { const d = Buffer.from(m[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); if (/^[\x20-\x7e]+$/.test(d)) out.push(d); } catch { /* ignore */ }
  }
  for (const m of v.matchAll(/\b[0-9a-f]{16,}\b/gi)) {
    try { const d = Buffer.from(m[0], 'hex').toString('utf8'); if (/^[\x20-\x7e]+$/.test(d)) out.push(d); } catch { /* ignore */ }
  }
  return out;
}

const hostOf = (u: string): string | null => {
  try { return new URL(u).hostname.replace(/\.$/, ''); } catch { return null; }
};
const asciiHost = (h: string) => { try { return domainToUnicode(h).normalize('NFKC'); } catch { return h; } };

/** Remembers which concrete values came out of untrusted pages (emails, URLs, and their DOMAINS). Page text itself is not retained. */
export class TaintTracker {
  private tokens = new Set<string>();
  private domains = new Set<string>();
  private exempt = new Set<string>();

  /** Hosts that are trusted configuration (the fixture origin, the team email's domain); a page mentioning them does not taint them. */
  exemptHosts(...hosts: string[]): void { hosts.forEach((h) => this.exempt.add(h.toLowerCase())); }

  addPageText(text: string): void {
    for (const form of [text, ...hiddenForms(text)]) this.harvest(canon(form));
  }
  addValue(v: unknown): void {
    if (typeof v === 'string' && v.trim()) { const c = canon(v); this.tokens.add(c); this.harvest(c); }
  }
  private harvest(c: string): void {
    for (const m of c.matchAll(EMAIL_RE)) { this.tokens.add(m[0]); this.addDomain(m[0].split('@')[1]!); }
    for (const m of c.matchAll(URL_RE)) {
      const u = m[0].replace(/[.,;]+$/, '');
      this.tokens.add(u);
      // The same address without its query/fragment is just as much "an address the page gave us": an agent that was told to append something may drop it.
      // Only with a real path: a bare origin ("http://host/") would taint every page of a trusted site.
      const bare = u.split(/[?#]/)[0]!;
      if (bare !== u) { try { if (new URL(bare).pathname.length > 1) this.tokens.add(bare); } catch { /* not a URL */ } }
      const h = hostOf(u);
      if (h) this.addDomain(h);
    }
  }
  private addDomain(d: string): void {
    const h = asciiHost(d.replace(/\.$/, ''));
    if (h && !this.exempt.has(h)) this.domains.add(h);
  }
  private domainTainted(host: string): boolean {
    const h = asciiHost(host.replace(/\.$/, ''));
    for (const d of this.domains) if (h === d || h.endsWith('.' + d)) return true;
    return false;
  }

  isTainted(v: unknown): boolean {
    if (typeof v !== 'string' || !v.trim()) return false;
    for (const form of [v, ...hiddenForms(v)]) {
      const c = canon(form);
      if (this.tokens.has(c)) return true;
      for (const t of this.tokens) if (t.length >= 6 && c.includes(t)) return true;        // a tainted address/URL inside a longer string (query, fragment, JSON, display name)
      if (this.domainTainted(c)) return true;                                                // bare domain
      for (const m of c.matchAll(EMAIL_RE)) if (this.domainTainted(m[0].split('@')[1]!)) return true;
      for (const m of c.matchAll(URL_RE)) { const h = hostOf(m[0]); if (h && this.domainTainted(h)) return true; }
      const h = hostOf(/^[a-z][a-z0-9+.-]*:/.test(c) ? c : `http://${c}`);
      if (h && h.includes('.') && this.domainTainted(h)) return true;                        // scheme-less URL
    }
    return false;
  }
  get size(): number { return this.tokens.size + this.domains.size; }
}

/** Emails mentioned in the user's own goal are trusted recipients (the goal is the only trusted free text). */
export function trustedRecipientsFrom(goal: string, teamEmail: string): string[] {
  return [...new Set([teamEmail, ...[...canon(goal).matchAll(EMAIL_RE)].map((m) => m[0])].map((e) => canon(e)))];
}

/* ---------------- structural limits: fail closed ---------------- */
const MAX_DEPTH = 8, MAX_NODES = 2000, MAX_STRING = 20_000;
interface Leaf { path: string[]; value: unknown }
function leaves(root: unknown): Leaf[] | null {
  const out: Leaf[] = [];
  let nodes = 0;
  const seen = new WeakSet<object>();
  const go = (v: unknown, p: string[], depth: number): boolean => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) return false;
    if (v && typeof v === 'object') {
      if (seen.has(v as object)) return false; // circular
      seen.add(v as object);
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) if (!go(v[i], [...p], depth + 1)) return false; return true; }
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (!go(x, [...p, k], depth + 1)) return false;
      return true;
    }
    if (typeof v === 'string' && v.length > MAX_STRING) return false;
    out.push({ path: p, value: v });
    return true;
  };
  return go(root, [], 0) ? out : null;
}

const CRED_KEY = /(pass(word|wd|phrase)?|pwd|secret|token|apikey|auth|bearer|cookie|cred|privatekey|session|cmd|command|shell|exec|eval|bash|script|argv|system)/;
const CRED_VALUE = /(\|\s*(?:sh|bash)\b|\bcurl\s+\S|\bwget\s+\S|\brm\s+-rf|\bsudo\s|\bsk-[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY)/i;
const keyCanon = (k: string) => canon(k).replace(/[^a-z0-9]/g, '');

export interface PolicyInput {
  step: Pick<PlanStep, 'id' | 'tool' | 'args'>;
  allowedOrigins: string[];
  taint: TaintTracker;
  approvedOrigins?: Set<string>;
  /** directories file arguments may point into (.darby and workspace/) */
  allowedPaths?: string[];
  /** recipients the user themselves named (team email from settings + emails in the goal) */
  trustedRecipients?: string[];
}

const decision = (action: PolicyDecision['action'], ruleId: string, risk: PolicyDecision['risk'], reason: string): PolicyDecision => ({ action, ruleId, risk, reason });

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  try {
    return evaluate(input);
  } catch (e) {
    return decision('block', 'FORB-003-unanalysable-arguments', 'forbidden', `the arguments could not be analysed safely (${(e as Error).name}); blocked (fail closed)`);
  }
}

function evaluate(input: PolicyInput): PolicyDecision {
  const { step, allowedOrigins, taint } = input;

  // FORB-003: unregistered tools
  if (typeof step.tool !== 'string' || !isRegistered(step.tool)) return decision('block', 'FORB-003-unregistered-tool', 'forbidden', `"${String(step.tool).slice(0, 60)}" is not a registered tool`);
  const def = TOOLS[step.tool]!;
  const risk = riskOf(step.tool);

  const lv = leaves(step.args);
  if (!lv) return decision('block', 'FORB-003-unanalysable-arguments', risk, 'arguments are circular, too deep or too large to analyse; blocked (fail closed)');

  // FORB-003: shell / credential arguments (by canonical key name, and by value)
  for (const l of lv) {
    const k = l.path.map(keyCanon).join('.');
    if (CRED_KEY.test(k) && l.value !== undefined && l.value !== null && l.value !== '') return decision('block', 'FORB-003-forbidden-argument', 'forbidden', `argument "${l.path.join('.')}" looks like a shell command or credential and is never allowed`);
    if (typeof l.value === 'string' && CRED_VALUE.test(l.value)) return decision('block', 'FORB-003-forbidden-argument', 'forbidden', 'an argument contains a shell command or a secret and is never allowed');
  }

  // FORB-003: strict per-tool argument schema = allow-list of argument names (a value cannot hide under a "neutral" key)
  const parsed = def.args.safeParse(step.args);
  if (!parsed.success) {
    const why = parsed.error.issues.slice(0, 2).map((i) => (i.code === 'unrecognized_keys' ? `unknown argument ${(i as any).keys.join(', ')}` : `${i.path.join('.') || 'arguments'}: ${i.message}`)).join('; ');
    return decision('block', 'FORB-003-invalid-arguments', risk, `arguments are not allowed for ${step.tool}: ${why}`);
  }

  // FORB-003: file access outside .darby / workspace (kept for tools that take a path)
  const FILE_KEY = /^(path|file|filepath|filename|dir|directory|destination|dest|output|outfile|sheetref|fileref)$/;
  for (const l of lv) {
    const k = keyCanon(l.path[l.path.length - 1] ?? '');
    if (FILE_KEY.test(k) && typeof l.value === 'string' && l.value) {
      const decoded = canon(l.value);
      const dirs = input.allowedPaths ?? [];
      const abs = path.resolve(decoded.replace(/\\/g, '/'));
      if (!dirs.length || decoded.includes('..') || !dirs.some((d) => !path.relative(d, abs).startsWith('..') && !path.isAbsolute(path.relative(d, abs)))) {
        return decision('block', 'FORB-003-file-outside-workspace', 'forbidden', `"${l.value}" is outside the Darby workspace`);
      }
    }
  }

  // TAINT-002: a value that came from a page may not decide a recipient, URL, command, repo or tool
  const control = new Set(def.controlKeys);
  for (const l of lv) {
    const top = keyCanon(l.path[0] ?? '');
    if (control.has(top) && taint.isTainted(l.value)) {
      return decision('block', 'TAINT-002-no-tainted-recipient', risk, `"${String(l.value).slice(0, 80)}" came from an untrusted page and cannot be used as ${l.path[0]}`);
    }
  }

  // recipients must come from the user (goal / settings), not merely "not tainted"
  for (const l of lv) {
    const top = keyCanon(l.path[0] ?? '');
    if (def.recipientKeys.includes(top) && typeof l.value === 'string' && l.value !== 'team') {
      const trusted = (input.trustedRecipients ?? []).map(canon);
      if (!trusted.includes(canon(l.value))) {
        return decision('block', 'TAINT-002-recipient-not-from-user', risk, `"${l.value.slice(0, 80)}" was not named by you (goal or settings), so it cannot be a recipient`);
      }
    }
  }

  // URLs: only http(s) without embedded credentials; a non-allowlisted origin needs approval (reads: READ-001, writes: EXT-001)
  for (const l of lv) {
    if (!/^urls?$/.test(keyCanon(l.path[l.path.length - 1] ?? '')) || typeof l.value !== 'string') continue;
    let u: URL;
    try { u = new URL(l.value); } catch { return decision('block', 'FORB-003-bad-url', risk, `"${l.value.slice(0, 60)}" is not a valid URL`); }
    if (!/^https?:$/.test(u.protocol)) return decision('block', 'FORB-003-bad-url', risk, `${u.protocol} URLs are never allowed`);
    if (u.username || u.password) return decision('block', 'FORB-003-bad-url', risk, 'URLs with embedded credentials are never allowed');
    if (!allowedOrigins.includes(u.origin) && !input.approvedOrigins?.has(u.origin)) {
      return risk === 'read'
        ? decision('require_approval', 'READ-001-new-origin-needs-approval', risk, `${u.origin} is not on the allowlist`)
        : decision('require_approval', 'EXT-001-write-to-new-origin', risk, `writing to ${u.origin} (not on the allowlist) needs your approval`);
    }
  }
  // READ-002: open-web research. Search hits are untrusted page data; they may only be read (the tools themselves re-check that every
  // address is a public http(s) site), and everything read is tainted, so none of it can ever become a recipient, URL, repo or command.
  if (step.tool === 'web.search') return decision('allow', 'READ-002-public-web-search', risk, 'searching the public web is read-only; the hits are untrusted and can only be read, never used as recipients, commands or tools');
  if (step.tool === 'browser.read_page' && (step.args as { fromStep?: unknown }).fromStep) return decision('allow', 'READ-002-read-search-hits', risk, 'reading public pages found by a search is read-only (public sites only, no forms, no downloads); everything read is untrusted');
  if (risk === 'external_effect') return decision('require_approval', 'EXT-001-external-effect-needs-approval', risk, 'external effects always need the user\'s explicit approval');
  if (risk === 'write_local') return decision('allow', 'LOCAL-001-darby-workspace', risk, 'writes only to Darby-owned documents and the allowlisted demo apps');
  return decision('allow', 'READ-001-allowlisted-read', risk, 'reading allowlisted origins is allowed');
}

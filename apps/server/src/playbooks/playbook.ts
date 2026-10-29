// Playbooks (SPEC §12): a verified run, saved as a reusable, parameterised, re-verifiable skill.
//
// What is stored is the PLAN (tools + arguments), never the proof: on every replay the plan compiler (code, not a model) rebuilds the
// evidence contracts, the policy engine re-decides every step, approvals and taint tracking apply as always, and the verifier checks
// the new run from scratch. A Playbook therefore cannot carry a verdict, a contract or a permission with it.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Plan, Risk } from '@darby/contracts';
import { z } from 'zod';
import type { Config } from '../config';
import type { RunRow } from '../db/repo';
import { compilePlan, type PlannerOutput } from '../planner/planner';
import type { Catalog } from '../sources';
import { isRegistered, resolveAllowedUrl, riskOf, TOOLS, type CompileCtx } from '../tools/registry';

export const PLAYBOOK_FORMAT = 'darby-playbook/1';
export const CHECK_FORMAT = 'darby-playbook-check/1';

export class PlaybookError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); this.name = 'PlaybookError'; }
}

/* ---------------- file format ---------------- */
const Bind = z.object({ step: z.string().min(1).max(24), arg: z.string().min(1).max(24) });
const Param = z.discriminatedUnion('type', [
  z.object({ key: z.string().regex(/^[a-zA-Z][\w]{0,23}$/), label: z.string().max(80), type: z.literal('urls'), default: z.array(z.string().max(2048)).min(1).max(12), bind: Bind }),
  z.object({ key: z.string().regex(/^[a-zA-Z][\w]{0,23}$/), label: z.string().max(80), type: z.literal('text'), default: z.string().max(40), bind: Bind }),
]);
export type PlaybookParam = z.infer<typeof Param>;

const PbStep = z.object({
  id: z.string().min(1).max(24),
  title: z.string().min(3).max(140),
  tool: z.string().min(1).max(60),
  args: z.record(z.unknown()),
  dependsOn: z.array(z.string()).default([]),
  /** the kind of proof the compiler will attach (informational: contracts are rebuilt by code on every run) */
  proof: z.string().nullable(),
});

const Manifest = z.object({
  tools: z.array(z.object({ tool: z.string(), risk: Risk })),
  /** pages the Playbook may read: "fixture site" means the configured, allow-listed origin(s) only */
  reads: z.array(z.string()),
  writes: z.array(z.string()),
  externalEffects: z.array(z.object({ tool: z.string(), what: z.string() })),
  recipients: z.array(z.string()),
  needsApproval: z.boolean(),
});
export type Manifest = z.infer<typeof Manifest>;

export const PlaybookFile = z.object({
  format: z.literal(PLAYBOOK_FORMAT),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,47}$/),
  name: z.string().min(3).max(80),
  description: z.string().min(3).max(300),
  createdAt: z.string(),
  createdFrom: z.object({ runId: z.string(), verdict: z.enum(['VERIFIED', 'VERIFIED_WITH_GAPS']), goal: z.string().max(600), gaps: z.array(z.string()).max(40) }),
  params: z.array(Param).max(6),
  steps: z.array(PbStep).min(1).max(12),
  manifest: Manifest,
});
export type PlaybookFile = z.infer<typeof PlaybookFile>;

export const slugify = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

/** Stable serialisation: the sha256 of these bytes is what a CI badge is bound to. */
export const serialize = (pb: PlaybookFile): string => `${JSON.stringify(pb, null, 2)}\n`;
export const sha256Of = (text: string): string => createHash('sha256').update(text).digest('hex');

/* ---------------- permission manifest (derived from the steps by code, never typed by hand) ---------------- */
const originLabel = (u: string, cfg: Config): string => {
  try { return new URL(u, cfg.fixtureBase).origin === new URL(cfg.fixtureBase).origin ? 'the fixture web (allow-listed origin)' : new URL(u, cfg.fixtureBase).origin; } catch { return 'invalid-url'; }
};

export function manifestOf(steps: { tool: string; args: Record<string, unknown> }[], cfg: Config): Manifest {
  const tools: Manifest['tools'] = [];
  const reads = new Set<string>(), writes = new Set<string>(), recipients = new Set<string>();
  const effects: Manifest['externalEffects'] = [];
  for (const s of steps) {
    const risk = riskOf(s.tool);
    if (!tools.some((t) => t.tool === s.tool)) tools.push({ tool: s.tool, risk });
    if (s.tool === 'browser.read_page' && Array.isArray(s.args.urls)) for (const u of s.args.urls) reads.add(originLabel(String(u), cfg));
    if (s.tool === 'browser.act' || s.tool === 'http.request') { const u = String(s.args.url ?? ''); if (u) reads.add(originLabel(u, cfg)); }
    if (risk === 'write_local') writes.add(s.tool === 'sheet.write' ? 'a new Darby-owned spreadsheet (its name is a parameter)' : s.tool.startsWith('gtm.') ? `launch assets in the Darby workspace (${s.tool})` : `${s.tool} (local, Darby workspace or the fixture apps)`);
    if (risk === 'external_effect') {
      effects.push({ tool: s.tool, what: s.tool === 'share.grant' ? `share the document with the team email as ${String(s.args.role ?? 'reader')}` : s.tool === 'github.create_pr' ? 'open a pull request in the configured test repository' : s.tool });
      if (s.tool === 'share.grant') recipients.add('the team email from settings');
    }
  }
  return { tools, reads: [...reads], writes: [...writes], externalEffects: effects, recipients: [...recipients], needsApproval: effects.length > 0 };
}

/* ---------------- save a Playbook from a verified run ---------------- */
const portable = (u: string, cfg: Config): string => {
  try {
    const x = new URL(u, cfg.fixtureBase);
    return x.origin === new URL(cfg.fixtureBase).origin ? `${x.pathname}${x.search}` : x.toString();
  } catch { return u; }
};

export function playbookFromRun(run: RunRow, name: string, description: string, cfg: Config): PlaybookFile {
  if (run.verdict !== 'VERIFIED' && run.verdict !== 'VERIFIED_WITH_GAPS') throw new PlaybookError('not_verified', 'Only a run that finished VERIFIED (or VERIFIED_WITH_GAPS) can become a Playbook. A failed or unfinished run proves nothing worth repeating.', 409);
  if (!run.plan) throw new PlaybookError('no_plan', 'That run has no plan to save.', 409);
  const slug = slugify(name);
  if (slug.length < 2) throw new PlaybookError('bad_name', 'Give the Playbook a name of at least 2 letters or digits.');
  const steps = run.plan.steps.map((s) => ({
    id: s.id, title: s.title, tool: s.tool, dependsOn: s.dependsOn, proof: s.contract?.kind ?? null,
    args: s.tool === 'browser.read_page' && Array.isArray(s.args.urls) ? { ...s.args, urls: s.args.urls.map((u) => portable(String(u), cfg)) } : s.args,
  }));
  for (const s of steps) if (!isRegistered(s.tool) || !TOOLS[s.tool]!.implemented || riskOf(s.tool) === 'forbidden') throw new PlaybookError('bad_tool', `Step ${s.id} uses "${s.tool}", which a Playbook may not contain.`, 409);

  const params: PlaybookParam[] = [];
  const read = steps.find((s) => s.tool === 'browser.read_page');
  if (read) params.push({ key: 'urls', label: 'Pages to read', type: 'urls', default: (read.args.urls as string[]).slice(0, 12), bind: { step: read.id, arg: 'urls' } });
  const sheet = steps.find((s) => s.tool === 'sheet.write');
  if (sheet) params.push({ key: 'sheetName', label: 'Name of the new sheet', type: 'text', default: String(sheet.args.name), bind: { step: sheet.id, arg: 'name' } });

  const pb: PlaybookFile = {
    format: PLAYBOOK_FORMAT, slug, name: name.trim(), description: description.trim() || `Saved from: ${run.goal.trim().slice(0, 240)}`,
    createdAt: new Date().toISOString(),
    createdFrom: { runId: run.id, verdict: run.verdict, goal: run.goal.slice(0, 600), gaps: (run.receipt?.gaps ?? []).slice(0, 40) },
    params, steps, manifest: manifestOf(steps, cfg),
  };
  return PlaybookFile.parse(pb);
}

/* ---------------- replay: instantiate with parameters ---------------- */
export const SHEET_NAME = /^[\w][\w \-]{0,39}$/;

export function resolveParams(pb: PlaybookFile, given: Record<string, unknown> | undefined, ctx: CompileCtx): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const g = given ?? {};
  for (const k of Object.keys(g)) if (!pb.params.some((p) => p.key === k)) throw new PlaybookError('unknown_param', `This Playbook has no parameter “${k}”. Parameters: ${pb.params.map((p) => p.key).join(', ') || 'none'}.`);
  for (const p of pb.params) {
    const v = g[p.key] ?? p.default;
    if (p.type === 'urls') {
      const list = (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,]+/) : []).map((x) => String(x).trim()).filter(Boolean);
      if (!list.length) throw new PlaybookError('bad_param', `“${p.label}”: give at least one page.`);
      if (list.length > 12) throw new PlaybookError('bad_param', `“${p.label}”: at most 12 pages.`);
      const bad = list.filter((u) => !resolveAllowedUrl(u, ctx));
      if (bad.length) throw new PlaybookError('bad_param', `“${p.label}”: not an allowed page (only the configured fixture origin may be read): ${bad.slice(0, 3).join(', ')}`);
      out[p.key] = [...new Set(list.map((u) => resolveAllowedUrl(u, ctx)!))];
    } else {
      const t = String(v ?? '').trim();
      if (!SHEET_NAME.test(t)) throw new PlaybookError('bad_param', `“${p.label}”: use 1–40 letters, digits, spaces, - or _ (got “${t.slice(0, 40)}”).`);
      out[p.key] = t;
    }
  }
  return out;
}

export function instantiate(pb: PlaybookFile, given: Record<string, unknown> | undefined, ctx: CompileCtx): { plan: Plan; params: Record<string, unknown>; goal: string } {
  const params = resolveParams(pb, given, ctx);
  const steps = pb.steps.map((s) => ({ id: s.id, title: s.title, tool: s.tool, args: structuredClone(s.args) as Record<string, unknown>, dependsOn: s.dependsOn, suggestedRisk: riskOf(s.tool) }));
  for (const p of pb.params) {
    const st = steps.find((s) => s.id === p.bind.step);
    if (!st) throw new PlaybookError('bad_playbook', `Parameter “${p.key}” points at a step (${p.bind.step}) that does not exist.`);
    st.args[p.bind.arg] = params[p.key];
  }
  const out: PlannerOutput = { steps: steps.map((s) => ({ ...s, suggestedRisk: s.suggestedRisk })) };
  const pageCount = Array.isArray(params.urls) ? (params.urls as unknown[]).length : null;
  const goal = `Playbook “${pb.name}”${params.sheetName ? ` → sheet “${String(params.sheetName)}”` : ''}${pageCount ? ` · ${pageCount} page${pageCount === 1 ? '' : 's'}` : ''}`;
  const c = compilePlan(goal, out, ctx, `plan_pb_${pb.slug}`);
  if (!c.plan) throw new PlaybookError('bad_playbook', `This Playbook no longer compiles into a valid plan: ${c.problems.slice(0, 3).join('; ')}`, 422);
  return { plan: c.plan, params, goal };
}

/* ---------------- manifest validation (used by the loader and by playbook:check) ---------------- */
export interface Problem { check: string; detail: string }

export function validateManifest(pb: PlaybookFile, cfg: Config): Problem[] {
  const problems: Problem[] = [];
  const ids = new Set<string>();
  for (const s of pb.steps) {
    if (ids.has(s.id)) problems.push({ check: 'steps', detail: `duplicate step id ${s.id}` });
    ids.add(s.id);
    if (!isRegistered(s.tool)) problems.push({ check: 'tools', detail: `step ${s.id}: tool “${s.tool}” is not registered` });
    else {
      if (!TOOLS[s.tool]!.implemented) problems.push({ check: 'tools', detail: `step ${s.id}: tool “${s.tool}” is not implemented` });
      if (riskOf(s.tool) === 'forbidden') problems.push({ check: 'tools', detail: `step ${s.id}: tool “${s.tool}” is forbidden` });
    }
    for (const d of s.dependsOn) if (!pb.steps.some((x) => x.id === d)) problems.push({ check: 'steps', detail: `step ${s.id} depends on unknown step ${d}` });
  }
  for (const p of pb.params) if (!pb.steps.some((s) => s.id === p.bind.step)) problems.push({ check: 'params', detail: `parameter ${p.key} is bound to unknown step ${p.bind.step}` });
  // the declared manifest must equal what the steps really do: a hand-edited manifest that understates the permissions is rejected
  const derived = manifestOf(pb.steps.map((s) => ({ tool: s.tool, args: s.args })), cfg);
  // parameter defaults are what the stored steps carry, so the derived manifest is comparable as-is
  if (JSON.stringify(derived) !== JSON.stringify(pb.manifest)) problems.push({ check: 'manifest', detail: 'the permission manifest does not match what the steps actually do (it must be derived from them)' });
  return problems;
}

/* ---------------- disk: playbooks/<slug>/{playbook.json, SKILL.md, check.json} ---------------- */
export interface CheckFile {
  format: typeof CHECK_FORMAT;
  slug: string;
  playbookSha256: string;
  passed: boolean;
  at: string;
  llm: string;
  checks: { name: string; ok: boolean; detail: string }[];
  runs: string[];
}

export interface PlaybookView {
  playbook: PlaybookFile;
  sha256: string;
  /** shown as the CI badge only when a check passed AND it was made for exactly these bytes */
  badge: 'passed' | 'stale' | 'failed' | 'none';
  check: CheckFile | null;
}

const dirOf = (cfg: Config, slug: string) => path.join(cfg.playbooksDir, slug);

export function loadPlaybook(cfg: Config, slug: string): PlaybookView | null {
  if (!/^[a-z0-9][a-z0-9-]{1,47}$/.test(slug)) return null;
  const file = path.join(dirOf(cfg, slug), 'playbook.json');
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  const parsed = PlaybookFile.safeParse(JSON.parse(text));
  if (!parsed.success) return null;
  const sha = sha256Of(text);
  let check: CheckFile | null = null;
  try { check = JSON.parse(readFileSync(path.join(dirOf(cfg, slug), 'check.json'), 'utf8')) as CheckFile; } catch { /* never checked */ }
  const badge: PlaybookView['badge'] = !check || check.format !== CHECK_FORMAT || check.slug !== slug ? 'none' : check.playbookSha256 !== sha ? 'stale' : check.passed ? 'passed' : 'failed';
  return { playbook: parsed.data, sha256: sha, badge, check: badge === 'none' ? null : check };
}

export function listPlaybooks(cfg: Config): PlaybookView[] {
  if (!existsSync(cfg.playbooksDir)) return [];
  return readdirSync(cfg.playbooksDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => loadPlaybook(cfg, d.name)).filter((x): x is PlaybookView => !!x).sort((a, b) => a.playbook.name.localeCompare(b.playbook.name));
}

export function savePlaybook(cfg: Config, pb: PlaybookFile, overwrite = false): PlaybookView {
  const dir = dirOf(cfg, pb.slug);
  if (existsSync(path.join(dir, 'playbook.json')) && !overwrite) throw new PlaybookError('exists', `A Playbook called “${pb.slug}” already exists. Pick another name.`, 409);
  const problems = validateManifest(pb, cfg);
  if (problems.length) throw new PlaybookError('invalid', problems.map((p) => p.detail).join('; '), 422);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'playbook.json'), serialize(pb));
  writeFileSync(path.join(dir, 'SKILL.md'), skillMd(pb));
  return loadPlaybook(cfg, pb.slug)!;
}

export function writeCheck(cfg: Config, check: CheckFile): void {
  writeFileSync(path.join(dirOf(cfg, check.slug), 'check.json'), `${JSON.stringify(check, null, 2)}\n`);
  const view = loadPlaybook(cfg, check.slug);
  if (view) writeFileSync(path.join(dirOf(cfg, check.slug), 'SKILL.md'), skillMd(view.playbook, view.check, view.badge));
}

/* ---------------- SKILL.md (generated; plain markdown anyone can read, and an agent skill file) ---------------- */
export function skillMd(pb: PlaybookFile, check: CheckFile | null = null, badge: PlaybookView['badge'] = 'none'): string {
  const m = pb.manifest;
  const bullets = (xs: string[], none: string) => (xs.length ? xs.map((x) => `- ${x}`).join('\n') : `- ${none}`);
  const ci = badge === 'passed' && check ? `**CI: passed** on ${check.at.slice(0, 10)} (${check.checks.filter((c) => c.ok).length}/${check.checks.length} checks, ${check.llm}). Bound to playbook.json sha256 \`${check.playbookSha256.slice(0, 12)}…\`.`
    : badge === 'stale' ? '**CI: stale** — playbook.json changed after the last check. Run `npm run playbook:check`.'
    : badge === 'failed' ? '**CI: failed** — see check.json.'
    : '**CI: not checked yet.** Run `npm run playbook:check`. No badge is shown until it passes.';
  return `---
name: ${pb.slug}
description: ${pb.description.replace(/\n/g, ' ')}
---

# ${pb.name}

${pb.description}

Saved from run \`${pb.createdFrom.runId}\` (verdict ${pb.createdFrom.verdict}${pb.createdFrom.gaps.length ? `, gaps: ${pb.createdFrom.gaps.join(', ')}` : ''}). Original goal: “${pb.createdFrom.goal}”

${ci}

## Steps (the proof for each is rebuilt by code on every run)
${pb.steps.map((s, i) => `${i + 1}. \`${s.tool}\` — ${s.title}${s.proof ? ` · proof: ${s.proof}` : ' · no proof needed'}`).join('\n')}

## Parameters
${pb.params.length ? pb.params.map((p) => `- \`${p.key}\` (${p.type}) — ${p.label}. Default: ${Array.isArray(p.default) ? `${p.default.length} pages` : `“${p.default}”`}`).join('\n') : '- none'}

## Permission manifest (derived from the steps; a hand-edited manifest is rejected)
**Reads**
${bullets(m.reads, 'nothing')}

**Writes**
${bullets(m.writes, 'nothing')}

**External effects (each one waits for your approval)**
${bullets(m.externalEffects.map((e) => `\`${e.tool}\` — ${e.what}`), 'none')}

**Recipients**
${bullets(m.recipients, 'none')}

## Run it
Hub tab in the Darby companion, or \`POST /api/playbooks/${pb.slug}/run\` with \`{"params": {…}}\`.
The run goes through the same policy engine, approvals, quarantined reader and independent verifier as any other run, and gets its own signed receipt labelled \`PLAYBOOK:${pb.slug}\`.
`;
}

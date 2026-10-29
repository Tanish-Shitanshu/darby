import type { EvidenceContract, Risk } from '@darby/contracts';
import { z } from 'zod';
import type { Config } from '../config';
import type { Catalog } from '../sources';

/** Context the plan compiler gives to tool definitions. All trusted: goal, config, catalog. Never page text. */
export interface CompileCtx {
  cfg: Config;
  catalog: Catalog;
}

export interface ToolDef {
  name: string;
  risk: Risk;
  description: string;
  /** one-line argument help shown to the planner */
  argsHelp: string;
  /** canonicalise planner-proposed args (the planner proposes, code decides) */
  normalize(args: Record<string, unknown>, ctx: CompileCtx, prev: { id: string; tool: string }[]): Record<string, unknown>;
  /** the evidence contract (template) that proves the step; null only for pure-reasoning steps */
  contract(args: Record<string, unknown>, ctx: CompileCtx): EvidenceContract | null;
  implemented: boolean;
  /** strict schema = the allow-list of argument names/shapes (policy FORB-003 rejects anything else) */
  args: z.ZodTypeAny;
  /** canonical (lower-case alphanumeric) names of arguments that decide WHERE something goes / WHAT runs: tainted values are never allowed there */
  controlKeys: string[];
  /** canonical names of arguments that name a person/address: the value must come from the user's goal or settings */
  recipientKeys: string[];
}

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : typeof v === 'string' ? [v] : []);
const lastOf = (prev: { id: string; tool: string }[], tool: string) => [...prev].reverse().find((p) => p.tool === tool)?.id;

/** Resolve a planner-supplied URL against the fixture origin; keep only allowlisted origins (READ-001). */
export function resolveAllowedUrl(raw: string, ctx: CompileCtx): string | null {
  try {
    const u = new URL(raw, ctx.cfg.fixtureBase);
    return ctx.cfg.allowedOrigins.includes(u.origin) ? u.toString() : null;
  } catch {
    return null;
  }
}

const slugOf = (url: string) => url.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() ?? 'page';
export { slugOf };

export const sheetPathFor = (runId: string, name: string) => `workspace/${runId}/${name}.xlsx`;

const Id = z.string().max(24).nullable();
const DocName = z.string().regex(/^[\w][\w \-]{0,39}$/);
const META: Record<string, Pick<ToolDef, 'args' | 'controlKeys' | 'recipientKeys'>> = {
  'browser.read_page': { args: z.object({ urls: z.array(z.string().max(2048)).min(1).max(12) }).strict(), controlKeys: ['urls'], recipientKeys: [] },
  'reader.extract': { args: z.object({ fromStep: Id }).strict(), controlKeys: [], recipientKeys: [] },
  'sheet.write': { args: z.object({ name: DocName, fromStep: Id }).strict(), controlKeys: [], recipientKeys: [] },
  'sheet.create': { args: z.object({ name: DocName }).strict(), controlKeys: [], recipientKeys: [] },
  'sheet.read': { args: z.object({ sheetRef: z.string().max(200) }).strict(), controlKeys: [], recipientKeys: [] },
  'share.grant': { args: z.object({ fromStep: Id, recipient: z.literal('team'), role: z.enum(['reader', 'commenter', 'writer']) }).strict(), controlKeys: ['recipient'], recipientKeys: ['recipient'] },
  'email.send': { args: z.object({ to: z.string().max(320), subject: z.string().max(200).optional(), body: z.string().max(5000).optional() }).strict(), controlKeys: ['to'], recipientKeys: ['to'] },
  'browser.act': { args: z.object({ url: z.string().max(2048), actions: z.array(z.record(z.unknown())).max(20) }).strict(), controlKeys: ['url'], recipientKeys: [] },
  'http.request': { args: z.object({ method: z.enum(['GET', 'POST']), url: z.string().max(2048), body: z.record(z.unknown()).optional() }).strict(), controlKeys: ['url'], recipientKeys: [] },
  'github.create_pr': { args: z.object({ repo: z.string().max(100), branch: z.string().max(100), title: z.string().max(200), body: z.string().max(5000).optional(), patchRef: z.string().max(200).optional() }).strict(), controlKeys: ['repo', 'branch'], recipientKeys: [] },
};
const def = (d: Omit<ToolDef, 'args' | 'controlKeys' | 'recipientKeys'>): [string, ToolDef] => [d.name, { ...d, ...META[d.name]! }];

export const TOOLS: Record<string, ToolDef> = Object.fromEntries([
  def({
    name: 'browser.read_page', risk: 'read', implemented: true,
    description: 'Open URLs in real browser tabs (up to 3 in parallel) and capture their page text for the quarantined reader, plus a screenshot of each.',
    argsHelp: '{ urls: string[] }  (URLs must come from the Sources list)',
    normalize(args, ctx) {
      const urls = [...new Set(strs(args.urls).map((u) => resolveAllowedUrl(u, ctx)).filter((u): u is string => !!u))].slice(0, 12);
      return { urls: urls.length ? urls : (ctx.catalog.sources[0]?.urls ?? []).slice(0, 12) };
    },
    contract(args, ctx) {
      const first = strs(args.urls)[0] ?? ctx.cfg.fixtureBase;
      return { kind: 'file_exists', path: `.darby/runs/{runId}/shots/read-${slugOf(first)}.png`, minBytes: 2000, mime: 'image/png' };
    },
  }),
  def({
    name: 'reader.extract', risk: 'read', implemented: true,
    description: 'Quarantined reader: a tool-less model turns each page text into a strict record {name, priceUsd|null, quote|null}. Never guesses; a missing price becomes a gap.',
    argsHelp: '{ fromStep: <id of a browser.read_page step> }',
    normalize(args, _ctx, prev) {
      const from = typeof args.fromStep === 'string' && prev.some((p) => p.id === args.fromStep && p.tool === 'browser.read_page') ? args.fromStep : lastOf(prev, 'browser.read_page');
      return { fromStep: from ?? null };
    },
    contract(_args, ctx) {
      return { kind: 'quote_in_page', url: ctx.catalog.sources[0]?.urls[0] ?? ctx.cfg.fixtureBase, items: [] };
    },
  }),
  def({
    name: 'sheet.write', risk: 'write_local', implemented: true,
    description: 'Create a new spreadsheet document owned by Darby and write the extracted rows (name, lowest paid monthly price USD, evidence quote, source URL, status, note).',
    argsHelp: '{ name: string (document name, e.g. "Competitors"), fromStep: <id of a reader.extract step> }',
    normalize(args, _ctx, prev) {
      const name = String(args.name ?? 'Competitors').replace(/[^\w \-]/g, '').trim().slice(0, 40) || 'Competitors';
      const from = typeof args.fromStep === 'string' && prev.some((p) => p.id === args.fromStep && p.tool === 'reader.extract') ? args.fromStep : lastOf(prev, 'reader.extract');
      return { name, fromStep: from ?? null };
    },
    contract(args) {
      return { kind: 'sheet_readback', sheetRef: sheetPathFor('{runId}', String(args.name ?? 'Competitors')), range: 'A1:F11', expected: [] };
    },
  }),
  def({
    name: 'sheet.create', risk: 'write_local', implemented: false, description: 'Create an empty Darby-owned spreadsheet.', argsHelp: '{ name }',
    normalize: (a) => a, contract: () => null,
  }),
  def({
    name: 'sheet.read', risk: 'write_local', implemented: false, description: 'Read back a Darby-owned spreadsheet.', argsHelp: '{ sheetRef }',
    normalize: (a) => a, contract: () => null,
  }),
  def({
    name: 'share.grant', risk: 'external_effect', implemented: true,
    description: 'Share the Darby-owned document with the team email (view access). External effect: always needs the user\'s approval.',
    argsHelp: '{ fromStep: <id of the sheet.write step>, recipient: "team", role: "reader" }',
    normalize(args, _ctx, prev) {
      const from = typeof args.fromStep === 'string' && prev.some((p) => p.id === args.fromStep && p.tool === 'sheet.write') ? args.fromStep : lastOf(prev, 'sheet.write');
      return { fromStep: from ?? null, recipient: 'team', role: 'reader' };
    },
    contract(_args, ctx) {
      return { kind: 'permission_present', fileRef: sheetPathFor('{runId}', 'Competitors'), email: ctx.cfg.teamEmail, role: 'reader' };
    },
  }),
  def({
    name: 'email.send', risk: 'external_effect', implemented: true, description: 'Send an email (fixture outbox only). External effect.', argsHelp: '{ to, subject, body }',
    normalize: (a, ctx) => ({ to: a.to === 'team' ? ctx.cfg.teamEmail : a.to, ...(a.subject !== undefined ? { subject: a.subject } : {}), ...(a.body !== undefined ? { body: a.body } : {}) }),
    contract: (a, ctx) => ({ kind: 'http_json_contains', url: `${ctx.cfg.fixtureBase}/api/outbox`, path: '$', expected: { to: String(a.to ?? '') } }),
  }),
  def({
    name: 'browser.act', risk: 'write_local', implemented: false, description: 'Click/type on an allowlisted origin (forms).', argsHelp: '{ url, actions: [...] }',
    normalize: (a) => a, contract: () => null,
  }),
  def({
    name: 'http.request', risk: 'write_local', implemented: false, description: 'Documented HTTP API call on the fixture origin.', argsHelp: '{ method, url, body }',
    normalize: (a) => a, contract: () => null,
  }),
  def({
    name: 'github.create_pr', risk: 'external_effect', implemented: false, description: 'Open a pull request on the test repo. External effect.', argsHelp: '{ repo, branch, title }',
    normalize: (a) => a, contract: () => null,
  }),
]);

export const isRegistered = (tool: string): boolean => Object.prototype.hasOwnProperty.call(TOOLS, tool) || /^gtm\./.test(tool) && Object.prototype.hasOwnProperty.call(TOOLS, tool);
export const riskOf = (tool: string): Risk => (isRegistered(tool) ? TOOLS[tool]!.risk : 'forbidden');

export function describeToolsForPlanner(): string {
  return Object.values(TOOLS)
    .filter((t) => t.implemented)
    .map((t) => `- ${t.name} [${t.risk}] ${t.description}\n    args: ${t.argsHelp}`)
    .join('\n');
}

// Independent verifier. It never imports the executor, never sees the reader's or the agent's prose, and does its own fresh reads
// (own fetch, own file open). It only receives the evidence CONTRACT (the claim to check) and returns pass / fail / gap / error.
import ExcelJS from 'exceljs';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { EvidenceContract } from '@darby/contracts';
import { readLocalShares } from '../adapters/share-local';

export interface CheckResult {
  /** every claim in the contract was proven (gaps count as proven-absent, see below) */
  passed: boolean;
  /** at least one item had no value on the page: a flagged gap, never a failure */
  gap: boolean;
  /** slugs of the items that are gaps */
  gaps: string[];
  /** the verifier itself could not check (timeout, tool error, not implemented): the run becomes NEEDS_YOU, never VERIFIED */
  error: boolean;
  detail: string;
}

export interface VisionAnswer { answer: boolean; reason: string }
export interface VerifierCtx {
  /** independent vision model: sees ONE screenshot and ONE yes/no question, never the agent's claim */
  vision?: (a: { file: string; question: string; stateHint: string }) => Promise<VisionAnswer>;
  root: string;           // repo root: relative paths resolve here
  workspaceDir: string;   // sheets must live here
  fetchTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const pass = (detail: string, extra: Partial<CheckResult> = {}): CheckResult => ({ passed: true, gap: false, gaps: [], error: false, detail, ...extra });
const fail = (detail: string): CheckResult => ({ passed: false, gap: false, gaps: [], error: false, detail });
const err = (detail: string): CheckResult => ({ passed: false, gap: false, gaps: [], error: true, detail });

/* ---------------- text helpers (pure, unit-tested) ---------------- */
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", '#8217': '\u2019' };

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (/^#x/i.test(e) ? String.fromCodePoint(parseInt(e.slice(2), 16)) : /^#\d/.test(e) ? String.fromCodePoint(parseInt(e.slice(1), 10)) : m));
}

/** Whitespace-normalise so a quote copied from a rendered page matches the page source. */
export function norm(s: string): string {
  return s.normalize('NFKC').replace(/[\u00a0\u2009\u202f]/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();
}

const PRICE_RE = /(?:\$|USD)\s?(\d{1,6}(?:[.,]\d{1,2})?)/gi;
/** All dollar amounts in a piece of text, in order. */
export function parsePrices(text: string): number[] {
  return [...text.matchAll(PRICE_RE)].map((m) => Number(m[1]!.replace(',', '.')));
}

export interface ClaimItem { field: string; value: string | null; quote: string | null }

/** The core of quote_in_page, pure so it can be unit-tested: gap vs fail vs pass. */
export function checkClaim(pageText: string, item: ClaimItem): { status: 'pass' | 'fail' | 'gap'; note: string } {
  const text = norm(pageText);
  if (item.value === null) {
    // No price claimed: this is a flagged gap, never a failure. If the page does show a paid price, say so (review) but still a gap.
    const paid = parsePrices(text).filter((p) => p > 0);
    return { status: 'gap', note: paid.length ? `price not extracted although the page mentions $${paid[0]} — review` : 'no paid price on the page (NOT FOUND, not guessed)' };
  }
  if (!item.quote) return { status: 'fail', note: 'a value was claimed without an evidence quote' };
  const q = norm(item.quote);
  if (!text.includes(q)) return { status: 'fail', note: `quote not found in the page: "${q.slice(0, 80)}"` };
  const want = Number(item.value);
  if (!Number.isFinite(want)) return { status: 'fail', note: `claimed value "${item.value}" is not a number` };
  const nums = parsePrices(q);
  if (!nums.length) return { status: 'fail', note: 'the quote contains no price' };
  if (nums[0] !== want) return { status: 'fail', note: `the quote shows $${nums[0]} but the claim is $${want}` };
  return { status: 'pass', note: `exact quote on the page, $${want}` };
}

const slugOfUrl = (url: string) => url.replace(/[?#].*$/, '').split('/').filter(Boolean).pop() ?? url;

/* ---------------- contract kinds ---------------- */
async function quoteInPage(c: Extract<EvidenceContract, { kind: 'quote_in_page' }>, ctx: VerifierCtx): Promise<CheckResult> {
  let html: string;
  try {
    const res = await (ctx.fetchImpl ?? fetch)(c.url, { signal: AbortSignal.timeout(ctx.fetchTimeoutMs ?? 10_000), headers: { 'user-agent': 'DarbyVerifier/0.1' } });
    if (!res.ok) return err(`independent fetch of ${c.url} returned HTTP ${res.status}`);
    if (res.url && new URL(res.url).origin !== new URL(c.url).origin) return err(`independent fetch of ${c.url} was redirected to another origin (${new URL(res.url).origin}); not trusted`);
    html = await res.text();
  } catch (e) {
    return err(`independent fetch of ${c.url} failed: ${(e as Error).name}`);
  }
  const text = htmlToText(html);
  const slug = slugOfUrl(c.url);
  const gaps: string[] = [];
  const notes: string[] = [];
  let failed = 0;
  for (const item of c.items) {
    const r = checkClaim(text, item);
    if (r.status === 'fail') failed++;
    if (r.status === 'gap') gaps.push(slug);
    notes.push(r.note);
  }
  if (failed) return { passed: false, gap: false, gaps: [], error: false, detail: `${slug}: ${notes.join('; ')}` };
  return { passed: true, gap: gaps.length > 0, gaps, error: false, detail: `${slug}: ${notes.join('; ')}` };
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    const o = v as any;
    if ('text' in o) return String(o.text);
    if ('result' in o) return String(o.result ?? '');
    if ('richText' in o) return o.richText.map((r: any) => r.text).join('');
    if (v instanceof Date) return v.toISOString();
  }
  return String(v);
}

export function resolveInside(ctx: VerifierCtx, ref: string, inside: string): string | null {
  const abs = path.resolve(ctx.root, ref);
  const rel = path.relative(inside, abs);
  return rel.startsWith('..') || path.isAbsolute(rel) ? null : abs;
}

async function sheetReadback(c: Extract<EvidenceContract, { kind: 'sheet_readback' }>, ctx: VerifierCtx): Promise<CheckResult> {
  const file = resolveInside(ctx, c.sheetRef, ctx.workspaceDir);
  if (!file) return fail(`sheet path ${c.sheetRef} is outside the Darby workspace`);
  if (!existsSync(file)) return fail(`the document ${c.sheetRef} does not exist`);
  let wb: ExcelJS.Workbook;
  try {
    wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file); // fresh open from disk: not the object the writer used
  } catch (e) {
    return err(`could not re-open ${c.sheetRef}: ${(e as Error).message.slice(0, 80)}`);
  }
  const ws = wb.worksheets[0];
  if (!ws) return fail('the document has no worksheet');
  let badCells = 0;
  let rowsOk = 0;
  const first: string[] = [];
  c.expected.forEach((row, r) => {
    let rowOk = true;
    row.forEach((want, col) => {
      const got = cellText(ws.getRow(r + 1).getCell(col + 1).value);
      if (got !== want) { rowOk = false; badCells++; if (first.length < 2) first.push(`R${r + 1}C${col + 1} expected "${want.slice(0, 30)}" got "${got.slice(0, 30)}"`); }
    });
    if (rowOk && r > 0) rowsOk++;
  });
  const dataRows = Math.max(0, c.expected.length - 1);
  if (badCells) return fail(`read-back mismatch: ${badCells} cell(s) differ (${first.join('; ')}); ${rowsOk}/${dataRows} data rows match`);
  if (dataRows === 0) return fail('nothing to compare: the contract has no expected rows');
  return pass(`${rowsOk}/${dataRows} data rows read back from ${path.basename(file)} and every cell equals what was written`);
}

function fileExists(c: Extract<EvidenceContract, { kind: 'file_exists' }>, ctx: VerifierCtx): CheckResult {
  const file = path.resolve(ctx.root, c.path);
  if (!existsSync(file)) return fail(`file missing: ${c.path}`);
  const size = statSync(file).size;
  if (size < c.minBytes) return fail(`file too small: ${size} < ${c.minBytes} bytes`);
  return pass(`${path.basename(file)} exists (${size} bytes)`);
}

function permissionPresent(c: Extract<EvidenceContract, { kind: 'permission_present' }>, ctx: VerifierCtx): CheckResult {
  const file = resolveInside(ctx, c.fileRef, ctx.workspaceDir);
  if (!file) return fail(`document path ${c.fileRef} is outside the Darby workspace`);
  const sc = readLocalShares(file);
  if (!sc) return fail(`no permission list exists for ${path.basename(file)}`);
  const hit = sc.grants.find((g) => g.email.toLowerCase() === c.email.toLowerCase() && g.role === c.role);
  if (!hit) return fail(`the permission list for ${path.basename(file)} does not show ${c.email} as ${c.role}`);
  return pass(`SIMULATED (local adapter): the permission list shows ${c.email} as ${c.role}; nothing left this computer`);
}

async function visionCheck(c: Extract<EvidenceContract, { kind: 'vision_check' }>, ctx: VerifierCtx): Promise<CheckResult> {
  if (!ctx.vision) return err('no vision model is available to check the screenshot');
  const file = path.resolve(ctx.root, c.screenshotPath);
  if (!existsSync(file)) return fail(`the screenshot ${c.screenshotPath} does not exist`);
  const side = `${file}.state`;
  const stateHint = existsSync(side) ? readFileSync(side, 'utf8').trim() : path.basename(file);
  let r: VisionAnswer;
  try { r = await ctx.vision({ file, question: c.question, stateHint }); } catch (e) { return err(`the vision model could not be reached: ${(e as Error).message.slice(0, 100)}`); }
  return r.answer ? pass(`independent vision check: YES — ${r.reason}`) : fail(`independent vision check: NO — ${r.reason}`);
}

/** Tiny path walker: "$", "$.a.b", "a[0].b", numeric segments. */
export function jsonPathGet(root: unknown, p: string): unknown {
  let cur: any = root;
  const parts = p.replace(/^\$\.?/, '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  for (const k of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[k];
  }
  return cur;
}
/** `expected` must be contained in `actual`: subset match for objects, any-element match for arrays, equality for scalars. */
export function jsonContains(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual)) return actual.some((el) => jsonContains(el, expected)) || (Array.isArray(expected) && expected.every((e) => actual.some((el) => jsonContains(el, e))));
  if (expected && typeof expected === 'object' && actual && typeof actual === 'object') return Object.entries(expected as Record<string, unknown>).every(([k, v]) => jsonContains((actual as any)[k], v));
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function httpJsonContains(c: Extract<EvidenceContract, { kind: 'http_json_contains' }>, ctx: VerifierCtx): Promise<CheckResult> {
  let body: unknown;
  try {
    const res = await (ctx.fetchImpl ?? fetch)(c.url, { signal: AbortSignal.timeout(ctx.fetchTimeoutMs ?? 10_000), headers: { accept: 'application/json', 'user-agent': 'DarbyVerifier/0.1' } });
    if (!res.ok) return err(`independent read of ${c.url} returned HTTP ${res.status}`);
    body = await res.json();
  } catch (e) {
    return err(`independent read of ${c.url} failed: ${(e as Error).name}`);
  }
  const got = jsonPathGet(body, c.path);
  return jsonContains(got, c.expected)
    ? pass(`a fresh GET ${new URL(c.url).pathname} contains ${JSON.stringify(c.expected).slice(0, 80)}`)
    : fail(`Not saved: a fresh GET ${new URL(c.url).pathname} does not contain ${JSON.stringify(c.expected).slice(0, 80)} (it holds ${Array.isArray(got) ? `${got.length} record(s)` : JSON.stringify(got)?.slice(0, 40) ?? 'nothing'}). A success message on the page is only a claim; the data is not there.`);
}

/** Entry point. Contract kinds that are not implemented yet return an ERROR (-> NEEDS_YOU), never a pass. */
export async function verifyContract(c: EvidenceContract, ctx: VerifierCtx, extra?: { custom?: (c: EvidenceContract) => Promise<CheckResult | null> }): Promise<CheckResult> {
  try {
    if (extra?.custom) {
      const r = await extra.custom(c);
      if (r) return r;
    }
    switch (c.kind) {
      case 'quote_in_page': return await quoteInPage(c, ctx);
      case 'sheet_readback': return await sheetReadback(c, ctx);
      case 'file_exists': return fileExists(c, ctx);
      case 'permission_present': return permissionPresent(c, ctx);
      case 'http_json_contains': return await httpJsonContains(c, ctx);
      case 'vision_check': return await visionCheck(c, ctx);
      default: return err(`verifier for "${c.kind}" is not available yet`);
    }
  } catch (e) {
    return err(`verifier error: ${(e as Error).message.slice(0, 120)}`);
  }
}

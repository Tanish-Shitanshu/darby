import type { EvidenceContract, PlanStep } from '@darby/contracts';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { writeLocalSheet, type SheetRow } from '../adapters/sheets-local';
import { grantLocalShare } from '../adapters/share-local';
import { readPage } from '../reader/reader';
import { slugOf } from '../tools/registry';
import { isPublicWebUrl, labelOf, searchDetailed, type Hit } from './websearch';
import { codeFix, codeTest } from './code-tools';
import { checkClaim, parsePrices } from '../verifier/verifier';
import { pMap } from '../util/pmap';
import { readPageText } from './browser';
import type { RunContext } from './context';
import { githubCreatePr, gtmCopy, gtmHero, gtmLanding, gtmTeaser, gtmTestPage, gtmVoice } from './gtm-tools';

/** Real pricing pages are long and mostly navigation. Keep the lines that talk about money (with one line of context each) so the reader's window holds the prices. */
export function focusPriceText(text: string): string {
  if (text.length <= 5000) return text;
  const lines = text.split('\n');
  const keep = new Set<number>();
  lines.forEach((l, i) => { if (/(\$\s?\d|USD|per (month|user|seat|member)|\/\s?(mo|month|user|seat)\b|monthly|billed (annually|monthly)|\bfree\b|\bplans?\b)/i.test(l)) for (let k = Math.max(0, i - 2); k <= Math.min(lines.length - 1, i + 2); k++) keep.add(k); });
  const picked = [...keep].sort((a, b) => a - b).map((i) => lines[i]!).join('\n');
  return (picked.length > 200 ? picked : text).slice(0, 11_000);
}

/**
 * A rule, not a model: the cheapest paid monthly price that the page itself states next to a "per month" wording, with the exact line as its quote.
 * Used on the open web only, when the reader model found nothing or named a number the page does not support. The verifier still re-checks the quote.
 */
export function fallbackPrice(text: string): { price: number; quote: string } | null {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let best: { price: number; quote: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const window = `${lines[i]}${/\$\s?\d[\d,.]*\s*$/.test(lines[i]!) || lines[i]!.length < 18 ? ` ${lines[i + 1] ?? ''}` : ''}`.trim();
    if (window.length > 200 || !/(\/\s?mo\b|per month|\/\s?month|monthly|a month|\bmo\b)/i.test(window)) continue;
    if (/(% off|first month|free credits|\bcredits?\b|trial|was \$|save \$|annually only)/i.test(window)) continue;
    const prices = parsePrices(window).filter((p) => p > 0 && p < 100_000);
    if (!prices.length || parsePrices(window)[0]! <= 0) continue;   // the quote must start with a paid price, not a $0 plan
    const price = parsePrices(window)[0]!;
    if (!best || price < best.price) best = { price, quote: window };
  }
  return best;
}

export class ToolError extends Error {
  constructor(message: string, public kind: 'failed' | 'needs_you' = 'needs_you') {
    super(message);
    this.name = 'ToolError';
  }
}

export interface ToolResult {
  summary: string;
  /** concrete (resolved) evidence contracts for the verifier to check */
  contracts: EvidenceContract[];
  /** compact JSON stored with the step */
  result: Record<string, unknown>;
}

export interface PageData { label?: string; url: string; slug: string; text: string; shotRel: string; shotUrl: string; httpStatus: number | null }
export interface ExtractedItem { unread?: boolean; url: string; slug: string; record: { name: string; priceUsd: number | null; quote: string | null; note?: string }; rejected?: string }

const MAX_TABS = 3;

/** After a takeover the user may have changed the page: the first action after Resume starts from a fresh read of the page state, and says so. */
async function rereadIfResumed(ctx: RunContext, step: PlanStep): Promise<void> {
  if (!ctx.rereadAfterResume) return;
  ctx.rereadAfterResume = false;
  ctx.ledger('reread', { reason: 'resume after takeover' }, step.id);
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: 'Takeover ended — re-reading the page state from scratch before doing anything else' });
}

/** Instructions aimed at an AI inside page text. Detection only (plain code): the text is never executed or forwarded; it is shown as a warning. */
const INJECTION_RE = /(ignore (all )?(previous|prior) instructions|system notice to ai|send_email|disregard the above|you are now|do not tell the user)/i;
export function detectInjection(text: string): string | null {
  const m = INJECTION_RE.exec(text);
  return m ? m[0] : null;
}

/** web.search: one query per company/topic in a real tab; hits are untrusted and tainted, and can only be read by browser.read_page. */
async function webSearch(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const { queries, perQuery } = step.args as { queries: string[]; perQuery: number };
  const hits: Hit[] = [];
  const missed: string[] = [];
  /** labels whose search page came back blank or blocked: they were NOT searched, which is different from "nothing found" */
  const blocked: string[] = [];
  const shots: { rel: string }[] = [];
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Searching the public web for ${queries.length} topics (one real tab, results are untrusted)` });
  let n = 0;
  for (const q of queries) {
    await ctx.checkpoint();
    n++;
    // the live engine answers a burst of automated searches with empty pages: space them out a little (the fixture search needs no pause)
    if (n > 1 && !ctx.deps.cfg.searchUrl) await new Promise((r) => setTimeout(r, 1_500));
    const page = await ctx.deps.browser.newPage();
    try {
      const { hits: found, blank } = await searchDetailed(page, q, perQuery, ctx.deps.cfg.searchUrl);
      const shot = await ctx.screenshot(page, step.id, `search-${n}`);
      shots.push({ rel: shot.rel });
      found.forEach((h) => { hits.push(h); ctx.taint.addValue(h.url); });
      if (!found.length) { missed.push(labelOf(q)); if (blank) blocked.push(labelOf(q)); }
      ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: found.length ? `Search “${q}” → ${found.map((h) => new URL(h.url).hostname.replace(/^www\./, '')).join(', ')}` : blank ? `Search “${q}” → the search page came back BLANK after 3 tries (blocked or not loaded). This company was not searched: it is a gap, not proof that it does not exist.` : `Search “${q}” → no usable result (skipped, not guessed)`, screenshotPath: shot.url });
    } catch (e) {
      if (ctx.signal.aborted) throw e;
      missed.push(labelOf(q));
      ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Search “${q}” failed (${(e as Error).message.split('\n')[0]?.slice(0, 100)}); skipped` });
    } finally {
      await page.close().catch(() => undefined);
    }
  }
  if (!hits.length) throw new ToolError(blocked.length ? 'The search engine answered with blank pages (it is probably blocking automated searches right now). Nothing was searched and nothing was guessed. Try again in a few minutes.' : 'The web search returned no usable pages (the search engine may be blocking automated searches). Nothing was guessed.', 'needs_you');
  ctx.outputs.set(step.id, { hits, missed, blocked });
  return {
    summary: `${hits.length} pages found for ${queries.length} searches${blocked.length ? `; ${blocked.length} search page${blocked.length === 1 ? '' : 's'} came back blank (not searched)` : ''}`,
    contracts: shots.map((s) => ({ kind: 'file_exists' as const, path: s.rel, minBytes: 2000, mime: 'image/png' })),
    result: { queries, hits: hits.map((h) => ({ query: h.query, host: new URL(h.url).hostname })) },
  };
}

async function readPages(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const fromSearch = typeof step.args.fromStep === 'string' ? (ctx.outputs.get(step.args.fromStep) as { hits?: Hit[]; missed?: string[]; blocked?: string[] } | undefined) : undefined;
  const fixtureOrigin = ctx.deps.cfg.searchUrl ? new URL(ctx.deps.cfg.searchUrl).origin : null;
  const okUrl = (u: string) => ctx.deps.cfg.allowedOrigins.includes(new URL(u).origin) || isPublicWebUrl(u) || (fixtureOrigin !== null && new URL(u).origin === fixtureOrigin);
  // one group per company (search query): its best hit first, the next hit as a fallback; on the fixture web every URL is its own group
  const groups: { label?: string; urls: string[] }[] = fromSearch
    ? [...new Map((fromSearch.hits ?? []).filter((h) => okUrl(h.url)).map((h) => [h.query, h] as const)).keys()].slice(0, 12).map((q) => ({ label: labelOf(q), urls: [...new Set((fromSearch.hits ?? []).filter((h) => h.query === q && okUrl(h.url)).map((h) => h.url))] }))
    : ((step.args.urls as string[]) ?? []).map((u) => ({ urls: [u] }));
  if (!groups.length) throw new ToolError('No URLs to read.', 'failed');
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Opening ${groups.length} pages in real browser tabs (${Math.min(MAX_TABS, groups.length)} at a time)` });
  const skipped: string[] = [];
  const unread: { label: string; url: string; reason: string }[] = (fromSearch?.missed ?? []).map((label) => ({ label, url: '', reason: fromSearch?.blocked?.includes(label) ? 'The search page came back blank (blocked or not loaded), so this company was NOT searched. Try again later.' : 'The web search found no usable page for this company.' }));
  // A search hit is usually a company's home page. The only address Darby derives from it is the same site's /pricing (a fixed path, never taken
  // from page text); it is tried first and the hit itself is the fallback. Both are public reads of the same origin.
  const PRICE_HINT = /\$\s?\d|\bUSD\b|per (user|seat|month)|\/\s?mo\b|monthly/i;
  const readCandidates = async (group: { label?: string; urls: string[] }): Promise<PageData | null> => {
    const url0 = group.urls[0]!;
    const candidates = fromSearch ? [...new Set(group.urls.flatMap((u) => [`${new URL(u).origin}/pricing`, u]))] : [url0];
    let first: PageData | null = null;
    let lastErr: unknown;
    for (const u of candidates) {
      try {
        const p = await readOne(u);
        if (!fromSearch || PRICE_HINT.test(p.text) || u === candidates[candidates.length - 1]) return { ...p, ...(group.label ? { label: group.label } : {}) };
        first ??= p;
      } catch (e) {
        if (ctx.signal.aborted) throw e;
        lastErr = e;
      }
    }
    if (first) return { ...first, ...(group.label ? { label: group.label } : {}) };
    const err = lastErr instanceof ToolError ? lastErr : new ToolError(`Could not load ${url0}: ${(lastErr as Error)?.message?.split('\n')[0] ?? 'unknown error'}`, 'needs_you');
    if (fromSearch) {   // on the open web some sites refuse automated readers: that one page becomes a gap, the others carry on
      const host = new URL(url0).hostname.replace(/^www\./, '');
      skipped.push(host);
      unread.push({ label: group.label ?? host, url: url0, reason: `The page could not be read (${err.message.replace(/https?:\/\/\S+/g, 'the page').slice(0, 70)}).` });
      ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Skipped ${host}: ${err.message.slice(0, 120)} (recorded as a gap, nothing guessed)` });
      return null;
    }
    throw err;
  };
  const readOne = async (url: string): Promise<PageData> => {
    const slug = fromSearch ? new URL(url).hostname.replace(/^www\./, '') : slugOf(url);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      await ctx.checkpoint();
      await rereadIfResumed(ctx, step);
      const page = await ctx.deps.browser.newPage();
      try {
        const read = await readPageText(page, url, ctx.signal);
        if (!read.httpStatus || read.httpStatus >= 400) throw new ToolError(`${url} answered HTTP ${read.httpStatus}`, 'failed');
        // redirects are followed by the browser: the FINAL origin must still be allowlisted (READ-001), otherwise nothing from it is used
        if (!(fromSearch ? okUrl(read.finalUrl) : ctx.deps.cfg.allowedOrigins.includes(new URL(read.finalUrl).origin))) throw new ToolError(`${url} redirected to ${new URL(read.finalUrl).origin}, which is not on the allowlist; its content was discarded`, 'failed');
        const shot = await ctx.screenshot(page, step.id, `read-${slug}`);
        ctx.taint.addPageText(read.text);
        await ctx.checkpoint(); // a takeover pauses before the next visible action, not after
        const hostile = detectInjection(read.text);
        if (hostile) {
          ctx.ledger('injection.detected', { slug, marker: hostile, handling: 'text goes only to the quarantined reader; no tool can be reached from it' }, step.id);
          ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Warning: the page ${slug} contains hidden text that tries to give orders to an AI (“${hostile}”). It is untrusted data: only the quarantined reader sees it, no tool can be reached from it.` });
        }
        ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Read ${ctx.deps.catalog.names[slug] ?? slug} (${url.replace(/^https?:\/\//, '')}) — HTTP ${read.httpStatus}, ${read.text.length} characters of page text`, screenshotPath: shot.url });
        // on the open web the page the maker really read is where the browser ended up (anthropic.com/pricing -> claude.com/pricing); the verifier re-reads exactly that public address
        return { url: fromSearch ? read.finalUrl : url, slug, text: read.text, shotRel: shot.rel, shotUrl: shot.url, httpStatus: read.httpStatus };
      } catch (e) {
        if (ctx.signal.aborted) throw e;
        lastErr = e;
      } finally {
        await page.close().catch(() => undefined);
      }
    }
    throw lastErr instanceof ToolError ? lastErr : new ToolError(`Could not load ${url}: ${(lastErr as Error)?.message?.split('\n')[0] ?? 'unknown error'}`, 'needs_you');
  };
  const pagesAll = await pMap(groups, MAX_TABS, readCandidates);
  const pages = pagesAll.filter((p): p is PageData => p !== null);
  if (!pages.length) throw new ToolError('None of the found pages could be read (sites may be blocking automated readers). Nothing was guessed.', 'needs_you');
  ctx.outputs.set(step.id, { pages, unread });
  return {
    summary: `${pages.length} pages read in real tabs${unread.length ? `, ${unread.length} could not be read (kept as missing rows)` : ''}`,
    contracts: pages.map((p) => ({ kind: 'file_exists', path: p.shotRel, minBytes: 2000, mime: 'image/png' })),
    result: { pages: pages.map((p) => ({ url: p.url, httpStatus: p.httpStatus, chars: p.text.length, screenshot: p.shotRel })), skipped },
  };
}

async function extract(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const src = ctx.outputs.get(String(step.args.fromStep)) as { pages: PageData[]; unread?: { label: string; url: string; reason: string }[] } | undefined;
  if (!src) throw new ToolError('The reader has no pages to read (the read step did not finish).', 'needs_you');
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Quarantined reader: ${src.pages.length} pages, schema-only output, no tools` });
  const items = await pMap(src.pages, 3, async (p): Promise<ExtractedItem> => {
    await ctx.checkpoint();
    let r;
    try {
      r = await readPage(ctx.deps.llm, p.label ? focusPriceText(p.text) : p.text, ctx.signal);
    } catch (e) {
      if (ctx.signal.aborted) throw e;
      if (p.label) {   // open web: one page the reader model could not answer must not sink the other companies
        const fb = fallbackPrice(p.text);
        if (fb && checkClaim(p.text, { field: 'priceUsd', value: String(fb.price), quote: fb.quote }).status === 'pass') {
          ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${p.label}: the reader model did not answer; a plain rule found “${fb.quote.slice(0, 70)}” on the page → $${fb.price}` });
          return { url: p.url, slug: p.slug, record: { name: p.label, priceUsd: fb.price, quote: fb.quote.slice(0, 200) } };
        }
        // otherwise it becomes a MISSING row
        ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${p.label}: the reader model did not answer for this page (${(e as Error).message.slice(0, 80)}). Marked MISSING, nothing guessed.` });
        if (!ctx.gapSlugs.includes(p.label)) ctx.gapSlugs.push(p.label);
        return { unread: true, url: p.url, slug: p.label, record: { name: p.label, priceUsd: null, quote: null, note: 'The page was read but the reader model gave no answer for it.' } };
      }
      throw new ToolError(`The reader model could not be reached: ${(e as Error).message.slice(0, 160)}`, 'needs_you');
    }
    if (r.llm) ctx.noteLlm(r.llm, 'reader');
    await ctx.checkpoint();
    if (!r.ok) {
      if (p.label) {
        const fb = fallbackPrice(p.text);
        if (fb && checkClaim(p.text, { field: 'priceUsd', value: String(fb.price), quote: fb.quote }).status === 'pass') {
          ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${p.label}: the reader gave no usable answer; a plain rule found “${fb.quote.slice(0, 70)}” on the page → $${fb.price}` });
          return { url: p.url, slug: p.slug, record: { name: p.label, priceUsd: fb.price, quote: fb.quote.slice(0, 200) } };
        }
      }
      ctx.ledger('reader.rejected', { slug: p.slug, reason: r.reason }, step.id);
      ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Reader output for ${p.slug} was REJECTED (${r.reason}) — recorded as a gap, nothing from it was used` });
      return { url: p.url, slug: p.slug, record: { name: p.label ?? ctx.deps.catalog.names[p.slug] ?? p.slug, priceUsd: null, quote: null }, rejected: r.reason };
    }
    let rec: { name: string; priceUsd: number | null; quote: string | null; note?: string } = p.label ? { ...r.record, name: p.label } : r.record;   // on the open web the name is the company the user asked about, not whatever the page calls itself
    if (p.label && (rec.priceUsd === null || checkClaim(p.text, { field: 'priceUsd', value: String(rec.priceUsd), quote: rec.quote }).status === 'fail')) {
      const fb = fallbackPrice(p.text);
      if (fb && checkClaim(p.text, { field: 'priceUsd', value: String(fb.price), quote: fb.quote }).status === 'pass') {
        ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${p.label}: ${rec.priceUsd === null ? 'the reader found no price' : 'the reader’s price did not match the page'}; a plain rule found “${fb.quote.slice(0, 70)}” on the page → $${fb.price}` });
        rec = { name: rec.name, priceUsd: fb.price, quote: fb.quote.slice(0, 200) };
      }
    }
    if (rec.priceUsd !== null) {   // the maker checks the reader's claim against the text it read before anything is written; the independent verifier still re-checks later
      const own = checkClaim(p.text, { field: 'priceUsd', value: String(rec.priceUsd), quote: rec.quote });
      if (own.status === 'fail') {
        ctx.ledger('reader.rejected', { slug: p.slug, reason: own.note }, step.id);
        ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${rec.name}: the reader's price did not match the page text (${own.note.slice(0, 90)}). Kept as a gap, nothing guessed.` });
        return { url: p.url, slug: p.slug, record: { name: rec.name, priceUsd: null, quote: null }, rejected: own.note };
      }
    }
    for (const v of [rec.name, rec.quote, rec.note]) ctx.taint.addValue(v);
    ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: rec.priceUsd === null ? `Reader: ${rec.name} — no paid monthly price shown → gap (not guessed)` : `Reader: ${rec.name} — $${rec.priceUsd} · “${rec.quote}”` });
    return { url: p.url, slug: p.slug, record: rec };
  });
  for (const u of src.unread ?? []) {   // a company that could not be read is a MISSING row, never silently dropped and never invented
    items.push({ unread: true, url: u.url, slug: u.label, record: { name: u.label, priceUsd: null, quote: null, note: u.reason } });
    if (!ctx.gapSlugs.includes(u.label)) ctx.gapSlugs.push(u.label);
    ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `${u.label}: ${u.reason} Added to the sheet as MISSING, nothing guessed.` });
  }
  ctx.outputs.set(step.id, { items });
  const gaps = items.filter((i) => i.record.priceUsd === null).length;
  return {
    summary: `${items.length - gaps} prices extracted with quotes, ${gaps} gaps`,
    contracts: items.filter((i) => !i.unread).map((i) => ({
      kind: 'quote_in_page',
      url: i.url,
      items: [{ field: 'priceUsd', value: i.record.priceUsd === null ? null : String(i.record.priceUsd), quote: i.record.quote }],
    })),
    result: { records: items.map((i) => ({ slug: i.slug, name: i.record.name, priceUsd: i.record.priceUsd, rejected: i.rejected ?? null })) },
  };
}

async function writeSheet(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const src = ctx.outputs.get(String(step.args.fromStep)) as { items: ExtractedItem[] } | undefined;
  if (!src) throw new ToolError('There is nothing to write (the extraction step did not finish).', 'needs_you');
  const name = String(step.args.name ?? 'Competitors');
  if (!/^[\w][\w \-]{0,39}$/.test(name)) throw new ToolError(`“${name.slice(0, 40)}” is not an allowed document name (letters, digits, spaces, - and _ only).`, 'failed');
  const runDir = path.join(ctx.deps.cfg.workspaceDir, ctx.runId);
  const file = path.join(runDir, `${name}.xlsx`);
  if (path.relative(runDir, file).startsWith('..')) throw new ToolError('The document path escapes the Darby workspace.', 'failed');
  const rows: SheetRow[] = src.items.map((i) => ({ name: i.record.name, priceUsd: i.record.priceUsd, quote: i.record.quote, url: i.url, ...(i.unread && i.record.note ? { note: i.record.note } : {}) }));
  await ctx.checkpoint();
  const { matrix, range } = await writeLocalSheet(file, name, rows);
  const ref = ctx.relative(file);
  ctx.registerFile(step.id, 'file', file);
  ctx.outputs.set(step.id, { file, ref, name, matrix, range });
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Created the new document “${name}” and wrote ${rows.length} rows (${ref})` });
  return {
    summary: `${rows.length} rows written to ${ref}`,
    contracts: [{ kind: 'sheet_readback', sheetRef: ref, range, expected: matrix }],
    result: { sheetRef: ref, rows: rows.length, range },
  };
}

async function shareGrant(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const doc = ctx.outputs.get(String(step.args.fromStep)) as { file: string; ref: string; name: string } | undefined;
  if (!doc) throw new ToolError('There is no document to share (the write step did not finish).', 'needs_you');
  const email = ctx.deps.cfg.teamEmail; // the recipient is trusted configuration ("the team email"), never something read from a page
  const role = String(step.args.role ?? 'reader');
  await ctx.checkpoint();
  grantLocalShare(doc.file, email, role);
  ctx.registerFile(step.id, 'file', `${doc.file}.shares.json`);
  ctx.labels.add('SIMULATED:share.grant');
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `SIMULATED share: recorded ${email} as ${role} on “${doc.name}” in the local permission list (nothing was sent anywhere)` });
  return {
    summary: `SIMULATED: ${email} granted ${role} on ${doc.ref}`,
    contracts: [{ kind: 'permission_present', fileRef: doc.ref, email, role }],
    result: { adapter: 'local', simulated: true, email, role, document: doc.ref },
  };
}

async function emailSend(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const to = String(step.args.to ?? '');
  const url = `${ctx.deps.cfg.fixtureBase}/api/outbox`; // fixture outbox only
  await ctx.checkpoint();
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to, subject: String(step.args.subject ?? ''), body: String(step.args.body ?? '') }), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new ToolError(`The fixture outbox answered HTTP ${res.status}`, 'needs_you');
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Sent an email to ${to} (fixture outbox)` });
  return { summary: `email to ${to} placed in the fixture outbox`, contracts: [{ kind: 'http_json_contains', url, path: '$', expected: { to } }], result: { to } };
}

/** Look at the app's "saved leads" page and keep a screenshot for the independent vision check. The state fingerprint only keys the replay cache. */
async function leadsPageEvidence(ctx: RunContext, step: PlanStep, email: string): Promise<EvidenceContract> {
  const url = `${ctx.deps.cfg.fixtureBase}/app/leads`;
  await ctx.checkpoint();
  const page = await ctx.deps.browser.newPage();
  try {
    const read = await readPageText(page, url, ctx.signal);
    const shot = await ctx.screenshot(page, step.id, 'leads-page');
    writeFileSync(`${shot.abs}.state`, createHash('sha256').update(read.text).digest('hex'));
    await ctx.checkpoint();
    ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: 'Opened the saved-leads page and took a screenshot for an independent visual check', screenshotPath: shot.url });
    return { kind: 'vision_check', screenshotPath: shot.rel, question: `This is the "Saved leads" page of a small lead-management app. Is there a table row whose Email column shows exactly "${email}"? Answer yes only if you can read that exact email in a row of the table.` };
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function browserAct(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const { url, fields, submit } = step.args as { url: string; fields: Record<string, string>; submit: boolean };
  const email = fields.email ?? '';
  await ctx.checkpoint();
  await rereadIfResumed(ctx, step);
  const page = await ctx.deps.browser.newPage();
  let claimed = false;
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    if (!ctx.deps.cfg.allowedOrigins.includes(new URL(page.url()).origin)) throw new ToolError('The form redirected to an origin that is not on the allowlist.', 'failed');
    if (!res || res.status() >= 400) throw new ToolError(`The form page answered HTTP ${res?.status()}`, 'failed');
    ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: 'Opened the lead form in a real tab', screenshotPath: (await ctx.screenshot(page, step.id, 'form-empty')).url });
    for (const [k, v] of Object.entries(fields)) {
      if (!/^[\w-]{1,40}$/.test(k)) throw new ToolError(`“${k.slice(0, 20)}” is not a valid field name.`, 'failed');
      await ctx.checkpoint();
      const loc = page.locator(`input[name="${k}"], textarea[name="${k}"]`).first();
      if ((await loc.count()) === 0) throw new ToolError(`The form has no field called “${k}”.`, 'failed');
      await loc.fill(v, { timeout: 5000 });
    }
    ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `Filled ${Object.keys(fields).join(', ')}`, screenshotPath: (await ctx.screenshot(page, step.id, 'form-filled')).url });
    if (submit) {
      await ctx.checkpoint();
      await page.locator('button[type=submit], input[type=submit]').first().click({ timeout: 5000 });
      await page.waitForTimeout(700);
      claimed = /saved|success|thank/i.test(await page.evaluate(() => document.body.innerText));
      ctx.emit({
        type: 'step.action', runId: ctx.runId, stepId: step.id,
        description: claimed ? 'Clicked Save. The page now shows a success message — that is only the page’s claim, NOT proof. Checking what was really saved…' : 'Clicked Save. No success message appeared. Checking what was really saved…',
        screenshotPath: (await ctx.screenshot(page, step.id, 'form-submitted')).url,
      });
    }
  } finally {
    await page.close().catch(() => undefined);
  }
  const vision = await leadsPageEvidence(ctx, step, email);
  return {
    summary: `form submitted${claimed ? ' (page claims success)' : ''}; waiting for the independent read-back`,
    contracts: [{ kind: 'http_json_contains', url: ctx.deps.catalog.apis.leads, path: '$', expected: { email } }, vision],
    result: { uiClaimedSuccess: claimed, url },
  };
}

async function httpRequest(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  const { method, url, body } = step.args as { method: string; url: string; body?: Record<string, string> };
  if (method !== 'POST') throw new ToolError('Only POST is available for this tool in this build.', 'failed');
  if (!ctx.deps.cfg.allowedOrigins.includes(new URL(url).origin)) throw new ToolError('The API is not on the allowlist.', 'failed');
  await ctx.checkpoint();
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(8000) });
  ctx.emit({ type: 'step.action', runId: ctx.runId, stepId: step.id, description: `POST ${new URL(url).pathname} → HTTP ${res.status} (the response is a claim too; it is verified by a fresh read-back)` });
  if (res.status >= 400) throw new ToolError(`The API refused the request (HTTP ${res.status}).`, 'failed');
  const email = body?.email ?? '';
  const vision = await leadsPageEvidence(ctx, step, email);
  return {
    summary: `POST ${new URL(url).pathname} answered HTTP ${res.status}; waiting for the independent read-back`,
    contracts: [{ kind: 'http_json_contains', url: ctx.deps.catalog.apis.leads, path: '$', expected: { email } }, vision],
    result: { method, path: new URL(url).pathname, status: res.status },
  };
}

export async function runTool(ctx: RunContext, step: PlanStep): Promise<ToolResult> {
  switch (step.tool) {
    case 'browser.read_page': return readPages(ctx, step);
    case 'web.search': return webSearch(ctx, step);
    case 'code.test': return codeTest(ctx, step);
    case 'code.fix': return codeFix(ctx, step);
    case 'reader.extract': return extract(ctx, step);
    case 'sheet.write': return writeSheet(ctx, step);
    case 'share.grant': return shareGrant(ctx, step);
    case 'email.send': return emailSend(ctx, step);
    case 'browser.act': return browserAct(ctx, step);
    case 'http.request': return httpRequest(ctx, step);
    case 'gtm.copy': return gtmCopy(ctx, step);
    case 'gtm.hero_image': return gtmHero(ctx, step);
    case 'gtm.voiceover': return gtmVoice(ctx, step);
    case 'gtm.teaser': return gtmTeaser(ctx, step);
    case 'gtm.landing_page': return gtmLanding(ctx, step);
    case 'gtm.test_page': return gtmTestPage(ctx, step);
    case 'github.create_pr': return githubCreatePr(ctx, step);
    default: throw new ToolError(`The tool "${step.tool}" is registered but not available in this build yet.`, 'needs_you');
  }
}

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { afterAll, describe, expect, it } from 'vitest';
import { writeLocalSheet, type SheetRow } from '../adapters/sheets-local';
import { checkClaim, htmlToText, norm, parsePrices, verifyContract } from './verifier';

const page = `<html><body><h1>Acme AI</h1><p>Free plan: $0, up to 5 meetings</p><p class="price">Pro plan:  $29 per user /
 month</p></body></html>`;

describe('quote_in_page: pass / fail / gap', () => {
  const text = htmlToText(page);

  it('passes when the exact quote is on the page and the number equals the claim (whitespace-normalised)', () => {
    expect(checkClaim(text, { field: 'priceUsd', value: '29', quote: 'Pro plan: $29 per user / month' }).status).toBe('pass');
  });

  it('fails when the quote is not on the page', () => {
    expect(checkClaim(text, { field: 'priceUsd', value: '29', quote: 'Pro plan: $19 per user / month' }).status).toBe('fail');
  });

  it('fails when the number in the quote differs from the claimed price', () => {
    expect(checkClaim(text, { field: 'priceUsd', value: '49', quote: 'Pro plan: $29 per user / month' }).status).toBe('fail');
  });

  it('fails when a price is claimed without a quote', () => {
    expect(checkClaim(text, { field: 'priceUsd', value: '29', quote: null }).status).toBe('fail');
  });

  it('fails a free-plan decoy claimed as the paid price', () => {
    expect(checkClaim(text, { field: 'priceUsd', value: '29', quote: 'Free plan: $0, up to 5 meetings' }).status).toBe('fail');
  });

  it('a null price is a GAP, never a failure', () => {
    const r = checkClaim(htmlToText('<p>Pricing coming soon. Join the waitlist.</p>'), { field: 'priceUsd', value: null, quote: null });
    expect(r.status).toBe('gap');
  });

  it('a null price on a page that DOES show a paid price is still a gap, but flagged for review', () => {
    const r = checkClaim(text, { field: 'priceUsd', value: null, quote: null });
    expect(r.status).toBe('gap');
    expect(r.note).toMatch(/review/);
  });

  it('parses prices and normalises text', () => {
    expect(parsePrices('From $99 / month or USD 79')).toEqual([99, 79]);
    expect(norm('a\u00a0b \n  c')).toBe('a b c');
    expect(htmlToText('<script>var a="$5"</script><!-- $7 --><b>x</b> &amp; y')).not.toMatch(/\$5|\$7/);
  });
});

describe('verifyContract (independent fetch)', () => {
  const fetchOf = (html: string, status = 200): typeof fetch => (async () => new Response(html, { status })) as unknown as typeof fetch;
  const ctx = (fetchImpl: typeof fetch) => ({ root: process.cwd(), workspaceDir: process.cwd(), fetchImpl });
  const contract = (value: string | null, quote: string | null) => ({ kind: 'quote_in_page' as const, url: 'http://x.test/startups/acme-ai', items: [{ field: 'priceUsd', value, quote }] });

  it('passed=true, gap=false for a proven price', async () => {
    const r = await verifyContract(contract('29', 'Pro plan: $29 per user / month'), ctx(fetchOf(page)));
    expect(r).toMatchObject({ passed: true, gap: false, error: false });
  });
  it('passed=true, gap=true (slug listed) for a null price', async () => {
    const r = await verifyContract(contract(null, null), ctx(fetchOf('<p>Contact sales</p>')));
    expect(r).toMatchObject({ passed: true, gap: true, gaps: ['acme-ai'], error: false });
  });
  it('passed=false (a real FAILURE) for a wrong quote', async () => {
    const r = await verifyContract(contract('29', 'Pro plan: $39 per user / month'), ctx(fetchOf(page)));
    expect(r).toMatchObject({ passed: false, error: false });
  });
  it('error=true (-> NEEDS_YOU, never VERIFIED) when the independent fetch fails or times out', async () => {
    expect((await verifyContract(contract('29', 'Pro plan: $29 per user / month'), ctx(fetchOf('nope', 500)))).error).toBe(true);
    const boom = (async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    expect((await verifyContract(contract('29', 'x'), ctx(boom))).error).toBe(true);
  });
  it('unimplemented contract kinds are an error, never a pass', async () => {
    const r = await verifyContract({ kind: 'vision_check', screenshotPath: 'x.png', question: 'q?' }, ctx(fetchOf('')));
    expect(r.error).toBe(true);
    expect(r.passed).toBe(false);
  });
});

describe('sheet_readback', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'darby-sheet-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const rows: SheetRow[] = [
    { name: 'Acme AI', priceUsd: 29, quote: 'Pro plan: $29 per user / month', url: 'http://x.test/startups/acme-ai' },
    { name: 'Cobalt', priceUsd: null, quote: null, url: 'http://x.test/startups/cobalt' },
    { name: '=HYPERLINK("http://evil.test")', priceUsd: 5, quote: '+cmd|calc', url: 'http://x.test/startups/evil' },
  ];
  const vctx = { root: dir, workspaceDir: dir };

  it('passes when the re-opened file equals what was written, cell by cell (and guards formula injection)', async () => {
    const file = path.join(dir, 'a.xlsx');
    const { matrix, range } = await writeLocalSheet(file, 'Competitors', rows);
    expect(matrix[3]![0]!.startsWith("'=")).toBe(true);
    const r = await verifyContract({ kind: 'sheet_readback', sheetRef: 'a.xlsx', range, expected: matrix }, vctx);
    expect(r).toMatchObject({ passed: true, error: false });
    expect(r.detail).toMatch(/3\/3 data rows/);
  });

  it('fails when the file differs from the claim (one cell edited after writing)', async () => {
    const file = path.join(dir, 'b.xlsx');
    const { matrix, range } = await writeLocalSheet(file, 'Competitors', rows);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    wb.worksheets[0]!.getRow(2).getCell(2).value = 30;
    await wb.xlsx.writeFile(file);
    const r = await verifyContract({ kind: 'sheet_readback', sheetRef: 'b.xlsx', range, expected: matrix }, vctx);
    expect(r.passed).toBe(false);
    expect(r.detail).toMatch(/mismatch/);
  });

  it('fails when the document does not exist and refuses paths outside the workspace', async () => {
    expect((await verifyContract({ kind: 'sheet_readback', sheetRef: 'missing.xlsx', range: 'A1:A1', expected: [['x']] }, vctx)).passed).toBe(false);
    const r = await verifyContract({ kind: 'sheet_readback', sheetRef: '../../etc/passwd', range: 'A1:A1', expected: [['x']] }, vctx);
    expect(r.passed).toBe(false);
    expect(r.detail).toMatch(/outside/);
  });
});

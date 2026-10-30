import { describe, expect, it } from 'vitest';
import type { Page } from 'playwright';
import { searchDetailed } from './websearch';

/** A scripted stand-in for a Playwright page: each goto() consumes the next scripted answer (a blank page, an empty result list, or result links). */
function fakePage(script: { text: string; hrefs: string[] }[]): { page: Page; gotos: () => number; waits: number[] } {
  let i = -1;
  const waits: number[] = [];
  const cur = () => script[Math.min(Math.max(i, 0), script.length - 1)]!;
  const page = {
    goto: async () => { i++; },
    waitForSelector: async () => undefined,
    $$eval: async () => cur().hrefs,
    evaluate: async () => cur().text.trim().length,
    waitForTimeout: async (ms: number) => { waits.push(ms); },
  } as unknown as Page;
  return { page, gotos: () => i + 1, waits };
}

const RESULTS = ['https://www.notion.com/pricing', 'https://www.example-reviews.com/notion'];

describe('searchDetailed: a blank page is not the same as "no result"', () => {
  it('returns hits straight away when the engine shows results (no retry)', async () => {
    const f = fakePage([{ text: 'Notion pricing results', hrefs: RESULTS }]);
    const r = await searchDetailed(f.page, 'Notion pricing', 1, null);
    expect(r.blank).toBe(false);
    expect(r.hits.map((h) => new URL(h.url).hostname)).toEqual(['www.notion.com']);
    expect(f.gotos()).toBe(1);
  });

  it('a page with the query but an empty result list is a real "no result": final, no retry, not blank', async () => {
    const f = fakePage([{ text: 'Zorblax Quantum Cloud pricing ALL IMAGES VIDEOS', hrefs: [] }]);
    const r = await searchDetailed(f.page, 'Zorblax Quantum Cloud pricing', 1, null);
    expect(r).toEqual({ hits: [], blank: false });
    expect(f.gotos()).toBe(1);
  });

  it('a completely empty page is retried with growing pauses, and reported as blank after 3 tries', async () => {
    const f = fakePage([{ text: '', hrefs: [] }]);
    const r = await searchDetailed(f.page, 'Canva pricing', 1, null);
    expect(r).toEqual({ hits: [], blank: true });
    expect(f.gotos()).toBe(3);
    expect(f.waits).toEqual([2_500, 5_000]);
  });

  it('recovers when a retry draws the results (the first empty page is not final)', async () => {
    const f = fakePage([{ text: '', hrefs: [] }, { text: 'Canva pricing results', hrefs: ['https://www.canva.com/pricing/'] }]);
    const r = await searchDetailed(f.page, 'Canva pricing', 1, null);
    expect(r.blank).toBe(false);
    expect(r.hits.map((h) => new URL(h.url).hostname)).toEqual(['www.canva.com']);
    expect(f.gotos()).toBe(2);
  });
});

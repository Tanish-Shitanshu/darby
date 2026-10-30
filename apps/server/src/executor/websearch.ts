import type { Page } from 'playwright';

/**
 * Open-web research support. Search hits are UNTRUSTED page data: they may only ever be READ (no forms, no writes) and can never
 * become a recipient, repository or command. The only gate on where a read may go is this "public web" check, done in code.
 */

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/** A URL a read may follow after a web search: http(s), a real public host name, no credentials, no private/loopback/link-local address. */
export function isPublicWebUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return false;
  if (u.port && !['80', '443'].includes(u.port)) return false;
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!h.includes('.') || /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan|.*\.home|.*\.test|.*\.invalid|.*\.example)$/.test(h)) return false;
  if (h.startsWith('[') || h.includes(':')) return false;                        // IPv6 literals are never needed
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) && PRIVATE_V4.some((r) => r.test(h))) return false;
  if (/^\d+$/.test(h.replace(/\./g, ''))) return false;                          // numeric host tricks (decimal / octal / hex forms)
  return true;
}

/** Bing wraps results in a click-tracking redirect; the real target is base64url in the `u` parameter after a 2-letter prefix. */
export function decodeBingUrl(href: string): string | null {
  try {
    const u = new URL(href);
    if (!/(^|\.)bing\.com$/.test(u.hostname)) return href;
    const enc = u.searchParams.get('u');
    if (!enc || enc.length < 4) return null;
    const b64 = enc.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    const out = Buffer.from(b64, 'base64').toString('utf8');
    return /^https?:\/\//.test(out) ? out : null;
  } catch {
    return null;
  }
}

const SEARCH_ENGINE_HOSTS = /(^|\.)(bing\.com|microsoft\.com|duckduckgo\.com|google\.[a-z.]+|yahoo\.com|baidu\.com)$/;

export interface Hit { url: string; query: string; label: string }

/** "Anthropic Claude pricing" -> "Anthropic Claude": the company the query was about, used as the row name so a row exists for every company asked for. */
export const labelOf = (query: string): string => query.replace(/\b(pricing|prices?|plans?|cost|costs|subscription|per month|official site)\b/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || query;

export interface SearchOutcome {
  hits: Hit[];
  /** The search page itself came back empty (blocked, throttled or never loaded). That company was NOT searched, which is not the same as "no result". */
  blank: boolean;
}

/** A page with (almost) no text at all: the engine never drew anything. A page that shows the query and an empty result list is NOT blank. */
const isBlankPage = async (page: Page): Promise<boolean> => ((await page.evaluate(() => (document.body?.innerText ?? '').trim().length).catch(() => 0)) as number) < 20;

/** Same as searchDetailed, hits only (kept for callers that do not care why nothing was found). */
export async function searchOnce(page: Page, query: string, perQuery: number, searchUrl?: string | null): Promise<Hit[]> {
  return (await searchDetailed(page, query, perQuery, searchUrl)).hits;
}

/** Run one query in the given tab and return up to `perQuery` hits from distinct sites. `searchUrl` (a test fixture) replaces the live engine. */
export async function searchDetailed(page: Page, query: string, perQuery: number, searchUrl?: string | null): Promise<SearchOutcome> {
  const url = searchUrl ? `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}` : `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-US`;
  const sel = searchUrl ? 'a.result__a' : 'li.b_algo h2 a';
  let hrefs: string[] = [];
  let blank = false;
  // Bing sometimes redirects mid-load ("Execution context was destroyed") and sometimes answers an automated tab with an empty white page:
  // wait for the result list and try again (a longer pause each time) before giving up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.waitForSelector(sel, { timeout: 8_000 }).catch(() => undefined);
      hrefs = await page.$$eval(sel, (as) => as.slice(0, 12).map((a) => (a as HTMLAnchorElement).href));
      blank = false;
      if (hrefs.length) break;
      blank = await isBlankPage(page);
      if (!blank || attempt === 3) break;      // a real "no result" page is final; only an empty page is worth another try
      await page.waitForTimeout(2_500 * attempt);
    } catch (e) {
      if (attempt === 3) throw e;
      await page.waitForTimeout(800);
    }
  }
  const seen = new Set<string>();
  const hits: Hit[] = [];
  // a price comparison wants the pricing page itself: results whose path names pricing or plans come first (order is otherwise the engine's)
  const decoded = hrefs.map((h) => (searchUrl ? h : decodeBingUrl(h))).filter((h): h is string => !!h);
  const wantsPricing = /pric|plans?\b|cost|subscription/i.test(query);   // re-rank toward pricing pages only when the question is about prices
  // Live web: the company's own site first (its pricing page best of all), then everything else in the engine's order.
  // Without this, any page that merely has "pricing" in its URL (a pizza menu, a forum thread) can outrank the real company.
  const tokens = labelOf(query).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !['pricing', 'price', 'plans', 'plan'].includes(t));
  const score = (u: string) => {
    try {
      const url = new URL(u);
      if (searchUrl) return wantsPricing && /pric|plans?\b|subscribe|billing/i.test(url.pathname) ? 0 : 1;   // fixture search keeps the simple rule
      const official = tokens.length > 0 && tokens.some((t) => url.hostname.toLowerCase().replace(/[^a-z0-9.]/g, '').includes(t));
      const pricingPath = wantsPricing && /pric|plans?\b|subscribe|billing/i.test(url.pathname);
      return official ? (pricingPath ? 0 : 1) : 2;
    } catch { return 2; }
  };
  const ordered = decoded.map((u, i) => ({ u, i })).sort((a, b) => score(a.u) - score(b.u) || a.i - b.i).map((x) => x.u);
  for (const target of ordered) {
    let origin: string;
    try { origin = new URL(target).origin; } catch { continue; }
    const host = new URL(target).hostname;
    const allowedFixture = searchUrl && target.startsWith(new URL(searchUrl).origin);
    if (!allowedFixture && (!isPublicWebUrl(target) || SEARCH_ENGINE_HOSTS.test(host))) continue;
    if (seen.has(origin)) continue;
    seen.add(origin);
    hits.push({ url: target, query, label: labelOf(query) });
    if (hits.length >= perQuery) break;
  }
  return { hits, blank: blank && hits.length === 0 };
}

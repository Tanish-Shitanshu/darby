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

export interface Hit { url: string; query: string }

/** Run one query in the given tab and return up to `perQuery` hits from distinct sites. `searchUrl` (a test fixture) replaces the live engine. */
export async function searchOnce(page: Page, query: string, perQuery: number, searchUrl?: string | null): Promise<Hit[]> {
  const url = searchUrl ? `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}` : `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-US`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForLoadState('load', { timeout: 6_000 }).catch(() => undefined);
  const hrefs = await page.$$eval(searchUrl ? 'a.result__a' : 'li.b_algo h2 a', (as) => as.slice(0, 12).map((a) => (a as HTMLAnchorElement).href));
  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const h of hrefs) {
    const target = searchUrl ? h : decodeBingUrl(h);
    if (!target) continue;
    let origin: string;
    try { origin = new URL(target).origin; } catch { continue; }
    const host = new URL(target).hostname;
    const allowedFixture = searchUrl && target.startsWith(new URL(searchUrl).origin);
    if (!allowedFixture && (!isPublicWebUrl(target) || SEARCH_ENGINE_HOSTS.test(host))) continue;
    if (seen.has(origin)) continue;
    seen.add(origin);
    hits.push({ url: target, query });
    if (hits.length >= perQuery) break;
  }
  return hits;
}

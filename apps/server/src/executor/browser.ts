import { chromium, type BrowserContext, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import type { Config } from '../config';

export interface PageRead {
  url: string;
  httpStatus: number | null;
  finalUrl: string;
  title: string;
  /** All text nodes including hidden ones (worst case). UNTRUSTED: goes to the quarantined reader only. */
  text: string;
}

/** One real Chromium (visible unless DARBY_HEADLESS=1) with a persistent profile in .darby/profile. */
export class BrowserHost {
  private ctx: BrowserContext | null = null;
  private launching: Promise<BrowserContext> | null = null;
  constructor(private cfg: Config) {}

  async context(): Promise<BrowserContext> {
    if (this.ctx) return this.ctx;
    if (!this.launching) this.launching = this.launch();
    this.ctx = await this.launching;
    this.ctx.on('close', () => { this.ctx = null; this.launching = null; });
    return this.ctx;
  }

  private async launch(): Promise<BrowserContext> {
    mkdirSync(this.cfg.profileDir, { recursive: true });
    const base = {
      headless: this.cfg.headless,
      viewport: { width: 1280, height: 800 },
      args: ['--window-size=1320,900', '--window-position=60,40', '--no-first-run', '--no-default-browser-check'],
    };
    if (this.cfg.browserChannel === 'chrome') {
      try {
        return await chromium.launchPersistentContext(this.cfg.profileDir, { ...base, channel: 'chrome' });
      } catch (e) {
        console.warn('[browser] installed Chrome could not be launched, falling back to Playwright Chromium:', (e as Error).message.split('\n')[0]);
      }
    }
    return chromium.launchPersistentContext(this.cfg.profileDir, base);
  }

  async newPage(): Promise<Page> {
    return (await this.context()).newPage();
  }

  async close(): Promise<void> {
    const c = this.ctx;
    this.ctx = null;
    this.launching = null;
    await c?.close().catch(() => undefined);
  }
}

/** Navigate and return every text node (script/style excluded), one per line. Hidden elements are included on purpose. */
export async function readPageText(page: Page, url: string, signal?: AbortSignal): Promise<PageRead> {
  signal?.throwIfAborted();
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForLoadState('load', { timeout: 8_000 }).catch(() => undefined);
  signal?.throwIfAborted();
  const text = await page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body ?? document.documentElement, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement;
      if (p && /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
      const t = (n.nodeValue ?? '').replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    }
    return out.join('\n');
  });
  return { url, httpStatus: res?.status() ?? null, finalUrl: page.url(), title: await page.title(), text };
}

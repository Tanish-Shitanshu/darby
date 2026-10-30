// Records the finished run's signed receipt and the real tamper test, for the pitch video.
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.UI_BASE ?? 'http://localhost:5173';
const out = path.resolve('video/work/rec3'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1920,1130'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: out, size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage();
const marks = []; const t0 = Date.now(); const mark = (n) => { marks.push([n, +((Date.now() - t0) / 1000).toFixed(1)]); };
try {
  await page.goto(BASE); await page.getByTestId('goal-box').waitFor();
  await page.getByText('History', { exact: true }).first().click(); await page.waitForTimeout(1000);
  await page.locator('text=/pricing research on the top five|top 5 AI startups|top five AI startups/i').first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('tab', { name: /Result/ }).click().catch(() => {});
  await page.waitForTimeout(1200);
  const tamper = page.getByRole('button', { name: /Tamper test/i }).first();
  await tamper.scrollIntoViewIfNeeded(); await page.mouse.wheel(0, 380); mark('receipt-visible'); await page.waitForTimeout(4200);
  await tamper.hover(); await page.waitForTimeout(900); mark('tamper-click'); await tamper.click();
  await page.waitForTimeout(1200); await page.keyboard.press('Escape');
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(250); }
  await page.waitForTimeout(5000); mark('tamper-result');
} catch (e) { console.error('ERROR', String(e.message ?? e).split('\n')[0]); }
finally {
  await ctx.close(); await browser.close();
  const webm = readdirSync(out).find((f) => f.endsWith('.webm'));
  if (webm) renameSync(path.join(out, webm), path.join(out, 'receipt.webm'));
  console.log(JSON.stringify(marks));
}

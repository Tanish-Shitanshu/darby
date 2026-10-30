// Records the finished run's result page and slowly scrolls to the Excel table (FOUND and NOT FOUND rows) for the pitch video.
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.UI_BASE ?? 'http://localhost:5173';
const out = path.resolve('video/work/rec2'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-size=1920,1130'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: out, size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage();
try {
  await page.goto(BASE); await page.getByTestId('goal-box').waitFor();
  await page.getByRole('tab', { name: 'History' }).or(page.getByText('History', { exact: true }).first()).first().click();
  await page.waitForTimeout(1200);
  await page.locator('text=/pricing research on the top five|top 5 AI startups|top five AI startups/i').first().click();
  await page.waitForTimeout(1500);
  await page.getByRole('tab', { name: /Result/ }).click().catch(() => {});
  await page.waitForTimeout(2500);
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(260); }   // slow scroll down to the sheet table
  await page.waitForTimeout(4500);
} catch (e) { console.error('ERROR', String(e.message ?? e).split('\n')[0]); }
finally {
  await ctx.close(); await browser.close();
  const webm = readdirSync(out).find((f) => f.endsWith('.webm'));
  if (webm) renameSync(path.join(out, webm), path.join(out, 'sheet.webm'));
  console.log('saved');
}

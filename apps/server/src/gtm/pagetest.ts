import type { Page } from 'playwright';

export interface PageAssertion { selector?: string; text?: string; clickThenExpectText?: string }
export interface PageTestResult { ok: boolean; detail: string; failures: string[] }

/** Load a page in a real browser tab and check what the brief promised: elements, text, a click that reveals text, and no console errors. */
export async function runPageAssertions(page: Page, url: string, assertions: PageAssertion[]): Promise<PageTestResult> {
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message.slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 120)); });
  await page.setViewportSize({ width: 1280, height: 800 });
  const res = await page.goto(url, { waitUntil: 'load', timeout: 20_000 }).catch((e) => { failures.push(`the page did not load: ${(e as Error).message.split('\n')[0]}`); return null; });
  if (res && res.status() >= 400) failures.push(`the page answered HTTP ${res.status()}`);
  if (!failures.length) {
    for (const a of assertions) {
      try {
        if (a.clickThenExpectText) {
          if (!a.selector) { failures.push('click assertion without a selector'); continue; }
          await page.locator(a.selector).first().click({ timeout: 4000 });
          await page.getByText(a.clickThenExpectText, { exact: false }).first().waitFor({ state: 'visible', timeout: 4000 });
        } else {
          if (a.selector && a.text) {
            const loc = page.locator(a.selector).filter({ hasText: a.text }).first();
            await loc.waitFor({ state: 'visible', timeout: 4000 });
          } else if (a.selector) {
            await page.locator(a.selector).first().waitFor({ state: 'visible', timeout: 4000 });
          } else if (a.text) {
            await page.getByText(a.text, { exact: false }).first().waitFor({ state: 'visible', timeout: 4000 });
          }
        }
      } catch {
        failures.push(a.clickThenExpectText ? `clicking ${a.selector} did not reveal “${a.clickThenExpectText.slice(0, 40)}”` : `not visible: ${a.selector ?? ''}${a.selector && a.text ? ' with text ' : ''}${a.text ? `“${a.text.slice(0, 40)}”` : ''}`);
      }
    }
    // images must really have loaded
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).length).catch(() => 0);
    if (broken) failures.push(`${broken} image(s) did not load`);
    if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.slice(0, 2).join(' | ')}`);
  }
  return { ok: failures.length === 0, failures, detail: failures.length ? failures.join('; ') : `${assertions.length} assertions passed, images loaded, no console errors` };
}

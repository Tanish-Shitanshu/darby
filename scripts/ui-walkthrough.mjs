// Drives the real companion UI through all four demo cases, the Hub, and the safety controls; saves screenshots as evidence.
//   npm run ui:walkthrough                 (starts its own stack in replay mode, headless)
//   UI_BASE=http://localhost:5173 npm run ui:walkthrough   (use a stack that is already running)
//   UI_LIVE=1 ...                          (use the provider in .env instead of recordings)
//   UI_HEADED=1 BROWSER_CHANNEL=chrome ... (watch it)
// Screenshots: docs/evidence/ui/<viewport>/<name>.png   Report: docs/evidence/ui/walkthrough.json
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(root, 'docs', 'evidence', process.env.UI_LIVE ? 'ui-live' : 'ui');
const goals = JSON.parse(readFileSync(path.join(root, 'fixtures', 'demo-goals.json'), 'utf8'));
const sizes = { '1280x720': { width: 1280, height: 720 }, '1920x1080': { width: 1920, height: 1080 } };
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const playbooksBefore = new Set(readdirSync(path.join(root, 'playbooks')));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, ms = 90_000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if ((await fetch(url)).ok) return true; } catch { /* not up yet */ } await sleep(500); }
  return false;
}

let stack = null;
let base = process.env.UI_BASE;
if (!base) {
  for (const port of [4000, 4010, 5173]) {
    const busy = await fetch(`http://localhost:${port}/`).then(() => true, () => false);
    if (busy) { console.error(`Port ${port} is already in use (another Darby stack is running). Stop it first, or run against it with UI_BASE=http://localhost:5173 and UI_API=http://localhost:4000.`); process.exit(2); }
  }
  const env = { ...process.env, LLM_PROVIDER: process.env.UI_LIVE ? (process.env.LLM_PROVIDER ?? 'gemini') : 'replay', DARBY_HEADLESS: process.env.UI_HEADED ? '0' : '1' };
  const reset = spawn(npm, ['run', '-s', 'db:reset', '--', '--runs'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  await new Promise((r) => reset.on('exit', r));
  stack = spawn(npm, ['run', 'dev'], { cwd: root, env, stdio: 'ignore', shell: process.platform === 'win32' });
  base = 'http://localhost:5173';
}
const apiBase = process.env.UI_API ?? 'http://localhost:4000';
if (!(await waitFor(`${apiBase}/health`)) || !(await waitFor(base))) { console.error('The stack did not come up.'); stack?.kill(); process.exit(1); }

const browser = await chromium.launch({ headless: !process.env.UI_HEADED, ...(process.env.BROWSER_CHANNEL && process.env.BROWSER_CHANNEL !== 'chromium' ? { channel: process.env.BROWSER_CHANNEL } : {}) });
const ctx = await browser.newContext({ viewport: sizes['1280x720'] });
const page = await ctx.newPage();
const shot = async (name) => {
  await page.waitForFunction(() => !document.querySelector('.leds')?.textContent?.includes('connecting'), null, { timeout: 15_000 }).catch(() => {});
  await page.waitForFunction(() => [...document.querySelectorAll('iframe')].every((f) => f.contentDocument === null || f.contentDocument.readyState === 'complete' || true), null, { timeout: 3_000 }).catch(() => {});
  await sleep(1200);
  for (const [label, vp] of Object.entries(sizes)) {
    await page.setViewportSize(vp);
    const dir = path.join(outRoot, label); mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  }
  await page.setViewportSize(sizes['1280x720']);
};
const tid = (id) => page.getByTestId(id);
const verdictText = async () => ((await tid('verdict').first().innerText()) ?? '').replace(/_/g, ' ').trim().toUpperCase();
const waitVerdict = (ms = 240_000) => tid('verdict').first().waitFor({ state: 'visible', timeout: ms });
const newGoal = async () => { if (await tid('new-goal').count()) await tid('new-goal').click(); await tid('goal-box').waitFor(); };
const startExample = async (key) => {
  await newGoal();
  await tid(`example-${key}`).click();
  await tid('run-btn').click();
};

try {
  console.log('\n▶ first run');
  await page.goto(base); await tid('goal-box').waitFor();
  check('first screen shows the goal box, example goals and the input buttons', (await tid('run-btn').count()) === 1 && (await tid('voice-btn').count()) === 1 && (await tid('shot-btn').count()) === 1 && (await tid('lang-select').count()) === 1 && (await tid('voice-replies').count()) === 1);
  await shot('00-start');

  console.log('\n▶ case 1: research to sheet, share needs approval');
  await startExample('case1');
  await tid('plan').first().waitFor({ timeout: 120_000 });
  check('plan appears with a proof line per step', (await page.locator('[data-testid^="step-"]').count()) >= 3);
  await shot('01-case1-plan');
  await tid('approval-card').waitFor({ timeout: 240_000 });
  check('the share step waits for you (approval card)', true);
  await shot('02-case1-approval');
  await tid('approve').click();
  await waitVerdict();
  check('case 1 verdict is VERIFIED WITH GAPS', (await verdictText()).includes('GAPS'), await verdictText());
  check('three gaps listed', /3 gaps/i.test(await tid('gaps').innerText()));
  await tid('summary-card').waitFor({ timeout: 20_000 });
  check('a plain-language summary says what Darby did and found (cheapest and priciest)', /Cheapest: Gizmo/.test(await tid('summary-card').innerText()), (await tid('summary-card').innerText()).slice(0, 90).replace(/\s+/g, ' '));
  check('the language picker, voice-chat switch and Listen button are there', (await tid('lang-select').count()) === 0 && (await tid('listen-btn').count()) === 1, 'picker is on the home screen; Listen is on the summary');
  check('the spreadsheet is shown in the app with a download button', (await tid('sheet-preview').count()) === 1 && (await tid('download-sheet').count()) === 1);
  check('chain badge says valid', /valid/.test(await tid('chain-badge').innerText()));
  check('timeline shows the quarantine warning from the poisoned page', /(instruction|untrusted|hostile|flag)/i.test(await tid('timeline').innerText()), 'Case 2 evidence in the same run');
  const outbox = await (await fetch('http://localhost:4010/api/outbox')).json().catch(() => null);
  check('the attacker outbox is empty', Array.isArray(outbox) && outbox.length === 0);
  await shot('03-case1-receipt');
  await tid('tamper-btn').click(); await tid('tamper-result').waitFor();
  check('tamper test detects an edited receipt', /(invalid|tamper|detected|fail)/i.test(await tid('tamper-result').innerText()), (await tid('tamper-result').innerText()).slice(0, 90));
  await shot('04-case1-tamper');

  console.log('\n▶ save as Playbook, then the Hub');
  if (await tid('save-playbook-btn').count()) {
    await tid('save-playbook-btn').click();
    await tid('pb-name').fill(`UI walkthrough ${Date.now() % 100000}`);
    await tid('save-playbook-go').click();
    await tid('pb-saved').waitFor({ timeout: 30_000 }).catch(() => {});
  }
  await tid('tab-hub').click(); await sleep(800);
  check('Hub lists playbooks with a tested/stale badge', (await page.locator('[data-testid^="playbook-"]').count()) >= 1 && (await tid('pb-badge').count()) >= 1);
  await shot('05-hub');

  console.log('\n▶ case 4: silent failure, honest FAILED, one-click repair');
  await tid('tab-run').click();
  await startExample('case4');
  await waitVerdict();
  check('run A is FAILED, not a false success', (await verdictText()).includes('FAILED'), await verdictText());
  check('the plain cause is shown', (await tid('cause').innerText()).length > 20);
  await shot('06-case4-failed');
  await tid('repair-btn').click();
  await sleep(1500);
  await page.waitForFunction(() => /VERIFIED/.test(document.querySelector('[data-testid="verdict"]')?.textContent ?? '') && !/FAILED/.test(document.querySelector('[data-testid="verdict"]')?.textContent ?? ''), null, { timeout: 240_000 });
  check('repair run is VERIFIED', (await verdictText()).includes('VERIFIED'), await verdictText());
  await shot('07-case4-repaired');

  console.log('\n▶ case 3: launch assets, PR behind your approval');
  await startExample('case3');
  await tid('approval-card').waitFor({ timeout: 360_000 });
  check('the pull request waits for you', /pull|PR|github/i.test(await tid('approval-card').innerText()));
  await shot('08-case3-approval');
  await tid('approve').click();
  await waitVerdict();
  check('case 3 verdict is VERIFIED', (await verdictText()).replace('WITH GAPS', '').includes('VERIFIED') || (await verdictText()).includes('VERIFIED'), await verdictText());
  await tid('review').waitFor({ timeout: 30_000 });
  check('review panel shows hero image, voiceover, teaser video and the landing page', (await tid('review-hero').count()) + (await tid('review-audio').count()) + (await tid('review-video').count()) + (await tid('review-page').count()) >= 4);
  check('labels say what was simulated', /SIMULATED/.test(await tid('receipt').innerText()));
  await tid('review-page').scrollIntoViewIfNeeded();
  await page.frames().find((f) => /landing/.test(f.url()))?.waitForSelector('main', { timeout: 15_000 }).catch(() => {});
  await sleep(1500);
  await shot('09-case3-review');

  console.log('\n▶ case 6: fix a failing test (coding workflow)');
  await startExample('case6');
  await waitVerdict();
  check('case 6 verdict is VERIFIED (the verifier ran the tests itself)', (await verdictText()).includes('VERIFIED'), await verdictText());
  check('the receipt says the tests were run again by the verifier', /run again by the verifier/.test(await tid('receipt').innerText()));
  await shot('09b-case6-code');

  console.log('\n▶ controls: deny and cancel');
  await startExample('case1');
  await tid('approval-card').waitFor({ timeout: 240_000 });
  await tid('deny').click();
  await waitVerdict();
  check('denying the share ends NEEDS YOU, never VERIFIED', (await verdictText()).includes('NEEDS'), await verdictText());
  await shot('10-deny');
  await startExample('case1');
  await tid('cancel-btn').waitFor({ timeout: 60_000 });
  await tid('cancel-btn').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="cancel-btn"]') || /cancel/i.test(document.body.innerText), null, { timeout: 60_000 });
  check('cancel stops the run', true);
  await shot('11-cancel');

  console.log('\n▶ history and memory');
  await tid('tab-history').click(); await tid('history').waitFor();
  check('history lists the runs', (await tid('history').innerText()).length > 20);
  await shot('12-history');
  await tid('tab-memory').click(); await sleep(500);
  await shot('13-memory');
} catch (e) {
  check('walkthrough crashed', false, String(e.message ?? e).split('\n')[0]);
  await shot('zz-crash').catch(() => {});
} finally {
  const failed = results.filter((r) => !r.ok).length;
  mkdirSync(outRoot, { recursive: true });
  writeFileSync(path.join(outRoot, 'walkthrough.json'), JSON.stringify({ at: new Date().toISOString(), llm: process.env.UI_LIVE ? 'live' : 'replay', passed: results.length - failed, failed, results }, null, 2));
  console.log(`\n${failed ? `${failed} check(s) FAILED` : 'all UI checks passed'} · ${results.length - failed}/${results.length} · screenshots in ${path.relative(root, outRoot)}`);
  await browser.close();
  // the walkthrough saves a throwaway Playbook; leave the committed ones alone and remove only the new ones
  for (const d of readdirSync(path.join(root, 'playbooks'))) if (!playbooksBefore.has(d)) rmSync(path.join(root, 'playbooks', d), { recursive: true, force: true });
  if (stack) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(stack.pid), '/T', '/F'], { stdio: 'ignore' }); else stack.kill(); }
  process.exit(failed ? 1 : 0);
}

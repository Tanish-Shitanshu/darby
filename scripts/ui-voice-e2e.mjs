// LIVE end-to-end proof of the Sarvam voice chat, through the real UI:
//   a Hindi voice message is "spoken" into a fake microphone -> Darby transcribes it (Sarvam), translates it, researches the web,
//   writes the Excel sheet, then shows and SPEAKS a summary of what it found in Hindi, and the Stop button silences it.
// Needs SARVAM_API_KEY and a live model in .env, and a running stack:  LLM_PROVIDER=gemini npm run dev   then   node scripts/ui-voice-e2e.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.UI_BASE ?? 'http://localhost:5173';
const out = path.resolve('docs/evidence/ui-voice'); mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`); };

// 1) make a Hindi "voice message" with Sarvam Bulbul and save it as the fake microphone input
const say = 'शीर्ष तीन एआई स्टार्टअप खोजो और उनकी कीमतें एक एक्सेल शीट में लिखो।';
const sp = await fetch(`${BASE}/api/voice/speak`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: say, lang: 'hi-IN' }) });
if (!sp.ok) { console.error('Sarvam speech is not available:', (await sp.text()).slice(0, 200)); process.exit(2); }
const wav = path.join(tmpdir(), 'darby-hindi-message.wav');
writeFileSync(wav, Buffer.from((await sp.json()).audios[0], 'base64'));

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: !process.env.UI_HEADED, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] });
const page = await ctx.newPage();
const tid = (id) => page.getByTestId(id);
try {
  await page.goto(BASE); await tid('goal-box').waitFor();
  await page.waitForFunction(() => document.querySelector('[data-testid="voice-replies"]')?.getAttribute('aria-pressed') === 'true');
  check('voice chat is on by default', true);
  await tid('voice-btn').click();
  await page.waitForTimeout(7500);              // the Hindi message plays into the fake microphone
  await tid('voice-btn').click();               // stop recording
  await page.getByTestId('input-note').filter({ hasText: /Heard/ }).waitFor({ timeout: 90_000 });
  const heard = await tid('input-note').innerText();
  check('Sarvam heard Hindi and understood the request', /Hindi/.test(heard) && /(top|startup)/i.test(heard), heard.slice(0, 160));
  await tid('runbar').waitFor({ timeout: 60_000 });
  check('the spoken request started a run by itself (voice chat)', true);
  await tid('summary-card').waitFor({ timeout: 540_000 });
  const card = await tid('summary-card').innerText();
  check('the summary is in Hindi (Devanagari)', /[ऀ-ॿ]{10,}/.test(card), card.replace(/\s+/g, ' ').slice(0, 120));
  check('the summary reports key findings from the sheet', /\$|डॉलर/.test(card) && /(14|20|2000|2,000|सबसे)/.test(card));
  check('the spreadsheet was produced and is shown', (await tid('download-sheet').count()) === 1);
  await page.waitForTimeout(500);
  const speaking = await tid('stop-speaking').count();
  check('Darby speaks the summary and a Stop button is on screen', speaking === 1 || (await tid('stop-speaking-global').count()) >= 1, `stop buttons: ${speaking}`);
  await page.screenshot({ path: path.join(out, 'hindi-summary.png'), fullPage: true });
  if (speaking) { await tid('stop-speaking').click(); await page.waitForTimeout(600); check('Stop speaking silences it', (await tid('stop-speaking').count()) === 0 && (await tid('listen-btn').count()) === 1); }
} catch (e) { check('voice e2e crashed', false, String(e.message ?? e).split('\n')[0]); await page.screenshot({ path: path.join(out, 'crash.png'), fullPage: true }).catch(() => {}); }
finally {
  const failed = results.filter((r) => !r.ok).length;
  writeFileSync(path.join(out, 'voice-e2e.json'), JSON.stringify({ at: new Date().toISOString(), passed: results.length - failed, failed, results }, null, 2));
  console.log(`\n${failed ? `${failed} FAILED` : 'voice chat e2e passed'} · ${results.length - failed}/${results.length}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
}

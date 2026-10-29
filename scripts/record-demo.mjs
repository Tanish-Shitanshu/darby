// Records the REAL app doing the Hindi voice job, for the pitch video.
//   - the "microphone" plays video/work/hindi-line.wav (the team's own recorded Hindi sentence)
//   - the page is recorded at 1920x1080; event times go to video/work/rec/events.json
//   - the Hindi spoken summary is fetched from Sarvam and saved as video/work/rec/summary-hi.wav (the browser video has no sound)
// Needs the stack running (npm run dev) with a live model.
import { mkdirSync, writeFileSync, readdirSync, renameSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.UI_BASE ?? 'http://localhost:5173';
const out = path.resolve('video/work/rec'); mkdirSync(out, { recursive: true });
const wav = path.resolve('video/work/hindi-line.wav');
const events = []; let t0 = 0;
const mark = (name, extra = {}) => { const t = (Date.now() - t0) / 1000; events.push({ t: +t.toFixed(2), name, ...extra }); console.log(`${t.toFixed(1)}s  ${name}`); };

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required', '--window-size=1920,1130'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, permissions: ['microphone'], recordVideo: { dir: out, size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage(); t0 = Date.now();
const tid = (id) => page.getByTestId(id);
let runId = null;
try {
  await page.goto(BASE); await tid('goal-box').waitFor(); mark('landing');
  await page.waitForTimeout(4500);
  await page.mouse.move(960, 520); await page.waitForTimeout(800);
  mark('mic-start'); await tid('voice-btn').click();
  await page.waitForTimeout(6800); mark('mic-stop'); await tid('voice-btn').click();
  await page.getByTestId('input-note').filter({ hasText: /Heard/ }).waitFor({ timeout: 90_000 }); mark('heard', { text: (await tid('input-note').innerText()).slice(0, 200) });
  await tid('runbar').waitFor({ timeout: 60_000 }); mark('run-started');
  await page.getByText(/Plan ready/).first().waitFor({ timeout: 120_000 }).catch(() => {}); mark('plan-ready');
  await tid('summary-card').waitFor({ timeout: 560_000 }); mark('summary-card');
  await page.waitForTimeout(2500);
  const id = await page.evaluate(async () => (await (await fetch('/api/runs')).json())[0]?.id ?? null).catch(() => null); runId = id;
  const sum = id ? await (await fetch(`${BASE}/api/runs/${id}/summary?lang=hi-IN`)).json().catch(() => null) : null;
  const text = sum?.text ?? sum?.summary ?? (await tid('summary-card').innerText());
  writeFileSync(path.join(out, 'summary-hi.txt'), text);
  const sp = await fetch(`${BASE}/api/voice/speak`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 430), lang: 'hi-IN' }) });
  if (sp.ok) writeFileSync(path.join(out, 'summary-hi.wav'), Buffer.from((await sp.json()).audios[0], 'base64'));
  mark('summary-audio-saved', { runId });
  await page.waitForTimeout(6000);
  await page.getByRole('tab', { name: /Result/ }).click().catch(() => {}); await page.waitForTimeout(3500); mark('result-tab');
  await page.waitForTimeout(3000);
} catch (e) { mark('ERROR', { message: String(e.message ?? e).split('\n')[0] }); }
finally {
  writeFileSync(path.join(out, 'events.json'), JSON.stringify({ runId, events }, null, 2));
  await ctx.close(); await browser.close();
  const webm = readdirSync(out).find((f) => f.endsWith('.webm'));
  if (webm) renameSync(path.join(out, webm), path.join(out, 'screen.webm'));
  console.log('saved', out);
}

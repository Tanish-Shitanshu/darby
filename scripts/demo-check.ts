// npm run demo:check — one-screen preflight for the demo machine. Never prints a key.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getConfig } from '../apps/server/src/config';
import { loadCatalog } from '../apps/server/src/sources';
import { requestKey } from '../apps/server/src/llm/llm';
import { plannerSystem, scopeOf } from '../apps/server/src/planner/planner';
import { ffmpegPath } from '../apps/server/src/gtm/media';

const cfg = getConfig();
let bad = 0;
const line = (ok: boolean | null, name: string, detail: string) => { if (ok === false) bad++; console.log(`${ok === null ? ' · ' : ok ? ' ✓ ' : ' ✗ '} ${name.padEnd(24)} ${detail}`); };

line(Number(process.versions.node.split('.')[0]) >= 20, 'Node 20+', process.versions.node);
const ff = ffmpegPath();
line(!!ff, 'ffmpeg', ff ? (ff === 'ffmpeg' ? 'system ffmpeg' : 'bundled (npm)') : 'missing: needed for the teaser (npm install gets a bundled one)');
const chrome = process.platform === 'darwin' ? existsSync('/Applications/Google Chrome.app') : process.platform === 'win32' ? existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') : spawnSync('which', ['google-chrome']).status === 0;
line(chrome || cfg.browserChannel === 'chromium', 'Browser', chrome ? 'Google Chrome found' : cfg.browserChannel === 'chromium' ? 'Playwright Chromium (BROWSER_CHANNEL=chromium)' : 'Chrome not found: install it or set BROWSER_CHANNEL=chromium and run `npx playwright install chromium`');
const provider = cfg.llm.provider;
const keyOk = provider === 'replay' || (provider === 'gemini' && !!process.env.GEMINI_API_KEY);
line(keyOk, `LLM provider: ${provider}`, keyOk ? (provider === 'replay' ? 'recordings only (offline)' : 'key present') : 'GEMINI_API_KEY missing in .env');
const voice = process.platform === 'darwin' ? 'macOS say (offline)' : spawnSync('edge-tts', ['--version']).status === 0 ? 'edge-tts' : spawnSync('espeak-ng', ['--version']).status === 0 ? 'espeak-ng' : null;
line(voice ? true : null, 'Voiceover engine', voice ?? 'none found: the receipt will say PLACEHOLDER tone (pip install edge-tts for a real voice)');
line(null, 'Real pull request', process.env.GITHUB_TOKEN && process.env.GITHUB_TEST_REPO ? `GitHub test repo ${process.env.GITHUB_TEST_REPO}` : 'no token: the PR will be SIMULATED (and labelled)');

const goals = JSON.parse(readFileSync(path.join(cfg.root, 'fixtures', 'demo-goals.json'), 'utf8')) as Record<string, { label: string; goal: string }>;
const catalog = await loadCatalog(cfg);
const have = new Set<string>();
for (const d of [cfg.replayCuratedDir, cfg.replayRecordDir]) if (existsSync(d)) for (const f of readdirSync(d)) have.add(f.replace(/\.json$/, ''));
console.log('\nOffline replay coverage (planner call per demo case):');
for (const g of Object.values(goals)) {
  const key = requestKey({ role: 'planner', system: plannerSystem({ cfg, catalog }, scopeOf(g.goal)), prompt: `USER GOAL:\n${g.goal}` });
  line(have.has(key) ? true : null, g.label, have.has(key) ? 'recorded: runs with no internet' : 'not recorded yet (needs one live run: npm run demo:record)');
}
console.log(bad ? `\n${bad} problem(s) above.` : '\nReady.');
process.exit(bad ? 1 : 0);

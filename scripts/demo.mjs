#!/usr/bin/env node
// npm run demo            -> reset local state, start server + companion + fixture web, open the companion
// npm run demo -- --offline   -> same, answering every model call from recordings (no internet, no key)
// npm run demo -- --keep      -> do not reset runs/workspace (keeps history)
// npm run demo -- --no-open   -> do not open a browser window
// npm run desktop             -> same, but the companion opens as its own app window (Chrome app mode: no tabs, no address bar)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env };
if (args.has('--offline')) env.LLM_PROVIDER = 'replay';

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) { console.error(`Node 20+ is required (this is ${process.versions.node}).`); process.exit(1); }
if (!existsSync(path.join(root, 'node_modules'))) { console.error('Run `npm install` first.'); process.exit(1); }
if (!existsSync(path.join(root, '.env')) && !args.has('--offline')) { console.error('No .env found: copy .env.example to .env (or use `npm run demo -- --offline`).'); process.exit(1); }

if (!args.has('--keep')) {
  console.log('Resetting local demo state (database, runs, workspace)…');
  const r = spawnSync(npm, ['run', '-s', 'db:reset', '--', '--runs'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const pre = spawnSync(npm, ['run', '-s', 'demo:check'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
if (pre.status !== 0) console.log('\n(preflight reported problems above; starting anyway)\n');

const child = spawn(npm, ['run', 'dev'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
let opened = false;
const open = (url) => {
  if (opened || args.has('--no-open')) return;
  opened = true;
  if (args.has('--app')) {   // a real desktop window: Chrome in app mode, with its own profile so it never touches the user's browsing
    const winChrome = ['LOCALAPPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)'].map((v) => process.env[v] && path.join(process.env[v], 'Google', 'Chrome', 'Application', 'chrome.exe')).find((p) => p && existsSync(p));
    const bin = process.platform === 'win32' ? winChrome : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome';
    if (bin && (process.platform === 'linux' || existsSync(bin))) {
      spawn(bin, [`--app=${url}`, '--window-size=1360,900', `--user-data-dir=${path.join(root, '.darby', 'app-window')}`, '--no-first-run'], { stdio: 'ignore', detached: true }).unref();
      console.log(`
▶ Darby is open in its own window (${url}). Stop with Ctrl+C.
`);
      return;
    }
    console.log('Chrome was not found for app mode; opening the default browser instead.');
  }
  const [cmd, a] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  spawn(cmd, a, { stdio: 'ignore', detached: true }).unref();
  console.log(`\n▶ Darby is open at ${url}\n  Demo goals: fixtures/demo-goals.json (buttons on the start screen)\n  Stop with Ctrl+C.\n`);
};
const onData = (d) => {
  const t = d.toString();
  process.stdout.write(t);
  const clean = t.replace(/\u001b\[[0-9;]*m/g, '');   // vite colours the word "Local" and its address, so match on the plain text
  const m = /Local:\s*(http:\/\/localhost:\d+)/.exec(clean);
  if (m) open(m[1]);
};
child.stdout.on('data', onData);
child.stderr.on('data', onData);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { child.kill(sig); setTimeout(() => process.exit(0), 500); });
child.on('exit', (c) => process.exit(c ?? 0));
void readFileSync;

// Self-contained fixtures check: boots the fixture web on a spare port, runs fixtures/site/selfcheck.mjs against it, shuts it down.
// (fixtures/site/selfcheck.mjs itself needs a server already running; `npm run fixtures:selfcheck` runs it raw.)
import { spawn } from 'node:child_process';

const port = process.env.FIXTURE_CHECK_PORT || '4019';
const base = `http://localhost:${port}`;

const server = spawn(process.execPath, ['fixtures/site/server.mjs'], {
  env: { ...process.env, FIXTURE_PORT: port },
  stdio: ['ignore', 'ignore', 'inherit'],
});
let exited = false;
server.on('exit', () => { exited = true; });

async function waitUp() {
  for (let i = 0; i < 50; i++) {
    if (exited) throw new Error('fixture server exited early (is port ' + port + ' in use?)');
    try { await fetch(base + '/'); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('fixture server did not start within 5s');
}

let code = 1;
try {
  await waitUp();
  code = await new Promise((resolve) => {
    const c = spawn(process.execPath, ['fixtures/site/selfcheck.mjs'], { env: { ...process.env, FIXTURE_URL: base }, stdio: 'inherit' });
    c.on('exit', (n) => resolve(n ?? 1));
  });
} catch (err) {
  console.error('fixtures:check error:', err.message);
} finally {
  server.kill();
}
process.exit(code);

// npm run playbook:check [-- <slug> ...] [--live]
// Runs the CI for Playbooks on a private fixture web (port 4018, same harness as the acceptance tests) and writes playbooks/<slug>/check.json.
// Default LLM_PROVIDER=replay (recorded answers: offline, deterministic). The Hub shows a badge only for Playbooks whose check passed for the exact bytes of playbook.json.
import { readdirSync, existsSync } from 'node:fs';
import { checkPlaybook } from '../apps/server/src/playbooks/check';
import { getConfig } from '../apps/server/src/config';
import { startHarness } from '../tests/acceptance/harness';

const args = process.argv.slice(2);
const live = args.includes('--live');
const wanted = args.filter((a) => !a.startsWith('--'));
const dir = getConfig().playbooksDir;
const slugs = wanted.length ? wanted : existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
if (!slugs.length) { console.log('No Playbooks yet. Run a goal, then "Save as Playbook" on its receipt (or POST /api/runs/:id/playbook).'); process.exit(0); }

const h = await startHarness({ replay: !live, headless: process.env.DARBY_HEADLESS !== '0', playbooksDir: dir });
let bad = 0;
try {
  for (const slug of slugs) {
    console.log(`\n▶ playbook:check ${slug}`);
    const r = await checkPlaybook(h, slug);
    for (const c of r.checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}\n      ${c.detail}`);
    console.log(r.passed ? `  PASSED — badge enabled (bound to sha256 ${r.playbookSha256.slice(0, 12)}…)` : '  FAILED — no badge');
    if (!r.passed) bad++;
  }
} finally { await h.stop(); }
process.exit(bad ? 1 : 0);

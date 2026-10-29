// npm run db:reset — delete .darby/darby.db (+ WAL files) and re-create it with all migrations.
// Keeps the signing key, browser profile and replay cache. Pass --runs to also delete .darby/runs and workspace/ (screenshots, sheets).
import { rmSync } from 'node:fs';
import { getConfig } from '../apps/server/src/config';
import { openDb } from '../apps/server/src/db';
import { createRepo } from '../apps/server/src/db/repo';

const cfg = getConfig();
for (const suffix of ['', '-wal', '-shm']) rmSync(cfg.dbPath + suffix, { force: true });
if (process.argv.includes('--runs')) {
  rmSync(cfg.runsDir, { recursive: true, force: true });
  rmSync(cfg.workspaceDir, { recursive: true, force: true });
}
const db = openDb(cfg.dbPath, cfg.migrationsDir);
console.log(`database reset: ${cfg.dbPath}`);
console.log(`tables: ${createRepo(db).listTables().join(', ')}`);
db.close();

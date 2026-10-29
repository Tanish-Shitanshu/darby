import { getConfig, type Config } from './config';
import { openDb } from './db';
import { createRepo } from './db/repo';
import { BrowserHost } from './executor/browser';
import { EventBus, type Deps } from './executor/context';
import { loadSigner } from './ledger/receipt';
import { createLlm, type Llm } from './llm/llm';
import { RunManager } from './runs/manager';
import { loadCatalog } from './sources';

/** Build every dependency from the environment. Tests pass overrides (temp dirs, a fake Llm, headless browser). */
export async function createDeps(over: { cfg?: Config; llm?: Llm } = {}): Promise<Deps> {
  const cfg = over.cfg ?? getConfig();
  const db = openDb(cfg.dbPath, cfg.migrationsDir);
  const repo = createRepo(db);
  // runs left "running" by a previous process can never complete: mark them so the UI does not show them as live
  for (const r of repo.listRuns(500)) if (['planning', 'running', 'awaiting_approval', 'paused'].includes(r.status)) repo.updateRun(r.id, { status: 'interrupted', finished: true });
  return {
    cfg,
    repo,
    llm: over.llm ?? createLlm(cfg),
    browser: new BrowserHost(cfg),
    signer: loadSigner(cfg.keysDir),
    catalog: await loadCatalog(cfg),
    bus: new EventBus(),
  };
}

export async function createManager(over: { cfg?: Config; llm?: Llm } = {}): Promise<RunManager> {
  return new RunManager(await createDeps(over));
}

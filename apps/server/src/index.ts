import { createManager } from './bootstrap';
import { buildServer } from './server';
import { redactSecrets } from './llm/providers';

// One stray rejection (a page crash, a socket error) must not take every running task down with it: log it and keep serving.
process.on('unhandledRejection', (r) => console.error('[server] unhandled rejection (kept running):', redactSecrets(String((r as Error)?.stack ?? r)).slice(0, 600)));
process.on('uncaughtException', (e) => console.error('[server] uncaught exception (kept running):', redactSecrets(String(e?.stack ?? e)).slice(0, 600)));

try {
  const manager = await createManager();
  const { cfg, llm } = manager.deps;
  const { http } = buildServer(manager);
  http.listen(cfg.port, () => {
    console.log(`Darby server on http://localhost:${cfg.port}  (health: /health, api: /api, ws: /ws)`);
    console.log(`LLM: ${llm.providerName}${llm.replayOnly ? ' (recorded responses only — runs are labelled REPLAY)' : `/${llm.model}`} · headless=${cfg.headless} · fixtures=${cfg.fixtureBase}`);
  });
  const stop = async () => { await manager.shutdown(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (e) {
  console.error('Darby server failed to start:', redactSecrets(String((e as Error).message)));
  process.exit(1);
}

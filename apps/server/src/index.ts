import { createManager } from './bootstrap';
import { buildServer } from './server';
import { redactSecrets } from './llm/providers';

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

// One tiny call through the real provider layer. Prints only OK or the (redacted) error; never the key.
import { getConfig } from '../apps/server/src/config';
import { createLlm, completeJson } from '../apps/server/src/llm/llm';
import { redactSecrets } from '../apps/server/src/llm/providers';
import { z } from 'zod';

const cfg = getConfig();
try {
  const llm = createLlm(cfg);
  const r = await completeJson(
    llm,
    { role: 'planner', system: 'Reply with JSON only.', prompt: 'Return {"ping":"pong"} and nothing else. (connectivity check)' },
    z.object({ ping: z.string() }),
  );
  if (r.ok && r.value.ping === 'pong') console.log(`OK (${r.result.provider}/${r.result.model}, ${r.result.source})`);
  else console.log('ERROR: unexpected answer', r.ok ? '' : r.reason);
  process.exit(r.ok ? 0 : 1);
} catch (e) {
  console.log('ERROR:', redactSecrets(String((e as Error).message)));
  process.exit(1);
}

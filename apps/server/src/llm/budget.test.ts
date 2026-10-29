import { describe, expect, it } from 'vitest';
import { Llm } from './llm';
import type { RawProvider } from './types';

/** A provider that never answers; like fetch, it rejects at once when its signal is already aborted. */
const hang: RawProvider = {
  name: 'hang', model: 'hang-1',
  generate: (_req, signal) => new Promise((_ok, no) => { if (signal?.aborted) no(signal.reason); signal?.addEventListener('abort', () => no(signal.reason)); }),
};

describe('a model call that never answers', () => {
  it('fails with a clear message inside the call budget instead of hanging', async () => {
    const llm = new Llm('hang', 'hang-1', hang, { get: () => undefined, put: () => undefined } as never, { rpm: 600, concurrency: 2 });
    const was = Llm.CALL_BUDGET_MS;
    Llm.CALL_BUDGET_MS = 300;
    try {
      const t0 = Date.now();
      await expect(llm.complete({ role: 'planner', system: 's', prompt: 'p' })).rejects.toThrow(/did not answer within/);
      expect(Date.now() - t0).toBeLessThan(3000);
    } finally { Llm.CALL_BUDGET_MS = was; }
  });

  it('a user cancel is still reported as a cancel, not as a timeout', async () => {
    const llm = new Llm('hang', 'hang-1', hang, { get: () => undefined, put: () => undefined } as never, { rpm: 600, concurrency: 2 });
    const c = new AbortController();
    const p = llm.complete({ role: 'planner', system: 's', prompt: 'p' }, c.signal);
    c.abort(new DOMException('Run cancelled by the user', 'AbortError'));
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});

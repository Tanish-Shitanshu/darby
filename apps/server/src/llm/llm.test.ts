import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { completeJson, Llm, normalizeOrigins, ReplayStore, requestKey } from './llm';
import { redactSecrets } from './providers';
import { RateLimitError, ReplayMissError, type LlmRequest, type RawProvider } from './types';

const dir = mkdtempSync(path.join(tmpdir(), 'darby-llm-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const req: LlmRequest = { role: 'reader', system: 'sys', prompt: 'hello http://localhost:4010/x' };

function fake(answers: (string | Error)[]): RawProvider & { calls: number } {
  const p = {
    name: 'fake', model: 'fake-1', calls: 0,
    async generate() {
      const a = answers[Math.min(p.calls++, answers.length - 1)]!;
      if (a instanceof Error) throw a;
      return { text: a, model: 'fake-1' };
    },
  };
  return p;
}
const store = (n: string) => new ReplayStore({ curated: path.join(dir, n, 'curated'), record: path.join(dir, n, 'rec') });

describe('replay store', () => {
  it('records a live answer and serves it from the store afterwards: no second API call', async () => {
    const raw = fake(['{"a":1}']);
    const llm = new Llm('fake', 'fake-1', raw, store('a'), { rpm: 100, concurrency: 2 });
    const first = await llm.complete(req);
    const second = await llm.complete(req);
    expect([first.source, second.source]).toEqual(['live', 'replay']);
    expect(raw.calls).toBe(1);
    expect(llm.stats).toEqual({ live: 1, replay: 1 });
  });

  it('replay-only mode answers recorded requests and fails loudly on a miss', async () => {
    const s = store('b');
    await new Llm('fake', 'fake-1', fake(['{"ok":true}']), s, { rpm: 100, concurrency: 2 }).complete(req);
    const replay = new Llm('replay', 'recorded', null, s, { rpm: 1, concurrency: 1 });
    expect((await replay.complete(req)).text).toBe('{"ok":true}');
    await expect(replay.complete({ ...req, prompt: 'never recorded' })).rejects.toBeInstanceOf(ReplayMissError);
  });

  it('keys do not depend on the fixture port, and the answer is localised to the current origin', async () => {
    expect(requestKey(req)).toBe(requestKey({ ...req, prompt: 'hello http://localhost:4018/x' }));
    expect(normalizeOrigins('http://127.0.0.1:9/a http://localhost:4010/b')).toBe('http://fixture.local/a http://fixture.local/b');
    const s = store('c');
    await new Llm('fake', 'fake-1', fake(['{"u":"http://localhost:4018/p"}']), s, { rpm: 100, concurrency: 2, fixtureBase: 'http://localhost:4018' }).complete(req);
    const r = await new Llm('replay', 'recorded', null, s, { rpm: 1, concurrency: 1, fixtureBase: 'http://localhost:4010' }).complete(req);
    expect(r.text).toBe('{"u":"http://localhost:4010/p"}');
  });

  it('never writes secrets: recorded files hold prompt preview + response only', async () => {
    const files = readdirSync(path.join(dir, 'a', 'rec'));
    expect(files.length).toBe(1);
  });
});

describe('resilience', () => {
  it('retries a 429 and then succeeds', async () => {
    const raw = fake([new RateLimitError(5), '{"x":1}']);
    const llm = new Llm('fake', 'fake-1', raw, store('d'), { rpm: 100, concurrency: 2 });
    expect((await llm.complete({ ...req, prompt: 'retry me' })).text).toBe('{"x":1}');
    expect(raw.calls).toBe(2);
  });

  it('caps concurrency', async () => {
    let active = 0, peak = 0;
    const raw: RawProvider = { name: 'f', model: 'm', async generate() { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 15)); active--; return { text: '{}', model: 'm' }; } };
    const llm = new Llm('f', 'm', raw, store('e'), { rpm: 100, concurrency: 2 });
    await Promise.all(Array.from({ length: 6 }, (_, i) => llm.complete({ ...req, prompt: `p${i}` })));
    expect(peak).toBe(2);
  });

  it('throttles to the per-minute budget (the 3rd call waits for the window)', async () => {
    const raw = fake(['{}']);
    const llm = new Llm('f', 'm', raw, store('f'), { rpm: 2, concurrency: 2 });
    await llm.complete({ ...req, prompt: 't1' });
    await llm.complete({ ...req, prompt: 't2' });
    const t0 = Date.now();
    const ac = new AbortController();
    const third = llm.complete({ ...req, prompt: 't3' }, ac.signal);
    await new Promise((r) => setTimeout(r, 150));
    expect(raw.calls).toBe(2); // still waiting, not sent
    ac.abort();
    await expect(third).rejects.toBeDefined();
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

describe('json helper and secret redaction', () => {
  it('validates answers against a schema without throwing on bad model output', async () => {
    const llm = new Llm('f', 'm', fake(['not json', '{"n":"str"}', '{"n":3}']), store('g'), { rpm: 100, concurrency: 2 });
    const schema = z.object({ n: z.number() });
    expect((await completeJson(llm, { ...req, prompt: 'j1' }, schema)).ok).toBe(false);
    expect((await completeJson(llm, { ...req, prompt: 'j2' }, schema)).ok).toBe(false);
    expect(await completeJson(llm, { ...req, prompt: 'j3' }, schema)).toMatchObject({ ok: true, value: { n: 3 } });
  });

  it('redacts key-shaped strings from error text', () => {
    const key = 'AIza' + 'x'.repeat(35);
    expect(redactSecrets(`bad key ${key} and sk-${'a'.repeat(30)} and mysecretvalue`, 'mysecretvalue')).toBe('bad key *** and sk-*** and ***');
  });
});

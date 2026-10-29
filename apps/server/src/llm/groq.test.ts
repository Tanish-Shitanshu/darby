import { afterEach, describe, expect, it, vi } from 'vitest';
import { groqKeysFromEnv, groqProvider } from './providers';

afterEach(() => vi.unstubAllGlobals());

const ok = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const limited = () => new Response(JSON.stringify({ error: { message: 'rate limit' } }), { status: 429, headers: { 'retry-after': '1' } });

describe('Groq with several keys', () => {
  it('collects keys from GROQ_API_KEY, GROQ_API_KEYS and GROQ_API_KEY_n without duplicates', () => {
    expect(groqKeysFromEnv({ GROQ_API_KEY: 'a', GROQ_API_KEYS: 'b, c ,a', GROQ_API_KEY_2: 'd' } as any)).toEqual(['a', 'b', 'c', 'd']);
    expect(groqKeysFromEnv({} as any)).toEqual([]);
  });

  it('moves to the next key when one is rate limited, and rests the limited one', async () => {
    const used: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      const key = String((init.headers as Record<string, string>).authorization).replace('Bearer ', '');
      used.push(key);
      return key === 'k1' ? limited() : ok('{"steps":[]}');
    }));
    const p = groqProvider(['k1', 'k2'], 'm');
    expect((await p.generate({ role: 'planner', system: 's', prompt: 'p' })).text).toBe('{"steps":[]}');
    expect(used).toEqual(['k1', 'k2']);
    await p.generate({ role: 'planner', system: 's', prompt: 'p' });
    expect(used).toEqual(['k1', 'k2', 'k2']);   // k1 is resting, not asked again
  });

  it('refuses images (Groq chat is text only) so the caller can use Gemini', async () => {
    const p = groqProvider(['k1'], 'm');
    await expect(p.generate({ role: 'reader', system: 's', prompt: 'p', images: [{ mime: 'image/png', data: Buffer.from('x') }] })).rejects.toThrow(/text only/);
  });
});

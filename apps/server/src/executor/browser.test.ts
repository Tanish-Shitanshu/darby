import { describe, expect, it } from 'vitest';
import type { BrowserContext } from 'playwright';
import { BrowserHost } from './browser';

describe('BrowserHost', () => {
  it('recovers after a failed launch instead of caching the failure', async () => {
    const host = new BrowserHost({} as never);
    let calls = 0;
    const fake = { on: () => undefined, close: async () => undefined } as unknown as BrowserContext;
    (host as any).launch = async () => { if (++calls === 1) throw new Error('profile is locked by another Chrome'); return fake; };
    await expect(host.context()).rejects.toThrow(/locked/);
    await expect(host.context()).resolves.toBe(fake);   // the second step gets a fresh launch
    expect(calls).toBe(2);
  });
});

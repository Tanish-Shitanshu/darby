import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chunkText, isEnglish, sarvamSpeak, sarvamTranscribe, sarvamTranslate, SarvamError } from './sarvam';
import { factsFor } from './summary';

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('Sarvam client (fetch mocked, no network, no key spent)', () => {
  const calls: { url: string; init: RequestInit }[] = [];
  beforeEach(() => { calls.length = 0; process.env.SARVAM_API_KEY = 'test-key-123'; });
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.SARVAM_API_KEY; });

  it('refuses to call without a key, and never leaks the key in an error', async () => {
    delete process.env.SARVAM_API_KEY;
    await expect(sarvamTranslate('hello', 'en-IN', 'hi-IN')).rejects.toThrow(/SARVAM_API_KEY/);
    process.env.SARVAM_API_KEY = 'secret-abc';
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { message: 'bad key secret-abc' } }), { status: 403 }));
    const e = await sarvamTranslate('hello', 'en-IN', 'hi-IN').catch((x: Error) => x);
    expect(e).toBeInstanceOf(SarvamError);
    expect(String((e as Error).message)).not.toContain('secret-abc');
  });

  it('translates with the right request shape and the key in the header', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls.push({ url, init }); return ok({ translated_text: 'नमस्ते', source_language_code: 'en-IN' }); });
    expect(await sarvamTranslate('Hello', 'en-IN', 'hi-IN')).toBe('नमस्ते');
    expect(calls[0]!.url).toBe('https://api.sarvam.ai/translate');
    expect((calls[0]!.init.headers as Record<string, string>)['api-subscription-key']).toBe('test-key-123');
    const sent = JSON.parse(String(calls[0]!.init.body));
    expect(sent).toMatchObject({ input: 'Hello', source_language_code: 'en-IN', target_language_code: 'hi-IN', model: 'mayura:v1' });
  });

  it('uses the wider model for languages Mayura does not cover, and skips same-language calls', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls.push({ url, init }); return ok({ translated_text: 'x' }); });
    await sarvamTranslate('Hello', 'en-IN', 'ur-IN');
    expect(JSON.parse(String(calls[0]!.init.body)).model).toBe('sarvam-translate:v1');
    calls.length = 0;
    expect(await sarvamTranslate('Hello', 'en-IN', 'en-IN')).toBe('Hello');
    expect(calls).toHaveLength(0);
  });

  it('transcribes as multipart with language auto-detection', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls.push({ url, init }); return ok({ transcript: 'दस स्टार्टअप खोजो', language_code: 'hi-IN' }); });
    const t = await sarvamTranscribe(Buffer.from('RIFF'), 'audio/wav');
    expect(t).toEqual({ transcript: 'दस स्टार्टअप खोजो', languageCode: 'hi-IN' });
    expect(calls[0]!.url).toBe('https://api.sarvam.ai/speech-to-text');
    const form = calls[0]!.init.body as FormData;
    expect(form.get('language_code')).toBe('unknown');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('speaks long text in pieces and falls back to English for a language it cannot speak', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls.push({ url, init }); return ok({ audios: ['QUJD'] }); });
    const long = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} is here to make the text long enough.`).join(' ');
    const r = await sarvamSpeak(long, 'hi-IN');
    expect(r.audios.length).toBe(calls.length);
    expect(calls.length).toBeGreaterThan(1);
    expect(JSON.parse(String(calls[0]!.init.body))).toMatchObject({ language_code: 'hi-IN', model: 'bulbul:v3' });
    calls.length = 0;
    expect((await sarvamSpeak('hello', 'ur-IN')).languageCode).toBe('en-IN');
  });

  it('chunks at sentence ends and never exceeds the limit', () => {
    const parts = chunkText(`${'a'.repeat(300)}. ${'b'.repeat(300)}. ${'c'.repeat(300)}.`, 450);
    expect(parts.every((p) => p.length <= 450)).toBe(true);
    expect(parts.join(' ')).toContain('b'.repeat(300));
    expect(chunkText('x'.repeat(1000), 400).every((p) => p.length <= 400)).toBe(true);
  });

  it('knows which codes are English', () => {
    expect(isEnglish('en-IN')).toBe(true);
    expect(isEnglish(null)).toBe(true);
    expect(isEnglish('hi-IN')).toBe(false);
  });
});

describe('summary facts come from the sheet and the receipt, computed by code', () => {
  const sheet = { name: 'AI Startups', header: ['Startup', 'Lowest paid monthly price (USD)', 'Evidence quote', 'Source URL', 'Status', 'Note'], rows: [
    ['Acme AI', '29', 'Pro: $29', 'https://a', 'FOUND', ''], ['Gizmo', '19', 'Creator: $19', 'https://g', 'FOUND', ''], ['Delta', '99', 'Growth: $99', 'https://d', 'FOUND', ''],
    ['Cobalt', 'NOT FOUND', 'NOT FOUND', 'https://c', 'GAP', 'x'],
  ] };
  const run = { goal: 'g', verdict: 'VERIFIED_WITH_GAPS', plan: { steps: [{ tool: 'web.search', title: 's' }] }, receipt: { steps: [{ title: 'a', status: 'passed', evidenceSummary: 'ok' }, { title: 'b', status: 'passed_with_gaps', evidenceSummary: 'gap' }], gaps: ['cobalt'], blocked: [{}] } };

  it('names the cheapest, the priciest, the average and the gaps', () => {
    const f = factsFor(run as never, sheet);
    const text = f.highlights.join(' ');
    expect(f.summary).toMatch(/searched the web/);
    expect(f.summary).toMatch(/2 of 2 steps were proven/);
    expect(text).toMatch(/Cheapest: Gizmo at \$19/);
    expect(text).toMatch(/Most expensive: Delta at \$99/);
    expect(text).toMatch(/average of the confirmed prices is \$49 per month/);
    expect(text).toMatch(/No public paid price could be confirmed for Cobalt/);
    expect(text).toMatch(/blocked 1 unsafe attempt/);
  });

  it('says what went wrong when a run failed', () => {
    const f = factsFor({ ...run, verdict: 'FAILED', receipt: { ...run.receipt, cause: 'Not saved' } } as never, null);
    expect(f.highlights.join(' ')).toMatch(/What went wrong: Not saved/);
  });
});

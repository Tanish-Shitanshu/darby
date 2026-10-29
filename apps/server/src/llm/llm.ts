import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ZodType } from 'zod';
import { canonicalJson, sha256 } from '../util/canonical';
import type { Config } from '../config';
import { azureProvider, geminiProvider, groqKeysFromEnv, groqProvider, openaiProvider, redactSecrets, sarvamChatProvider } from './providers';
import { RateLimitError, ReplayMissError, TransientError, type LlmRequest, type LlmResult, type RawProvider } from './types';

/* ---------------- replay store ---------------- */
interface Recorded {
  key: string;
  role: string;
  provider: string;
  model: string;
  recordedAt: string;
  promptPreview: string;
  response: string;
}

/** Reads curated recordings (replay/llm, committed) and local ones (.darby/replay); writes only to the local dir. */
export class ReplayStore {
  constructor(private dirs: { curated: string; record: string }) {}
  get(key: string): Recorded | null {
    for (const d of [this.dirs.curated, this.dirs.record]) {
      const f = path.join(d, `${key}.json`);
      if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')) as Recorded;
    }
    return null;
  }
  put(rec: Recorded): void {
    mkdirSync(this.dirs.record, { recursive: true });
    writeFileSync(path.join(this.dirs.record, `${rec.key}.json`), JSON.stringify(rec, null, 2));
  }
}

/** Fixture origins differ per machine/port; recordings must not. */
export const FIXTURE_PLACEHOLDER = 'http://fixture.local';
export const normalizeOrigins = (t: string): string => t.replace(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/g, FIXTURE_PLACEHOLDER);

export function requestKey(req: LlmRequest): string {
  return sha256(
    canonicalJson({
      role: req.role,
      system: normalizeOrigins(req.system),
      prompt: normalizeOrigins(req.prompt),
      images: req.imageKeyHint ? [`hint:${req.imageKeyHint}`] : (req.images ?? []).map((i) => sha256(i.data)),
    }),
  );
}

/* ---------------- limiter: sliding window RPM + concurrency cap ---------------- */
class Limiter {
  private stamps: number[] = [];
  private active = 0;
  private waiters: (() => void)[] = [];
  constructor(private rpm: number, private concurrency: number) {}

  async acquire(signal?: AbortSignal): Promise<void> {
    while (this.active >= this.concurrency) await new Promise<void>((r) => this.waiters.push(r));
    this.active++;
    try {
      for (;;) {
        const t = Date.now();
        this.stamps = this.stamps.filter((s) => t - s < 60_000);
        if (this.stamps.length < this.rpm) break;
        const wait = 60_000 - (t - this.stamps[0]!) + 50;
        await sleep(wait, signal);
      }
      this.stamps.push(Date.now());
    } catch (e) {
      this.release();
      throw e;
    }
  }
  release(): void {
    this.active--;
    this.waiters.shift()?.();
  }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('aborted'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason ?? new Error('aborted')); }, { once: true });
  });
}

/* ---------------- Llm: cache -> throttle -> retry -> record ---------------- */
export class Llm {
  stats = { live: 0, replay: 0 };
  private limiter: Limiter;
  private fixtureBase: string;
  constructor(
    public readonly providerName: string,
    public readonly model: string,
    private raw: RawProvider | null,
    private store: ReplayStore,
    opts: { rpm: number; concurrency: number; fixtureBase?: string },
  ) {
    this.fixtureBase = opts.fixtureBase ?? 'http://localhost:4010';
    this.limiter = new Limiter(opts.rpm, opts.concurrency);
  }

  get replayOnly(): boolean { return this.raw === null; }
  private localize(t: string): string { return t.split(FIXTURE_PLACEHOLDER).join(this.fixtureBase.replace(/\/$/, '')); }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResult> {
    const key = requestKey(req);
    const hit = this.store.get(key);
    if (hit) {
      this.stats.replay++;
      return { text: this.localize(hit.response), source: 'replay', provider: hit.provider, model: hit.model, key };
    }
    if (!this.raw) throw new ReplayMissError(key, req.role);

    await this.limiter.acquire(signal);
    let out: { text: string; model: string };
    try {
      out = await this.withRetry(() => this.raw!.generate(req, signal), signal);
    } finally {
      this.limiter.release();
    }
    this.stats.live++;
    this.store.put({
      key, role: req.role, provider: this.raw.name, model: out.model, recordedAt: new Date().toISOString(),
      promptPreview: normalizeOrigins(req.prompt).slice(0, 240), response: normalizeOrigins(out.text),
    });
    return { text: this.localize(normalizeOrigins(out.text)), source: 'live', provider: this.raw.name, model: out.model, key };
  }

  private async withRetry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    let delay = 4000;
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn();
      } catch (e) {
        if (signal?.aborted) throw e;
        const retriable = e instanceof RateLimitError || e instanceof TransientError;
        if (!retriable || attempt >= 5) throw e;
        const wait = e instanceof RateLimitError && e.retryAfterMs ? e.retryAfterMs + 500 : delay;
        delay = Math.min(delay * 2, 45_000);
        await sleep(wait, signal);
      }
    }
  }
}

export function createLlm(cfg: Config): Llm {
  const store = new ReplayStore({ curated: cfg.replayCuratedDir, record: cfg.replayRecordDir });
  const opts = { rpm: cfg.llm.rpm, concurrency: cfg.llm.concurrency, fixtureBase: cfg.fixtureBase };
  const e = process.env;
  let raw: RawProvider | null = null;
  switch (cfg.llm.provider) {
    case 'gemini':
      if (!e.GEMINI_API_KEY) throw new Error('LLM_PROVIDER=gemini but GEMINI_API_KEY is empty (see docs/HANDOFF.md)');
      raw = geminiProvider(e.GEMINI_API_KEY, [cfg.llm.geminiModel, ...cfg.llm.geminiFallbacks.filter((m) => m !== cfg.llm.geminiModel)]);
      break;
    case 'openai':
      if (!e.OPENAI_API_KEY) throw new Error('LLM_PROVIDER=openai but OPENAI_API_KEY is empty');
      raw = openaiProvider(e.OPENAI_API_KEY, e.OPENAI_MODEL || 'gpt-4.1');
      break;
    case 'azure':
      if (!e.AZURE_OPENAI_API_KEY || !e.AZURE_OPENAI_ENDPOINT || !e.AZURE_OPENAI_DEPLOYMENT) throw new Error('LLM_PROVIDER=azure but endpoint/key/deployment are not all set');
      raw = azureProvider(e.AZURE_OPENAI_ENDPOINT, e.AZURE_OPENAI_API_KEY, e.AZURE_OPENAI_DEPLOYMENT, e.AZURE_OPENAI_API_VERSION || '2024-10-21');
      break;
    case 'sarvam': {
      if (!e.SARVAM_API_KEY) throw new Error('LLM_PROVIDER=sarvam but SARVAM_API_KEY is empty');
      const sar = sarvamChatProvider(e.SARVAM_API_KEY, e.SARVAM_MODEL || 'sarvam-105b');
      const gem = e.GEMINI_API_KEY ? geminiProvider(e.GEMINI_API_KEY, [cfg.llm.geminiModel, ...cfg.llm.geminiFallbacks.filter((m) => m !== cfg.llm.geminiModel)]) : null;
      // text goes to Sarvam; anything with an image or audio goes to Gemini when a key exists (Sarvam chat is text-only)
      raw = { name: 'sarvam', model: sar.model, generate: (req, signal) => (req.images?.length && gem ? gem.generate(req, signal) : sar.generate(req, signal)) };
      break;
    }
    case 'auto': {
      // Best available live model: Gemini first (reads pages best, handles images and audio); if it is out of quota or down, Sarvam's chat model takes over for text.
      // Order: Gemini -> Groq (several keys) -> Sarvam. Each tier that fails is rested for a short time; Gemini is retried every 90 s, so the run moves back to it as soon as its quota is back.
      const gem = e.GEMINI_API_KEY ? geminiProvider(e.GEMINI_API_KEY, [cfg.llm.geminiModel, ...cfg.llm.geminiFallbacks.filter((m) => m !== cfg.llm.geminiModel)]) : null;
      const groqKeys = groqKeysFromEnv(e);
      const grq = groqKeys.length ? groqProvider(groqKeys, e.GROQ_MODEL || 'llama-3.3-70b-versatile') : null;
      const sar = e.SARVAM_API_KEY ? sarvamChatProvider(e.SARVAM_API_KEY, e.SARVAM_MODEL || 'sarvam-105b') : null;
      const tiers = [gem, grq, sar].filter((t): t is RawProvider => !!t);
      if (!tiers.length) throw new Error('LLM_PROVIDER=auto needs GEMINI_API_KEY, GROQ_API_KEY and/or SARVAM_API_KEY in .env');
      const restUntil = new Map<string, number>();
      raw = {
        name: 'auto', model: tiers[0]!.model,
        async generate(req, signal) {
          const hasMedia = !!req.images?.length;
          const usable = tiers.filter((t) => !hasMedia || t === gem);   // only Gemini reads images and audio
          const awake = usable.filter((t) => (restUntil.get(t.name) ?? 0) <= Date.now());
          let last: unknown = new Error('no live model is available');
          for (const t of awake.length ? awake : usable) {
            try { return await t.generate(req, signal); }
            catch (err) {
              if (signal?.aborted) throw err;
              restUntil.set(t.name, Date.now() + 90_000);
              last = err;
            }
          }
          throw last;
        },
      };
      break;
    }
    case 'groq': {
      const keys = groqKeysFromEnv(e);
      if (!keys.length) throw new Error('LLM_PROVIDER=groq but GROQ_API_KEY is empty');
      raw = groqProvider(keys, e.GROQ_MODEL || 'llama-3.3-70b-versatile');
      break;
    }
    case 'replay':
      raw = null;
      break;
    default:
      throw new Error(`Unknown LLM_PROVIDER "${cfg.llm.provider}" (auto | gemini | sarvam | openai | azure | replay)`);
  }
  return new Llm(cfg.llm.provider, raw?.model ?? 'recorded', raw, store, opts);
}

/* ---------------- JSON helper ---------------- */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error('response is not valid JSON');
  }
}

export interface JsonCall<T> { ok: true; value: T; result: LlmResult }
export interface JsonFail { ok: false; reason: string; result?: LlmResult }

/** Call a role and validate the answer against a zod schema. Never throws for bad model output, only for transport errors. */
export async function completeJson<T>(llm: Llm, req: LlmRequest, schema: ZodType<T, any, any>, signal?: AbortSignal): Promise<JsonCall<T> | JsonFail> {
  const result = await llm.complete(req, signal);
  let parsed: unknown;
  try {
    parsed = extractJson(result.text);
  } catch (e) {
    return { ok: false, reason: (e as Error).message, result };
  }
  const v = schema.safeParse(parsed);
  if (!v.success) return { ok: false, reason: redactSecrets(v.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')).slice(0, 400), result };
  return { ok: true, value: v.data, result };
}

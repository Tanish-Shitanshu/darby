import { RateLimitError, TransientError, type LlmRequest, type RawProvider } from './types';

const REQUEST_TIMEOUT_MS = 40_000;

function withTimeout(signal?: AbortSignal): AbortSignal {
  const t = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, t]) : t;
}

/** Remove anything that looks like a key from error text before it can reach a log or the UI. */
export function redactSecrets(text: string, ...secrets: (string | undefined)[]): string {
  let out = text.replace(/AIza[0-9A-Za-z_\-]{20,}/g, '***').replace(/sk-[A-Za-z0-9_\-]{16,}/g, 'sk-***');
  for (const s of secrets) if (s) out = out.split(s).join('***');
  return out;
}

async function call(url: string, init: RequestInit, signal: AbortSignal | undefined, secrets: (string | undefined)[]): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: withTimeout(signal) });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new TransientError(redactSecrets(`network/timeout: ${(e as Error).name} ${(e as any).cause?.code ?? ''}`, ...secrets));
  }
  const body: any = await res.json().catch(() => ({}));
  if (res.ok) return body;
  const msg = redactSecrets(String(body?.error?.message ?? res.statusText).slice(0, 300), ...secrets);
  if (res.status === 429) {
    const hint = JSON.stringify(body?.error?.details ?? '').match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
    const ra = Number(res.headers.get('retry-after'));
    const ms = hint ? Math.ceil(Number(hint[1]) * 1000) : ra ? ra * 1000 : null;
    throw new RateLimitError(ms, `429: ${msg}`);
  }
  if (res.status >= 500) throw new TransientError(`${res.status}: ${msg}`);
  throw new Error(`LLM request failed (${res.status}): ${msg}`);
}

/**
 * Google AI Studio (free tier). The key travels in a header, never in a URL.
 * `models` is a fallback chain: new Flash models are sometimes overloaded (503 / hangs), so on a transient failure the next model is tried.
 */
export function geminiProvider(apiKey: string, models: string[]): RawProvider {
  const callModel = async (model: string, req: LlmRequest, signal?: AbortSignal): Promise<string> => {
    const parts: unknown[] = [{ text: req.prompt }];
    for (const im of req.images ?? []) parts.push({ inlineData: { mimeType: im.mime, data: im.data.toString('base64') } });
    const body = await call(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 8192 },
        }),
      },
      signal,
      [apiKey],
    );
    const cand = body?.candidates?.[0];
    const text = (cand?.content?.parts ?? []).filter((p: any) => typeof p.text === 'string' && !p.thought).map((p: any) => p.text).join('');
    if (!text) throw new TransientError(`Gemini returned no text (finishReason ${cand?.finishReason ?? body?.promptFeedback?.blockReason ?? 'unknown'})`);
    return text;
  };
  return {
    name: 'gemini',
    model: models[0]!,
    async generate(req, signal) {
      let last: unknown;
      for (const model of models) {
        try {
          return { text: await callModel(model, req, signal), model };
        } catch (e) {
          if (signal?.aborted) throw e;
          last = e;
          if (!(e instanceof TransientError || e instanceof RateLimitError)) throw e;
        }
      }
      throw last;
    },
  };
}

function openAiMessages(req: LlmRequest) {
  const content: unknown[] = [{ type: 'text', text: req.prompt }];
  for (const im of req.images ?? []) content.push({ type: 'image_url', image_url: { url: `data:${im.mime};base64,${im.data.toString('base64')}` } });
  return [{ role: 'system', content: req.system }, { role: 'user', content }];
}

/**
 * Sarvam AI chat models (sarvam-105b): a second, India-built brain for planning, reading and writing, so the whole voice pipeline can run on one key.
 * Sarvam chat models read text only; requests with images or audio are handled by the caller (see llm.ts).
 */
export function sarvamChatProvider(apiKey: string, model: string): RawProvider {
  return {
    name: 'sarvam',
    model,
    async generate(req, signal) {
      if (req.images?.length) throw new Error('Sarvam chat models read text only; image and audio steps need a Gemini key as well (GEMINI_API_KEY).');
      const body = await call(
        'https://api.sarvam.ai/v1/chat/completions',
        { method: 'POST', headers: { 'content-type': 'application/json', 'api-subscription-key': apiKey }, body: JSON.stringify({ model, temperature: 0, max_tokens: 3000, messages: [{ role: 'system', content: `${req.system}
Reply with ONLY one JSON object, no explanation.` }, { role: 'user', content: req.prompt }] }) },
        signal,
        [apiKey],
      );
      const text = String(body?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (!text) throw new TransientError('Sarvam returned no text');
      return { text, model };
    },
  };
}

/** Kept working, not used by the project. */
export function openaiProvider(apiKey: string, model: string, baseUrl = 'https://api.openai.com/v1'): RawProvider {
  return {
    name: 'openai',
    model,
    async generate(req, signal) {
      const body = await call(
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, temperature: 0, response_format: { type: 'json_object' }, messages: openAiMessages(req) }) },
        signal,
        [apiKey],
      );
      return { text: String(body?.choices?.[0]?.message?.content ?? ''), model };
    },
  };
}

/** Kept working, not used by the project. */
export function azureProvider(endpoint: string, apiKey: string, deployment: string, apiVersion: string): RawProvider {
  return {
    name: 'azure',
    model: deployment,
    async generate(req, signal) {
      const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
      const body = await call(
        url,
        { method: 'POST', headers: { 'content-type': 'application/json', 'api-key': apiKey }, body: JSON.stringify({ temperature: 0, response_format: { type: 'json_object' }, messages: openAiMessages(req) }) },
        signal,
        [apiKey],
      );
      return { text: String(body?.choices?.[0]?.message?.content ?? ''), model: deployment };
    },
  };
}

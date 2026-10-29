export type Role = 'planner' | 'reader' | 'verifier' | 'vision' | 'creative' | 'coder';

export interface LlmImage { mime: string; data: Buffer }

export interface LlmRequest {
  role: Role;
  system: string;
  prompt: string;
  images?: LlmImage[];
  /** For vision calls: stable identity of the image (e.g. url + viewport) so the replay key does not depend on screenshot bytes. */
  imageKeyHint?: string;
}

export interface LlmResult {
  text: string;
  source: 'live' | 'replay';
  provider: string;
  model: string;
  key: string;
}

/** A raw provider: one network call, JSON output requested. No caching or retries here. */
export interface RawProvider {
  name: string;
  model: string;
  /** Returns the text and the model that actually answered (a provider may fall back across models). */
  generate(req: LlmRequest, signal?: AbortSignal): Promise<{ text: string; model: string }>;
}

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number | null, message = 'rate limited (429)') { super(message); this.name = 'RateLimitError'; }
}
export class TransientError extends Error {
  constructor(message: string) { super(message); this.name = 'TransientError'; }
}
export class ReplayMissError extends Error {
  constructor(public key: string, public role: Role) {
    super(`No recorded response for ${role} call ${key.slice(0, 12)}… and no live provider is active. Run once with LLM_PROVIDER=gemini to record it.`);
    this.name = 'ReplayMissError';
  }
}

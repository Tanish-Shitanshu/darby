/**
 * Sarvam AI: speech-to-text (Saaras), text-to-speech (Bulbul) and translation (Mayura / Sarvam-Translate) for Indian languages.
 * REST only, one key in .env (SARVAM_API_KEY, header `api-subscription-key`). Nothing here ever logs the key.
 * Docs: https://docs.sarvam.ai/api-reference/introduction
 */
const BASE = 'https://api.sarvam.ai';

export class SarvamError extends Error {
  constructor(message: string, public status: number | null = null) { super(message); this.name = 'SarvamError'; }
}

export const sarvamKey = (): string | null => process.env.SARVAM_API_KEY?.trim() || null;
export const sarvamEnabled = (): boolean => !!sarvamKey();

/** Languages offered in the UI. `tts` = Bulbul can speak it; `mayura` = the faster translation model supports it. */
export const LANGUAGES: { code: string; name: string; native: string; tts: boolean; mayura: boolean }[] = [
  { code: 'en-IN', name: 'English', native: 'English', tts: true, mayura: true },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', tts: true, mayura: true },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা', tts: true, mayura: true },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்', tts: true, mayura: true },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు', tts: true, mayura: true },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', tts: true, mayura: true },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', tts: true, mayura: true },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी', tts: true, mayura: true },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', tts: true, mayura: true },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', tts: true, mayura: true },
  { code: 'od-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', tts: true, mayura: true },
  { code: 'ur-IN', name: 'Urdu', native: 'اردو', tts: false, mayura: false },
  { code: 'ne-IN', name: 'Nepali', native: 'नेपाली', tts: false, mayura: false },
];
const byCode = (c: string) => LANGUAGES.find((l) => l.code === c);
export const isEnglish = (code: string | null | undefined): boolean => !code || /^en(-|$)/i.test(code);
export const languageName = (code: string): string => byCode(code)?.name ?? code;

const redact = (s: string): string => { const k = sarvamKey(); return k ? s.split(k).join('[key]') : s; };

async function call(path: string, init: RequestInit, timeoutMs = 60_000): Promise<any> {
  const key = sarvamKey();
  if (!key) throw new SarvamError('SARVAM_API_KEY is not set in .env');
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), 'api-subscription-key': key }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new SarvamError(`Sarvam could not be reached (${redact((e as Error).name)})`);
  }
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* not json */ }
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.message ?? text.slice(0, 160);
    throw new SarvamError(`Sarvam answered HTTP ${res.status}: ${redact(String(msg)).slice(0, 200)}`, res.status);
  }
  return body;
}

/** Speech to text. Language is auto-detected. `audio` should be WAV or MP3 (the server converts recordings first). */
export async function sarvamTranscribe(audio: Buffer, mime = 'audio/wav', languageCode = 'unknown'): Promise<{ transcript: string; languageCode: string }> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)], { type: mime }), mime.includes('mpeg') ? 'speech.mp3' : 'speech.wav');
  form.append('language_code', languageCode);   // model and mode are left to Sarvam's current default
  const b = await call('/speech-to-text', { method: 'POST', body: form });
  return { transcript: String(b?.transcript ?? '').trim(), languageCode: String(b?.language_code ?? 'en-IN') };
}

/** Split into pieces a translation / speech request accepts, at sentence ends where possible. */
export function chunkText(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const s of text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?।॥])\s+/)) {
    if (s.length > max) { // one very long sentence: cut at spaces
      if (cur) { out.push(cur); cur = ''; }
      for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
      continue;
    }
    if ((cur + ' ' + s).trim().length > max) { out.push(cur); cur = s; } else cur = (cur + ' ' + s).trim();
  }
  if (cur) out.push(cur);
  return out;
}

/** Translate between Indian languages and English. Returns the input unchanged when source and target are the same. */
export async function sarvamTranslate(text: string, from: string, to: string): Promise<string> {
  if (!text.trim() || (from === to && from !== 'auto')) return text;
  if (to === 'auto') throw new SarvamError('a target language is required');
  // Sarvam-Translate keeps brand names intact (Mayura turned "Perplexity" into the word "puzzle" in Hindi) and covers all 22 languages
  const model = 'sarvam-translate:v1';
  const pieces = chunkText(text, 1800);
  const out: string[] = [];
  for (const piece of pieces) {
    const b = await call('/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: piece, source_language_code: from, target_language_code: to, model, mode: 'formal' }) });
    out.push(String(b?.translated_text ?? ''));
  }
  return out.join(' ').trim();
}

/** Text to speech: returns WAV files (base64), one per chunk, in playback order. Falls back to English when Bulbul cannot speak the language. */
export async function sarvamSpeak(text: string, languageCode: string): Promise<{ audios: string[]; languageCode: string }> {
  const lang = byCode(languageCode)?.tts ? languageCode : 'en-IN';
  const audios: string[] = [];
  for (const piece of chunkText(text, 450).slice(0, 8)) {
    const b = await call('/text-to-speech', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: piece, target_language_code: lang, language_code: lang, model: 'bulbul:v3', pace: 1.0, speech_sample_rate: 22050 }) });
    for (const a of b?.audios ?? []) audios.push(String(a));
  }
  if (!audios.length) throw new SarvamError('Sarvam returned no audio');
  return { audios, languageCode: lang };
}

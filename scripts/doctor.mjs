// npm run doctor — tells you in ~10 seconds why a run would fail, without reading any code.
// Checks: Node/sqlite, .env keys (presence only, never printed), each live model, the server and the UI.
import fs from 'node:fs';

const env = {};
try {
  for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=([^#]*)/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch { /* no .env */ }

const rows = [];
const add = (name, ok, detail) => { rows.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const hit = async (url, init) => {
  try { const r = await fetch(url, { ...init, signal: AbortSignal.timeout(25000) }); return { status: r.status, text: (await r.text()).slice(0, 160) }; }
  catch (e) { return { status: 0, text: String(e.message || e) }; }
};

add('Node version', true, process.version + ' (the sqlite module must be built for this version; if tests say NODE_MODULE_VERSION, run `npm rebuild better-sqlite3`)');
add('LLM_PROVIDER', !!env.LLM_PROVIDER, env.LLM_PROVIDER || 'unset');

if (env.SARVAM_API_KEY) {
  for (const model of ['sarvam-105b', 'sarvam-105b-conversations']) {
    const r = await hit('https://api.sarvam.ai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', 'api-subscription-key': env.SARVAM_API_KEY }, body: JSON.stringify({ model, max_tokens: 20, messages: [{ role: 'user', content: 'say ok' }] }) });
    add(`Sarvam ${model}`, r.status === 200, r.status === 200 ? 'answers' : `HTTP ${r.status} ${r.text.replace(/\s+/g, ' ').slice(0, 90)}`);
  }
} else add('Sarvam key', false, 'SARVAM_API_KEY empty (voice and the backup brain are off)');

if (env.GEMINI_API_KEY) {
  const model = env.GEMINI_MODEL?.split(/\s/)[0] || 'gemini-3.5-flash';
  const r = await hit(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body: JSON.stringify({ contents: [{ parts: [{ text: 'say ok' }] }] }) });
  add(`Gemini ${model}`, r.status === 200, r.status === 200 ? 'answers' : r.status === 429 ? 'daily free quota used up (resets daily; Darby falls back to Groq, then Sarvam)' : `HTTP ${r.status}`);
} else add('Gemini key', false, 'GEMINI_API_KEY empty');

const groqKeys = [env.GROQ_API_KEY, env.GROQ_API_KEY_2, env.GROQ_API_KEY_3, ...(env.GROQ_API_KEYS || '').split(',')].map((k) => (k || '').trim()).filter(Boolean);
if (groqKeys.length) {
  let i = 0;
  for (const k of groqKeys) {
    i++;
    const r = await hit('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + k }, body: JSON.stringify({ model: env.GROQ_MODEL || 'llama-3.3-70b-versatile', max_tokens: 10, messages: [{ role: 'user', content: 'say ok' }] }) });
    add('Groq key ' + i, r.status === 200, r.status === 200 ? 'answers' : r.status === 429 ? 'rate limited right now' : 'HTTP ' + r.status);
  }
} else add('Groq keys', true, 'none set (optional backup: GROQ_API_KEY in .env)');

const api = await hit('http://localhost:5173/api/voice/config');
add('Darby server via the UI proxy', api.status === 200, api.status === 200 ? 'up' : 'not reachable — start it with `npm run dev`');
const fx = await hit('http://localhost:4010/');
add('Fixture site (:4010)', fx.status > 0, fx.status > 0 ? 'up' : 'not running (only the offline test cases need it)');

const bad = rows.filter((r) => !r.ok);
console.log(bad.length ? `\n${bad.length} problem(s). See docs/DEBUGGING.md for what each one means.` : '\nAll good.');

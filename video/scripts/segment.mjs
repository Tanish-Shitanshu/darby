// Plug a recorded clip into a scene:  node scripts/segment.mjs <file> <scene> <speaker name>
//   scenes: hook problem intro demo security verify stack market adal end
// It copies the clip to public/segments/<scene>.mp4, finds where the speaker really starts and stops
// (silence detection), and records that in src/segments.json. The scene then lasts exactly as long as the speech.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ff = (args) => spawnSync('npx', ['remotion', 'ffmpeg', ...args], { encoding: 'utf8', shell: true });
const envKey = (() => { try { return /^SARVAM_API_KEY=(\S+)/m.exec(fs.readFileSync(path.resolve('..', '.env'), 'utf8'))?.[1] ?? ''; } catch { return ''; } })();

const [file, scene, who = ''] = process.argv.slice(2);
if (!file || !scene) { console.error('usage: node scripts/segment.mjs <file> <scene> <speaker>'); process.exit(1); }
const ext = path.extname(file).toLowerCase() || '.mp4';
fs.mkdirSync('public/segments', { recursive: true });
const rel = `segments/${scene}${ext}`;
fs.copyFileSync(file, path.join('public', rel));

const run = spawnSync('npx', ['remotion', 'ffmpeg', '-i', path.join('public', rel), '-vn', '-af', 'silencedetect=noise=-35dB:d=0.35', '-f', 'null', '-'], { encoding: 'utf8', shell: true });
const log = (run.stderr || '') + (run.stdout || '');
const dm = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
if (!dm) { console.error('could not read the clip length\n', log.slice(-400)); process.exit(1); }
const dur = +dm[1] * 3600 + +dm[2] * 60 + +dm[3];
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const speechStart = starts.length && starts[0] < 0.3 && ends.length ? ends[0] : 0;
// speech ends where a final silence begins and never ends (it runs to the end of the clip)
const trailing = starts.length > ends.length || (ends.length && ends[ends.length - 1] >= dur - 0.15);
const speechEnd = trailing && starts.length > 1 ? starts[starts.length - 1] : dur;
const seg = { file: rel, who, trimStart: +Math.max(0, speechStart - 0.25).toFixed(2), trimEnd: +Math.min(dur, speechEnd + 0.3).toFixed(2), speechStart: +speechStart.toFixed(2), speechEnd: +speechEnd.toFixed(2) };

// what the speaker really said (Sarvam speech-to-text, in chunks under its 30 s limit), so captions match the recording
const dim = /Video:.*?, (\d{2,5})x(\d{2,5})/.exec(log);
const portrait = dim ? +dim[2] > +dim[1] : false;
seg.crop = portrait ? { pos: '50% 55%', scale: 1.55, origin: '50% 55%' } : { pos: '46% 30%', scale: 1.5, origin: '46% 38%' };
if (envKey) {
  const parts = [];
  for (let t = seg.trimStart; t < seg.trimEnd - 0.3; t += 26) {
    const wav = path.join('work', `_chunk_${scene}.wav`);
    ff(['-y', '-ss', String(t), '-t', '27', '-i', path.join('public', rel), '-vn', '-ac', '1', '-ar', '16000', wav]);
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(wav)], { type: 'audio/wav' }), 'a.wav');
    fd.append('model', 'saarika:v2.5'); fd.append('language_code', 'unknown');
    const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': envKey }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (j.transcript) parts.push(j.transcript.trim());
  }
  if (parts.length) seg.transcript = parts.join(' ');   // raw speech-to-text, for reference only; captions use `text` if someone has written a cleaned one
}

const jf = 'src/segments.json';
const all = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : {};
all[scene] = seg;
fs.writeFileSync(jf, JSON.stringify(all, null, 2) + '\n');
console.log(scene, JSON.stringify(seg), `-> scene lasts ${(seg.trimEnd - seg.trimStart).toFixed(1)}s`);

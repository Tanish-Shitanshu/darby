// Plug a recorded clip into a scene:  node scripts/segment.mjs <file> <scene> <speaker name>
//   scenes: hook problem intro demo security verify stack market adal end
// It copies the clip to public/segments/<scene>.mp4, finds where the speaker really starts and stops
// (silence detection), and records that in src/segments.json. The scene then lasts exactly as long as the speech.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
const seg = { file: rel, who, trimStart: +Math.max(0, speechStart - 0.4).toFixed(2), trimEnd: +Math.min(dur, speechEnd + 0.5).toFixed(2), speechStart: +speechStart.toFixed(2), speechEnd: +speechEnd.toFixed(2) };

const jf = 'src/segments.json';
const all = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')) : {};
all[scene] = seg;
fs.writeFileSync(jf, JSON.stringify(all, null, 2) + '\n');
console.log(scene, JSON.stringify(seg), `-> scene lasts ${(seg.trimEnd - seg.trimStart).toFixed(1)}s`);

// Finds what the team dropped into public/ and writes src/assets.json, so nobody edits code to add footage.
//   public/clips/demo.mp4      screen recording of the live demo (Tanish speaks the Hindi command in it)
//   public/clips/receipt.mp4   optional: receipt + tamper test recording
//   public/clips/adal.mp4      AdaL footage (Browser Use / review agent)
//   public/voice.(wav|mp3|m4a) the full voice-over, one continuous track in the order of the script
//   public/music.(mp3|wav)     optional background music, mixed very low
import fs from 'node:fs';
import path from 'node:path';

const pub = path.resolve('public');
const ls = (d) => (fs.existsSync(path.join(pub, d)) ? fs.readdirSync(path.join(pub, d)) : []);
const rootFiles = fs.existsSync(pub) ? fs.readdirSync(pub) : [];
const pick = (names, base, exts) => names.find((n) => exts.some((e) => n.toLowerCase() === `${base}.${e}`));

const clips = {};
for (const k of ['demo', 'receipt', 'adal']) {
  const f = pick(ls('clips'), k, ['mp4', 'mov', 'webm', 'mkv']);
  if (f) clips[k] = `clips/${f}`;
}
const voice = pick(rootFiles, 'voice', ['wav', 'mp3', 'm4a']);
const music = pick(rootFiles, 'music', ['mp3', 'wav', 'm4a']);
const out = { clips, voice: voice ?? null, music: music ?? null };
fs.mkdirSync('src', { recursive: true });
fs.writeFileSync('src/assets.json', JSON.stringify(out, null, 2) + '\n');
console.log('assets:', JSON.stringify(out));

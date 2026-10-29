import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Page } from 'playwright';

/** ffmpeg: the one on PATH, else the binary bundled by @ffmpeg-installer/ffmpeg (an npm package, no download step). */
export function ffmpegPath(): string | null {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (probe.status === 0) return 'ffmpeg';
  try {
    const p = createRequire(import.meta.url)('@ffmpeg-installer/ffmpeg').path as string;
    if (p && existsSync(p)) return p;
  } catch { /* not installed */ }
  return null;
}

export function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolve) => {
    const c = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    const t = setTimeout(() => c.kill('SIGKILL'), timeoutMs);
    c.stdout.on('data', (d) => (out += d));
    c.stderr.on('data', (d) => (err += d));
    c.on('error', (e) => { clearTimeout(t); resolve({ code: -1, out, err: String(e) }); });
    c.on('close', (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

export interface MediaInfo { seconds: number | null; hasVideo: boolean; hasAudio: boolean }
/** Duration and streams from a fresh `ffmpeg -i` run (stderr is parsed; the non-zero exit code is normal for -i without output). */
export async function probeMedia(file: string): Promise<MediaInfo | null> {
  const ff = ffmpegPath();
  if (!ff || !existsSync(file)) return null;
  const r = await run(ff, ['-hide_banner', '-i', file], 30_000);
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(r.err);
  const seconds = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
  return { seconds, hasVideo: /Stream #\d+:\d+.*Video:/.test(r.err), hasAudio: /Stream #\d+:\d+.*Audio:/.test(r.err) };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Deterministic hero card (no image model needed): same input, same pixels. Labelled "generated placeholder" wherever it is shown. */
export function heroHtml(p: { product: string; headline: string; sub: string }): string {
  return `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1280px;height:720px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;background:linear-gradient(135deg,#14213d 0%,#1f3a5f 55%,#fca311 160%);color:#fff;display:flex;align-items:center;justify-content:center">
<div style="width:1040px"><div style="display:flex;gap:18px;margin-bottom:34px">
<div style="width:210px;height:140px;border-radius:14px;background:#fff;color:#14213d;padding:18px;box-sizing:border-box;font:600 20px system-ui;transform:rotate(-6deg);box-shadow:0 12px 30px #0006">Q: What is spaced repetition?</div>
<div style="width:210px;height:140px;border-radius:14px;background:#fca311;color:#14213d;padding:18px;box-sizing:border-box;font:600 20px system-ui;transform:rotate(3deg);box-shadow:0 12px 30px #0006">A: Reviewing just before you forget.</div>
<div style="width:210px;height:140px;border-radius:14px;background:#e5e5e5;color:#14213d;padding:18px;box-sizing:border-box;font:600 20px system-ui;transform:rotate(-2deg);box-shadow:0 12px 30px #0006">Lecture 7 slides → 24 cards</div></div>
<div style="font-size:84px;line-height:1.05;font-weight:700">${esc(p.headline)}</div>
<div style="font:400 30px system-ui;margin-top:22px;opacity:.9;max-width:900px">${esc(p.sub)}</div>
<div style="font:600 20px system-ui;margin-top:40px;opacity:.7;letter-spacing:.12em">${esc(p.product.toUpperCase())} · GENERATED PLACEHOLDER IMAGE</div></div></body>`;
}

export function captionHtml(heroDataUri: string | null, line: string, n: number, total: number): string {
  return `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1280px;height:720px;overflow:hidden;position:relative;background:#14213d;font-family:system-ui">
${heroDataUri ? `<img src="${heroDataUri}" style="position:absolute;inset:0;width:1280px;height:720px;filter:brightness(.55)">` : ''}
<div style="position:absolute;left:80px;right:80px;bottom:110px;color:#fff;font:700 62px/1.15 Georgia,serif;text-shadow:0 3px 18px #000">${esc(line)}</div>
<div style="position:absolute;left:80px;bottom:60px;color:#fca311;font:600 22px system-ui;letter-spacing:.1em">${n} / ${total}</div></body>`;
}

export async function renderPng(page: Page, html: string, outFile: string): Promise<void> {
  mkdirSync(path.dirname(outFile), { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outFile, type: 'png', clip: { x: 0, y: 0, width: 1280, height: 720 } });
}

/* ---------------- voiceover: first engine that works wins, and the receipt says which ---------------- */
export type VoicePath = 'edge-tts' | 'macos-say' | 'espeak-ng' | 'PLACEHOLDER-tone';
export async function makeVoiceover(text: string, outMp3: string, prefer?: string): Promise<{ path: VoicePath; note: string }> {
  const ff = ffmpegPath();
  if (!ff) throw new Error('ffmpeg is not available (install ffmpeg, or run npm install to get the bundled one)');
  mkdirSync(path.dirname(outMp3), { recursive: true });
  const tmp = outMp3.replace(/\.mp3$/, '.tmp');
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 600);
  const order: VoicePath[] = prefer ? [prefer as VoicePath] : ['edge-tts', 'macos-say', 'espeak-ng', 'PLACEHOLDER-tone'];
  for (const eng of order) {
    try {
      if (eng === 'edge-tts') {
        const probe = await run('edge-tts', ['--version'], 8000);
        if (probe.code !== 0) continue;
        const r = await run('edge-tts', ['--voice', 'en-US-AriaNeural', '--text', clean, '--write-media', outMp3], 40_000);
        if (r.code === 0 && existsSync(outMp3)) return { path: 'edge-tts', note: 'Microsoft Edge neural voice (edge-tts)' };
      } else if (eng === 'macos-say') {
        if (process.platform !== 'darwin') continue;
        const aiff = `${tmp}.aiff`;
        const r = await run('say', ['-o', aiff, clean], 40_000);
        if (r.code !== 0) continue;
        const c = await run(ff, ['-y', '-hide_banner', '-loglevel', 'error', '-i', aiff, '-codec:a', 'libmp3lame', '-q:a', '4', outMp3], 60_000);
        rmSync(aiff, { force: true });
        if (c.code === 0 && existsSync(outMp3)) return { path: 'macos-say', note: 'macOS built-in speech (say), works offline' };
      } else if (eng === 'espeak-ng') {
        const wav = `${tmp}.wav`;
        const r = await run('espeak-ng', ['-w', wav, clean], 30_000);
        if (r.code !== 0) continue;
        const c = await run(ff, ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', outMp3], 60_000);
        rmSync(wav, { force: true });
        if (c.code === 0 && existsSync(outMp3)) return { path: 'espeak-ng', note: 'espeak-ng speech synthesis' };
      } else {
        // honest last resort: a soft tone, one beep per sentence. It is NOT speech and is labelled PLACEHOLDER everywhere.
        const secs = Math.min(14, Math.max(6, Math.round(clean.split(' ').length / 2.6)));
        const c = await run(ff, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=440:duration=${secs}`, '-af', 'volume=0.15,tremolo=f=3:d=0.7', '-codec:a', 'libmp3lame', '-q:a', '6', outMp3], 60_000);
        if (c.code === 0 && existsSync(outMp3)) return { path: 'PLACEHOLDER-tone', note: 'no speech engine found on this computer: a placeholder tone was generated instead of a voice' };
      }
    } catch { /* try the next engine */ }
  }
  throw new Error('no voiceover engine produced audio');
}

/** Teaser: caption slides (rendered by the browser) + voiceover -> one H.264/AAC mp4 of exactly `seconds`. */
export async function makeTeaser(slides: string[], audio: string, out: string, seconds = 15): Promise<void> {
  const ff = ffmpegPath();
  if (!ff) throw new Error('ffmpeg is not available');
  const per = seconds / slides.length;
  const list = path.join(path.dirname(out), 'teaser-slides.txt');
  const body = slides.map((f) => `file '${f.replace(/'/g, "'\\''")}'\nduration ${per}`).join('\n') + `\nfile '${slides.at(-1)!.replace(/'/g, "'\\''")}'\n`;
  writeFileSync(list, body);
  const r = await run(ff, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', audio, '-filter_complex', '[1:a]apad[a]', '-map', '0:v', '-map', '[a]', '-t', String(seconds), '-r', '25', '-vf', 'scale=1280:720,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], 180_000);
  rmSync(list, { force: true });
  if (r.code !== 0 || !existsSync(out)) throw new Error(`ffmpeg failed: ${r.err.slice(-200)}`);
}

import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AbsoluteFill as _A } from 'remotion';
import { OffthreadVideo, staticFile } from 'remotion';
import { FPS, chapters, finalScript, scenes, segments, showCaptions } from './config';
import { C, display, mono, sans } from './components';

/** Film grain + vignette over everything: the thing that makes flat UI look like a produced video. */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'multiply' }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 6} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 120% at 50% 45%, transparent 70%, rgba(10,31,24,0.06) 100%)' }} />
    </AbsoluteFill>
  );
};

/** A mint bar sweeps across at the start of every scene. */
export const Wipe: React.FC = () => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, 16], [-30, 130], { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  if (f > 18) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: '34%', background: 'linear-gradient(90deg, transparent, rgba(11,138,100,0.22), rgba(11,138,100,0.5), rgba(11,138,100,0.22), transparent)', transform: 'skewX(-14deg)', filter: 'blur(6px)' }} />
    </AbsoluteFill>
  );
};

/** Small chapter tag, top-left. */
export const Chapter: React.FC<{ id: keyof typeof scenes }> = ({ id }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const label = chapters[id];
  if (!label) return null;
  return (
    <div style={{ position: 'absolute', top: 54, left: 76, display: 'flex', alignItems: 'center', gap: 14, opacity: o, fontFamily: mono, fontSize: 24, letterSpacing: 4, color: C.mint }}>
      <span style={{ width: 34, height: 3, background: C.mint, display: 'inline-block' }} />{label}
    </div>
  );
};

/** Word-by-word kinetic reveal. */
export const Words: React.FC<{ text: string; at?: number; stagger?: number; size?: number; color?: string; weight?: number; family?: string; hot?: string[]; align?: 'left' | 'center'; maxWidth?: number }> = ({ text, at = 0, stagger = 4, size = 90, color = C.white, weight = 700, family = display, hot = [], align = 'center', maxWidth = 1500 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.26}px`, maxWidth, fontFamily: family, fontWeight: weight, fontSize: size, lineHeight: 1.12, letterSpacing: -size / 50, color }}>
      {text.split(' ').map((w, i) => {
        const s = spring({ frame: f - at - i * stagger, fps, config: { damping: 16, stiffness: 120 } });
        const isHot = hot.some((h) => w.toLowerCase().replace(/[^a-z]/g, '') === h);
        return <span key={i} style={{ display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 34}px)`, filter: `blur(${(1 - s) * 8}px)`, color: isHot ? C.mint : color }}>{w}</span>;
      })}
    </div>
  );
};

export const Typed: React.FC<{ text: string; at?: number; cps?: number; style?: React.CSSProperties; cursor?: boolean }> = ({ text, at = 0, cps = 28, style, cursor = true }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - at) / FPS) * cps)));
  const blink = Math.floor(f / 8) % 2 === 0;
  return <span style={style}>{text.slice(0, n)}{cursor && n < text.length || (cursor && blink) ? '▍' : ''}</span>;
};

/** Camera shake for a handful of frames starting at `at`. */
export const Shake: React.FC<{ at: number; dur?: number; amp?: number; children: React.ReactNode }> = ({ at, dur = 10, amp = 14, children }) => {
  const f = useCurrentFrame();
  const t = f - at;
  const k = t >= 0 && t < dur ? 1 - t / dur : 0;
  return <AbsoluteFill style={{ transform: `translate(${Math.sin(t * 7.1) * amp * k}px, ${Math.cos(t * 9.3) * amp * k}px)` }}>{children}</AbsoluteFill>;
};

/** Chunks of the spoken script, shown a few words at a time. Timings come from config.script. */
export const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (!showCaptions) return null;
  const line = finalScript.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  const words = line.text.split(' ');
  const per = (line.to - line.from) / words.length;
  const idx = Math.min(words.length - 1, Math.floor((t - line.from) / per));
  const start = Math.floor(idx / 7) * 7;
  const chunk = words.slice(start, start + 7);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', justifyContent: 'center' }}>
      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.white, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', padding: '12px 28px', borderRadius: 18, border: '1px solid rgba(11,138,100,0.18)' }}>
        {chunk.map((w, i) => <span key={start + i} style={{ color: start + i === idx ? C.mint : start + i < idx ? C.white : 'rgba(10,31,24,0.32)' }}>{w}{' '}</span>)}
      </div>
    </div>
  );
};

export const Waveform: React.FC<{ bars?: number; width?: number; height?: number; color?: string; active?: boolean }> = ({ bars = 44, width = 520, height = 90, color = C.mint, active = true }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width, height, justifyContent: 'center' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = active ? 0.2 + 0.8 * Math.abs(Math.sin(f / 5 + i * 0.7) * Math.cos(f / 11 + i * 0.31)) : 0.12;
        return <i key={i} style={{ width: 6, height: `${h * 100}%`, borderRadius: 99, background: color, opacity: 0.5 + 0.5 * h }} />;
      })}
    </div>
  );
};

/** Simple line icons (emoji do not render reliably in the video renderer). */
export const Icon: React.FC<{ name: 'shield' | 'mic' | 'camera' | 'flask'; size?: number; color?: string }> = ({ name, size = 64, color = C.mint }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      {name === 'shield' && <><path d="M16 3l11 4v8c0 7-4.5 12-11 14C9.500 27 5 22 5 15V7z" {...p} /><path d="M11 16l4 4 7-8" {...p} /></>}
      {name === 'mic' && <><rect x="12" y="4" width="8" height="15" rx="4" {...p} /><path d="M7 15a9 9 0 0018 0M16 24v4M11 28h10" {...p} /></>}
      {name === 'camera' && <><rect x="3" y="8" width="26" height="18" rx="4" {...p} /><circle cx="16" cy="17" r="5" {...p} /><path d="M11 8l2-3h6l2 3" {...p} /></>}
      {name === 'flask' && <><path d="M12 4h8M13 4v9L6 25a2 2 0 002 3h16a2 2 0 002-3l-7-12V4" {...p} /><path d="M9.500 21h13" {...p} /></>}
    </svg>
  );
};

export const Glass: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; border?: string }> = ({ children, style, border = 'rgba(11,138,100,0.30)' }) => (
  <div style={{ background: '#ffffff', border: `1.5px solid ${border}`, borderRadius: 26, backdropFilter: 'blur(8px)', boxShadow: '0 24px 60px rgba(10,31,24,0.10)', ...style }}>{children}</div>
);

/** The speaker, as a round camera bubble, with their name. Audio comes from the same clip. */
export const Presenter: React.FC<{ id: keyof typeof scenes }> = ({ id }) => {
  const seg = segments[id];
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!seg || id === 'demo') return null;
  const s = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 110 } });
  return (
    <_A style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', right: 50, bottom: 96, width: 330, transform: `scale(${0.5 + 0.5 * s})`, opacity: s, transformOrigin: '100% 100%', textAlign: 'center' }}>
        <div style={{ width: 330, height: 330, borderRadius: 999, overflow: 'hidden', border: `5px solid ${C.mint}`, boxShadow: '0 20px 60px rgba(10,31,24,0.25)', background: '#e9efec' }}>
          <OffthreadVideo src={staticFile(seg.file)} startFrom={Math.round(seg.trimStart * FPS)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: seg.crop?.pos ?? '46% 30%', transform: `scale(${seg.crop?.scale ?? 1.5})`, transformOrigin: seg.crop?.origin ?? '46% 38%' }} />
        </div>
        <div style={{ display: 'inline-block', marginTop: -26, position: 'relative', fontFamily: sans, fontWeight: 600, fontSize: 32, color: C.ink, background: C.mint, padding: "6px 26px", borderRadius: 999 }}>{seg.who}</div>
      </div>
    </_A>
  );
};

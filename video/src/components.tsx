import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const C = {
  ink: '#ffffff',      // page background, and text that sits on green
  deep: '#f3f8f6',
  green: '#0b6b4f',
  mid: '#14876a',
  mint: '#0b8a64',     // the one accent
  white: '#0a1f18',    // main text (dark ink)
  mute: 'rgba(10,31,24,0.62)',
  red: '#e5484d',
  amber: '#d98a00',
};
export const display = '"Inter","Segoe UI Variable Display","Segoe UI",system-ui,-apple-system,sans-serif';
export const sans = '"Inter","Segoe UI",system-ui,-apple-system,sans-serif';
export const mono = '"JetBrains Mono",Consolas,monospace';

/** Slowly drifting dark-green glow. `light` fades it in for the reveal. */
export const Bg: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  const f = useCurrentFrame();
  const x = 85 + Math.sin(f / 120) * 6;
  const y = 8 + Math.cos(f / 140) * 5;
  return (
    <AbsoluteFill style={{ background: '#fbfdfc' }}>
      <AbsoluteFill style={{ background: `radial-gradient(45% 50% at ${x}% ${y}%, rgba(11,138,100,${0.14 * glow}) 0%, transparent 70%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(40% 45% at ${100 - x}% ${100 - y}%, rgba(11,138,100,${0.09 * glow}) 0%, transparent 70%)` }} />
    </AbsoluteFill>
  );
};

export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <defs>
      <linearGradient id="lg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#14876a" />
        <stop offset="1" stopColor="#063b2e" />
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="18" fill="url(#lg)" />
    <path d="M20 15h12.5c10 0 16.5 7 16.5 17s-6.5 17-16.5 17H20z" fill="none" stroke="#fff" strokeWidth="5.2" strokeLinejoin="round" />
    <path d="M26.5 32.5l5.2 5.2 9.8-11.4" fill="none" stroke="#8ff0c8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Fade + rise in, optionally out. Times in frames relative to the enclosing Sequence. */
export const Reveal: React.FC<{ at?: number; out?: number; dur?: number; rise?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at = 0, out, dur = 18, rise = 28, children, style }) => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const gone = out === undefined ? 1 : interpolate(f, [out, out + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <div style={{ opacity: inn * gone, transform: `translateY(${(1 - inn) * rise}px)`, ...style }}>{children}</div>;
};

/** Springy pop. */
export const Pop: React.FC<{ at?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at = 0, children, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 13, stiffness: 140 } });
  return <div style={{ transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.6), ...style }}>{children}</div>;
};

/** Count up to `value`, starting at frame `at`. */
export const Counter: React.FC<{ value: number; at?: number; dur?: number; prefix?: string; suffix?: string; style?: React.CSSProperties }> = ({ value, at = 0, dur = 45, prefix = '', suffix = '', style }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return <span style={style}>{prefix}{Math.round(value * t)}{suffix}</span>;
};

export const Pill: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.mint, style }) => (
  <span style={{ fontFamily: mono, fontSize: 26, color, border: `1.5px solid ${color}55`, background: `${color}14`, padding: '8px 18px', borderRadius: 999, whiteSpace: 'nowrap', display: 'inline-block', ...style }}>{children}</span>
);

/** Fade a whole scene in and out at its edges so cuts feel soft. */
export const Edge: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(f, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  void frames;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

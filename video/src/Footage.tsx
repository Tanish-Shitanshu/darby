import React from 'react';
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import assets from './assets.json';
import { C, mono } from './components';

type Key = 'demo' | 'receipt' | 'adal';

/** A browser-style window around either the real recording (public/clips/<key>.mp4) or, until it exists, still screenshots with a slow push-in. */
export const Footage: React.FC<{ clip: Key; fallback: string[]; zoomTo?: number; label?: string }> = ({ clip, fallback, zoomTo = 1.06, label }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const src = (assets.clips as Record<string, string | undefined>)[clip];
  const scale = interpolate(f, [0, durationInFrames], [1, zoomTo], { easing: Easing.inOut(Easing.quad) });
  const per = Math.ceil(durationInFrames / Math.max(1, fallback.length));
  const idx = Math.min(fallback.length - 1, Math.floor(f / per));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 1500, height: 880, borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 40px 120px rgba(10,31,24,0.18), 0 0 0 1.5px rgba(10,31,24,0.10)', transform: `scale(${scale})` }}>
        <div style={{ height: 44, background: '#eef3f1', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px' }}>
          {['#ff6b6b', '#ffc857', '#8ff0c8'].map((c) => <i key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c, opacity: 0.85 }} />)}
          <span style={{ marginLeft: 16, fontFamily: mono, fontSize: 16, color: C.mute }}>{label ?? 'localhost:5173 · Darby'}</span>
        </div>
        <div style={{ position: 'relative', width: '100%', height: 836, background: '#fff' }}>
          {src ? (
            <OffthreadVideo src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Img src={staticFile(fallback[idx]!)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

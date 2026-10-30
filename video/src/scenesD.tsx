import React from 'react';
import { AbsoluteFill, Audio, Easing, Freeze, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Pill, Pop, Reveal, mono, sans } from './components';
import { Glass } from './fx';
import { Scene } from './scenesA';
import { Demo as PlaceholderDemo } from './scenesB';
import { FPS, contracts, demoPause, demoT, hindiAnswerEnglish, segments } from './config';
import { Words } from './fx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const fr = (s: number) => Math.round(s * FPS);
const REC = 'rec/screen.mp4';

/** One stretch of the real screen recording, in a browser window, with a slow push-in toward a point of interest. */
export const Screen: React.FC<{ from: number; to: number; zoom?: number; ox?: string; oy?: string; src?: string }> = ({ from, to, zoom = 1.08, ox = '50%', oy = '40%', src = REC }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const rate = Math.max(0.0625, (to - from) / (durationInFrames / FPS));
  const k = interpolate(f, [0, durationInFrames], [1, zoom], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 70, paddingTop: 70 }}>
      <div style={{ width: 1440, height: 880, borderRadius: 22, overflow: 'hidden', background: '#fff', boxShadow: '0 30px 90px rgba(10,31,24,0.18), 0 0 0 1.5px rgba(10,31,24,0.10)' }}>
        <div style={{ height: 42, background: '#eef3f1', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px' }}>
          {['#ff6b6b', '#ffc857', '#8ff0c8'].map((c) => <i key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c, opacity: 0.85 }} />)}
          <span style={{ marginLeft: 16, fontFamily: mono, fontSize: 16, color: C.mute }}>localhost:5173 · Darby</span>
        </div>
        <div style={{ width: '100%', height: 838, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', transform: `scale(${k})`, transformOrigin: `${ox} ${oy}` }}>
            <OffthreadVideo src={staticFile(src)} startFrom={fr(from)} playbackRate={rate} muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => (
  <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: '14px 0 0 470px', pointerEvents: 'none' }}>
    <Reveal rise={10} dur={10}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Pill style={{ fontSize: 24, background: C.mint, color: '#fff', border: 'none', padding: '8px 22px' }}>{text}</Pill>
        {sub && <span style={{ fontFamily: sans, fontSize: 24, color: C.mute }}>{sub}</span>}
      </div>
    </Reveal>
  </AbsoluteFill>
);

/** Sarvam capability strip shown while the voice is turned into text. */
const SarvamCard: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'flex-end', justifyContent: 'flex-start', padding: '0 0 130px 110px' }}>
    <Pop at={4}>
      <Glass style={{ padding: '22px 30px' }}>
        <div style={{ fontFamily: mono, fontSize: 20, letterSpacing: 4, color: C.mint }}>SARVAM AI</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, fontFamily: sans, fontWeight: 600, fontSize: 32, color: C.white }}>
          <span>Speech to text</span><span style={{ color: C.mint }}>→</span><span>Translate</span><span style={{ color: C.mint }}>→</span><span>Text to speech</span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 22, color: C.mute, marginTop: 8 }}>Hindi in, Hindi out. 10 Indian languages + English.</div>
      </Glass>
    </Pop>
  </AbsoluteFill>
);

/** The round camera bubble for Mohit's clip. Audio plays only while it is not paused; during the pause it freezes and dims. */
const Bubble: React.FC = () => {
  const seg = segments.demo!;
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 6, fps, config: { damping: 14, stiffness: 110 } });
  const a = fr(demoPause.at - seg.trimStart);          // frames of clip before the pause
  const p = fr(demoPause.len);
  const paused = f >= a && f < a + p;
  const vid = (start: number, frozen = false) => (
    <OffthreadVideo src={staticFile(seg.file)} startFrom={fr(start)} muted={frozen} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: seg.crop?.pos ?? '46% 30%', transform: `scale(${seg.crop?.scale ?? 1.5})`, transformOrigin: seg.crop?.origin ?? '46% 38%' }} />
  );
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', right: 50, bottom: 96, width: 330, transform: `scale(${0.5 + 0.5 * pop})`, opacity: pop, transformOrigin: '100% 100%', textAlign: 'center' }}>
        <div style={{ width: 330, height: 330, borderRadius: 999, overflow: 'hidden', border: `5px solid ${paused ? 'rgba(10,31,24,0.25)' : C.mint}`, boxShadow: '0 20px 60px rgba(10,31,24,0.25)', background: '#e9efec', position: 'relative', filter: paused ? 'grayscale(0.7) brightness(0.9)' : 'none' }}>
          <Sequence from={0} durationInFrames={a}>{vid(seg.trimStart)}</Sequence>
          <Sequence from={a} durationInFrames={p}><Freeze frame={0}>{vid(demoPause.at, true)}</Freeze></Sequence>
          <Sequence from={a + p}>{vid(demoPause.at)}</Sequence>
          {paused && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.35)' }}><div style={{ display: 'flex', gap: 14 }}><i style={{ width: 22, height: 70, background: C.white, borderRadius: 6 }} /><i style={{ width: 22, height: 70, background: C.white, borderRadius: 6 }} /></div></div>}
        </div>
        <div style={{ display: 'inline-block', marginTop: -26, position: 'relative', fontFamily: sans, fontWeight: 600, fontSize: 32, color: C.ink, background: C.mint, padding: '6px 26px', borderRadius: 999 }}>{seg.who}</div>
      </div>
    </AbsoluteFill>
  );
};

/** The Hindi answer, shown while Mohit's clip is paused. */
const HindiAnswer: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(f, [durationInFrames - 20, durationInFrames], [1, 0], clamp);
  return (
    <AbsoluteFill>
      <Screen from={101} to={101 + demoPause.len} zoom={1.12} ox="45%" oy="62%" />
      <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: '14px 0 0 470px' }}>
        <Reveal rise={10} dur={10}><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Pill style={{ fontSize: 24, background: C.mint, color: '#fff', border: 'none', padding: '8px 22px' }}>PREVIEW · THE ANSWER, SPOKEN IN HINDI</Pill>
          <span style={{ fontFamily: sans, fontSize: 24, color: C.mute }}>Sarvam voice · from this exact run</span>
        </div></Reveal>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-end', padding: '0 0 120px 110px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hindiAnswerEnglish.map((t, i) => (
            <Reveal key={t} at={fr(0.5 + i * 2.1)} style={{ opacity: out }}>
              <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 28, maxWidth: 1000, color: C.white, background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(11,138,100,0.35)', padding: '12px 24px', borderRadius: 16, boxShadow: '0 12px 40px rgba(10,31,24,0.14)' }}>{t}</div>
            </Reveal>
          ))}
        </div>
      </AbsoluteFill>
      <Sequence from={0} durationInFrames={fr(demoPause.len)}>
        <Audio src={staticFile('rec/summary-hi.wav')} volume={(frame) => interpolate(frame, [fr(demoPause.len) - 36, fr(demoPause.len)], [1, 0], clamp)} />
      </Sequence>
    </AbsoluteFill>
  );
};

type Block = { m0: number; m1: number; rec: [number, number]; src?: string; zoom?: number; ox?: string; oy?: string; tag: string; sub?: string; sarvam?: boolean };
const blocks: Block[] = [
  { m0: 0.17, m1: 5.4, rec: [0.4, 5.7], zoom: 1.04, tag: 'THE WEBSITE', sub: 'live, running on this laptop' },
  { m0: 5.4, m1: 10.9, rec: [5.7, 11.2], zoom: 1.1, ox: '35%', oy: '38%', tag: 'SPEAK IN HINDI', sub: 'the real microphone button' },
  { m0: 10.9, m1: 15.1, rec: [12.5, 16.6], zoom: 1.12, ox: '30%', oy: '30%', tag: 'SARVAM AI HEARS IT', sarvam: true },
  { m0: 15.1, m1: 24.1, rec: [16.5, 25.5], zoom: 1.35, ox: '22%', oy: '48%', tag: 'A PROOF PLANNED FOR EVERY STEP' },
  { m0: 24.1, m1: 33.1, rec: [27, 87], zoom: 1.22, ox: '66%', oy: '40%', tag: 'REAL CHROME TABS', sub: 'sped up · real pages, real screenshots' },
  { m0: 33.1, m1: 38.7, rec: [4.2, 9.8], src: 'rec/sheet.mp4', zoom: 1.2, ox: '50%', oy: '55%', tag: 'NOT FOUND, NEVER GUESSED', sub: 'Done, with gaps listed' },
  { m0: 38.7, m1: 47.63, rec: [101, 110], zoom: 1.1, ox: '50%', oy: '70%', tag: 'VOICE IN · VOICE OUT', sub: 'Excel ready, answer read back in Hindi' },
];

const Real: React.FC = () => {
  const seg = segments.demo!;
  return (
    <Scene id="demo" glow={0.3}>
      {blocks.map((b, i) => {
        const start = demoT(b.m0 === 0.17 ? seg.trimStart : b.m0);
        const end = demoT(b.m1 === 47.63 ? seg.trimEnd : b.m1 - 0.0001);
        // the pause is inserted at demoPause.at: blocks ending exactly there end before it
        return (
          <Sequence key={i} from={fr(start)} durationInFrames={Math.max(1, fr(end) - fr(start))} name={b.tag}>
            <Screen from={b.rec[0]} to={b.rec[1]} src={b.src} zoom={b.zoom} ox={b.ox} oy={b.oy} />
            <Tag text={b.tag} sub={b.sub} />
            {b.sarvam && <SarvamCard />}
          </Sequence>
        );
      })}
      <Sequence from={fr(demoPause.at - seg.trimStart)} durationInFrames={fr(demoPause.len)} name="hindi-answer"><HindiAnswer /></Sequence>
      <Bubble />
    </Scene>
  );
};

export const Demo: React.FC = () => (segments.demo ? <Real /> : <PlaceholderDemo />);


/* ───────── PROOF (real receipt + real tamper test) ───────── */
export const Verify: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const K = durationInFrames / (24 * FPS);               // designed for 24 s; follows the recorded length
  const sec = (x: number) => Math.round(x * K * FPS);
  const phase = (a: number, b: number) => f >= sec(a) && f < sec(b);
  const lit = (i: number) => f > sec(5.4) + i * Math.round(sec(0.55));
  const inv = interpolate(f, [sec(19.4), sec(19.9)], [0, 1], clamp);
  return (
    <Scene id="verify" glow={0.5}>
      {/* 0–5 s: the claim vs the check */}
      <Sequence from={0} durationInFrames={sec(5.6)}>
        <AbsoluteFill style={{ padding: '170px 120px 0 120px' }}>
          <Words text="The agent says “Saved ✓”. Darby doesn’t take its word for it." size={92} stagger={3} align="left" maxWidth={1500} hot={['darby']} />
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: '640px 0 0 120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
            <Pop at={sec(1.6)}><Glass style={{ padding: '26px 38px' }} border="rgba(10,31,24,0.16)"><div style={{ fontFamily: mono, fontSize: 22, color: C.mute, letterSpacing: 4 }}>AGENT CLAIM</div><div style={{ fontFamily: sans, fontWeight: 700, fontSize: 56, color: C.white, textDecoration: 'line-through', textDecorationColor: C.red, textDecorationThickness: 6 }}>“Saved ✓”</div></Glass></Pop>
            <Reveal at={sec(2.6)}><span style={{ fontSize: 60, color: C.mint }}>→</span></Reveal>
            <Pop at={sec(3)}><Glass style={{ padding: '26px 38px' }}><div style={{ fontFamily: mono, fontSize: 22, color: C.mint, letterSpacing: 4 }}>INDEPENDENT VERIFIER</div><div style={{ fontFamily: sans, fontWeight: 700, fontSize: 40, color: C.white }}>re-opens the real page, file, record</div></Glass></Pop>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 5–13 s: ten kinds of proof */}
      {phase(5.4, 13.2) && (
        <AbsoluteFill style={{ padding: '120px 120px 0 120px' }}>
          <Reveal at={sec(5.4)}><Pill style={{ fontSize: 28 }}>10 EVIDENCE CONTRACTS</Pill></Reveal>
          <div style={{ marginTop: 40, width: 1500, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22 }}>
            {contracts.map((c, i) => (
              <Pop key={c} at={sec(5.4) + i * Math.round(sec(0.55))}>
                <div style={{ height: 150, borderRadius: 22, border: `2.5px solid ${lit(i) ? C.mint : 'rgba(10,31,24,0.14)'}`, background: lit(i) ? 'rgba(11,138,100,0.08)' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 12px 40px rgba(10,31,24,0.07)' }}>
                  <div style={{ fontSize: 44, color: lit(i) ? C.mint : 'rgba(10,31,24,0.2)', lineHeight: 1 }}>✓</div>
                  <div style={{ fontFamily: mono, fontSize: 24, color: C.white }}>{c}</div>
                </div>
              </Pop>
            ))}
          </div>
          <Reveal at={sec(9.2)} style={{ marginTop: 44 }}><div style={{ fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.white }}>From an exact quote in a page … to <span style={{ color: C.mint }}>“the code’s tests now pass.”</span></div></Reveal>
        </AbsoluteFill>
      )}

      {/* 13–19 s: the real signed receipt */}
      <Sequence from={sec(13.2)} durationInFrames={sec(6.2)}>
        <Screen src="rec/receipt.mp4" from={3.2} to={9.2} zoom={1.12} ox="45%" oy="22%" />
        <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: '14px 0 0 470px' }}>
          <Reveal rise={10} dur={10}><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><Pill style={{ fontSize: 24, background: C.mint, color: '#fff', border: 'none', padding: '8px 22px' }}>SIGNED RECEIPT · ED25519</Pill><span style={{ fontFamily: sans, fontSize: 24, color: C.mute }}>hash-chained ledger · real, from the run you just saw</span></div></Reveal>
        </AbsoluteFill>
      </Sequence>

      {/* 19–24 s: the real tamper test */}
      <Sequence from={sec(19.4)}>
        <Screen src="rec/receipt.mp4" from={10.8} to={15.8} zoom={1.6} ox="48%" oy="94%" />
        <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: '14px 0 0 470px' }}>
          <Reveal rise={10} dur={10}><Pill style={{ fontSize: 24, background: C.red, color: '#fff', border: 'none', padding: '8px 22px' }}>TAMPER TEST · ONE BYTE CHANGED</Pill></Reveal>
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'center', padding: '0 0 0 110px', opacity: inv }}>
          <Pop at={sec(0.6)}>
            <div style={{ background: '#fff', border: `3px solid ${C.red}`, borderRadius: 24, padding: '22px 38px', boxShadow: '0 24px 70px rgba(229,72,77,0.25)' }}>
              <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 64, color: C.red, letterSpacing: -2 }}>INVALID ✗</div>
              <div style={{ fontFamily: sans, fontSize: 28, color: C.white }}>content does not match its hash</div>
            </div>
          </Pop>
        </AbsoluteFill>
      </Sequence>
    </Scene>
  );
};

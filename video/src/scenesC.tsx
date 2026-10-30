import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Counter, Logo, Pill, Pop, Reveal, display, mono, sans } from './components';
import { Glass, Icon, Words } from './fx';
import { Screen } from './scenesD';
import { Scene } from './scenesA';
import { FPS, adalLines, market, proof, repoUrl, team } from './config';

const sec = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* ───────── STACK ───────── */
export const Stack: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const K = durationInFrames / (18 * FPS);
  const sec = (x: number) => Math.round(x * K * FPS);
  const stack = ['TypeScript', 'Node', 'Playwright · real Chrome', 'React', 'SQLite ledger', 'zod contracts', 'Ed25519'];
  const gemDown = f > sec(8);
  const groqUp = f > sec(8.8);
  return (
    <Scene id="stack" glow={0.5}>
      <AbsoluteFill style={{ padding: '130px 120px 0' }}>
        <Words text="TypeScript end to end. Three models. One of them is always awake." size={68} stagger={3} align="left" maxWidth={1500} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: 'translateY(30px)' }}>
      <div style={{ position: 'absolute', left: 120, top: 400, width: 1680, display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {stack.map((s, i) => <Pop key={s} at={sec(1.5) + i * 5}><Pill style={{ fontSize: 34, padding: '14px 28px' }}>{s}</Pill></Pop>)}
      </div>
      <div style={{ position: 'absolute', left: 120, top: 590, display: 'flex', alignItems: 'center', gap: 30 }}>
        {[
          { n: 'Gemini', sub: gemDown ? 'quota used ✗' : 'answering…', bad: gemDown },
          { n: 'Groq', sub: groqUp ? 'taking over ✓' : 'standing by', bad: false, live: groqUp },
          { n: 'Sarvam', sub: 'voice + backup brain', bad: false },
        ].map((m, i) => (
          <React.Fragment key={m.n}>
            {i > 0 && <Reveal at={sec(5)}><span style={{ color: C.mint, fontSize: 52 }}>→</span></Reveal>}
            <Pop at={sec(5) + i * 6}>
              <div style={{ width: 360, padding: '24px 28px', borderRadius: 24, border: `2.5px solid ${m.bad ? C.red : m.live ? C.mint : 'rgba(10,31,24,0.16)'}`, background: m.live ? 'rgba(20,135,106,0.35)' : 'rgba(11,138,100,0.06)', boxShadow: m.live ? '0 0 60px rgba(11,138,100,0.35)' : 'none' }}>
                <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 44, color: C.white }}>{m.n}</div>
                <div style={{ fontFamily: mono, fontSize: 24, color: m.bad ? C.red : C.mint, marginTop: 6 }}>{m.sub}</div>
              </div>
            </Pop>
          </React.Fragment>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 120, top: 830, display: 'flex', gap: 22 }}>
        {([['mic', 'Voice in & out'], ['camera', 'Screenshots read'], ['flask', 'Code fix · tests pass']] as const).map(([i, t], k) => (
          <Pop key={t} at={sec(11.5) + k * 8}>
            <Glass style={{ padding: '16px 30px', display: 'flex', gap: 16, alignItems: 'center' }}><Icon name={i} size={44} /><span style={{ fontFamily: sans, fontSize: 32, color: C.white }}>{t}</span></Glass>
          </Pop>
        ))}
      </div>
    </AbsoluteFill>
    </Scene>
  );
};

/* ───────── MARKET ───────── */
export const Market: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const K = durationInFrames / (20 * FPS);
  const sec = (x: number) => Math.round(x * K * FPS);
  const bar = (to: number, at: number) => interpolate(f, [at, at + 40], [0, to], { ...clamp });
  return (
    <Scene id="market" glow={0.6}>
      <AbsoluteFill style={{ padding: '130px 120px 0' }}>
        <Words text="Verified agent work, in your own language." size={78} stagger={4} align="left" hot={['verified']} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 120, top: 360, display: 'flex', gap: 40, width: 1500 }}>
        {market.stats.map((s, i) => (
          <Pop key={s.label} at={sec(1.6) + i * 12} style={{ flex: 1 }}>
            <Glass style={{ padding: '34px 34px', height: 330 }}>
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 140, color: C.mint, letterSpacing: -4, lineHeight: 1 }}><Counter value={s.value} at={sec(2) + i * 12} dur={50} prefix={s.prefix} suffix={s.suffix} /></div>
              <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 34, color: C.white, marginTop: 14 }}>{s.label}</div>
              <div style={{ fontFamily: sans, fontSize: 22, color: C.mute, marginTop: 10 }}>{s.note}</div>
            </Glass>
          </Pop>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 120, top: 740, width: 1400 }}>
        <Reveal at={sec(8)} style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 34 }}>
          <Pill style={{ fontSize: 26, background: C.mint, color: '#fff', border: 'none' }}>VISION</Pill>
          {market.vision.map((v, i) => (<React.Fragment key={v}>{i > 0 && <span style={{ color: C.mint, fontSize: 32 }}>→</span>}<span style={{ fontFamily: sans, fontWeight: 600, fontSize: 27, color: C.white }}>{v}</span></React.Fragment>))}
        </Reveal>
        <Reveal at={sec(12)} style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          {market.model.map((m, i) => (<React.Fragment key={m}>{i > 0 && <span style={{ color: C.mint, fontSize: 38 }}>→</span>}<Pill style={{ fontSize: 30, padding: '12px 26px' }}>{m}</Pill></React.Fragment>))}
        </Reveal>
        <div style={{ display: 'none' }}>{bar(1, 0)}</div>
      </div>
    </Scene>
  );
};

/* ───────── ADAL (Mohit's words over the real AdaL sessions) ───────── */
const adalWhere: [string, string, number][] = [
  ['UI TESTING', 'Browser Use drove the live app after every milestone', 2.2],
  ['RED-TEAM', 'headless AdaL (adal -q) attacked our 10 hostile pages', 6.0],
  ['CODE REVIEW', 'Review Agent checked every diff before we tagged it', 9.2],
];
export const Adal: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const K = durationInFrames / (19 * FPS);
  const t = (x: number) => Math.round(x * K * FPS);
  return (
    <Scene id="adal" glow={0.4}>
      <Screen src="rec/adal.mp4" from={0} to={29.5} zoom={1.03} ox="50%" oy="50%" />
      <AbsoluteFill style={{ alignItems: 'flex-start', justifyContent: 'flex-start', padding: '14px 0 0 470px' }}>
        <Reveal rise={10} dur={10}><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><Pill style={{ fontSize: 24, background: C.mint, color: '#fff', border: 'none', padding: '8px 22px' }}>REAL ADAL SESSIONS</Pill><span style={{ fontFamily: sans, fontSize: 24, color: C.mute }}>building and testing Darby</span></div></Reveal>
      </AbsoluteFill>
      <AbsoluteFill style={{ width: 1560, justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 120px 90px', gap: 8 }}>
        {adalWhere.map(([where, how, at]) => (
          <Reveal key={where} at={t(at)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: sans, fontSize: 30, color: C.white, background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(11,138,100,0.4)', padding: '10px 24px', borderRadius: 18, marginTop: 6, boxShadow: '0 12px 40px rgba(10,31,24,0.16)' }}>
              <span style={{ fontFamily: mono, fontSize: 21, color: '#fff', background: C.mint, padding: '4px 14px', borderRadius: 99, letterSpacing: 2 }}>{where}</span><span style={{ color: C.mint }}>→</span><span>{how}</span>
            </div>
          </Reveal>
        ))}
        <Reveal at={t(13.4)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: sans, fontWeight: 600, fontSize: 28, color: C.white, background: 'rgba(255,255,255,0.97)', border: '1.5px solid rgba(11,138,100,0.4)', padding: '10px 24px', borderRadius: 18, marginTop: 6, boxShadow: '0 12px 40px rgba(10,31,24,0.16)' }}>
            <span style={{ fontFamily: mono, fontSize: 21, color: '#fff', background: C.mint, padding: '4px 14px', borderRadius: 99, letterSpacing: 2 }}>NEXT</span>
            {market.vision.map((v, i) => (<React.Fragment key={v}>{i > 0 && <span style={{ color: C.mint }}>→</span>}<span>{v}</span></React.Fragment>))}
          </div>
        </Reveal>
      </AbsoluteFill>
    </Scene>
  );
};

/* ───────── END (timed to Tanish's closing: "...can we really prove what they did? Darby is our answer.") ───────── */
export const End: React.FC = () => (
  <Scene id="end" glow={0.9}>
    <AbsoluteFill style={{ width: 1560 }}>
    <Sequence from={0} durationInFrames={sec(6.9)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 26, textAlign: 'center', padding: '0 120px' }}>
        <Reveal at={sec(0.4)}><div style={{ fontFamily: mono, fontSize: 30, color: C.mute, letterSpacing: 6 }}>SOON, AGENTS WILL RUN OUR</div></Reveal>
        <div style={{ display: 'flex', gap: 56, alignItems: 'baseline' }}>
          {[['work', 3.2], ['money', 4.5], ['business', 5.5]].map(([w, at]) => (
            <Pop key={w as string} at={sec(at as number)}><div style={{ fontFamily: display, fontWeight: 800, fontSize: 170, letterSpacing: -6, color: C.mint }}>{w}</div></Pop>
          ))}
        </div>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={sec(6.9)} durationInFrames={sec(2.7)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Words text="How smart are they?" size={130} stagger={7} color="rgba(10,31,24,0.35)" />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={sec(9.6)} durationInFrames={sec(5.6)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: 10 }}>
        <Reveal at={2}><div style={{ fontFamily: mono, fontSize: 30, color: C.mute, letterSpacing: 6 }}>THE QUESTION IS</div></Reveal>
        <Words text="Can we really prove what they did?" size={140} stagger={12} at={sec(1.2)} hot={['prove']} maxWidth={1500} />
      </AbsoluteFill>
    </Sequence>
    <Sequence from={sec(15.2)} durationInFrames={sec(2.2)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, textAlign: 'center' }}>
        <Pop at={4}><Logo size={190} /></Pop>
        <Reveal at={sec(0.5)}><div style={{ fontFamily: display, fontWeight: 800, fontSize: 120, letterSpacing: -4, color: C.white }}>Darby is our answer.</div></Reveal>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={sec(17.4)} durationInFrames={sec(4.4)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 90 }}>
          {[{ v: 119, l: 'tests passing', at: 0.2 }, { v: 10, l: 'attacks contained', at: 1.7 }, { v: 1, l: 'receipt anyone can verify', at: 2.7 }].map((p) => (
            <Pop key={p.l} at={sec(p.at)}>
              <div>
                <div style={{ fontFamily: display, fontWeight: 800, fontSize: 210, color: C.mint, lineHeight: 1, letterSpacing: -6 }}><Counter value={p.v} at={sec(p.at) + 2} dur={24} /></div>
                <div style={{ fontFamily: sans, fontSize: 34, color: C.mute, marginTop: 10 }}>{p.l}</div>
              </div>
            </Pop>
          ))}
        </div>
      </AbsoluteFill>
    </Sequence>
    <Sequence from={sec(21.8)}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28, textAlign: 'center' }}>
        <Reveal at={2}><div style={{ fontFamily: display, fontWeight: 800, fontSize: 150, letterSpacing: -5, color: C.white }}>Team Target 9X</div></Reveal>
        <Reveal at={sec(1)} style={{ display: 'flex', gap: 22, fontFamily: sans, fontSize: 32, color: C.mute }}>
          {['Tanish Shitanshu', 'Sai Mohit Kotta', 'Ghana Polisetty', 'Pragunie Aditya'].map((n, i) => <span key={n}>{i > 0 ? '· ' : ''}{n}</span>)}
        </Reveal>
        <Reveal at={sec(2)} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Logo size={64} /><span style={{ fontFamily: mono, fontSize: 32, color: C.white }}>{repoUrl}</span>
        </Reveal>
        <Reveal at={sec(2.2)}><div style={{ fontFamily: display, fontWeight: 700, fontSize: 90, color: C.mint, letterSpacing: -3 }}>Thank you.</div></Reveal>
      </AbsoluteFill>
    </Sequence>
    </AbsoluteFill>
  </Scene>
);

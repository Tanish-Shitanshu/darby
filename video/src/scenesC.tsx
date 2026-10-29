import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, Counter, Logo, Pill, Pop, Reveal, display, mono, sans } from './components';
import { Glass, Icon, Words } from './fx';
import { Footage } from './Footage';
import { Scene } from './scenesA';
import { FPS, adalLines, market, proof, repoUrl, team } from './config';

const sec = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/* ───────── STACK ───────── */
export const Stack: React.FC = () => {
  const f = useCurrentFrame();
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
        <Reveal at={sec(8)} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 34 }}>
          {market.languages.map((l) => <Pill key={l} color={C.mint} style={{ fontSize: 28 }}>{l}</Pill>)}
        </Reveal>
        <Reveal at={sec(12)} style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          {market.model.map((m, i) => (<React.Fragment key={m}>{i > 0 && <span style={{ color: C.mint, fontSize: 38 }}>→</span>}<Pill style={{ fontSize: 30, padding: '12px 26px' }}>{m}</Pill></React.Fragment>))}
        </Reveal>
        <div style={{ display: 'none' }}>{bar(1, 0)}</div>
      </div>
    </Scene>
  );
};

/* ───────── ADAL ───────── */
export const Adal: React.FC = () => (
  <Scene id="adal" glow={0.4}>
    <Footage clip="adal" fallback={['docs/10-deny.png', 'docs/09-review.png']} label="Built with AdaL" zoomTo={1.04} />
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 56px 110px', gap: 12 }}>
      {adalLines.map((l, i) => (
        <Reveal key={l} at={sec(1 + i * 2.6)}>
          <div style={{ fontFamily: sans, fontSize: 36, color: C.white, background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(11,138,100,0.4)', padding: '14px 28px', borderRadius: 18, marginTop: 10 }}>✓ {l}</div>
        </Reveal>
      ))}
    </AbsoluteFill>
  </Scene>
);

/* ───────── END ───────── */
export const End: React.FC = () => (
  <Scene id="end" glow={0.95}>
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40, textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: 80 }}>
        {proof.map((p, i) => (
          <Pop key={p.label} at={4 + i * 6}>
            <div>
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 120, color: C.mint, lineHeight: 1 }}><Counter value={p.value} at={6 + i * 6} dur={30} /></div>
              <div style={{ fontFamily: sans, fontSize: 28, color: C.mute, marginTop: 8 }}>{p.label}</div>
            </div>
          </Pop>
        ))}
      </div>
      <Reveal at={sec(3.8)}><div style={{ fontFamily: display, fontWeight: 700, fontSize: 80, color: 'rgba(10,31,24,0.45)', letterSpacing: -2, textDecoration: 'line-through', textDecorationColor: C.red }}>Other agents say “trust me.”</div></Reveal>
      <Reveal at={sec(6)}><div style={{ fontFamily: display, fontWeight: 700, fontSize: 150, color: C.white, letterSpacing: -5 }}>Darby says: <span style={{ color: C.mint }}>check me.</span></div></Reveal>
      <Reveal at={sec(9)} style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 10 }}>
        <Logo size={72} /><span style={{ fontFamily: mono, fontSize: 32, color: C.white }}>{repoUrl}</span>
      </Reveal>
      <Reveal at={sec(10.5)} style={{ display: 'flex', alignItems: 'center', gap: 18, fontFamily: sans, fontSize: 30, color: C.mute }}>
        <span style={{ color: C.white, fontWeight: 700 }}>{team}</span>
        {['Tanish Shitanshu', 'Sai Mohit Kotta', 'Ghana Polisetty', 'Pragunie Aditya'].map((n) => <span key={n}>· {n}</span>)}
      </Reveal>
    </AbsoluteFill>
  </Scene>
);

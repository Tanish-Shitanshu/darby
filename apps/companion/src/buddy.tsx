import { useEffect, useRef, useState } from 'react';

/* ---------- Dabo: Darby's little voice companion ----------
   Appears only while there is something to show (listening, understanding, working on a spoken task, needing approval, speaking),
   follows the cursor with a soft lag, and leaves when it has nothing more to say. */

export type BuddyMode = 'listening' | 'thinking' | 'working' | 'attention' | 'speaking';

const LINES: Record<Exclude<BuddyMode, 'speaking'>, string> = {
  listening: "I'm listening…",
  thinking: 'Understanding you…',
  working: 'On it. I will tell you when it is done.',
  attention: 'I need your approval to go on.',
};

const cache = new Map<string, string>();

/** Short status lines in the user's language (Sarvam translates, results are cached; English shows at once and is the fallback). */
export function useBuddyLine(mode: BuddyMode | null, lang: string): string {
  const key = mode && mode !== 'speaking' ? mode : null;
  const english = key ? LINES[key] : '';
  const id = `${lang}|${key}`;
  const [, bump] = useState(0);
  useEffect(() => {
    if (!key || /^en(-|$)/i.test(lang) || lang === 'auto' || cache.has(id)) return;
    let live = true;
    fetch('/api/voice/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: english, lang }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { cache.set(id, j?.translated && j.text ? String(j.text) : english); if (live) bump((n) => n + 1); })
      .catch(() => cache.set(id, english));
    return () => { live = false; };
  }, [id, key, english, lang]);
  return cache.get(id) ?? english;
}

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Buddy({ mode, line, speech, onStop }: { mode: BuddyMode | null; line: string; speech: string; onStop?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const [shown, setShown] = useState<BuddyMode | null>(null);
  const [leaving, setLeaving] = useState(false);

  // stay mounted briefly after the mode ends so it can wave goodbye
  useEffect(() => {
    if (mode) { setShown(mode); setLeaving(false); return; }
    if (!shown) return;
    setLeaving(true);
    const t = setTimeout(() => { setShown(null); setLeaving(false); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const active = !!shown;
  useEffect(() => {
    if (!active) return;
    const still = reduced();
    const home = () => ({ x: window.innerWidth - 110, y: window.innerHeight - 150 });
    if (!pos.current.x && !pos.current.y) { pos.current = home(); target.current = { ...pos.current }; }
    // while Dabo speaks, the Stop button travels with it; when the cursor comes close, Dabo waits so the button can be reached and clicked
    const reachable = (e: PointerEvent) => {
      if (!box.current?.querySelector('.buddy-stop')) return false;
      const rs = [box.current.querySelector('.buddy-bubble'), box.current.querySelector('.buddy-svg')].map((n) => n?.getBoundingClientRect()).filter((r): r is DOMRect => !!r);
      if (!rs.length) return false;
      const m = 56;
      const l = Math.min(...rs.map((r) => r.left)) - m, r = Math.max(...rs.map((r) => r.right)) + m, t = Math.min(...rs.map((r) => r.top)) - m, b = Math.max(...rs.map((r) => r.bottom)) + m;
      return e.clientX > l && e.clientX < r && e.clientY > t && e.clientY < b;
    };
    const onMove = (e: PointerEvent) => { if (reachable(e)) return; target.current = still ? home() : { x: Math.min(e.clientX + 34, window.innerWidth - 90), y: Math.min(e.clientY + 30, window.innerHeight - 100) }; };
    const onResize = () => { if (still) target.current = home(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', onResize);
    let raf = 0;
    const tick = () => {
      const p = pos.current, t = target.current;
      const dx = t.x - p.x, dy = t.y - p.y;
      p.x += dx * 0.12; p.y += dy * 0.12;
      if (box.current) {
        box.current.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
        box.current.dataset.side = p.x > window.innerWidth / 2 ? 'left' : 'right';   // keep the speech bubble on screen
        box.current.dataset.vert = p.y < 150 ? 'below' : 'above';
      }
      if (eyes.current) { const m = Math.hypot(dx, dy) || 1; const k = Math.min(1, m / 60); eyes.current.style.transform = `translate(${(-dx / m) * 2.6 * k}px, ${(-dy / m) * 2.2 * k}px)`; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', onResize); };
  }, [active]);

  const speaking = shown === 'speaking';
  useEffect(() => {
    if (!speaking || !onStop) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onStop(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [speaking, onStop]);

  if (!shown) return null;
  const text = shown === 'speaking' ? (speech.length > 170 ? `${speech.slice(0, 167)}…` : speech) : line;
  return (
    <div ref={box} className={`buddy buddy-${shown}${leaving ? ' leaving' : ''}`} data-testid="buddy" data-mode={shown} role="status" aria-live="polite" aria-label={text || 'Darby companion'}>
      <div className="buddy-pop" onClick={speaking && onStop ? onStop : undefined} title={speaking ? 'Click to stop' : undefined}>
        {text && (
          <div className="buddy-bubble">
            <span>{text}</span>
            {shown === 'speaking' && onStop && <button className="buddy-stop" onClick={onStop} data-testid="buddy-stop" aria-label="Stop speaking">Stop</button>}
          </div>
        )}
        <svg className="buddy-svg" viewBox="0 0 120 120" width="84" height="84" aria-hidden="true">
          <defs>
            <linearGradient id="dabo-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3fbf8e" /><stop offset="1" stopColor="#0f7a5c" /></linearGradient>
            <radialGradient id="dabo-tip" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#fff7c2" /><stop offset="1" stopColor="#ffb938" /></radialGradient>
          </defs>
          <ellipse className="dabo-shadow" cx="60" cy="112" rx="26" ry="5" />
          <g className="dabo-body">
            <g className="dabo-ant dabo-ant-l"><path d="M44 30 C40 18 34 14 30 9" /><circle cx="29" cy="8" r="5" fill="url(#dabo-tip)" /></g>
            <g className="dabo-ant dabo-ant-r"><path d="M76 30 C80 18 86 14 90 9" /><circle cx="91" cy="8" r="5" fill="url(#dabo-tip)" /></g>
            <path className="dabo-arm dabo-arm-l" d="M18 66 C8 66 6 78 14 82" />
            <path className="dabo-arm dabo-arm-r" d="M102 66 C112 66 114 78 106 82" />
            <rect x="16" y="28" width="88" height="76" rx="34" fill="url(#dabo-body)" />
            <rect x="26" y="38" width="68" height="52" rx="26" className="dabo-face" />
            <ellipse cx="34" cy="76" rx="6" ry="4" className="dabo-cheek" /><ellipse cx="86" cy="76" rx="6" ry="4" className="dabo-cheek" />
            <g ref={eyes} className="dabo-eyes">
              <g className="dabo-eye"><ellipse cx="46" cy="62" rx="9" ry="10.5" className="dabo-white" /><circle cx="46" cy="63" r="5" className="dabo-pupil" /><circle cx="48" cy="60.5" r="1.6" fill="#fff" /></g>
              <g className="dabo-eye"><ellipse cx="74" cy="62" rx="9" ry="10.5" className="dabo-white" /><circle cx="74" cy="63" r="5" className="dabo-pupil" /><circle cx="76" cy="60.5" r="1.6" fill="#fff" /></g>
            </g>
            <path className="dabo-mouth" d="M52 80 Q60 86 68 80" />
            <ellipse className="dabo-mouth-open" cx="60" cy="82" rx="7" ry="5" />
          </g>
          {shown === 'speaking' && (
            <g className="dabo-waves"><path d="M112 40 q7 8 0 16" /><path d="M118 34 q11 14 0 28" /></g>
          )}
        </svg>
        {shown === 'speaking' && (
          <span className="buddy-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
          </span>
        )}
        {shown === 'listening' && <span className="buddy-rings" aria-hidden="true"><i /><i /><i /></span>}
        {(shown === 'thinking' || shown === 'working') && <span className="buddy-dots" aria-hidden="true"><i /><i /><i /></span>}
      </div>
    </div>
  );
}

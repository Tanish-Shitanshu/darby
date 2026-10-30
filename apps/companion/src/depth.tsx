import { useEffect, useRef } from 'react';

/* ---------- Depth: a honeycomb field that twists with scroll, perspective reveals, and card tilt ----------
   Hand-written canvas + CSS, no 3D library. Everything is subtle on purpose (thin lines, low contrast, slow motion), pauses when the tab is
   hidden, and falls back to a still frame (no motion at all) when the user prefers reduced motion. */

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const hash = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

export function DepthField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = reduced();
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0;
    const cursor = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let scroll = 0, scrollSmooth = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const hex = (x: number, y: number, r: number, rot: number) => {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = rot + (Math.PI / 3) * k + Math.PI / 6;
        const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const draw = (now: number) => {
      const t = now / 1000;
      cursor.x += (cursor.tx - cursor.x) * 0.12; cursor.y += (cursor.ty - cursor.y) * 0.12;
      scrollSmooth += (scroll - scrollSmooth) * 0.08;
      ctx.clearRect(0, 0, W, H);

      const R = Math.max(26, Math.min(44, W / 30));                 // cell size follows the screen
      const dx0 = R * Math.sqrt(3), dy0 = R * 1.5;
      const vx = W * 0.5, vy = H * 0.42;                            // the vortex centre
      const reach = Math.max(W, H) * 0.6;
      const twist = scrollSmooth * 0.0009;                          // scrolling winds the lattice up
      const cols = Math.ceil(W / dx0) + 4, rows = Math.ceil(H / dy0) + 4;

      for (let j = -2; j < rows; j++) {
        for (let i = -2; i < cols; i++) {
          const cx = i * dx0 + (j % 2 ? dx0 / 2 : 0), cy = j * dy0;
          const ox = cx - vx, oy = cy - vy;
          const r = Math.hypot(ox, oy);
          const swirl = (twist + (still ? 0 : Math.sin(t * 0.18) * 0.04)) * Math.exp(-r / (reach * 0.9)) * 6;   // inner cells turn more: a vortex, not a spin
          const c = Math.cos(swirl), s = Math.sin(swirl);
          const x = vx + ox * c - oy * s, y = vy + ox * s + oy * c;
          const depth = still ? 0 : Math.sin(r * 0.011 - t * 0.55 + scrollSmooth * 0.0024) * 9;           // a slow ripple travelling outwards
          const persp = 1 / (1 - depth / 520);
          if (x < -R * 2 || x > W + R * 2 || y < -R * 2 || y > H + R * 2) continue;

          const near = Math.max(0, 1 - Math.hypot(x - cursor.x, y - cursor.y) / 230);
          const pulse = still ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.7 + hash(i, j) * 6.283)), 14);        // the odd cell breathes
          const edge = Math.max(0, 1 - r / (reach * 1.25));                                                // fade toward the edges
          const a = (0.09 + near * near * 0.36 + pulse * 0.18) * (0.5 + edge * 0.5);
          if (a < 0.012) continue;
          const cr = R * 0.9 * persp * (1 + near * 0.08);
          hex(x, y, cr, swirl);
          if (near > 0.15) { ctx.fillStyle = `rgba(15,122,92,${(near * near * 0.07).toFixed(3)})`; ctx.fill(); }
          ctx.strokeStyle = `rgba(15,122,92,${a.toFixed(3)})`;
          ctx.lineWidth = 0.8 + near * 0.9;
          ctx.stroke();
        }
      }
    };

    const loop = (now: number) => {
      if (document.hidden) { raf = requestAnimationFrame(loop); return; }
      if (now - last > 30) { draw(now); last = now; }            // ~30 fps is plenty for slow thin lines, and cheap
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => { cursor.tx = e.clientX; cursor.ty = e.clientY; };
    const onScroll = () => { scroll = window.scrollY; if (still) draw(performance.now()); };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (still) { draw(0); } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('scroll', onScroll); window.removeEventListener('pointermove', onMove); };
  }, []);

  return <canvas ref={ref} className="depth-field" aria-hidden="true" />;
}

/** Perspective reveals for [data-reveal], card tilt + spotlight for [data-tilt], and a gentle parallax on the hero. Re-scans when `scanKey` changes. */
export function useDepthEffects(scanKey: string) {
  useEffect(() => {
    // content that arrives later (a page that fetches its data, a card added after a run) must be revealed too, so new nodes are watched for
    if (reduced()) {
      const showAll = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => el.classList.add('in'));
      showAll();
      const mo = new MutationObserver(showAll);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    const seen = new WeakSet<Element>();
    let batch = 0;
    const scan = () => {
      document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        (el as HTMLElement).style.setProperty('--i', String(batch++ % 6));
        io.observe(el);
      });
      batch = 0;
    };
    let raf = 0;
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; scan(); }); });
    mo.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => { mo.disconnect(); io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [scanKey]);

  useEffect(() => {
    if (reduced()) return;
    let active: HTMLElement | null = null;
    const reset = (el: HTMLElement | null) => { if (!el) return; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.classList.remove('tilting'); };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-tilt]') as HTMLElement | null;
      if (active && active !== el) reset(active);
      active = el;
      if (!el) return;
      const b = el.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      el.style.setProperty('--ry', `${((px - 0.5) * 9).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * 7).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      el.classList.add('tilting');
    };
    const onLeave = () => { reset(active); active = null; };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }, []);

  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      const lede = document.querySelector('.lede') as HTMLElement | null;
      const glow = document.querySelector('.hero-glow') as HTMLElement | null;
      if (lede) { lede.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`; lede.style.opacity = String(Math.max(0.25, 1 - y / 900)); }
      if (glow) glow.style.transform = `translate3d(0, ${(y * -0.2).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [scanKey]);
}

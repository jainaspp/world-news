import { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_BEATS, HERO_SEEN_KEY, HERO_SETTLE_AT, type HeroPhase } from '../../shared/heroOpening';
import { prefersReducedMotion } from '../utils/scroll';

/**
 * 開場 Hero：奇點 → 爆炸 → 原子湯 → 恆星 → 地球 → 交接入軸。
 *
 * Same structure as renderHeroOpening() in shared/heroOpening.ts (the SSR
 * render), so the client takes over without a markup swap. Every line sits
 * in normal flow from first paint — the reveal is opacity/transform only,
 * which keeps CLS at zero and makes overlap impossible by construction.
 * The canvas is decorative; the full text is always in the accessibility tree.
 */

interface HeroLevels {
  glow: number;
  stars: number;
  earth: number;
  line: number;
}

/** Canvas layer targets per chapter. Levels ease toward these every frame. */
const PHASE_TARGETS: Record<HeroPhase, HeroLevels> = {
  singularity: { glow: 1, stars: 0, earth: 0, line: 0 },
  bloom: { glow: 0.3, stars: 0.1, earth: 0, line: 0 },
  soup: { glow: 0, stars: 0.55, earth: 0, line: 0 },
  ignition: { glow: 0, stars: 1, earth: 0, line: 0 },
  earth: { glow: 0, stars: 1, earth: 1, line: 0 },
  handoff: { glow: 0, stars: 1, earth: 1, line: 1 },
};

interface Star {
  x: number;
  y: number;
  r: number;
  born: number;
  speed: number;
  phase: number;
  gold: boolean;
}

function buildStars(width: number, height: number): Star[] {
  const count = Math.max(90, Math.min(210, Math.round((width * height) / 8500)));
  const stars: Star[] = [];
  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.1 + 0.35,
      born: Math.random(),
      speed: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.16,
    });
  }
  return stars;
}

function softGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rgb: string, alpha: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
  gradient.addColorStop(0.55, `rgba(${rgb},${alpha * 0.28})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function HeroOpening() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bloomAtRef = useRef(0);
  const [reduced] = useState(prefersReducedMotion);
  const [mode, setMode] = useState<'playing' | 'settled'>(() => {
    if (prefersReducedMotion()) return 'settled';
    try {
      if (window.sessionStorage.getItem(HERO_SEEN_KEY)) return 'settled';
    } catch {
      /* private mode: play */
    }
    return 'playing';
  });
  const [revealed, setRevealed] = useState(mode === 'settled' ? HERO_BEATS.length : 0);
  const [phase, setPhase] = useState<HeroPhase>(mode === 'settled' ? 'handoff' : 'singularity');
  const [runId, setRunId] = useState(0);
  const phaseRef = useRef<HeroPhase>(phase);

  const finish = useCallback((markSeen: boolean) => {
    setRevealed(HERO_BEATS.length);
    setPhase('handoff');
    setMode('settled');
    if (markSeen) {
      try {
        window.sessionStorage.setItem(HERO_SEEN_KEY, '1');
      } catch {
        /* private mode */
      }
    }
  }, []);

  const skip = useCallback(() => finish(true), [finish]);

  const replay = useCallback(() => {
    bloomAtRef.current = 0;
    setRevealed(0);
    setPhase('singularity');
    setRunId((id) => id + 1);
    setMode('playing');
  }, []);

  /* Claim the SSR section so its 4s no-script fallback stands down. */
  useEffect(() => {
    sectionRef.current?.setAttribute('data-hero-boot', '1');
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === 'bloom') bloomAtRef.current = performance.now();
  }, [phase]);

  useEffect(() => {
    if (mode !== 'playing') return undefined;
    const timers = HERO_BEATS.map((beat, index) =>
      window.setTimeout(() => {
        setRevealed(index + 1);
        setPhase(beat.phase);
      }, beat.at),
    );
    const done = window.setTimeout(() => finish(true), HERO_SETTLE_AT);
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.clearTimeout(done);
    };
  }, [mode, runId, finish]);

  /* Decorative canvas. One rAF loop, paused offscreen / when hidden; a single
     static frame under prefers-reduced-motion. Reads phaseRef, never React
     state, so phase changes do not restart the loop. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const levels: HeroLevels = { ...PHASE_TARGETS[phaseRef.current] };
    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;
    let inView = true;
    let lastT = 0;

    const draw = (t: number) => {
      const target = PHASE_TARGETS[phaseRef.current];
      const dt = Math.min(64, t - (lastT || t));
      lastT = t;
      const ease = 1 - Math.exp(-dt / 480);
      levels.glow += (target.glow - levels.glow) * ease;
      levels.stars += (target.stars - levels.stars) * ease;
      levels.earth += (target.earth - levels.earth) * ease;
      levels.line += (target.line - levels.line) * ease;

      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.4;

      if (levels.glow > 0.01) {
        const pulse = 0.9 + 0.1 * Math.sin(t / 880);
        softGlow(ctx, cx, cy, Math.min(width, height) * 0.3 * pulse, '232,228,220', 0.34 * levels.glow);
        ctx.fillStyle = `rgba(247,241,230,${0.9 * levels.glow})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const bloomAt = bloomAtRef.current;
      if (bloomAt > 0) {
        const age = t - bloomAt;
        if (age >= 0 && age < 1700) {
          const progress = age / 1700;
          const eased = 1 - Math.pow(1 - progress, 3);
          ctx.strokeStyle = `rgba(240,235,227,${0.5 * (1 - progress)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(cx, cy, eased * Math.hypot(width, height) * 0.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      for (const star of stars) {
        const gate = Math.min(1, Math.max(0, (levels.stars - star.born * 0.85) / 0.15));
        if (gate <= 0) continue;
        const twinkle = 0.66 + 0.34 * Math.sin(t * 0.0011 * star.speed + star.phase);
        const alpha = gate * twinkle * (star.gold ? 0.95 : 0.8);
        ctx.fillStyle = star.gold ? `rgba(196,165,114,${alpha})` : `rgba(224,229,238,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (levels.earth > 0.01) {
        const ex = width * 0.74;
        const ey = height * 0.6;
        softGlow(ctx, ex, ey, 26, '158,192,239', 0.5 * levels.earth);
        ctx.fillStyle = `rgba(158,192,239,${0.95 * levels.earth})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(247,251,255,${0.9 * levels.earth})`;
        ctx.beginPath();
        ctx.arc(ex - 0.7, ey - 0.7, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      if (levels.line > 0.01) {
        const lineWidth = width * levels.line;
        const left = (width - lineWidth) / 2;
        const gradient = ctx.createLinearGradient(left, 0, left + lineWidth, 0);
        gradient.addColorStop(0, 'rgba(196,165,114,0)');
        gradient.addColorStop(0.5, `rgba(196,165,114,${0.85 * levels.line})`);
        gradient.addColorStop(1, 'rgba(196,165,114,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(left, height - 1.5, lineWidth, 1.5);
      }
    };

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = buildStars(width, height);
      if (reduced) draw(4000);
    };

    const tick = (t: number) => {
      draw(t);
      raf = running ? window.requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (running || reduced || !inView || document.hidden) return;
      running = true;
      lastT = 0;
      raf = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };
    const gate = () => {
      if (inView && !document.hidden) start();
      else stop();
    };

    const observer = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      gate();
    });
    observer.observe(section);
    const onVisibility = () => gate();
    document.addEventListener('visibilitychange', onVisibility);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);

    resize();
    if (reduced) draw(4000);
    else start();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced]);

  return (
    <section ref={sectionRef} className="hero-opening" id="hero-opening" data-mode={mode} data-phase={phase} aria-label="開場：從奇點到今天">
      <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
      <div className="hero-inner">
        <p className="hero-kicker">文明編年史 · 開場</p>
        <h2 className="hero-title">從宇宙到今天</h2>
        <div className="hero-lines">
          {HERO_BEATS.map((beat, index) => (
            <p key={beat.id} className="hero-line" data-beat={beat.id} data-on={index < revealed ? 'true' : 'false'}>
              <span className="hero-main">{beat.main}</span>
              {beat.aside ? <span className="hero-aside">{beat.aside}</span> : null}
            </p>
          ))}
        </div>
        <div className="hero-cta">
          <a className="hero-btn hero-btn-brass" href="#slice">進入今日切片</a>
          <a className="hero-btn hero-btn-ghost" href="/civilization/">打開文明總覽</a>
        </div>
        <p className="hero-hint-row">
          <a className="hero-hint" href="#slice">向下滾動，開始編年</a>
        </p>
      </div>
      <button className="hero-skip" type="button" onClick={skip}>跳過開場</button>
      <button className="hero-replay" type="button" onClick={replay}>重播開場</button>
    </section>
  );
}

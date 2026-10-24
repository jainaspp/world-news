import { useCallback, useEffect, useRef, useState } from 'react';
import { MONITOR_READING } from '../../shared/civilization/clock';
import {
  HERO_AIR_KEYS,
  HERO_ARIA_LABEL,
  HERO_BEATS,
  HERO_HINT,
  HERO_KICKER,
  HERO_PRIMARY,
  HERO_RAIL_STOPS,
  HERO_REPLAY_LABEL,
  HERO_RING_AT,
  HERO_RING_MS,
  HERO_RING_RGB,
  HERO_RING_WIDTH,
  HERO_SECONDARY,
  HERO_SEEN_KEY,
  HERO_SETTLE_AT,
  HERO_SKIP_LABEL,
  HERO_TITLE,
  HERO_VIOLET_RGB,
  heroAirAt,
  heroCanvasDpr,
  heroDialCenter,
  heroEarthCenter,
  heroEarthRadius,
  heroMinuteAngle,
  heroPlaybackAt,
  heroReadingMinutes,
  heroRingAlpha,
  heroRingRadius,
  heroStageAt,
  type HeroAir,
  type HeroChapter,
  type HeroPhase,
} from '../../shared/heroOpening';
import { cssColorToRgb, heroStarPoint, syncHeroStarField, type HeroStar, type StarField } from '../../shared/heroStars';
import { prefersReducedMotion } from '../utils/scroll';

/**
 * Twelve-second scientific cold open.
 *
 * Same DOM as renderHeroOpening(): #hero-opening, the line list, both CTAs,
 * skip and replay. The title is opaque from the first frame. The canvas is
 * decorative and fades in only after it has painted, so it does not take LCP.
 * The minute hand is drawn once, on MONITOR_READING.minutes. No second hand.
 */

interface Boot {
  mode: 'playing' | 'settled';
  revealed: number;
  phase: HeroPhase;
  chapter: HeroChapter;
  reading: boolean;
  elapsed: number;
}

function readHeroBootElapsed(): number {
  if (typeof window === 'undefined') return 0;
  const stamp = (window as unknown as { __WN_HERO_T0?: unknown }).__WN_HERO_T0;
  if (typeof stamp !== 'number' || !Number.isFinite(stamp)) return 0;
  return Math.max(0, Date.now() - stamp);
}

function initialHero(): Boot {
  if (prefersReducedMotion()) {
    return { mode: 'settled', revealed: HERO_BEATS.length, phase: 'handoff', chapter: 'future', reading: true, elapsed: 0 };
  }
  try {
    if (window.sessionStorage.getItem(HERO_SEEN_KEY)) {
      return { mode: 'settled', revealed: HERO_BEATS.length, phase: 'handoff', chapter: 'future', reading: true, elapsed: 0 };
    }
  } catch {
    /* private mode: play */
  }
  const elapsed = readHeroBootElapsed();
  const playback = heroPlaybackAt(elapsed);
  if (playback.settled) {
    return { mode: 'settled', revealed: HERO_BEATS.length, phase: 'handoff', chapter: 'future', reading: true, elapsed };
  }
  return { mode: 'playing', revealed: playback.revealed, phase: playback.phase, chapter: playback.chapter, reading: playback.reading, elapsed };
}

function eraRgb(section: HTMLElement, name: string, fallback: string): string {
  const raw = getComputedStyle(section).getPropertyValue(name).trim();
  return cssColorToRgb(raw) ?? cssColorToRgb(fallback) ?? fallback;
}

function softGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rgb: string, alpha: number) {
  if (alpha <= 0.01 || radius <= 1) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
  gradient.addColorStop(0.55, `rgba(${rgb},${alpha * 0.28})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, widthPx: number, color: string, alpha: number) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = widthPx;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, length * 0.14);
  ctx.lineTo(0, -length);
  ctx.stroke();
  ctx.restore();
}

function drawEarth(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number, glowRgb: string) {
  if (alpha <= 0.02) return;
  softGlow(ctx, x, y, radius * 4.4, glowRgb, 0.4 * alpha);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  const body = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
  body.addColorStop(0, `rgba(244,249,255,${alpha})`);
  body.addColorStop(0.45, `rgba(${glowRgb},${alpha})`);
  body.addColorStop(1, `rgba(46,74,120,${alpha})`);
  ctx.fillStyle = body;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.fillStyle = `rgba(14,22,36,${0.42 * alpha})`;
  ctx.beginPath();
  ctx.arc(x + radius * 0.62, y + radius * 0.08, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = `rgba(214,230,248,${0.55 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

/** Twelve ticks, hour hand fixed at midnight, one minute hand. No second hand. */
function drawDial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  handAlpha: number,
  minutes: number,
  gold: string,
) {
  if (alpha <= 0.02 && handAlpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(232,228,220,0.72)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.35;
  ctx.beginPath();
  ctx.arc(x, y, radius - 5, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 12; index += 1) {
    const ang = -Math.PI / 2 + index * (Math.PI / 6);
    const outer = radius - 2;
    const inner = index === 0 ? radius - 11 : radius - 6.5;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = index === 0 ? `rgb(${gold})` : 'rgba(232,228,220,0.75)';
    ctx.lineWidth = index === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * inner, y + Math.sin(ang) * inner);
    ctx.lineTo(x + Math.cos(ang) * outer, y + Math.sin(ang) * outer);
    ctx.stroke();
  }
  ctx.restore();
  drawHand(ctx, x, y, radius * 0.38, 0, 2.4, `rgb(${gold})`, alpha);
  const minuteAngle = heroMinuteAngle(minutes);
  const minuteLen = radius * 0.78;
  drawHand(ctx, x, y, minuteLen, minuteAngle, 1.5, '#f7f1e6', handAlpha);
  if (handAlpha > 0.2) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(minuteAngle);
    ctx.globalAlpha = handAlpha;
    ctx.fillStyle = '#f7f1e6';
    ctx.beginPath();
    ctx.arc(0, -minuteLen, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = Math.max(alpha, handAlpha);
  ctx.fillStyle = '#f7f1e6';
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** SSR hero lives outside #root so createRoot cannot drop the LCP title. */
function hostedHero(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const node = document.getElementById('hero-opening');
  const root = document.getElementById('root');
  if (!(node instanceof HTMLElement) || !root || root.contains(node)) return null;
  return node;
}

function drawRail(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number) {
  if (alpha <= 0.02) return;
  const y = height - 2;
  const span = width * Math.min(1, alpha);
  const left = (width - span) / 2;
  const gradient = ctx.createLinearGradient(left, 0, left + span, 0);
  for (const stop of HERO_RAIL_STOPS) gradient.addColorStop(stop.at, stop.color);
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = gradient;
  ctx.fillRect(left, y, span, 2);
  ctx.restore();
}

export function HeroOpening() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hosted] = useState(hostedHero);
  if (hosted) {
    sectionRef.current = hosted;
    const canvas = hosted.querySelector('canvas');
    if (canvas instanceof HTMLCanvasElement) canvasRef.current = canvas;
  }
  const settlePaintRef = useRef<() => void>(() => {});
  const [reduced] = useState(prefersReducedMotion);
  const [boot] = useState(initialHero);
  const bootElapsedRef = useRef(boot.elapsed);
  const revealedRef = useRef(boot.revealed);
  const phaseRef = useRef<HeroPhase>(boot.phase);
  const chapterRef = useRef<HeroChapter>(boot.chapter);
  const readingRef = useRef(boot.reading);
  const stoppedRef = useRef(boot.mode !== 'playing');
  const [mode, setMode] = useState<'playing' | 'settled'>(boot.mode);
  const [revealed, setRevealed] = useState(boot.revealed);
  const [phase, setPhase] = useState<HeroPhase>(boot.phase);
  const [chapter, setChapter] = useState<HeroChapter>(boot.chapter);
  const [reading, setReading] = useState(boot.reading);
  const [runId, setRunId] = useState(0);
  const [canvasOn, setCanvasOn] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const finish = useCallback((markSeen: boolean) => {
    stoppedRef.current = true;
    revealedRef.current = HERO_BEATS.length;
    phaseRef.current = 'handoff';
    chapterRef.current = 'future';
    readingRef.current = true;
    settlePaintRef.current();
    setRevealed(HERO_BEATS.length);
    setPhase('handoff');
    setChapter('future');
    setReading(true);
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
    if (reduced) {
      stoppedRef.current = true;
      settlePaintRef.current();
      return;
    }
    stoppedRef.current = false;
    revealedRef.current = 0;
    phaseRef.current = 'singularity';
    chapterRef.current = 'ancient';
    readingRef.current = false;
    setRevealed(0);
    setPhase('singularity');
    setChapter('ancient');
    setReading(false);
    setMode('playing');
    setRunId((id) => id + 1);
  }, [reduced]);

  useEffect(() => {
    sectionRef.current?.setAttribute('data-hero-boot', '1');
  }, []);

  useEffect(() => {
    if (!hosted) return undefined;
    hosted.dataset.mode = mode;
    hosted.dataset.phase = phase;
    hosted.dataset.chapter = chapter;
    hosted.querySelectorAll('.hero-line').forEach((line, index) => {
      line.setAttribute('data-on', index < revealed ? 'true' : 'false');
    });
    hosted.querySelector('.hero-reading')?.setAttribute('data-on', reading ? 'true' : 'false');
    hosted.querySelector('canvas')?.classList.toggle('is-drawn', canvasOn);
    return undefined;
  }, [hosted, mode, phase, chapter, revealed, reading, canvasOn]);

  useEffect(() => {
    if (!hosted) return undefined;
    const onSkip = () => skip();
    const onReplay = () => replay();
    const skipBtn = hosted.querySelector('[data-hero-skip]');
    const replayBtn = hosted.querySelector('[data-hero-replay]');
    skipBtn?.addEventListener('click', onSkip);
    replayBtn?.addEventListener('click', onReplay);
    return () => {
      skipBtn?.removeEventListener('click', onSkip);
      replayBtn?.removeEventListener('click', onReplay);
    };
  }, [hosted, skip, replay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const ancient = eraRgb(section, '--era-ancient', '#c4a572');
    const nowBlue = eraRgb(section, '--era-now', '#9ec0ef');
    const future = eraRgb(section, '--era-future', '#2a2140');
    const minutes = heroReadingMinutes(MONITOR_READING.minutes);
    let field: StarField | null = null;
    let stars: readonly HeroStar[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = false;
    let inView = true;
    let alive = true;
    let lastT = 0;
    let ringAt = -1;
    let ringUsed = false;
    let paused = 0;
    let pauseBegan = 0;
    const base = runId === 0 ? bootElapsedRef.current : 0;
    const origin = performance.now() - base;
    if (base >= HERO_RING_AT && base < HERO_RING_AT + HERO_RING_MS) {
      ringUsed = true;
      ringAt = performance.now() - (base - HERO_RING_AT);
    } else if (base >= HERO_RING_AT + HERO_RING_MS) {
      ringUsed = true;
    }
    const levels: HeroAir = heroAirAt(stoppedRef.current ? HERO_SETTLE_AT : base);
    let modeLocal: 'playing' | 'settled' = reduced || stoppedRef.current || modeRef.current !== 'playing' ? 'settled' : 'playing';

    const paintWash = () => {
      section.style.setProperty('--gold-a', levels.gold.toFixed(3));
      section.style.setProperty('--blue-a', levels.blue.toFixed(3));
      section.style.setProperty('--violet-a', levels.violet.toFixed(3));
    };

    const publish = (elapsed: number) => {
      if (!alive) return;
      const playback = heroPlaybackAt(elapsed);
      if (playback.revealed !== revealedRef.current) {
        revealedRef.current = playback.revealed;
        setRevealed(playback.revealed);
      }
      if (playback.phase !== phaseRef.current) {
        phaseRef.current = playback.phase;
        setPhase(playback.phase);
      }
      if (playback.chapter !== chapterRef.current) {
        chapterRef.current = playback.chapter;
        setChapter(playback.chapter);
      }
      if (playback.reading !== readingRef.current) {
        readingRef.current = playback.reading;
        setReading(playback.reading);
      }
    };

    const showCanvas = () => {
      if (alive) setCanvasOn(true);
    };

    const draw = (now: number, showRing: boolean) => {
      ctx.clearRect(0, 0, width, height);
      const dial = heroDialCenter(width);
      const earthAt = heroEarthCenter(width);
      for (const star of stars) {
        const gate = Math.min(1, Math.max(0, (levels.stars - star.born * 0.85) / 0.15));
        if (gate <= 0) continue;
        const twinkle = modeLocal === 'playing' ? 0.66 + 0.34 * Math.sin(now * 0.0011 * star.speed + star.phase) : 0.82;
        const warm = star.gold ? 1 : levels.gold * 0.85;
        const red = Math.round(224 + (196 - 224) * warm);
        const green = Math.round(229 + (165 - 229) * warm);
        const blue = Math.round(238 + (114 - 238) * warm);
        const alpha = gate * twinkle * (star.gold ? 0.95 : 0.78);
        const point = heroStarPoint(star, width, height);
        ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      drawEarth(ctx, earthAt.x, earthAt.y, heroEarthRadius(levels.earth), levels.earth, nowBlue);
      const pointAlpha = levels.glow * (1 - levels.dial);
      softGlow(ctx, dial.x, dial.y, dial.r * 1.35, '226,196,140', 0.42 * pointAlpha);
      if (pointAlpha > 0.04) {
        ctx.fillStyle = `rgba(247,241,230,${pointAlpha})`;
        ctx.beginPath();
        ctx.arc(dial.x, dial.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      if (showRing && ringAt >= 0) {
        const age = now - ringAt;
        const radius = heroRingRadius(age, width, height);
        const alpha = heroRingAlpha(age);
        if (radius && alpha > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(${HERO_RING_RGB},${alpha})`;
          ctx.lineWidth = HERO_RING_WIDTH;
          ctx.beginPath();
          ctx.arc(dial.x, dial.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      const handAlpha = Math.max(0, Math.min(1, (levels.hand - 0.42) / 0.58));
      drawDial(ctx, dial.x, dial.y, dial.r, levels.dial, handAlpha, minutes, ancient);
      if (levels.violet > 0.01) {
        const glow = ctx.createLinearGradient(0, height * 0.84, 0, height);
        glow.addColorStop(0, `rgba(${future},0)`);
        glow.addColorStop(1, `rgba(${HERO_VIOLET_RGB},${0.22 * levels.violet})`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, height * 0.84, width, height * 0.16);
      }
      drawRail(ctx, width, height, levels.rail);
    };

    const applyStage = (elapsed: number, dt: number, snap: boolean) => {
      const stage = heroStageAt(elapsed);
      const ease = snap ? 1 : 1 - Math.exp(-dt / 480);
      for (const key of HERO_AIR_KEYS) {
        levels[key] += (stage[key] - levels[key]) * ease;
      }
      if (stage.ring && !ringUsed && !snap && !reduced) {
        ringUsed = true;
        ringAt = performance.now();
      }
      paintWash();
    };

    const snapEnd = () => {
      const end = heroAirAt(HERO_SETTLE_AT);
      for (const key of HERO_AIR_KEYS) levels[key] = end[key];
      ringAt = -1;
      paintWash();
    };

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      const dpr = heroCanvasDpr(nextW, window.devicePixelRatio || 1);
      const next = syncHeroStarField(field, nextW, nextH);
      field = next.field;
      stars = field.stars;
      width = nextW;
      height = nextH;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const stop = () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const elapsedMs = (now: number) => {
      if (modeLocal !== 'playing') return HERO_SETTLE_AT;
      const end = pauseBegan || now;
      return Math.max(0, end - origin - paused);
    };

    const drawSettled = () => {
      modeLocal = 'settled';
      resize();
      snapEnd();
      draw(0, false);
      showCanvas();
      stop();
    };
    settlePaintRef.current = drawSettled;

    const frame = (now: number) => {
      if (!alive || stoppedRef.current || modeLocal !== 'playing') {
        stop();
        return;
      }
      const dt = lastT ? Math.min(64, now - lastT) : 16;
      lastT = now;
      const elapsed = elapsedMs(now);
      if (elapsed >= HERO_SETTLE_AT) {
        finish(true);
        return;
      }
      applyStage(elapsed, dt, false);
      publish(elapsed);
      draw(now, true);
      showCanvas();
      if (alive && !stoppedRef.current && inView && !document.hidden && modeLocal === 'playing') {
        raf = window.requestAnimationFrame(frame);
      } else {
        stop();
      }
    };

    const start = () => {
      if (running || !alive || stoppedRef.current || modeLocal !== 'playing' || !inView || document.hidden) return;
      running = true;
      lastT = 0;
      raf = window.requestAnimationFrame(frame);
    };

    const setPause = (hold: boolean) => {
      if (hold) {
        if (!pauseBegan) pauseBegan = performance.now();
        stop();
        return;
      }
      if (pauseBegan) {
        paused += performance.now() - pauseBegan;
        pauseBegan = 0;
      }
      start();
    };

    const gate = () => {
      setPause(!inView || document.hidden || modeLocal !== 'playing' || stoppedRef.current);
    };

    const observer = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
      gate();
    });
    observer.observe(section);
    const onVisibility = () => gate();
    document.addEventListener('visibilitychange', onVisibility);
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (modeLocal !== 'playing' || pauseBegan || stoppedRef.current) {
        if (modeLocal !== 'playing' || stoppedRef.current) snapEnd();
        draw(modeLocal === 'playing' ? performance.now() : 0, modeLocal === 'playing');
        showCanvas();
      }
    });
    resizeObserver.observe(section);
    resize();
    if (modeLocal !== 'playing') drawSettled();
    else start();

    return () => {
      alive = false;
      stop();
      settlePaintRef.current = () => {};
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced, runId, finish]);

  const minutes = heroReadingMinutes(MONITOR_READING.minutes);

  if (hosted) return null;

  return (
    <section
      ref={sectionRef}
      className="hero-opening"
      id="hero-opening"
      data-mode={mode}
      data-phase={phase}
      data-chapter={chapter}
      aria-label={HERO_ARIA_LABEL}
    >
      <canvas ref={canvasRef} className={canvasOn ? 'hero-canvas is-drawn' : 'hero-canvas'} aria-hidden="true" />
      <div className="hero-inner">
        <p className="hero-kicker">{HERO_KICKER}</p>
        <h2 className="hero-title">{HERO_TITLE}</h2>
        <p className="hero-reading" data-on={reading ? 'true' : 'false'}>
          監測刻度 · 午夜前 <span className="hero-minute">{minutes}</span> 分
        </p>
        <div className="hero-lines">
          {HERO_BEATS.map((beat, index) => (
            <p key={beat.id} className="hero-line" data-beat={beat.id} data-on={index < revealed ? 'true' : 'false'}>
              <span className="hero-main">{beat.main}</span>
              {beat.aside ? <span className="hero-aside">{beat.aside}</span> : null}
            </p>
          ))}
        </div>
        <div className="hero-cta">
          <a className="hero-btn hero-btn-brass" href={HERO_PRIMARY.href}>{HERO_PRIMARY.label}</a>
          <a className="hero-btn hero-btn-ghost" href={HERO_SECONDARY.href}>{HERO_SECONDARY.label}</a>
        </div>
        <p className="hero-hint-row">
          <a className="hero-hint" href={HERO_HINT.href}>{HERO_HINT.label}</a>
        </p>
      </div>
      <button className="hero-skip" type="button" data-hero-skip onClick={skip}>{HERO_SKIP_LABEL}</button>
      <button className="hero-replay" type="button" data-hero-replay onClick={replay}>{HERO_REPLAY_LABEL}</button>
    </section>
  );
}

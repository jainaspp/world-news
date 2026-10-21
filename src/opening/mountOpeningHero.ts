import {
  OPENING_HERO_MS,
  OPENING_SESSION_KEY,
  makeStars,
  openingCue,
  settledCue,
  type OpeningCue,
  type SkyStar,
} from '../../shared/civilization/openingHero';
import { prefersReducedMotion, scrollBehavior } from '../utils/scroll';
import { paintSky } from './heroSky';

function readSettled(): boolean {
  try {
    return sessionStorage.getItem(OPENING_SESSION_KEY) === 'settled';
  } catch {
    return false;
  }
}

function writeSettled(): void {
  try {
    sessionStorage.setItem(OPENING_SESSION_KEY, 'settled');
  } catch {
    /* private mode */
  }
}

function clearSettled(): void {
  try {
    sessionStorage.removeItem(OPENING_SESSION_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Paints the plate and steps the lines. The loop stops when the hero settles,
 * leaves the screen, or the tab hides. Reduced motion paints the last frame once.
 */
export function mountOpeningHero(root: ParentNode): () => void {
  const hero = root.querySelector('.bbt-hero');
  const canvas = root.querySelector('.bbt-sky');
  const stage = root.querySelector('.bbt-stage');
  if (!(hero instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return () => undefined;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const plate: HTMLElement = hero;
  const sky: HTMLCanvasElement = canvas;
  const ink: CanvasRenderingContext2D = ctx;

  const reduce = prefersReducedMotion() || document.body.classList.contains('static');
  let bucket = window.innerWidth < 420 ? 96 : 150;
  let stars: SkyStar[] = makeStars(bucket);
  let playing = false;
  let elapsed = 0;
  let start = 0;
  let raf = 0;
  let lastW = 0;
  let lastH = 0;
  let lastDpr = 0;

  function fit(): { w: number; h: number } {
    const parent = sky.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : sky.getBoundingClientRect();
    const narrow = rect.width < 420;
    const dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (sky.width !== bw || sky.height !== bh || lastDpr !== dpr) {
      sky.width = bw;
      sky.height = bh;
      lastDpr = dpr;
    }
    sky.style.width = `${w}px`;
    sky.style.height = `${h}px`;
    ink.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastW = w;
    lastH = h;
    return { w, h };
  }

  function applyCue(cue: OpeningCue): void {
    const { w, h } = fit();
    if (w < 2 || h < 2) return;
    paintSky(ink, w, h, cue, stars);
    if (stage instanceof HTMLElement) stage.dataset.beat = cue.beat;
    const live = plate.classList.contains('is-live');
    plate.querySelectorAll('.bbt-line').forEach((line, index) => {
      line.classList.toggle('is-on', !live || index === cue.lineIndex);
      if (line instanceof HTMLElement) {
        if (live && index === cue.lineIndex) line.setAttribute('aria-current', 'true');
        else line.removeAttribute('aria-current');
      }
    });
    plate.querySelectorAll('.bbt-beat').forEach((button) => {
      const on = button.getAttribute('data-beat') === cue.beat;
      button.classList.toggle('is-on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function settle(): void {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    plate.dataset.state = 'still';
    if (!reduce) plate.classList.add('is-live');
    else plate.classList.remove('is-live');
    applyCue(settledCue());
    writeSettled();
  }

  function frame(now: number): void {
    raf = 0;
    if (!playing) return;
    elapsed = now - start;
    if (elapsed >= OPENING_HERO_MS) {
      settle();
      return;
    }
    applyCue(openingCue(elapsed));
    if (playing) raf = requestAnimationFrame(frame);
  }

  function startLoop(): void {
    if (!playing || raf || document.hidden) return;
    start = performance.now() - elapsed;
    raf = requestAnimationFrame(frame);
  }

  function play(from: number): void {
    if (reduce) {
      settle();
      return;
    }
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    playing = true;
    elapsed = from;
    plate.classList.add('is-live');
    plate.dataset.state = 'play';
    applyCue(openingCue(from));
    startLoop();
  }

  if (reduce || readSettled()) settle();
  else play(0);

  function onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const beat = target.closest('.bbt-beat');
    if (beat instanceof HTMLButtonElement) {
      if (!reduce) play(Number(beat.dataset.at || 0));
      return;
    }
    const act = target.closest('[data-act]');
    if (!(act instanceof HTMLButtonElement)) return;
    if (act.dataset.act === 'skip') settle();
    if (act.dataset.act === 'replay') {
      clearSettled();
      play(0);
    }
  }

  const handoff = plate.querySelector('a[href="#civ"]');
  function onHandoff(event: Event): void {
    const axis = document.getElementById('civ');
    if (!axis) return;
    event.preventDefault();
    const chrome = document.querySelector('.chrome');
    const offset = chrome instanceof HTMLElement ? chrome.offsetHeight + 16 : 220;
    axis.style.scrollMarginTop = `${offset}px`;
    axis.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }

  function onResize(): void {
    const next = window.innerWidth < 420 ? 96 : 150;
    if (next !== bucket) {
      bucket = next;
      stars = makeStars(bucket);
    }
    if (lastW === 0 && lastH === 0) return;
    applyCue(playing ? openingCue(elapsed) : settledCue());
  }

  plate.addEventListener('click', onClick);
  handoff?.addEventListener('click', onHandoff);

  const resize = new ResizeObserver(onResize);
  if (stage instanceof Element) resize.observe(stage);
  else resize.observe(plate);

  const io = new IntersectionObserver((entries) => {
    const entry = entries[0];
    const onScreen = !!entry && entry.isIntersecting && entry.intersectionRatio >= 0.35;
    if (!onScreen) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    startLoop();
  }, { threshold: [0, 0.35, 0.6] });
  io.observe(plate);

  function onVis(): void {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    startLoop();
  }
  document.addEventListener('visibilitychange', onVis);

  return () => {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    plate.removeEventListener('click', onClick);
    handoff?.removeEventListener('click', onHandoff);
    resize.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}

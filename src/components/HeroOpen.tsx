import { useCallback, useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import {
  HERO_CTA_MS,
  HERO_NARRATIVE,
  HERO_PLAYED_FLAG,
  HERO_SETTLE_END_MS,
  heroKicker,
  type HeroBeat,
} from '../../shared/hero/heroNarrative';
import { CosmosPainter } from '../hero/heroCosmos';
import { prefersReducedMotion, scrollBehavior } from '../utils/scroll';

/**
 * Homepage opening prologue: 星塵獨白 over an ink-paper cosmos.
 *
 * One master clock drives everything. The narration beats and the canvas
 * read the same timeline, so copy and scenery stay in lock-step; the clock
 * pauses when the hero leaves the viewport or the tab is hidden, and the
 * story resumes exactly where it stopped. Reduced motion or body.static
 * skips the film — every beat is simply there, with one static tableau frame.
 *
 * The film plays once per session; returning mounts settle instantly into
 * the ambient tableau, so the opening stays a welcome, not a toll booth.
 */

/** Mirrors the site's html.civ-motion boot: hides beats until the clock says them. */
const MOTION_CLASS = 'hero-motion';

function beatClass(beat: HeroBeat): string {
  if (beat.kind === 'aside') return 'hero-line hero-aside';
  if (beat.kind === 'bang') return 'hero-line hero-line--bang';
  return 'hero-line';
}

function BeatText({ beat }: { beat: HeroBeat }) {
  if (!beat.emphasis) return <>{beat.text}</>;
  const at = beat.text.indexOf(beat.emphasis);
  if (at < 0) return <>{beat.text}</>;
  return (
    <>
      {beat.text.slice(0, at)}
      <span className="hero-bang">{beat.emphasis}</span>
      {beat.text.slice(at + beat.emphasis.length)}
    </>
  );
}

export function HeroOpen() {
  const rootRef = useRef<HTMLElement | null>(null);

  const scrollToTarget = useCallback((event: ReactMouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    const target = href ? document.querySelector(href) : null;
    if (!(target instanceof HTMLElement)) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }, []);

  // Layout effect on purpose: the beat-hidden CSS must apply before the
  // browser's first paint of the hero, or the opening would flash fully
  // written for one frame before the film arcs back to its blank page.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const canvas = root.querySelector<HTMLCanvasElement>('.hero-canvas');
    const painter = canvas ? new CosmosPainter(canvas) : null;
    const doc = document.documentElement;
    const applySize = () => {
      const dpr = window.devicePixelRatio || 1;
      painter?.resize(root.clientWidth, root.clientHeight, dpr);
    };

    const beats = Array.from(root.querySelectorAll<HTMLElement>('[data-beat]'));
    const sayAll = () => beats.forEach((beat) => beat.classList.add('is-said'));
    const reduced = prefersReducedMotion() || document.body.classList.contains('static');
    let alreadyPlayed = false;
    try {
      alreadyPlayed = window.sessionStorage.getItem(HERO_PLAYED_FLAG) === '1';
    } catch {
      /* private mode */
    }

    applySize();

    if (reduced || alreadyPlayed) {
      painter?.drawTableau();
      sayAll();
      root.classList.add('is-settled');
      const onResize = () => {
        applySize();
        painter?.drawTableau();
      };
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        painter?.dispose();
      };
    }

    doc.classList.add(MOTION_CLASS);
    let elapsed = 0;
    let saidThrough = 0;
    let settled = false;
    let frame = 0;
    let running = true;
    let raf = 0;
    let lastTick = performance.now();

    const sayPast = (tMs: number) => {
      for (let index = saidThrough; index < beats.length; index += 1) {
        const start = Number(beats[index].dataset.beat);
        if (tMs >= start) {
          beats[index].classList.add('is-said');
          saidThrough = index + 1;
        } else {
          break;
        }
      }
    };

    const markSettled = () => {
      if (settled) return;
      settled = true;
      root.classList.add('is-settled');
      sayAll();
      try {
        window.sessionStorage.setItem(HERO_PLAYED_FLAG, '1');
      } catch {
        /* private mode */
      }
      // Drop the gate one beat after the last reveal so the CSS default is
      // again "visible" — a late re-render can never re-hide the copy.
      window.setTimeout(() => doc.classList.remove(MOTION_CLASS), 1200);
    };

    const tick = (now: number) => {
      if (!running) return;
      elapsed += now - lastTick;
      lastTick = now;
      frame += 1;
      sayPast(elapsed);
      if (elapsed >= HERO_SETTLE_END_MS) markSettled();
      // Ambient mode keeps the galaxy alive at half frame rate.
      const frameCap = elapsed >= HERO_SETTLE_END_MS ? 2 : 1;
      if (frame % frameCap === 0) painter?.drawFrame(elapsed);
      raf = window.requestAnimationFrame(tick);
    };

    const pause = () => {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(raf);
    };
    const resume = () => {
      if (running) return;
      running = true;
      lastTick = performance.now();
      raf = window.requestAnimationFrame(tick);
    };

    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) resume();
            else pause();
          }
        }, { threshold: 0.01 })
      : null;
    observer?.observe(root);

    const onVisibility = () => {
      if (document.hidden) pause();
      else resume();
    };
    const onResize = () => {
      applySize();
      painter?.drawFrame(elapsed);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    raf = window.requestAnimationFrame(tick);

    // Safety net: if the rAF loop never runs (exotic throttling), the copy
    // must not stay hidden behind the motion class.
    const failsafe = window.setTimeout(markSettled, HERO_SETTLE_END_MS + 4000);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(failsafe);
      doc.classList.remove(MOTION_CLASS);
      painter?.dispose();
    };
  }, []);

  return (
    <section className="hero-open" aria-label="文明編年史・序章" ref={rootRef}>
      <canvas className="hero-canvas" aria-hidden="true" />
      <div className="hero-vignette" aria-hidden="true" />
      <div className="hero-inner">
        <p className="hero-kicker">
          <span className="hero-seal" aria-hidden="true">序</span>
          {heroKicker()}
        </p>
        <div className="hero-narration" aria-label="開場旁白">
          {HERO_NARRATIVE.map((beat) => (
            <p key={beat.startMs} className={beatClass(beat)} data-beat={beat.startMs}>
              <BeatText beat={beat} />
            </p>
          ))}
          <p className="hero-cta" data-beat={HERO_CTA_MS}>
            <a className="btn btn-brass" href="#civ" onClick={scrollToTarget}>開始編年</a>
            <a className="btn btn-ghost" href="#slice" onClick={scrollToTarget}>先看今日切片</a>
          </p>
        </div>
      </div>
      <p className="hero-scroll-hint" aria-hidden="true">
        <span className="hero-hint-track"><span className="hero-hint-dot" /></span>
      </p>
    </section>
  );
}
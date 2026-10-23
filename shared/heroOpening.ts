import { esc } from './contentPage.js';
import { MONITOR_READING } from './civilization/clock.js';

/**
 * 文明編年史 · 開場 Hero.
 *
 * Live script is the Grok 4.7 twelve-second cold open (design source:
 * PR #239, docs/hero-motion/grok-4.7-2026-10-23). SSR markup and the React
 * component share this module. `soup` stays on the phase union so older
 * callers keep type-checking; this timeline does not schedule it.
 *
 * Tone: scientific cold open, written Chinese. The joke is a correction.
 * No Cantonese particles. No「距午夜」. No second hand.
 */

export type HeroPhase = 'singularity' | 'bloom' | 'soup' | 'ignition' | 'earth' | 'handoff';
export type HeroChapter = 'ancient' | 'now' | 'future';

export interface HeroBeat {
  id: number;
  phase: HeroPhase;
  chapter: HeroChapter;
  main: string;
  aside?: string;
  /** ms after the opening starts when this line appears. */
  at: number;
}

export const HERO_AIR_KEYS = ['gold', 'blue', 'violet', 'stars', 'earth', 'dial', 'hand', 'rail', 'glow'] as const;
export type HeroAirKey = (typeof HERO_AIR_KEYS)[number];
export type HeroAir = Record<HeroAirKey, number>;

export interface HeroStage extends HeroAir {
  at: number;
  chapter: HeroChapter;
  phase: HeroPhase;
  /** One gold ring expands from this stage. It does not repeat. */
  ring?: boolean;
}

/**
 * Six short lines, ~12s. Lines stay once revealed.
 * Beat 1 is copy only: the air is already the warm point from 0ms.
 */
export const HERO_BEATS: readonly HeroBeat[] = [
  {
    id: 1,
    phase: 'singularity',
    chapter: 'ancient',
    main: '甚麼都還沒有名字。',
    aside: '膨脹已經開始。鐘更晚。',
    at: 400,
  },
  {
    id: 2,
    phase: 'bloom',
    chapter: 'ancient',
    main: '空間忽然多出來。',
    aside: '沒有空氣，就沒有響聲。',
    at: 2500,
  },
  {
    id: 3,
    phase: 'ignition',
    chapter: 'now',
    main: '碳是恆星煉成的。',
    aside: '包括這一行裡的碳。',
    at: 4600,
  },
  {
    id: 4,
    phase: 'earth',
    chapter: 'now',
    main: '然後，人類才開始看分鐘。',
    aside: '地球並不趕時間。',
    at: 6700,
  },
  {
    id: 5,
    phase: 'handoff',
    chapter: 'future',
    main: '這一格由編輯寫定。',
    aside: '對照公開公報，並不逐秒走動。',
    at: 8800,
  },
  {
    id: 6,
    phase: 'handoff',
    chapter: 'future',
    main: '三卷仍在這一屏之下。',
    aside: '刻度交給編年，不交給秒針。',
    at: 10500,
  },
];

/** Buttons and the scroll hint fade in together. */
export const HERO_SETTLE_AT = 12000;

/** The reading row appears with beat 5. It is not a seventh line. */
export const HERO_READING_AT = 8800;

/**
 * React-claim safety. Four seconds is shorter than the twelve-second play
 * on purpose: if React never sets data-hero-boot, readers still get the
 * settled text quickly. This is not the opening length, and it is not
 * carried over from the retired 15.6s script.
 */
export const HERO_BOOT_FALLBACK_MS = 4000;

/** sessionStorage flag: the opening plays at most once per session. */
export const HERO_SEEN_KEY = 'wn_hero_seen';

export const HERO_KICKER = '文明編年史 · 開場';
export const HERO_TITLE = '從宇宙到今天';
export const HERO_ARIA_LABEL = '開場：從奇點到今天';
export const HERO_SKIP_LABEL = '跳過開場';
export const HERO_REPLAY_LABEL = '重播開場';

/**
 * Spine handoff is #civ. The slice stays a secondary control.
 */
export const HERO_PRIMARY = { href: '#civ', label: '開始編年' } as const;
export const HERO_SECONDARY = { href: '#slice', label: '進入今日切片' } as const;
export const HERO_HINT = { href: '#civ', label: '向下滾動，開始編年' } as const;

/** Gold ring: once, 1.5s, 2.5px, peak alpha 0.62. Not a white flash. */
export const HERO_RING_AT = 2500;
export const HERO_RING_MS = 1500;
export const HERO_RING_WIDTH = 2.5;
export const HERO_RING_ALPHA = 0.62;
export const HERO_RING_RGB = '232,210,160';

/** Recognisable stone, still drawn, not an image. Full size at earth = 1. */
export const HERO_EARTH_RADIUS = 14;

/** Visible future glow. The era token stays #2a2140 and is only the dim end. */
export const HERO_VIOLET_RGB = '110,90,170';

/**
 * Same copper-gold colours as `.deep-axis .rail`
 * (transparent, #c4a572, #e8e4dc, #c4a572, transparent).
 */
export const HERO_RAIL_STOPS: readonly { at: number; color: string }[] = [
  { at: 0, color: 'rgba(196,165,114,0)' },
  { at: 0.32, color: 'rgba(196,165,114,0.95)' },
  { at: 0.5, color: 'rgba(232,228,220,0.92)' },
  { at: 0.68, color: 'rgba(196,165,114,0.95)' },
  { at: 1, color: 'rgba(196,165,114,0)' },
];

/**
 * Air targets. `soup` is intentionally absent.
 * The clock face and minute hand fade in already resting on the editorial minute.
 */
export const HERO_STAGES: readonly HeroStage[] = [
  { at: 0, chapter: 'ancient', phase: 'singularity', gold: 0.62, blue: 0, violet: 0, stars: 0.12, earth: 0, dial: 0, hand: 0, rail: 0, glow: 1 },
  { at: 2500, chapter: 'ancient', phase: 'bloom', gold: 0.48, blue: 0, violet: 0, stars: 0.42, earth: 0, dial: 0, hand: 0, rail: 0, glow: 0.72, ring: true },
  { at: 4600, chapter: 'now', phase: 'ignition', gold: 0.2, blue: 0.42, violet: 0.04, stars: 1, earth: 0.35, dial: 0, hand: 0, rail: 0, glow: 0.18 },
  { at: 6700, chapter: 'now', phase: 'earth', gold: 0.16, blue: 0.5, violet: 0.08, stars: 1, earth: 1, dial: 1, hand: 1, rail: 0.15, glow: 0.08 },
  { at: 8800, chapter: 'future', phase: 'handoff', gold: 0.12, blue: 0.26, violet: 0.4, stars: 1, earth: 1, dial: 1, hand: 1, rail: 0.62, glow: 0.04 },
  { at: 10500, chapter: 'future', phase: 'handoff', gold: 0.1, blue: 0.2, violet: 0.34, stars: 1, earth: 1, dial: 1, hand: 1, rail: 1, glow: 0.02 },
];

export function heroStageAt(elapsedMs: number): HeroStage {
  let stage: HeroStage = HERO_STAGES[0]!;
  for (const next of HERO_STAGES) {
    if (elapsedMs >= next.at) stage = next;
  }
  return stage;
}

export function heroAirAt(elapsedMs: number): HeroAir {
  const stage = heroStageAt(elapsedMs);
  const air = {} as HeroAir;
  for (const key of HERO_AIR_KEYS) air[key] = stage[key];
  return air;
}

/** Twelve o'clock is midnight. One minute is 6° toward eleven. No second hand. */
export function heroMinuteAngle(minutes: number): number {
  return -minutes * (Math.PI / 30);
}

export function heroRingRadius(ageMs: number, width: number, height: number): number | null {
  if (ageMs < 0 || ageMs >= HERO_RING_MS) return null;
  const progress = ageMs / HERO_RING_MS;
  const reach = Math.min(Math.max(width, height) * 0.42, 520);
  return Math.max(12, progress * reach);
}

export function heroRingAlpha(ageMs: number): number {
  if (ageMs < 0 || ageMs >= HERO_RING_MS) return 0;
  return HERO_RING_ALPHA * (1 - ageMs / HERO_RING_MS);
}

export function heroEarthRadius(level: number): number {
  return HERO_EARTH_RADIUS * (0.35 + 0.65 * level);
}

/** Phone DPR cap 1.25, otherwise 1.5. Never the raw device ratio. */
export function heroCanvasDpr(cssWidth: number, devicePixelRatio: number): number {
  const cap = cssWidth < 800 ? 1.25 : 1.5;
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(cap, dpr);
}

export function heroDialCenter(width: number): { x: number; y: number; r: number } {
  const r = Math.min(60, Math.max(46, width * 0.07));
  return { x: width * 0.5, y: 22 + r, r };
}

export function heroEarthCenter(width: number): { x: number; y: number } {
  const dial = heroDialCenter(width);
  return { x: Math.max(36, dial.x - dial.r - 52), y: dial.y - 4 };
}

/** Editorial minute only. Seconds stay on `.bulletin-clock`. */
export function heroReadingMinutes(minutes = MONITOR_READING.minutes): number {
  if (!Number.isFinite(minutes)) return MONITOR_READING.minutes;
  return Math.max(0, Math.round(minutes));
}

export function heroReadingText(minutes = MONITOR_READING.minutes): string {
  return `監測刻度 · 午夜前 ${heroReadingMinutes(minutes)} 分`;
}

export interface HeroPlayback {
  revealed: number;
  phase: HeroPhase;
  chapter: HeroChapter;
  reading: boolean;
  settled: boolean;
}

/** Where the opening is on the timeline `elapsedMs` after boot. */
export function heroPlaybackAt(elapsedMs: number): HeroPlayback {
  if (elapsedMs >= HERO_SETTLE_AT) {
    return { revealed: HERO_BEATS.length, phase: 'handoff', chapter: 'future', reading: true, settled: true };
  }
  let revealed = 0;
  let phase: HeroPhase = 'singularity';
  let chapter: HeroChapter = 'ancient';
  for (const beat of HERO_BEATS) {
    if (elapsedMs >= beat.at) {
      revealed += 1;
      phase = beat.phase;
      chapter = beat.chapter;
    }
  }
  return {
    revealed,
    phase,
    chapter,
    reading: elapsedMs >= HERO_READING_AT,
    settled: false,
  };
}

/**
 * Pre-paint boot, inlined right after the SSR section.
 * Lines and the reading row are marked data-on=false BEFORE data-mode=playing.
 * The title and kicker are never touched. Skip settles and writes wn_hero_seen.
 * The fallback force-settles only if React never claims the section
 * (data-hero-boot). It does not write the seen flag.
 * window.__WN_HERO_T0 lets createRoot resume this timeline.
 */
export function heroBootScript(): string {
  return `(function(){try{var h=document.getElementById('hero-opening');if(!h)return;var seen=false;try{seen=!!sessionStorage.getItem('${HERO_SEEN_KEY}')}catch(e){}var reduce=false;try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}function paint(on){var list=h.querySelectorAll('.hero-line, .hero-reading');for(var i=0;i<list.length;i++)list[i].setAttribute('data-on',on?'true':'false')}function settle(){paint(true);h.dataset.mode='settled';h.dataset.phase='handoff';h.dataset.chapter='future';try{sessionStorage.setItem('${HERO_SEEN_KEY}','1')}catch(e){}}var skip=h.querySelector('[data-hero-skip]');if(skip)skip.addEventListener('click',function(){settle()});if(seen||reduce)return;paint(false);h.dataset.mode='playing';h.dataset.phase='singularity';h.dataset.chapter='ancient';try{window.__WN_HERO_T0=Date.now()}catch(e){}setTimeout(function(){if(h.dataset.mode==='playing'&&!h.dataset.heroBoot){paint(true);h.dataset.mode='settled';h.dataset.phase='handoff';h.dataset.chapter='future'}},${HERO_BOOT_FALLBACK_MS})}catch(e){}})();`;
}

/**
 * Static markup for the SSR homepage. Default state is settled so no-JS
 * readers get the full text. The boot script re-hides lines for a first
 * visit before paint. React renders the same structure.
 */
export function renderHeroOpening(): string {
  const minutes = heroReadingMinutes();
  const lines = HERO_BEATS.map((beat) => {
    const aside = beat.aside ? `<span class="hero-aside">${esc(beat.aside)}</span>` : '';
    return `<p class="hero-line" data-beat="${beat.id}" data-on="true"><span class="hero-main">${esc(beat.main)}</span>${aside}</p>`;
  }).join('');
  return `<section class="hero-opening" id="hero-opening" data-mode="settled" data-phase="handoff" data-chapter="future" aria-label="${esc(HERO_ARIA_LABEL)}">
  <canvas class="hero-canvas" aria-hidden="true"></canvas>
  <div class="hero-inner">
    <p class="hero-kicker">${esc(HERO_KICKER)}</p>
    <h2 class="hero-title">${esc(HERO_TITLE)}</h2>
    <p class="hero-reading" data-on="true">監測刻度 · 午夜前 <span class="hero-minute">${minutes}</span> 分</p>
    <div class="hero-lines">${lines}</div>
    <div class="hero-cta">
      <a class="hero-btn hero-btn-brass" href="${HERO_PRIMARY.href}">${esc(HERO_PRIMARY.label)}</a>
      <a class="hero-btn hero-btn-ghost" href="${HERO_SECONDARY.href}">${esc(HERO_SECONDARY.label)}</a>
    </div>
    <p class="hero-hint-row"><a class="hero-hint" href="${HERO_HINT.href}">${esc(HERO_HINT.label)}</a></p>
  </div>
  <button class="hero-skip" type="button" data-hero-skip>${esc(HERO_SKIP_LABEL)}</button>
  <button class="hero-replay" type="button" data-hero-replay>${esc(HERO_REPLAY_LABEL)}</button>
</section><script>${heroBootScript()}</script>`;
}

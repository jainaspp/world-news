import { siteBrand } from '../brand.js';
import { esc } from '../contentPage.js';

/**
 * Homepage opening only. Do not import this module from news, explainers,
 * the monitoring clock, or /learn/. The spoken lines stay inside the hero.
 * Ages are approximate. The plate is a diagram, not a map and not a simulation.
 */

export const OPENING_HERO_MS = 18200;
export const OPENING_SESSION_KEY = 'wn-opening-hero';

export type OpeningBeatId = 'singularity' | 'bang' | 'galaxy' | 'earth' | 'handoff';

export interface OpeningBeat {
  id: OpeningBeatId;
  label: string;
  start: number;
  end: number;
}

export const OPENING_BEATS: readonly OpeningBeat[] = [
  { id: 'singularity', label: '奇點', start: 0, end: 2600 },
  { id: 'bang', label: '砰', start: 2600, end: 6800 },
  { id: 'galaxy', label: '星系', start: 6800, end: 12400 },
  { id: 'earth', label: '地球', start: 12400, end: 15000 },
  { id: 'handoff', label: '接軸', start: 15000, end: 18200 },
];

export interface OpeningLine {
  beat: OpeningBeatId;
  text: string;
  /** The one correction. Dimmer ink, still the same voice. */
  aside: boolean;
  at: number;
}

export const OPENING_LINES: readonly OpeningLine[] = [
  { beat: 'singularity', at: 0, aside: false, text: '話說，約一百三十八億年前，什麼都沒有。' },
  { beat: 'bang', at: 2600, aside: false, text: '然後——「砰」。' },
  { beat: 'bang', at: 4400, aside: true, text: '其實沒有聲音。聲音要有介質，那時還沒有。' },
  { beat: 'galaxy', at: 6800, aside: false, text: '重力把氣體收成恆星，恆星再把原子撒回太空。' },
  { beat: 'galaxy', at: 9600, aside: false, text: '你身上的碳、氧、鐵，都在恆星核心裡煉過。' },
  { beat: 'earth', at: 12400, aside: false, text: '後來有了地球。再後來，故事有了讀者。' },
  { beat: 'handoff', at: 15000, aside: false, text: '接下來，輪到我們。時間軸就在下面。' },
];

export interface SkyStar {
  /** 0 or 1, already baked into `angle` for arm stars. */
  arm: number;
  angle: number;
  /** 0..1 across the plate. */
  radius: number;
  size: number;
  alpha: number;
}

export interface OpeningCue {
  elapsed: number;
  beat: OpeningBeatId;
  beatT: number;
  lineIndex: number;
  /** 0 at the point, 1 once stars have reached their spiral. */
  spawn: number;
  spin: number;
  earth: number;
  filament: number;
  ring: number;
  core: number;
  settled: boolean;
}

export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function easeOutCubic(value: number): number {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed field so a resize does not shuffle the sky. */
export function makeStars(count: number, seed = 20261021): SkyStar[] {
  const rand = mulberry32(seed);
  const stars: SkyStar[] = [];
  const total = Math.max(0, Math.floor(count));
  for (let i = 0; i < total; i += 1) {
    const interarm = rand() < 0.16;
    const arm = i % 2;
    const angle = interarm ? rand() * Math.PI * 2 : arm * Math.PI + (rand() - 0.5) * 0.85;
    stars.push({
      arm,
      angle,
      radius: 0.1 + rand() ** 0.72 * 0.9,
      size: rand() < 0.07 ? 1.7 + rand() * 0.7 : 0.45 + rand() * 0.95,
      alpha: 0.28 + rand() * 0.62,
    });
  }
  return stars;
}

export function openingCue(elapsedMs: number): OpeningCue {
  const elapsed = Math.max(0, elapsedMs);
  const beat = [...OPENING_BEATS].reverse().find((item) => elapsed >= item.start) ?? OPENING_BEATS[0];
  const span = Math.max(1, beat.end - beat.start);
  let lineIndex = 0;
  for (let i = 0; i < OPENING_LINES.length; i += 1) {
    if (elapsed >= OPENING_LINES[i].at) lineIndex = i;
  }
  const bangT = clamp01((elapsed - 2600) / 4200);
  const earthT = clamp01((elapsed - 12400) / 1800);
  const filamentT = clamp01((elapsed - 15000) / 2200);
  return {
    elapsed,
    beat: beat.id,
    beatT: clamp01((elapsed - beat.start) / span),
    lineIndex,
    spawn: easeOutCubic(bangT),
    spin: Math.max(0, elapsed - 6800) * 0.00009,
    earth: easeOutCubic(earthT),
    filament: easeOutCubic(filamentT),
    ring: bangT,
    core: 1 - easeOutCubic(earthT) * 0.84,
    settled: elapsed >= OPENING_HERO_MS,
  };
}

export function settledCue(): OpeningCue {
  return openingCue(OPENING_HERO_MS);
}

function bootScript(): string {
  return `<script>try{var n=document.currentScript;var r=n&&n.closest(".bbt-hero");if(!r)throw 0;var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;var settled=false;try{settled=sessionStorage.getItem("${OPENING_SESSION_KEY}")==="settled"}catch(err){}if(!reduce){r.classList.add("is-live");if(settled){r.dataset.state="still";var lines=r.querySelectorAll(".bbt-line");for(var i=0;i<lines.length;i++)lines[i].classList.toggle("is-on",i===lines.length-1);var beats=r.querySelectorAll(".bbt-beat");for(var j=0;j<beats.length;j++)beats[j].classList.toggle("is-on",j===beats.length-1)}else{r.dataset.state="play"}}}catch(e){}</script>`;
}

/** Static hero. The client paints the plate and advances lines. No timer in this string. */
export function renderOpeningHero(): string {
  const lines = OPENING_LINES.map((line, index) => {
    const aside = line.aside ? ' bbt-line-aside' : '';
    const on = index === 0 ? ' is-on' : '';
    return `<p class="bbt-line${aside}${on}" data-beat="${line.beat}" data-i="${index}">${esc(line.text)}</p>`;
  }).join('');
  const beats = OPENING_BEATS.map((beat, index) => {
    const on = index === 0 ? ' is-on' : '';
    const pressed = index === 0 ? 'true' : 'false';
    return `<button type="button" class="bbt-beat${on}" data-beat="${beat.id}" data-at="${beat.start}" aria-pressed="${pressed}">${esc(beat.label)}</button>`;
  }).join('');
  return `<section class="bbt-hero" id="opening" aria-labelledby="opening-title" data-state="still">
    <p class="bbt-kicker" id="opening-title">開場 · 示意 · 約數</p>
    <p class="bbt-brand">${esc(siteBrand)}</p>
    <div class="bbt-stage" data-beat="singularity">
      <canvas class="bbt-sky" aria-hidden="true"></canvas>
    </div>
    <div class="bbt-narration">${lines}</div>
    <div class="bbt-beats" role="group" aria-label="開場段落">${beats}</div>
    <div class="bbt-controls">
      <a class="bbt-btn bbt-btn-brass" href="#civ">接到時間軸</a>
      <button type="button" class="bbt-btn bbt-btn-ghost bbt-play-only" data-act="skip">跳過開場</button>
      <button type="button" class="bbt-btn bbt-btn-ghost bbt-play-only" data-act="replay">重看</button>
    </div>
    ${bootScript()}
  </section>`;
}

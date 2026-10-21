/**
 * Homepage opening prologue — copy and beat timing.
 *
 * Tone contract (GM adopt 2026-10-21): mild Big-Bang-Theory-style nerd humour
 * is allowed on the Hero ONLY. News, briefings and explainers keep formal
 * written Chinese and must not import narration phrasing.
 *
 * The numbers here are a choreography contract. The canvas painter, the DOM
 * reveal timeline and tests all read them, so a beat change means updating
 * the SPEC appendix and the phase tests in the same PR.
 */

/** How a beat is presented. `aside` prints smaller and dimmer, like a footnote. */
export type HeroBeatKind = 'line' | 'aside' | 'bang';

export interface HeroBeat {
  /** Reader-facing copy, final wording. */
  text: string;
  /** Milliseconds after the hero mounts when the beat starts to appear. */
  startMs: number;
  kind: HeroBeatKind;
  /** Optional substring of `text` that gets the emphasis treatment. */
  emphasis?: string;
}

/** Phase boundaries in milliseconds after hero mount. Ordered by t. */
export const HERO_PHASES = {
  /** Blank ink paper. One brass seed point breathes at centre. */
  void: 0,
  /** The bang: ink-drop bloom bursts outward. */
  bang: 6_400,
  /** Particles decelerate; a faint recombination shimmer. */
  drift: 8_200,
  /** Gravity winds the burst into two spiral arms; stars flare. */
  galaxy: 11_600,
  /** Earth drifts in below the narration and settles. */
  earth: 18_400,
  /** Ambient tableau: slow galaxy, hairline axis, hand-off to the axis band. */
  settle: 21_900,
} as const;

export type HeroPhaseName = keyof typeof HERO_PHASES;

/** The CTA row appears with the hand-off beat, slightly after the last line. */
export const HERO_CTA_MS = 22_900;

/** After this the sequence is complete; ambient mode throttles drawing. */
export const HERO_SETTLE_END_MS = 23_400;

/**
 * Seven-beat opening monologue (獨白七句, GM brief 2026-10-21). Keep exactly
 * seven; each beat must be readable inside its slot before the next lands.
 * Beats stay on the mild side: pedantic science corrections, never doom.
 */

/** Device-pixel-ratio cap for the hero canvas. 2 keeps phones within budget. */
export const HERO_MAX_DPR = 2;
export const HERO_NARRATIVE: readonly HeroBeat[] = [
  {
    text: '話說，一百三十八億年前——什麼都沒有。',
    startMs: 900,
    kind: 'line',
  },
  {
    text: '然後：「砰」。',
    startMs: HERO_PHASES.bang,
    kind: 'bang',
    emphasis: '砰',
  },
  {
    text: '好吧，嚴格來說沒有「砰」。聲音需要介質，而當時連介質本身都還在成形。',
    startMs: HERO_PHASES.drift,
    kind: 'aside',
  },
  {
    text: '重力把氫氣捏成一顆顆恆星，恆星再把鍛好的新原子撒回太空。',
    startMs: HERO_PHASES.galaxy,
    kind: 'line',
  },
  {
    text: '你身上的每一粒原子，都曾在恆星核心裡上過班。',
    startMs: 14_900,
    kind: 'line',
  },
  {
    text: '四十六億年前，星塵聚成地球——後來，故事有了讀者。',
    startMs: HERO_PHASES.earth,
    kind: 'line',
  },
  {
    text: '接下來，輪到我們出場。向下捲動，編年開始。',
    startMs: HERO_PHASES.settle,
    kind: 'aside',
  },
];

/** Ambient tableau time used by the static, reduced-motion first paint. */
export const HERO_TABLEAU_MS = HERO_SETTLE_END_MS + 4_000;

/** Session flag: the film plays once per session; later mounts settle instantly. */
export const HERO_PLAYED_FLAG = 'wn-hero-played';

export function heroKicker(): string {
  return '文明編年史 · 序章';
}

/** Prologue prose for search and copy audits. Same order as narration. */
export function heroProse(): string {
  return `${heroKicker()}。${HERO_NARRATIVE.map((beat) => beat.text).join('')}`;
}

/** Phase a given playback time falls into. Pure; tested at each boundary. */
export function heroPhaseAt(timeMs: number): HeroPhaseName {
  let phase: HeroPhaseName = 'void';
  for (const [name, ms] of Object.entries(HERO_PHASES)) {
    if (timeMs >= ms) phase = name as HeroPhaseName;
  }
  return phase;
}
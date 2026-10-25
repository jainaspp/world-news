import { esc } from './contentPage.js';

/**
 * 文明編年史 · 開場 Hero（BBT opening）。
 *
 * Single source of truth for the homepage opening: the narration beats,
 * the timeline, and the server-rendered markup that functions/index.ts
 * injects into the homepage shell. src/components/HeroOpening.tsx renders
 * the same structure client-side and drives the canvas + reveal timing.
 *
 * Tone rules: mild BBT-style nerd humour lives ONLY here. News, briefings
 * and explainers stay in formal written Chinese. These lines are written
 * Chinese (書面語) — playful imagery, no Cantonese particles.
 */

export type HeroPhase = 'singularity' | 'bloom' | 'soup' | 'ignition' | 'earth' | 'handoff';

export interface HeroBeat {
  id: number;
  /** Canvas chapter this beat belongs to. */
  phase: HeroPhase;
  main: string;
  aside?: string;
  /** ms after the opening starts when this line appears. */
  at: number;
}

/**
 * 敘事節拍（定稿）. Seven beats, ~15.6s total, skippable at any time.
 * Lines stay on screen once revealed, so a slower reader never loses text;
 * `at` only needs to be register time, not full reading time.
 */
export const HERO_BEATS: readonly HeroBeat[] = [
  {
    id: 1,
    phase: 'singularity',
    main: '一百三十八億年前，宇宙甚麼都沒有。',
    aside: '連「甚麼都沒有」，也還沒有。',
    at: 600,
  },
  {
    id: 2,
    phase: 'bloom',
    main: '然後——「砰」。',
    aside: '其實沒有聲音：聲音需要空氣。',
    at: 3300,
  },
  {
    id: 3,
    phase: 'soup',
    main: '最初的幾分鐘，只有光、熱，和一鍋原子湯。',
    at: 5400,
  },
  {
    id: 4,
    phase: 'ignition',
    main: '重力用一億年，把氣體捏成第一批恆星。',
    at: 7500,
  },
  {
    id: 5,
    phase: 'ignition',
    main: '恆星燃盡，把碳和氧撒回黑暗。',
    aside: '你體內每個原子，都住過恆星核心。',
    at: 9500,
  },
  {
    id: 6,
    phase: 'earth',
    main: '九十億年後，一顆藍色小石頭學會了下雨。',
    aside: '再後來，故事有了讀者。',
    at: 12100,
  },
  {
    id: 7,
    phase: 'handoff',
    main: '現在，輪到我們了。',
    aside: '先看見尺度，再讀今天。',
    at: 14400,
  },
];

/** When the CTA row fades in and the opening counts as seen. */
export const HERO_SETTLE_AT = 15600;

/** sessionStorage flag: the opening plays at most once per session. */
export const HERO_SEEN_KEY = 'wn_hero_seen';

/**
 * Spine handoff is #civ (古→今→未來). The slice stays a secondary control.
 * Copy matches the destination: 開始編年 does not point at today's slice.
 */
export const HERO_PRIMARY = { href: '#civ', label: '開始編年' } as const;
export const HERO_SECONDARY = { href: '#slice', label: '進入今日切片' } as const;
export const HERO_HINT = { href: '#civ', label: '向下滾動，開始編年' } as const;

/** Where the opening is on the timeline `elapsedMs` after boot. */
export function heroPlaybackAt(elapsedMs: number): { revealed: number; phase: HeroPhase; settled: boolean } {
  if (elapsedMs >= HERO_SETTLE_AT) {
    return { revealed: HERO_BEATS.length, phase: 'handoff', settled: true };
  }
  let revealed = 0;
  let phase: HeroPhase = 'singularity';
  for (const beat of HERO_BEATS) {
    if (elapsedMs >= beat.at) {
      revealed += 1;
      phase = beat.phase;
    }
  }
  return { revealed, phase, settled: false };
}

/**
 * Pre-paint boot, inlined right after the SSR section.
 * Lines are marked data-on=false BEFORE data-mode=playing, in the same
 * synchronous turn, so first paint cannot show every line with the CTA hidden.
 * [data-hero-skip] settles and writes wn_hero_seen, the same end state React uses.
 * The 4s fallback force-settles only if React never claims the section
 * (data-hero-boot). It does not write the seen flag.
 * window.__WN_HERO_T0 lets createRoot resume this timeline instead of replaying
 * from line 0. createRoot still replaces the node (residual P1; not a hydrate).
 */
export function heroBootScript(): string {
  const at = HERO_BEATS.map((beat) => beat.at).join(',');
  return `(function(){try{var h=document.getElementById('hero-opening');if(!h)return;var seen=false;try{seen=!!sessionStorage.getItem('${HERO_SEEN_KEY}')}catch(e){}var reduce=false;try{reduce=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}function paint(on){var list=h.querySelectorAll('.hero-line');for(var i=0;i<list.length;i++)list[i].setAttribute('data-on',on?'true':'false')}function settle(){paint(true);h.dataset.mode='settled';h.dataset.phase='handoff';try{sessionStorage.setItem('${HERO_SEEN_KEY}','1')}catch(e){}}var skip=h.querySelector('[data-hero-skip]');if(skip)skip.addEventListener('click',function(){settle()});if(seen||reduce)return;paint(false);h.dataset.mode='playing';h.dataset.phase='singularity';try{window.__WN_HERO_T0=Date.now()}catch(e){}var at=[${at}];for(var n=0;n<at.length;n++){(function(i){setTimeout(function(){if(h.dataset.mode!=='playing')return;var line=h.querySelector('[data-beat="'+(i+1)+'"]');if(line)line.setAttribute('data-on','true')},at[i])})(n)}setTimeout(function(){if(h.dataset.mode==='playing'&&!h.dataset.heroBoot){paint(true);h.dataset.mode='settled';h.dataset.phase='handoff'}},4000)}catch(e){}})();`;
}

/**
 * Static markup for the SSR homepage. Default state is settled (every line
 * visible) so no-JS readers and crawlers get the full text; the boot script
 * above re-hides lines for eligible first-time visitors before paint.
 * React renders the same structure and takes over from there.
 */
export function renderHeroOpening(): string {
  const lines = HERO_BEATS.map((beat) => {
    const aside = beat.aside ? `<span class="hero-aside">${esc(beat.aside)}</span>` : '';
    return `<p class="hero-line" data-beat="${beat.id}" data-on="true"><span class="hero-main">${esc(beat.main)}</span>${aside}</p>`;
  }).join('');
  return `<section class="hero-opening" id="hero-opening" data-mode="settled" data-phase="handoff" aria-label="開場：從奇點到今天">
  <canvas class="hero-canvas" aria-hidden="true"></canvas>
  <div class="hero-inner">
    <p class="hero-kicker">文明編年史 · 開場</p>
    <h2 class="hero-title">從宇宙到今天</h2>
    <div class="hero-lines">${lines}</div>
    <div class="hero-cta">
      <a class="hero-btn hero-btn-brass" href="${HERO_PRIMARY.href}">${esc(HERO_PRIMARY.label)}</a>
      <a class="hero-btn hero-btn-ghost" href="${HERO_SECONDARY.href}">${esc(HERO_SECONDARY.label)}</a>
    </div>
    <p class="hero-hint-row"><a class="hero-hint" href="${HERO_HINT.href}">${esc(HERO_HINT.label)}</a></p>
  </div>
  <button class="hero-skip" type="button" data-hero-skip>跳過開場</button>
  <button class="hero-replay" type="button" data-hero-replay>重播開場</button>
</section><script>${heroBootScript()}</script>`;
}

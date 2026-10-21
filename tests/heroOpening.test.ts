import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HERO_BEATS, HERO_SEEN_KEY, HERO_SETTLE_AT, renderHeroOpening, type HeroPhase } from '../shared/heroOpening';
import { renderHomeFeed } from '../shared/homePage';

/** Same particle scan as copy.test.ts; the Hero may be playful, never Cantonese-colloquial. */
const PARTICLES = /我哋|嘅|喺|咗|點樣|决|嘢|咁|同埋|呢個|呢啲|呢|唔|冇|仲未|撳|睇/g;
const BARE_HAI = /(?<![關係干])係(?![數統列])/g;
const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;

const PHASES: readonly HeroPhase[] = ['singularity', 'bloom', 'soup', 'ignition', 'earth', 'handoff'];

describe('hero opening beats', () => {
  it('runs seven beats from singularity to handoff inside a tight timeline', () => {
    expect(HERO_BEATS.length).toBe(7);
    expect(HERO_BEATS[0]?.phase).toBe('singularity');
    expect(HERO_BEATS[HERO_BEATS.length - 1]?.phase).toBe('handoff');
    for (const beat of HERO_BEATS) expect(PHASES).toContain(beat.phase);
    const ids = HERO_BEATS.map((beat) => beat.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let index = 1; index < HERO_BEATS.length; index += 1) {
      expect(HERO_BEATS[index]!.at).toBeGreaterThan(HERO_BEATS[index - 1]!.at);
    }
    expect(HERO_BEATS[0]!.at).toBeGreaterThanOrEqual(400);
    expect(HERO_SETTLE_AT).toBeGreaterThan(HERO_BEATS[HERO_BEATS.length - 1]!.at);
    expect(HERO_SETTLE_AT).toBeLessThanOrEqual(17000);
  });

  it('keeps the narration in written Chinese with no red-line terms', () => {
    for (const beat of HERO_BEATS) {
      const text = `${beat.main}${beat.aside ?? ''}`;
      expect(text.match(PARTICLES) ?? []).toEqual([]);
      expect(text.match(BARE_HAI) ?? []).toEqual([]);
      expect(REDLINE.test(text)).toBe(false);
    }
    expect(HERO_BEATS[0]!.main).toContain('甚麼');
  });
});

describe('hero opening SSR', () => {
  it('renders settled markup with every line, both CTAs, and the boot fallback', () => {
    const html = renderHeroOpening();
    expect(html).toContain('class="hero-opening"');
    expect(html).toContain('data-mode="settled"');
    expect(html).toContain('data-phase="handoff"');
    expect(html).not.toContain('<h1');
    for (const beat of HERO_BEATS) {
      expect(html).toContain(beat.main);
      if (beat.aside) expect(html).toContain(beat.aside);
    }
    expect(html).toContain('href="#slice"');
    expect(html).toContain('href="/civilization/"');
    expect(html).toContain('hero-canvas');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('跳過開場');
    expect(html).toContain('重播開場');
    expect(html).toContain(HERO_SEEN_KEY);
    expect(html).toContain('prefers-reduced-motion: reduce');
    expect(html).toContain('heroBoot');
    expect(html).toContain('文明編年史');
  });

  it('mounts the hero on the pure homepage only, before the axis band', () => {
    const home = renderHomeFeed([]);
    expect(home).toContain('hero-opening');
    expect(home.indexOf('hero-opening')).toBeLessThan(home.indexOf('axis-hero'));
    const focus = renderHomeFeed([], new Map(), null, '', null, '', undefined, [], new Date(), false, {}, '香港');
    expect(focus).not.toContain('hero-opening');
  });
});

describe('hero opening client wiring', () => {
  it('mounts HeroOpening on the poetic home view before the axis mount', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('poeticAxis && <HeroOpening />');
    expect(app.indexOf('<HeroOpening />')).toBeLessThan(app.indexOf('className="axis-mount"'));
  });

  it('drives canvas, timers, reduced motion and the seen flag in the component', () => {
    const source = readFileSync('src/components/HeroOpening.tsx', 'utf8');
    expect(source).toContain('prefersReducedMotion');
    expect(source).toContain(HERO_SEEN_KEY === 'wn_hero_seen' ? 'HERO_SEEN_KEY' : 'wn_hero_seen');
    expect(source).toContain('requestAnimationFrame');
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('visibilitychange');
    expect(source).toContain('clearTimeout');
    expect(source).toContain('data-hero-boot');
  });

  it('keeps hero styling on ink tokens with gated motion and 44px targets', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const block = css.slice(css.indexOf('.hero-opening {'));
    expect(block).toContain('#161c24');
    expect(block).not.toContain('#05060a');
    expect(block).not.toContain('100vh');
    expect(block).toContain('svh');
    expect(block).toContain('min-height: 44px');
    expect(block).toContain('.hero-opening[data-mode="playing"] .hero-line');
    expect(block).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(block).toContain('@media (prefers-reduced-motion: reduce)');
    expect(block).toContain('animation: none');
    expect(block).toContain('transition: none');
  });
});

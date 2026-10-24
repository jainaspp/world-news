import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import {
  HERO_BEATS,
  HERO_HINT,
  HERO_PRIMARY,
  HERO_SECONDARY,
  HERO_SEEN_KEY,
  HERO_SETTLE_AT,
  heroPlaybackAt,
  renderHeroOpening,
  type HeroPhase,
} from '../shared/heroOpening';
import { cssColorToRgb, heroStarPoint, rollHeroStars, syncHeroStarField } from '../shared/heroStars';
import { phoneSpineSlots, restingPartialSlots, slotFullyReachable } from '../shared/spineTrack';
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
    expect(html).toContain(`href="${HERO_PRIMARY.href}">${HERO_PRIMARY.label}`);
    expect(html).toContain(`href="${HERO_SECONDARY.href}">${HERO_SECONDARY.label}`);
    expect(html).toContain(`href="${HERO_HINT.href}">${HERO_HINT.label}`);
    expect(html).not.toContain('href="/civilization/"');
    expect(html).not.toMatch(/hero-btn-brass" href="#slice"/);
    expect(html).not.toMatch(/hero-hint" href="#slice"/);
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
    expect(source).toContain('href={HERO_PRIMARY.href}');
    expect(source).toContain('href={HERO_SECONDARY.href}');
    expect(source).toContain('href={HERO_HINT.href}');
    expect(source).toContain('heroPlaybackAt');
    expect(source).toContain('__WN_HERO_T0');
    expect(source).toContain('syncHeroStarField');
    expect(source).toContain("eraRgb(section, '--era-ancient'");
    expect(source).toContain("eraRgb(section, '--era-now'");
    expect(source).toContain("eraRgb(section, '--era-future'");
    expect(source).toContain('getPropertyValue(name)');
    expect(source).not.toContain('Math.random');
    expect(source).not.toContain('href="#slice"');
    expect(source).not.toContain('href="#civ"');
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
    expect(block).toContain('--era-ancient: #c4a572');
    expect(block).toContain('--era-now: #9ec0ef');
    expect(block).toContain('--era-future: #2a2140');
    expect(block).toContain('var(--era-ancient)');
    const beforeHero = css.slice(0, css.indexOf('.hero-opening {'));
    expect(beforeHero).not.toContain('--era-ancient');
    expect(beforeHero).not.toContain('--era-now');
    expect(beforeHero).not.toContain('--era-future');
  });
});

function lin(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const lum = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    return 0.2126 * lin((value >> 16) & 255) + 0.7152 * lin((value >> 8) & 255) + 0.0722 * lin(value & 255);
  };
  const [hi, lo] = [lum(foreground), lum(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

function dataAttr(prop: string): string {
  return `data-${prop.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
}

function datasetProxy(el: FakeEl) {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return el.attrs.get(dataAttr(prop));
    },
    set(_target, prop, value) {
      if (typeof prop !== 'string') return false;
      const key = dataAttr(prop);
      el.attrs.set(key, String(value));
      el.log.push(`${el.label}:${key}=${value}`);
      return true;
    },
  });
}

class FakeEl {
  attrs = new Map<string, string>();
  listeners: Array<() => void> = [];
  lines: FakeEl[] = [];
  skip: FakeEl | null = null;
  log: string[];
  label: string;
  constructor(log: string[], label: string) {
    this.log = log;
    this.label = label;
  }
  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
    this.log.push(`${this.label}:${name}=${value}`);
  }
  get dataset() {
    return datasetProxy(this);
  }
  querySelector(sel: string) {
    return sel === '[data-hero-skip]' ? this.skip : null;
  }
  querySelectorAll(sel: string) {
    return sel === '.hero-line' ? this.lines : [];
  }
  addEventListener(_type: string, fn: () => void) {
    this.listeners.push(fn);
  }
}

function runBoot(options: { seen?: boolean; reduce?: boolean; heroBoot?: boolean } = {}) {
  const html = renderHeroOpening();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!script) throw new Error('missing boot script');
  const log: string[] = [];
  const section = new FakeEl(log, 'section');
  section.setAttribute('data-mode', 'settled');
  section.setAttribute('data-phase', 'handoff');
  const count = html.match(/class="hero-line"/g)?.length ?? 0;
  section.lines = Array.from({ length: count }, (_, index) => {
    const line = new FakeEl(log, `line${index}`);
    line.setAttribute('data-on', 'true');
    return line;
  });
  section.skip = new FakeEl(log, 'skip');
  if (options.heroBoot) section.setAttribute('data-hero-boot', '1');
  log.length = 0;
  const store = new Map<string, string>();
  if (options.seen) store.set(HERO_SEEN_KEY, '1');
  const timer: { fn: (() => void) | null } = { fn: null };
  const windowObj: { __WN_HERO_T0?: number } = {};
  runInNewContext(script, {
    document: { getElementById: (id: string) => (id === 'hero-opening' ? section : null) },
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    },
    matchMedia: () => ({ matches: Boolean(options.reduce) }),
    setTimeout: (fn: () => void) => {
      timer.fn = fn;
      return 1;
    },
    window: windowObj,
    Date,
  });
  return { section, store, timer: timer.fn, windowObj, log };
}

function lineOn(section: FakeEl): string[] {
  return section.lines.map((line) => line.attrs.get('data-on') ?? '');
}

describe('hero boot reveal', () => {
  it('resumes the timeline from elapsed time instead of showing every line at once', () => {
    expect(heroPlaybackAt(0)).toEqual({ revealed: 0, phase: 'singularity', settled: false });
    expect(heroPlaybackAt(HERO_BEATS[0]!.at).revealed).toBe(1);
    expect(heroPlaybackAt(4000).revealed).toBeLessThan(HERO_BEATS.length);
    expect(heroPlaybackAt(HERO_SETTLE_AT)).toEqual({ revealed: HERO_BEATS.length, phase: 'handoff', settled: true });
  });

  it('hides every line before playing, and skip settles with the seen flag', () => {
    const first = runBoot();
    expect(first.log.indexOf('line0:data-on=false')).toBeGreaterThanOrEqual(0);
    expect(first.log.indexOf('line0:data-on=false')).toBeLessThan(first.log.indexOf('section:data-mode=playing'));
    expect(lineOn(first.section)).toEqual(Array(HERO_BEATS.length).fill('false'));
    expect(first.section.attrs.get('data-mode')).toBe('playing');
    expect(first.section.attrs.get('data-phase')).toBe('singularity');
    expect(typeof first.windowObj.__WN_HERO_T0).toBe('number');
    expect(first.store.has(HERO_SEEN_KEY)).toBe(false);

    first.section.skip?.listeners[0]?.();
    expect(first.store.get(HERO_SEEN_KEY)).toBe('1');
    expect(first.section.attrs.get('data-mode')).toBe('settled');
    expect(first.section.attrs.get('data-phase')).toBe('handoff');
    expect(lineOn(first.section)).toEqual(Array(HERO_BEATS.length).fill('true'));

    first.timer?.();
    expect(first.section.attrs.get('data-mode')).toBe('settled');
  });

  it('leaves a seen or reduced-motion visitor on the settled text', () => {
    for (const options of [{ seen: true }, { reduce: true }]) {
      const run = runBoot(options);
      expect(run.section.attrs.get('data-mode')).toBe('settled');
      expect(lineOn(run.section)).toEqual(Array(HERO_BEATS.length).fill('true'));
      expect(run.windowObj.__WN_HERO_T0).toBeUndefined();
      expect(run.timer).toBeNull();
    }
  });

  it('force-settles only when React never claims the section', () => {
    const open = runBoot();
    open.timer?.();
    expect(open.section.attrs.get('data-mode')).toBe('settled');
    expect(lineOn(open.section)).toEqual(Array(HERO_BEATS.length).fill('true'));
    expect(open.store.has(HERO_SEEN_KEY)).toBe(false);

    const claimed = runBoot({ heroBoot: true });
    claimed.timer?.();
    expect(claimed.section.attrs.get('data-mode')).toBe('playing');
    expect(lineOn(claimed.section)).toEqual(Array(HERO_BEATS.length).fill('false'));
  });
});

describe('hero star field', () => {
  it('keeps the same roll when only the height changes', () => {
    const first = syncHeroStarField(null, 390, 700);
    const again = syncHeroStarField(null, 390, 700);
    expect(again.field.stars).toEqual(first.field.stars);
    const micro = syncHeroStarField(first.field, 390, 706);
    expect(micro.rebuilt).toBe(false);
    expect(micro.field.stars).toBe(first.field.stars);
    expect(micro.field.height).toBe(706);
    const star = first.field.stars[0]!;
    const before = heroStarPoint(star, 390, 700);
    const after = heroStarPoint(star, 390, 706);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y / before.y).toBeCloseTo(706 / 700);
    const wider = syncHeroStarField(micro.field, 420, 706);
    expect(wider.rebuilt).toBe(true);
    expect(wider.field.stars).not.toBe(first.field.stars);
    expect(wider.field.stars).toEqual(rollHeroStars(420, 706));
  });

  it('reads hex and computed rgb era colors', () => {
    expect(cssColorToRgb('#c4a572')).toBe('196,165,114');
    expect(cssColorToRgb('#9ec0ef')).toBe('158,192,239');
    expect(cssColorToRgb('#2a2140')).toBe('42,33,64');
    expect(cssColorToRgb('rgb(42, 33, 64)')).toBe('42,33,64');
    expect(cssColorToRgb('#05060a')).not.toBe(cssColorToRgb('#2a2140'));
  });
});

describe('homepage anchor and brass', () => {
  it('clears the slice heading under the measured chrome, not the 220px civ offset', () => {
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toMatch(/--civ-anchor-offset:\s*220px/);
    expect(css).toMatch(/--home-anchor-offset:\s*127px/);
    expect(css).toMatch(/@media \(max-width: 700px\) \{\s*:root \{ --home-anchor-offset: 177px; \}/);
    expect(css).toMatch(/\.civ-home #slice,\s*\.civ-home #civ \{\s*scroll-margin-top: var\(--home-anchor-offset\);/);
    const h2Inset = 1 + 4 + 10;
    expect(177 + h2Inset - 161).toBeGreaterThanOrEqual(8);
    expect(127 + h2Inset - 111).toBeGreaterThanOrEqual(8);
    expect(177).toBe(161 + 16);
    expect(127).toBe(111 + 16);
  });

  it('keeps ink on a brass fill that clears 4.5:1', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const fill = css.match(/--brass-ink-fill:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(fill).toBeTruthy();
    expect(contrast('#161c24', fill!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#161c24', '#9a7b4f')).toBeLessThan(4.5);
    expect(css).toMatch(/\.hero-btn-brass \{ background: var\(--brass-ink-fill\); color: #161c24; \}/);
    expect(css).toMatch(/\.axis-hero \.btn-brass \{ background: var\(--brass-ink-fill\); color: #161c24; \}/);
  });

  it('does not rest with a spine label cut in half at phone widths', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const narrow = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    const rule = narrow.match(/width:\s*calc\(\(100cqi - (\d+)px\) \/ (\d+)\)/);
    expect(rule).toBeTruthy();
    const deep = narrow.slice(narrow.indexOf('.deep-axis {'), narrow.indexOf('.deep-axis::-webkit-scrollbar'));
    expect(deep).toContain('scroll-snap-type: x mandatory');
    expect(deep).toContain('scroll-padding-inline: 8px');
    expect(narrow).toContain('container-type: inline-size');
    const inset = Number(deep.match(/padding-inline:\s*(\d+)px/)?.[1]);
    expect(inset).toBe(8);
    const gapTotal = Number(rule?.[1]);
    const visible = Number(rule?.[2]);
    const gap = gapTotal / (visible - 1);
    expect(gap).toBeGreaterThan(inset);
    const tail = Number(narrow.match(/\.milestones li:nth-child\(5\) \{[^}]*margin-inline-start:\s*(\d+)px/)?.[1]);
    expect(tail).toBe(24);
    expect(narrow).toContain('scroll-padding-inline-end: 16px');
    expect(narrow).toContain('padding-inline-end: calc(25cqi + 8px)');
    const base = css.slice(css.indexOf('.milestones {'), css.indexOf('@media (max-width: 640px)'));
    expect(base).toContain('.milestones li { flex: 1; min-width: 0; text-align: center; }');
    for (const viewport of [355, 360, 375, 390, 414, 640]) {
      const scrollport = viewport - 32;
      const slots = phoneSpineSlots(scrollport, visible, gap, 7, inset, tail);
      expect(restingPartialSlots(scrollport, slots)).toEqual([]);
      /* Full-bleed hero: the scrollport ends 16px before the viewport edge. */
      const viewportEdge = scrollport + 16;
      expect(slots[4]!.left).toBeGreaterThanOrEqual(viewportEdge);
      expect(slots[6]!.left).toBeGreaterThan(slots[4]!.left);
      const endPad = (scrollport - inset * 2) * 0.25 + 8;
      const maxScroll = slots[slots.length - 1]!.right + endPad + inset - scrollport;
      const snap = slots[4]!.left - inset;
      expect(maxScroll).toBeGreaterThanOrEqual(snap - 0.5);
      for (const slot of slots) {
        const left = slot.left - snap;
        const right = slot.right - snap;
        const width = right - left;
        const shown = Math.min(right, scrollport) - Math.max(left, 0);
        const partial = shown > 0.5 && shown < width - 0.5;
        expect(partial).toBe(false);
      }
      for (let index = 0; index < slots.length; index += 1) {
        expect(slotFullyReachable(scrollport, slots, index)).toBe(true);
      }
    }
  });
});

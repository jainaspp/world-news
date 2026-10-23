import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MONITOR_READING } from '../shared/civilization/clock';
import {
  HERO_BEATS,
  HERO_BOOT_FALLBACK_MS,
  HERO_HINT,
  HERO_PRIMARY,
  HERO_READING_AT,
  HERO_RING_AT,
  HERO_RING_MS,
  HERO_SECONDARY,
  HERO_SEEN_KEY,
  HERO_SETTLE_AT,
  HERO_STAGES,
  heroAirAt,
  heroCanvasDpr,
  heroDialCenter,
  heroMinuteAngle,
  heroPlaybackAt,
  heroReadingText,
  heroRingAlpha,
  heroRingRadius,
  heroStageAt,
  renderHeroOpening,
  type HeroPhase,
} from '../shared/heroOpening';
import { cssColorToRgb, heroStarPoint, rollHeroStars, syncHeroStarField } from '../shared/heroStars';
import { phoneSpineSlots, slotsPastViewport } from '../shared/spineTrack';
import { renderHomeFeed } from '../shared/homePage';

/** Same particle scan as copy.test.ts; the Hero may be playful, never Cantonese-colloquial. */
const PARTICLES = /我哋|嘅|喺|咗|點樣|决|嘢|咁|同埋|呢個|呢啲|呢|唔|冇|仲未|撳|睇/g;
const BARE_HAI = /(?<![關係干])係(?![數統列])/g;
const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;

const PHASES: readonly HeroPhase[] = ['singularity', 'bloom', 'soup', 'ignition', 'earth', 'handoff'];

describe('hero opening beats', () => {
  it('runs six beats from singularity to handoff inside twelve seconds', () => {
    expect(HERO_BEATS.length).toBe(6);
    expect(HERO_BEATS.map((beat) => beat.phase)).toEqual([
      'singularity', 'bloom', 'ignition', 'earth', 'handoff', 'handoff',
    ]);
    expect(HERO_BEATS.map((beat) => beat.chapter)).toEqual([
      'ancient', 'ancient', 'now', 'now', 'future', 'future',
    ]);
    expect(HERO_BEATS.some((beat) => beat.phase === 'soup')).toBe(false);
    for (const beat of HERO_BEATS) expect(PHASES).toContain(beat.phase);
    const ids = HERO_BEATS.map((beat) => beat.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let index = 1; index < HERO_BEATS.length; index += 1) {
      expect(HERO_BEATS[index]!.at).toBeGreaterThan(HERO_BEATS[index - 1]!.at);
    }
    expect(HERO_BEATS[0]!.at).toBe(400);
    expect(HERO_BEATS[1]!.at).toBe(HERO_RING_AT);
    expect(HERO_BEATS[4]!.at).toBe(HERO_READING_AT);
    expect(HERO_SETTLE_AT).toBe(12000);
    expect(HERO_SETTLE_AT - HERO_BEATS[HERO_BEATS.length - 1]!.at).toBe(1500);
    expect(HERO_BOOT_FALLBACK_MS).toBe(4000);
    expect(HERO_BOOT_FALLBACK_MS).toBeLessThan(HERO_SETTLE_AT);
  });

  it('keeps the narration in written Chinese with no red-line terms', () => {
    const reading = heroReadingText();
    expect(reading).toBe(`監測刻度 · 午夜前 ${MONITOR_READING.minutes} 分`);
    expect(reading).not.toContain('距午夜');
    const copy = [
      ...HERO_BEATS.map((beat) => `${beat.main}${beat.aside ?? ''}`),
      reading,
    ];
    for (const text of copy) {
      expect(text.match(PARTICLES) ?? []).toEqual([]);
      expect(text.match(BARE_HAI) ?? []).toEqual([]);
      expect(REDLINE.test(text)).toBe(false);
      expect(text).not.toContain('距午夜');
      expect(text).not.toContain('末日');
      expect(text).not.toContain('倒數');
    }
    expect(HERO_BEATS[0]!.main).toBe('甚麼都還沒有名字。');
    expect(HERO_BEATS[1]!.aside).toBe('沒有空氣，就沒有響聲。');
    expect(HERO_BEATS[5]!.main).toBe('三卷仍在這一屏之下。');
    expect(HERO_BEATS.map((beat) => beat.main).join('')).not.toContain('秒');
  });
});

describe('hero opening SSR', () => {
  it('renders settled markup with every line, both CTAs, and the boot fallback', () => {
    const html = renderHeroOpening();
    expect(html).toContain('class="hero-opening"');
    expect(html).toContain('id="hero-opening"');
    expect(html).toContain('data-mode="settled"');
    expect(html).toContain('data-phase="handoff"');
    expect(html).toContain('data-chapter="future"');
    expect(html).toContain('class="hero-reading"');
    expect(html).toContain(`午夜前 <span class="hero-minute">${MONITOR_READING.minutes}</span> 分`);
    expect(html).not.toContain('距午夜');
    expect(html).not.toContain('volume-card');
    expect(html).not.toContain('setInterval');
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
    expect(html).toContain('data-hero-replay');
    expect(html).toContain(HERO_SEEN_KEY);
    expect(html).toContain('prefers-reduced-motion: reduce');
    expect(html).toContain('heroBoot');
    expect(html).toContain(String(HERO_BOOT_FALLBACK_MS));
    expect(html).not.toContain('15600');
    expect(html).toContain('文明編年史');
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
    expect(script).not.toContain('hero-title');
    expect(script).not.toContain('hero-kicker');
  });

  it('mounts the hero on the pure homepage only, before the axis band', () => {
    const home = renderHomeFeed([]);
    expect(home).toContain('hero-opening');
    expect(home.indexOf('hero-opening')).toBeLessThan(home.indexOf('axis-hero'));
    const heroClose = home.indexOf('</section>', home.indexOf('id="hero-opening"'));
    expect(home.indexOf('volume-card')).toBeGreaterThan(heroClose);
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
    expect(source).toContain('cancelAnimationFrame');
    expect(source).toContain('data-hero-boot');
    expect(source).toContain('data-chapter');
    expect(source).toContain('hero-reading');
    expect(source).toContain('data-hero-replay');
    expect(source).toContain('heroMinuteAngle');
    expect(source).toContain('heroCanvasDpr');
    expect(source).toContain('heroDialCenter');
    expect(source).toContain('heroRingRadius');
    expect(source).toContain('MONITOR_READING');
    expect(source).toContain('is-drawn');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('shadowBlur');
    expect(source).not.toContain('距午夜');
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
    expect(block).toContain('[data-chapter="ancient"]');
    expect(block).toContain('[data-chapter="future"]');
    expect(block).toContain('.hero-reading');
    expect(block).toContain('.hero-canvas.is-drawn');
    expect(block).toContain('180ms');
    expect(block).toContain('rgba(110, 90, 170, var(--violet-a))');
    expect(block).toContain('.hero-opening[data-mode="playing"] .hero-title');
    expect(block).not.toMatch(/\.hero-title\s*\{[^}]*opacity:\s*0/);
    expect(block).toContain('font-size: max(12px, 0.82em)');
    expect(block).toContain('.hero-hint-row { margin: 8px 0 0; }');
    expect(block).toContain('.hero-skip');
    expect(block).toContain('min-height: 44px');
    expect(block).toContain('min-width: 44px');
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
  reading: FakeEl | null = null;
  querySelectorAll(sel: string) {
    if (sel === '.hero-line') return this.lines;
    if (sel === '.hero-line, .hero-reading') return this.reading ? [...this.lines, this.reading] : this.lines;
    return [];
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
  section.setAttribute('data-chapter', 'future');
  section.reading = new FakeEl(log, 'reading');
  section.reading.setAttribute('data-on', 'true');
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
    expect(heroPlaybackAt(0)).toEqual({
      revealed: 0, phase: 'singularity', chapter: 'ancient', reading: false, settled: false,
    });
    expect(heroPlaybackAt(HERO_BEATS[0]!.at).revealed).toBe(1);
    expect(heroPlaybackAt(4000).revealed).toBeLessThan(HERO_BEATS.length);
    expect(heroPlaybackAt(HERO_READING_AT - 1).reading).toBe(false);
    expect(heroPlaybackAt(HERO_READING_AT)).toMatchObject({ reading: true, chapter: 'future', phase: 'handoff' });
    expect(heroPlaybackAt(HERO_SETTLE_AT)).toEqual({
      revealed: HERO_BEATS.length, phase: 'handoff', chapter: 'future', reading: true, settled: true,
    });
  });

  it('hides every line before playing, and skip settles with the seen flag', () => {
    const first = runBoot();
    expect(first.log.indexOf('line0:data-on=false')).toBeGreaterThanOrEqual(0);
    expect(first.log.indexOf('line0:data-on=false')).toBeLessThan(first.log.indexOf('section:data-mode=playing'));
    expect(lineOn(first.section)).toEqual(Array(HERO_BEATS.length).fill('false'));
    expect(first.section.attrs.get('data-mode')).toBe('playing');
    expect(first.section.attrs.get('data-phase')).toBe('singularity');
    expect(first.section.attrs.get('data-chapter')).toBe('ancient');
    expect(first.section.reading?.attrs.get('data-on')).toBe('false');
    expect(typeof first.windowObj.__WN_HERO_T0).toBe('number');
    expect(first.store.has(HERO_SEEN_KEY)).toBe(false);

    first.section.skip?.listeners[0]?.();
    expect(first.store.get(HERO_SEEN_KEY)).toBe('1');
    expect(first.section.attrs.get('data-mode')).toBe('settled');
    expect(first.section.attrs.get('data-phase')).toBe('handoff');
    expect(first.section.attrs.get('data-chapter')).toBe('future');
    expect(first.section.reading?.attrs.get('data-on')).toBe('true');
    expect(lineOn(first.section)).toEqual(Array(HERO_BEATS.length).fill('true'));

    first.timer?.();
    expect(first.section.attrs.get('data-mode')).toBe('settled');
  });

  it('leaves a seen or reduced-motion visitor on the settled text', () => {
    for (const options of [{ seen: true }, { reduce: true }]) {
      const run = runBoot(options);
      expect(run.section.attrs.get('data-mode')).toBe('settled');
      expect(run.section.attrs.get('data-chapter')).toBe('future');
      expect(run.section.reading?.attrs.get('data-on')).toBe('true');
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
    expect(claimed.section.attrs.get('data-chapter')).toBe('ancient');
    expect(lineOn(claimed.section)).toEqual(Array(HERO_BEATS.length).fill('false'));
    expect(claimed.section.reading?.attrs.get('data-on')).toBe('false');
  });
});

describe('hero opening clock and air', () => {
  it('keeps a single gold ring, a minute hand, and a capped canvas', () => {
    expect(HERO_STAGES.filter((stage) => stage.ring).map((stage) => stage.at)).toEqual([HERO_RING_AT]);
    expect(HERO_STAGES.some((stage) => stage.phase === 'soup')).toBe(false);
    expect(heroStageAt(0)).toMatchObject({ chapter: 'ancient', phase: 'singularity', glow: 1 });
    expect(heroStageAt(2900).ring).toBe(true);
    expect(heroStageAt(HERO_SETTLE_AT)).toMatchObject({ chapter: 'future', phase: 'handoff', rail: 1, hand: 1 });
    expect(heroAirAt(0)).not.toBe(heroAirAt(0));
    expect(heroMinuteAngle(MONITOR_READING.minutes)).toBeCloseTo(-MONITOR_READING.minutes * (Math.PI / 30));
    expect(heroMinuteAngle(15)).toBeCloseTo(-Math.PI / 2);
    expect(heroRingRadius(-1, 360, 800)).toBeNull();
    expect(heroRingRadius(HERO_RING_MS, 360, 800)).toBeNull();
    const age = 2900 - HERO_RING_AT;
    expect(heroRingAlpha(age)).toBeCloseTo(0.62 * (1 - age / HERO_RING_MS));
    expect(heroRingRadius(age, 360, 800)).toBeGreaterThan(12);
    expect(heroCanvasDpr(390, 3)).toBe(1.25);
    expect(heroCanvasDpr(1280, 3)).toBe(1.5);
    expect(heroCanvasDpr(1280, 1)).toBe(1);
    const dial = heroDialCenter(360);
    expect(dial.y + dial.r).toBeLessThan(156);
    expect(heroDialCenter(1280).r).toBe(60);
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

  it('keeps every phone spine label inside the viewport', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const narrow = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    const deep = narrow.slice(narrow.indexOf('.deep-axis {'), narrow.indexOf('.deep-axis::-webkit-scrollbar'));
    expect(deep).toContain('margin-inline: -16px');
    expect(deep).toContain('overflow: visible');
    expect(deep).not.toContain('overflow-x: auto');
    expect(deep).not.toContain('100cqi');
    const milestones = narrow.slice(narrow.indexOf('.milestones {'), narrow.indexOf('.milestones::before'));
    expect(milestones).toContain('width: 100%');
    expect(milestones).toContain('gap: 8px');
    expect(milestones).not.toContain('width: max-content');
    const item = narrow.slice(narrow.indexOf('.milestones li {'), narrow.indexOf('.chronicle-strip'));
    expect(item).toContain('flex: 1 1 0');
    expect(item).toContain('min-width: 44px');
    const hero = css.slice(css.indexOf('.axis-hero {'), css.indexOf('.axis-hero::after'));
    expect(hero).toContain('padding: 22px 16px 32px');
    expect(hero).toContain('margin: 12px -16px 0');
    for (const viewport of [360, 390]) {
      const slots = phoneSpineSlots(viewport);
      expect(slots).toHaveLength(7);
      expect(slotsPastViewport(viewport, slots)).toEqual([]);
      for (let index = 0; index < slots.length; index += 1) {
        const slot = slots[index]!;
        expect(slot.right - slot.left).toBeGreaterThanOrEqual(44);
        if (index > 0) expect(slot.left - slots[index - 1]!.right).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

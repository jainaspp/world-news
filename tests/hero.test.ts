import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HERO_CTA_MS,
  HERO_MAX_DPR,
  HERO_NARRATIVE,
  HERO_PHASES,
  HERO_PLAYED_FLAG,
  HERO_SETTLE_END_MS,
  heroKicker,
  heroPhaseAt,
  heroProse,
} from '../shared/hero/heroNarrative';

/**
 * Prologue contract. The narration data, the reveal timeline and the canvas
 * all share these numbers; the SPEC appendix quotes them, so a silent change
 * here would desync the film from its documentation. Copy tone is also part
 * of the contract: mild BBT-style humour, never doom or scare language, and
 * Hero only — the formal register of news pages must not pick it up.
 */
describe('hero narration data', () => {
  it('keeps exactly seven beats in strictly increasing order', () => {
    expect(HERO_NARRATIVE).toHaveLength(7);
    for (let index = 1; index < HERO_NARRATIVE.length; index += 1) {
      expect(HERO_NARRATIVE[index].startMs).toBeGreaterThan(HERO_NARRATIVE[index - 1].startMs);
    }
  });

  it('paces the film inside the LCP-friendly window', () => {
    expect(HERO_NARRATIVE[0].startMs).toBeGreaterThanOrEqual(800);
    expect(HERO_NARRATIVE[0].startMs).toBe(HERO_PHASES.void + HERO_NARRATIVE[0].startMs);
    expect(HERO_NARRATIVE.at(-1)!.startMs).toBeLessThanOrEqual(23_000);
    expect(HERO_CTA_MS).toBeGreaterThan(HERO_PHASES.settle);
    expect(HERO_SETTLE_END_MS).toBeGreaterThanOrEqual(HERO_CTA_MS + 400);
  });

  it('locks the bang beat to the canvas bang phase', () => {
    const bang = HERO_NARRATIVE.find((beat) => beat.kind === 'bang');
    expect(bang).toBeDefined();
    expect(bang!.startMs).toBe(HERO_PHASES.bang);
    expect(bang!.emphasis).toBeDefined();
    expect(bang!.text).toContain(bang!.emphasis!);
  });

  it('stays mild: no doom, stopwatch, or scare language in the prologue', () => {
    const prose = heroProse();
    for (const banned of ['末日', '倒數', '秒錶', '恐慌', '災難', '滅亡', '死線']) {
      expect(prose).not.toContain(banned);
    }
    expect(prose).toContain('一百三十八億');
    expect(prose).toContain('恆星');
    expect(prose).toContain('地球');
    expect(prose).toContain('編年');
  });

  it('prints the kicker with the brand and reads joined in prose', () => {
    expect(heroKicker()).toBe('文明編年史 · 序章');
    expect(heroProse().startsWith(heroKicker())).toBe(true);
    for (const beat of HERO_NARRATIVE) {
      expect(heroProse()).toContain(beat.text);
    }
  });

  it('caps the canvas DPR at 2 so phones stay within frame budget', () => {
    expect(HERO_MAX_DPR).toBe(2);
  });

  it('names the session replay flag, not an ad or store key', () => {
    expect(HERO_PLAYED_FLAG).toBe('wn-hero-played');
  });
});

describe('hero phase machine', () => {
  it('walks void → bang → drift → galaxy → earth → settle at the phase boundaries', () => {
    expect(heroPhaseAt(0)).toBe('void');
    expect(heroPhaseAt(HERO_PHASES.bang - 1)).toBe('void');
    expect(heroPhaseAt(HERO_PHASES.bang)).toBe('bang');
    expect(heroPhaseAt(HERO_PHASES.drift - 1)).toBe('bang');
    expect(heroPhaseAt(HERO_PHASES.drift)).toBe('drift');
    expect(heroPhaseAt(HERO_PHASES.galaxy)).toBe('galaxy');
    expect(heroPhaseAt(HERO_PHASES.earth)).toBe('earth');
    expect(heroPhaseAt(HERO_PHASES.settle)).toBe('settle');
    expect(heroPhaseAt(60_000)).toBe('settle');
  });

  it('orders the phases monotonically in time', () => {
    const entries = Object.values(HERO_PHASES);
    for (let index = 1; index < entries.length; index += 1) {
      expect(entries[index]).toBeGreaterThan(entries[index - 1]);
    }
  });
});

describe('hero module wiring', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  const component = readFileSync('src/components/HeroOpen.tsx', 'utf8');
  const painter = readFileSync('src/hero/heroCosmos.ts', 'utf8');
  const narrative = readFileSync('shared/hero/heroNarrative.ts', 'utf8');

  it('mounts the hero above the axis band, inside civ-home', () => {
    const home = app.slice(app.indexOf('className="civ-home"'), app.indexOf('id="slice"'));
    const heroAt = home.indexOf('<HeroOpen />');
    const axisAt = home.indexOf('axis-mount');
    expect(heroAt).toBeGreaterThan(-1);
    expect(axisAt).toBeGreaterThan(heroAt);
  });

  it('renders copy from the shared data module, not literals in the component', () => {
    expect(component).toContain("from '../../shared/hero/heroNarrative'");
    expect(painter).toContain("from '../../shared/hero/heroNarrative'");
    // The narration text lives in exactly one module.
    for (const file of [app, component, painter, narrative]) {
      if (file === narrative) continue;
      expect(file).not.toContain('話說，一百三十八億年前');
    }
  });

  it('pauses with the reader: intersection, visibility, reduced motion, static body', () => {
    expect(component).toContain('IntersectionObserver');
    expect(component).toContain('visibilitychange');
    expect(component).toContain('prefersReducedMotion()');
    expect(component).toContain("document.body.classList.contains('static')");
    expect(component).toContain('useLayoutEffect');
    expect(component).toContain('drawTableau');
    // The session flag is used via the shared constant, never re-hardcoded.
    expect(component).toContain('HERO_PLAYED_FLAG');
  });

  it('keeps the painter clock-free: the component drives every frame', () => {
    expect(painter).not.toContain('requestAnimationFrame');
    expect(painter).toContain('clamp(dpr, 1, HERO_MAX_DPR)');
    expect(painter).not.toContain('#05060a');
  });
});

describe('hero CSS gates', () => {
  const css = readFileSync('src/App.css', 'utf8');

  it('keeps the ink ground and never the prototype pure black', () => {
    expect(css).not.toContain('#05060a');
    const hero = heroSection(css);
    expect(hero).toContain('background: #161c24');
    expect(hero).toContain('min-height: 86svh');
    expect(hero).toContain('overflow: hidden');
  });

  it('hides beats only while the motion class is armed, inside no-preference', () => {
    const enableAt = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(enableAt).toBeGreaterThan(-1);
    const gated = css.slice(enableAt);
    expect(gated).toContain('html.hero-motion .hero-open .hero-line:not(.is-said)');
    expect(gated).toContain('hero-hint-fall');
    const freezeAt = css.indexOf('body.static .hero-line');
    expect(freezeAt).toBeGreaterThan(-1);
  });

  it('disables hero transitions and animation under reduced motion', () => {
    const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'), css.indexOf('@keyframes logo-enter'));
    expect(reduce).toContain('.hero-open .hero-line');
    expect(reduce).toContain('.hero-open .hero-cta');
    expect(reduce).toContain('animation: none');
    expect(reduce).toContain('transition: none');
  });

  it('meets the mobile gates: 44px targets, no fixed widths, bleed guard', () => {
    const hero = heroSection(css);
    expect(hero).toContain('min-height: 44px');
    const narrow = hero.slice(hero.indexOf('@media (max-width: 640px)'));
    expect(narrow).toContain('min-width: 0');
    expect(narrow).toContain('overflow-wrap: break-word');
    // Fixed-width trap guard (P0-03): the three fluid containers must never
    // carry a hard pixel width. max-* caps and tiny decorative seals are fine.
    for (const container of ['.hero-open', '.hero-inner', '.hero-narration']) {
      const block = hero.match(new RegExp(`${container.replace('.', '\\.')}\\s*\\{[^}]*\\}`));
      expect(block).not.toBeNull();
      expect(block![0]).not.toMatch(/(?:^|[;{\s])width:\s*\d+px/);
    }
  });

  it('lands the #civ hand-off clear of the sticky chrome', () => {
    expect(css).toContain('.civ-home .axis-hero { scroll-margin-top: var(--civ-anchor-offset); }');
  });
});

/** The hero styles are the site stylesheet's final section. */
function heroSection(css: string): string {
  const start = css.indexOf('.hero-open {');
  expect(start).toBeGreaterThan(-1);
  return css.slice(start);
}
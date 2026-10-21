import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderCivilizationHub } from '../shared/civilizationPage';
import { renderBulletinClock } from '../shared/civilization/clock';
import {
  OPENING_BEATS,
  OPENING_HERO_MS,
  OPENING_LINES,
  makeStars,
  openingCue,
  renderOpeningHero,
  settledCue,
} from '../shared/civilization/openingHero';
import { renderHomeFeed } from '../shared/homePage';
import type { NewsItem } from '../shared/types';

const item: NewsItem = {
  id: 'n1',
  title: '港鐵公布票價檢討',
  link: 'https://example.com/n',
  source: '香港電台',
  sourceUrl: 'https://news.rthk.hk',
  regions: ['HKG'],
  pubDate: '2026-10-17T01:00:00.000Z',
  category: 'hk',
};

describe('opening hero copy and timing', () => {
  it('locks seven lines, one aside, and a handoff that does not claim every atom', () => {
    expect(OPENING_LINES).toHaveLength(7);
    expect(OPENING_LINES.filter((line) => line.aside)).toHaveLength(1);
    expect(OPENING_LINES[2]?.aside).toBe(true);
    expect(OPENING_LINES.map((line) => line.at)).toEqual([0, 2600, 4400, 6800, 9600, 12400, 15000]);
    expect(OPENING_HERO_MS).toBe(18200);
    expect(OPENING_LINES[4]?.text).toContain('碳、氧、鐵');
    expect(OPENING_LINES.map((line) => line.text).join('')).not.toContain('每一個原子');
    expect(OPENING_BEATS.map((beat) => beat.id)).toEqual(['singularity', 'bang', 'galaxy', 'earth', 'handoff']);
  });

  it('walks singularity to the axis without a timer', () => {
    expect(openingCue(0)).toMatchObject({ beat: 'singularity', lineIndex: 0, spawn: 0, earth: 0, settled: false });
    expect(openingCue(2599).beat).toBe('singularity');
    expect(openingCue(2600)).toMatchObject({ beat: 'bang', lineIndex: 1 });
    expect(openingCue(4400).lineIndex).toBe(2);
    expect(openingCue(6800).beat).toBe('galaxy');
    expect(openingCue(9600).lineIndex).toBe(4);
    expect(openingCue(12400).beat).toBe('earth');
    expect(openingCue(12400).earth).toBe(0);
    expect(openingCue(13200).earth).toBeGreaterThan(0);
    expect(openingCue(15000)).toMatchObject({ beat: 'handoff', lineIndex: 6 });
    const end = settledCue();
    expect(end.settled).toBe(true);
    expect(end.filament).toBe(1);
    expect(end.earth).toBe(1);
    expect(end.lineIndex).toBe(6);
    const spawn = [2600, 4000, 6800].map((ms) => openingCue(ms).spawn);
    expect(spawn[0]).toBeLessThan(spawn[1] ?? 0);
    expect(spawn[1]).toBeLessThan(spawn[2] ?? 0);
    expect(makeStars(96)).toEqual(makeStars(96));
  });
});

describe('opening hero on the homepage', () => {
  const hero = renderOpeningHero();
  const home = renderHomeFeed([item]);
  const spec = readFileSync('docs/hero/BBT-HERO-GROK-4.7-SPEC-2026-10-21.md', 'utf8');

  it('renders the plate before the axis and leaves the clock, the h1, and learn alone', () => {
    expect(home.indexOf('id="opening"')).toBeGreaterThan(-1);
    expect(home.indexOf('id="opening"')).toBeLessThan(home.indexOf('id="civ"'));
    expect(home.indexOf('id="civ"')).toBeLessThan(home.indexOf('class="bulletin-clock"'));
    expect(home.indexOf('class="bulletin-clock"')).toBeLessThan(home.indexOf('id="slice"'));
    expect(home.match(/<h1\b/g)).toHaveLength(1);
    expect(home).toContain('<h1 class="axis-title">站在一條很長的時間軸上</h1>');
    expect(hero).not.toMatch(/<h1\b/);
    expect(hero).toContain('href="#civ"');
    expect(hero).toContain('接到時間軸');
    expect(hero).not.toContain('/learn/');
    expect(hero).not.toContain('setInterval');
    expect(hero).not.toContain('#05060a');
    expect(hero).not.toMatch(/gsap|lenis|three/i);
    for (const line of OPENING_LINES) {
      expect(hero).toContain(line.text);
      expect(spec).toContain(line.text);
    }
    expect(spec).toContain('18200');
    expect(spec).toContain('Grok 4.7');
    expect(renderBulletinClock()).not.toContain('砰');
    expect(renderCivilizationHub().html).not.toContain('id="opening"');
    expect(readFileSync('shared/homeCopy.ts', 'utf8')).not.toContain('然後——「砰」');
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('<OpeningHero />');
  });

  it('keeps ink paper, 44px controls, and a reduced-motion stop', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const block = css.slice(css.indexOf('.bbt-hero {'));
    expect(block).toContain('background-color: #161c24');
    expect(block).not.toContain('#05060a');
    expect(block).toContain('--era-ancient: #c4a572');
    expect(block).toContain('--era-now: #4a7fb5');
    expect(block).toContain('--era-future: #8d7aaa');
    expect(block).toContain('min-height: 44px');
    expect(block).toContain('min-width: 44px');
    expect(block).toContain('gap: 8px');
    expect(block).toContain('overflow-wrap: anywhere');
    expect(block).toContain('@media (max-width: 390px)');
    expect(block).toContain('prefers-reduced-motion: reduce');
    expect(block).toContain('animation: none');
    expect(block).toContain('transition: none');
    expect(block).not.toContain('position: sticky');
    expect(css).toMatch(/\.axis-hero \{[^}]*background:\s*#161c24/);
    expect(readFileSync('package.json', 'utf8')).not.toMatch(/gsap|lenis|lottie|three|animejs/i);
  });
});

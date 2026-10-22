import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderChroniclePage, renderCivilizationHub } from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';

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

function block(css: string, start: string, end: string): string {
  const from = css.indexOf(start);
  expect(from, start).toBeGreaterThanOrEqual(0);
  const to = css.indexOf(end, from + start.length);
  expect(to, end).toBeGreaterThan(from);
  return css.slice(from, to);
}

describe('2026-10-22 gate relock', () => {
  const gate = readFileSync('docs/gates/SITE-MAJOR-UPDATE-GATE.md', 'utf8');

  it('records the GM relock as a contract fix, not a Critical exemption', () => {
    expect(gate).toContain('LOCK 2026-10-22');
    expect(gate).toContain('#198');
    expect(gate).toContain('唔係豁免 Critical');
    expect(gate).toContain('R1 三席');
  });

  it('defers TRAP-V08 for PR 198 only and leaves other P0 rules in force', () => {
    expect(gate).toContain('LOCK 2026-10-22 晚（HKT，約 20:04）');
    expect(gate).toContain('只限');
    expect(gate).toContain('DEFERRED');
    expect(gate).toContain('不得記 **FAIL**');
    expect(gate).toContain('下一次站級重大更新');
    expect(gate).toContain('桌面 DevTools 仍然不算通過');
    expect(gate).toContain('P0 不可由投票豁免，也不可由 GM 豁免');
    const evening = gate.slice(gate.indexOf('LOCK 2026-10-22 晚'), gate.indexOf('來源 PR'));
    expect(evening).toContain('TRAP-V08');
    expect(evening).toContain('§7.3 第 8 項');
    expect(evening).toContain('Critical 必須仍為 0');
  });

  it('requires three volume cards and drops chronicle-strip from the C skeleton', () => {
    const section = block(gate, '### 2.2 頁面', '### 2.3 主題');
    expect(section).toContain('三張 `.volume-card`');
    expect(section).toContain('#ch-ancient');
    expect(section).toContain('#ch-now');
    expect(section).toContain('#ch-future');
    expect(section).toContain('#stage-1');
    expect(section).toContain('#stage-10');
    expect(section).toContain('唔再');
    expect(section).toContain('P0-DOM-EXPECT');
    expect(section).not.toContain('`.chronicle-strip`、`.pattern-axis`');
    const dom = gate.slice(gate.indexOf('`P0-DOM-EXPECT`'), gate.indexOf('`P0-RENDER-ERR`'));
    expect(dom).toContain('.volume-card');
    expect(dom).toContain('唔再計本條 FAIL');
    expect(dom).toContain('#ch-future');
  });
});

describe('R1 critical union in CSS', () => {
  const css = readFileSync('src/App.css', 'utf8');

  it('gives enumerated phone controls a 44px box and an 8px chip gap', () => {
    const btn = block(css, '.axis-hero .btn {', '.axis-hero .btn-brass');
    expect(btn).toContain('min-height: 44px');
    expect(btn).toContain('min-width: 44px');
    for (const start of ['.pattern-axis .chip {', '.case-axis .chip {', '.chronicle-nav .chip,', '.volume-card a {']) {
      const rule = css.slice(css.indexOf(start), css.indexOf('}', css.indexOf(start)));
      expect(rule, start).toContain('min-height: 44px');
      expect(rule, start).toContain('min-width: 44px');
    }
    expect(css).toContain('.header-actions .icon-btn { min-width: 44px; min-height: 44px;');
    expect(css).toContain('.search-bar > .search-toggle { display: inline-flex; min-height: 44px; min-width: 44px; }');
    const phone = css.slice(css.indexOf('@media (max-width: 720px)'), css.indexOf('@media (min-width: 640px)'));
    expect(phone).toContain('min-width: 44px;\n    min-height: 44px;');
    expect(phone).not.toContain('min-height: 32px');
    expect(phone).not.toContain('min-height: 36px');
    expect(phone).toContain('gap: 8px');
    const mast = css.slice(css.lastIndexOf('@media (max-width: 720px)'));
    expect(mast).toContain('min-width: 44px; min-height: 44px;');
    expect(mast).not.toContain('min-height: 32px');
    const nav = block(css, '.chronicle-nav,\n.cosmo-nav {', '.chronicle-nav::-webkit-scrollbar');
    expect(nav).toContain('gap: 8px');
    const volumes = block(css, '.volume-grid {', '.volume-card {');
    expect(volumes).toContain('gap: 12px');
  });

  it('snaps the deep axis and chronicle nav so a resting chip is whole', () => {
    const nav = block(css, '.chronicle-nav,\n.cosmo-nav {', '.chronicle-nav::-webkit-scrollbar');
    expect(nav).toContain('flex-wrap: wrap');
    expect(nav).toContain('scroll-snap-type: x mandatory');
    expect(nav).toContain('scroll-padding-inline: 12px');
    expect(nav).toContain('padding: 4px 12px 10px');
    const chip = block(css, '.chronicle-nav .chip,', '.chronicle-stage {');
    expect(chip).toContain('scroll-snap-align: start');
    const narrow = css.slice(css.lastIndexOf('@media (max-width: 640px)'));
    const deep = narrow.slice(narrow.indexOf('.deep-axis {'), narrow.indexOf('.deep-axis::-webkit-scrollbar'));
    expect(deep).toContain('scroll-snap-type: x mandatory');
    expect(deep).toContain('padding-inline: 8px');
    expect(deep).toContain('scroll-padding-inline: 8px');
    expect(narrow).toContain('width: calc((100cqi - 36px) / 4)');
  });

  it('paints dark chapter bands with ink #161c24', () => {
    expect(css).not.toContain('#10151b');
    const dark = block(css, 'html.dark .chapter-band,', 'html.dark .bulletin-clock .bulletin-kicker');
    expect(dark).toContain('background: #161c24');
    expect(dark).toContain('.chapter-band-future');
    const light = block(css, '.chapter-band {', '.chapter-band h2');
    expect(light).toContain('background: #161c24');
  });

  it('keeps small brass on paper at 4.5:1 without replacing the brand brass', () => {
    const token = css.match(/--brass-on-paper:\s*(#[0-9a-fA-F]{6})/)?.[1];
    expect(token).toBe('#7a5a32');
    expect(contrast(token!, '#f7f1e6')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token!, '#f4f6f8')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#9a7b4f', '#f7f1e6')).toBeLessThan(4.5);
    expect(contrast('#c4a572', '#161c24')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#161c24', '#a18256')).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain('--brass-ink-fill: #a18256');
    for (const selector of [
      '.chronicle-stage .era',
      '.milestone-h',
      '.civ-slice-kicker',
      '.civ-slot-label',
      '.layer-card .era',
      '.case-kicker',
      '.question-precedent',
    ]) {
      const rule = css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)));
      expect(rule, selector).toContain('var(--brass-on-paper)');
      expect(rule, selector).toMatch(/font-size:\s*12px/);
    }
    expect(css).toContain('html.dark .chronicle-stage .era');
    expect(css).toContain('color: #c4a572');
    expect(css).toMatch(/border: 1\.5px solid #9a7b4f/);
  });
});

describe('R4 dark figcaption contrast', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const split = css.indexOf('/* Dark civ surfaces');
  const light = css.slice(0, split);
  const dark = css.slice(split);

  function rule(source: string, selector: string): string {
    const at = source.indexOf(selector);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return source.slice(at, source.indexOf('}', at));
  }

  function declaredColor(block: string): string {
    const color = block.match(/color:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
    expect(color, block).toBeTruthy();
    return color!;
  }

  it('keeps muted figcaptions at 4.5:1 on dark paper and ink', () => {
    const selectors = [
      '.civ-figure figcaption',
      '.civ-figure-credit',
      '.milestone-figure figcaption',
      '.civ-block-figure figcaption',
      '.civ-node-hero figcaption',
    ];
    for (const selector of selectors) {
      expect(declaredColor(rule(light, selector)), selector).toBe('#5c6570');
      expect(contrast('#5c6570', '#f7f1e6'), `${selector} light paper`).toBeGreaterThanOrEqual(4.5);
      const darkColor = declaredColor(rule(dark, selector));
      expect(contrast(darkColor, '#2a231b'), `${selector} on #2a231b`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(darkColor, '#161c24'), `${selector} on #161c24`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast('#5c6570', '#2a231b')).toBeLessThan(4.5);
    expect(rule(light, '.civ-block-figure figcaption')).toContain('font-size: 12px');
    const chip = rule(dark, 'html.dark .future-cover figcaption');
    expect(declaredColor(chip)).toBe('#161c24');
    expect(chip).toContain('background: #f7f1e6');
    expect(contrast('#161c24', '#f7f1e6')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('R5 P0-CONTRAST muted text', () => {
  const css = readFileSync('src/App.css', 'utf8');

  it('darkens light clock seconds and lifts dark muted text without touching figcaptions', () => {
    const seconds = css.match(/--civ-clock-seconds:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
    expect(seconds).toBe('#6e675c');
    expect(contrast(seconds!, '#f7f1e6')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#8a8175', '#f7f1e6')).toBeLessThan(4.5);
    expect(css).toContain('color: var(--civ-clock-seconds)');
    expect(css).toContain('html.dark .bulletin-clock .bulletin-seconds,\nhtml.dark .bulletin-clock .bulletin-asof { color: #b7b1a6; }');
    expect(contrast('#b7b1a6', '#161c24')).toBeGreaterThanOrEqual(4.5);

    const link = css.match(/--civ-link-on-ink:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
    expect(link).toBe('#9ec0ef');
    expect(contrast(link!, '#161c24')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#1d4f91', '#161c24')).toBeLessThan(4.5);
    expect(css).toContain('.chapter-band .stage-links a { color: var(--civ-link-on-ink); }');

    const muted = css.match(/html\.dark \{[^}]*--color-muted:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
    expect(muted).toBe('#c9d3df');
    expect(contrast(muted!, '#121820')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted!, '#0e141c')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#3d4550', '#121820')).toBeLessThan(4.5);
    expect(contrast('#5c6570', '#121820')).toBeLessThan(4.5);
    expect(contrast('#5c6570', '#0e141c')).toBeLessThan(4.5);
    expect(css).toContain([
      'html.dark .learn-progress,',
      'html.dark .learn-note,',
      'html.dark .learn-bound,',
      'html.dark .learn-locked,',
      'html.dark .learn-bearings { color: var(--color-muted); }',
    ].join('\n'));
    expect(css).toContain('html.dark .more-today span { color: var(--color-muted); }');
    expect(css).toContain('html.dark .nav-more summary { color: var(--color-muted); }');
    expect(css).toContain('html.dark .civ-block-figure figcaption { color: #d2c4b0; }');
  });
});

describe('R6 P0-CONTRAST axis year labels', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const photoMedian = '#453f38';

  it('plates .axis-node .yr on ink so brass clears the bright axis photo', () => {
    const at = css.lastIndexOf('.axis-node .yr {');
    expect(at).toBeGreaterThan(css.indexOf('.axis-node .lab, .axis-node .yr {'));
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).toContain('color: #c4a572');
    expect(rule).toContain('background: #161c24');
    expect(rule).toContain('width: max-content');
    expect(rule).toContain('max-width: 100%');
    expect(contrast('#c4a572', '#161c24')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#c4a572', photoMedian)).toBeLessThan(4.5);
    const lab = css.slice(css.indexOf('.axis-node {'), css.indexOf('a.axis-node:hover'));
    expect(lab).toContain('color: #c5c0b6');
    expect(contrast('#c5c0b6', photoMedian)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#c5c0b6', '#161c24')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#c4a572', '#161c24')).toBeGreaterThanOrEqual(4.5);
    expect(css).toContain('--brass-on-paper: #7a5a32');
    expect(css).toContain('--civ-clock-seconds: #6e675c');
    expect(css).toContain('--civ-link-on-ink: #9ec0ef');
    expect(css).toMatch(/html\.dark \{[^}]*--color-muted:\s*#c9d3df/);
    expect(css).toContain('html.dark .civ-block-figure figcaption { color: #d2c4b0; }');
  });
});

describe('three volume skeleton still renders', () => {
  it('puts three volume cards on home and hub, and the chapter plus stage anchors on the chronicle', () => {
    const home = renderHomeFeed([], new Map(), null, '', null, '', [], [], new Date('2026-10-17T04:00:00.000Z'), true);
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z')).html;
    const chronicle = renderChroniclePage().html;
    for (const html of [home, hub]) {
      expect(html.match(/class="volume-card"/g)).toHaveLength(3);
      expect(html).not.toContain('class="chronicle-strip"');
    }
    for (const id of ['ch-ancient', 'ch-now', 'ch-future']) {
      expect(chronicle).toContain(`id="${id}"`);
    }
    for (let n = 1; n <= 10; n += 1) {
      expect(chronicle).toContain(`id="stage-${n}"`);
    }
  });
});

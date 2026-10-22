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

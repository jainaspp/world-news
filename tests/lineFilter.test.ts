import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CASE_STUDIES } from '../shared/civilization/cases';
import { CHRONICLE_STAGES } from '../shared/civilization/chronicle';
import { CIV_LINES } from '../shared/civilization/contract';
import {
  lineFilterAttrs,
  lineFilterEmpty,
  lineFilterHides,
  lineFilterPatternStatus,
  lineFilterStatus,
  lineFilterTally,
  renderLineFilter,
} from '../shared/civilization/lineFilter';
import { PATTERN_CARDS } from '../shared/civilization/patterns';
import {
  civilizationPublicPaths,
  renderChroniclePage,
  renderCityPage,
  renderCivilizationHub,
  renderCosmosPage,
  renderEarthPage,
  renderGalaxyPage,
  renderOriginsPage,
  renderTechPage,
} from '../shared/civilizationPage';

describe('civilization hub four-line filter', () => {
  it('keeps a block out of the filter unless every line is in the closed set', () => {
    expect(lineFilterAttrs(undefined)).toBe('');
    expect(lineFilterAttrs([])).toBe('');
    expect(lineFilterAttrs(['環境', '類群'])).toBe('');
    expect(lineFilterAttrs(['能量', '時間'])).toBe('');
    expect(lineFilterAttrs(['工具', '能源'])).toBe('');
    expect(lineFilterAttrs(['能量', '能量'])).toBe('');
    expect(lineFilterAttrs(['能量'])).toBe(' data-lines="能量"');
    expect(lineFilterAttrs(['貨幣', '制度'])).toBe(' data-lines="制度 貨幣"');
    expect(lineFilterHides(['制度', '貨幣'], '')).toBe(false);
    expect(lineFilterHides(['制度', '貨幣'], '能量')).toBe(true);
    expect(lineFilterHides(['制度', '貨幣'], '貨幣')).toBe(false);
    expect(lineFilterEmpty([['信息']], '能量')).toBe(true);
    expect(lineFilterEmpty([['信息'], ['能量']], '能量')).toBe(false);
    expect(lineFilterEmpty([['信息']], '')).toBe(false);
    expect(lineFilterTally([['能量'], ['信息', '制度'], ['環境']], '能量')).toBe(1);
    expect(lineFilterTally([['環境', '類群']], '')).toBe(0);
    expect(lineFilterStatus('', { stages: 10, patterns: 3 })).toBe('全部：10 個階段，3 張模式卡。');
    expect(lineFilterStatus('能量', { stages: 0, patterns: 0 })).toBe('能量：暫無階段，暫無模式卡。');
    expect(lineFilterStatus('能量', { stages: 0, patterns: 1 })).toBe('能量：暫無階段，1 張模式卡。');
    expect(lineFilterStatus('制度', { stages: 2, patterns: 0 })).toBe('制度：2 個階段，暫無模式卡。');
    expect(lineFilterStatus('度量', { stages: 1, patterns: 1 })).toBe('');
    expect(lineFilterPatternStatus('貨幣', 1)).toBe('貨幣：1 張模式卡。');
    expect(lineFilterPatternStatus('貨幣', 0)).toBe('貨幣：暫無模式卡。');
    expect(lineFilterPatternStatus('', 3)).toBe('');
    expect(lineFilterPatternStatus('度量', 1)).toBe('');
    const blank = renderLineFilter([], []);
    expect(blank).toContain('class="line-filter-status is-empty"');
    expect(blank).toContain('全部：暫無階段，暫無模式卡。');
    expect(blank.match(/<button /g)).toHaveLength(5);
  });

  it('keeps the line filter off the reading pages', () => {
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z'));
    expect(hub.html).not.toContain('class="line-filter"');
    expect(hub.html).not.toContain('class="volume-grid"');
    expect(hub.html).not.toContain('id="stage-grid"');
    expect(hub.html).not.toContain('class="stage-card"');
    const stageGroups = CHRONICLE_STAGES.map((stage) => stage.lines);
    const patternGroups = PATTERN_CARDS.map((card) => card.lines);
    for (const line of CIV_LINES) {
      expect(lineFilterTally(stageGroups, line)).toBeGreaterThan(0);
      expect(lineFilterEmpty([...stageGroups, ...patternGroups], line)).toBe(false);
    }
    for (const page of [hub, renderChroniclePage(), renderEarthPage(), renderCosmosPage(), renderGalaxyPage(), renderCityPage(), renderTechPage(), renderOriginsPage()]) {
      expect(page.html).not.toContain('class="line-filter"');
      expect(page.html).not.toContain('line-filter-echo');
      expect(page.html).not.toContain('line-filter-status');
    }
    for (const item of CASE_STUDIES) {
      const page = item.mount === '/civilization/tech/' ? renderTechPage() : renderChroniclePage();
      expect(page.html).toContain(`id="case-${item.id}"`);
    }
  });

  it('adds no civilization route and does not animate the filter or the reveal', () => {
    expect(civilizationPublicPaths()).toEqual([
      '/civilization/',
      '/civilization/cosmos/',
      '/civilization/galaxy/',
      '/civilization/earth/',
      '/civilization/origins/',
      '/civilization/tech/',
      '/civilization/city/',
      '/civilization/chronicle/',
    ]);
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/vault|methodology|line-filter|能量/);
    const css = readFileSync('src/App.css', 'utf8');
    const filterCss = css.slice(css.indexOf('.line-filter {'), css.indexOf('.stage-links', css.indexOf('.line-filter {')));
    expect(filterCss).toContain('#161c24');
    expect(filterCss).toContain('#f7f1e6');
    expect(filterCss).toContain('min-height: 44px');
    expect(filterCss).toContain('repeat(5, minmax(0, 1fr))');
    expect(filterCss).toContain('.line-filter-status.is-empty');
    expect(filterCss).toContain('display: none');
    expect(filterCss).not.toMatch(/max-height|height:\s*0/);
    const motion = css.slice(css.indexOf('Civilization axis motion'));
    expect(motion).toContain('html.civ-motion body:not(.static) .civ-reveal:not(.is-inview):not(.civ-reveal--above-fold)');
    expect(motion).toContain('prefers-reduced-motion: no-preference');
    expect(motion).toContain('body.static .civ-reveal');
    const js = readFileSync('public/columns.js', 'utf8');
    const filterJs = js.slice(js.indexOf('function applyLineFilter'), js.indexOf('var related = document.getElementById'));
    expect(filterJs).toContain('data-lines');
    expect(filterJs).toContain('data-status');
    expect(filterJs).toContain('is-empty');
    expect(filterJs).toContain('line-filter-echo');
    expect(filterJs).toContain('ArrowRight');
    expect(filterJs).toContain("setAttribute('hidden'");
    expect(filterJs).toContain('removeAttribute(\'hidden\')');
    expect(filterJs).not.toContain('line-filter-empty');
    expect(filterJs).not.toContain('civ-reveal');
    expect(filterJs).not.toContain('civ-motion');
    expect(filterJs).not.toContain('prefers-reduced-motion');
    expect(filterJs).not.toContain('maxHeight');
    expect(filterJs).not.toContain('requestAnimationFrame');
    expect(readFileSync('shared/civilization/SCHEMA.md', 'utf8')).toContain('總覽四線篩選');
  });
});

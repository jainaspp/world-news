import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CASE_STUDIES } from '../shared/civilization/cases';
import { CHRONICLE_STAGES } from '../shared/civilization/chronicle';
import { CIV_LINES } from '../shared/civilization/contract';
import {
  LINE_FILTER_EMPTY,
  lineFilterAttrs,
  lineFilterEmpty,
  lineFilterHides,
} from '../shared/civilization/lineFilter';
import { PATTERN_CARDS } from '../shared/civilization/patterns';
import {
  civilizationPublicPaths,
  renderChroniclePage,
  renderCityPage,
  renderCivilizationHub,
  renderCosmosPage,
  renderEarthPage,
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
  });

  it('renders chips on the hub from stage and pattern lines, and leaves other pages alone', () => {
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z'));
    const filterAt = hub.html.indexOf('class="line-filter"');
    const emptyAt = hub.html.indexOf('class="line-filter-empty"');
    const gridAt = hub.html.indexOf('class="stage-grid"');
    expect(filterAt).toBeGreaterThan(hub.html.indexOf('class="chronicle-board"'));
    expect(emptyAt).toBeGreaterThan(filterAt);
    expect(gridAt).toBeGreaterThan(emptyAt);
    const filter = hub.html.slice(filterAt, emptyAt);
    expect(filter.match(/<button /g)).toHaveLength(5);
    expect(filter).toContain('aria-label="按四線篩選階段與模式卡"');
    expect(filter).toContain('data-line="" aria-pressed="true">全部<');
    let cursor = 0;
    for (const label of ['全部', ...CIV_LINES]) {
      const at = filter.indexOf(`>${label}<`, cursor);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    for (const line of CIV_LINES) {
      expect(filter).toContain(`data-line="${line}" aria-pressed="false"`);
    }
    expect(hub.html).toContain(`<p class="line-filter-empty" hidden>${LINE_FILTER_EMPTY}</p>`);
    expect(hub.html).not.toMatch(/<article class="stage-card"[^>]*\shidden/);
    expect(hub.html).not.toMatch(/<details class="civ-block pattern-card"[^>]*\shidden/);

    const groups = [
      ...CHRONICLE_STAGES.map((stage) => stage.lines),
      ...PATTERN_CARDS.map((card) => card.lines),
    ];
    for (const line of CIV_LINES) expect(lineFilterEmpty(groups, line)).toBe(false);
    expect(hub.html.match(/data-lines="/g)).toHaveLength(groups.length);

    for (const stage of CHRONICLE_STAGES) {
      const card = hub.html.slice(hub.html.indexOf(`<article class="stage-card" data-stage="${stage.n}"`));
      const end = card.indexOf('</article>');
      expect(card.slice(0, end)).toContain(lineFilterAttrs(stage.lines).trim());
    }
    for (const card of PATTERN_CARDS) {
      const at = hub.html.indexOf(`id="pattern-${card.id}"`);
      const body = hub.html.slice(at, hub.html.indexOf('</details>', at));
      expect(body).toContain(lineFilterAttrs(card.lines).trim());
      expect(at).toBeGreaterThan(gridAt);
    }

    for (const page of [renderChroniclePage(), renderEarthPage(), renderCosmosPage(), renderCityPage(), renderTechPage(), renderOriginsPage()]) {
      expect(page.html).not.toContain('class="line-filter"');
    }
    for (const page of [renderEarthPage(), renderCosmosPage(), renderCityPage(), renderOriginsPage()]) {
      expect(page.html).not.toContain('data-lines=');
    }
    for (const item of CASE_STUDIES) {
      const page = item.mount === '/civilization/tech/' ? renderTechPage() : renderChroniclePage();
      expect(page.html).toContain(`id="case-${item.id}"`);
      expect(page.html).toContain(lineFilterAttrs(item.lines).trim());
      expect(hub.html).not.toContain(`id="case-${item.id}"`);
    }
  });

  it('adds no civilization route and does not animate the filter or the reveal', () => {
    expect(civilizationPublicPaths()).toEqual([
      '/civilization/',
      '/civilization/cosmos/',
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
    expect(filterCss).toContain('display: none');
    expect(filterCss).not.toMatch(/max-height|height:\s*0/);
    const motion = css.slice(css.indexOf('Civilization axis motion'));
    expect(motion).toContain('html.civ-motion body:not(.static) .civ-reveal:not(.is-inview):not(.civ-reveal--above-fold)');
    expect(motion).toContain('prefers-reduced-motion: no-preference');
    expect(motion).toContain('body.static .civ-reveal');
    const js = readFileSync('public/columns.js', 'utf8');
    const filterJs = js.slice(js.indexOf('function applyLineFilter'), js.indexOf('var related = document.getElementById'));
    expect(filterJs).toContain('data-lines');
    expect(filterJs).toContain("setAttribute('hidden'");
    expect(filterJs).toContain('removeAttribute(\'hidden\')');
    expect(filterJs).not.toContain('civ-reveal');
    expect(filterJs).not.toContain('civ-motion');
    expect(filterJs).not.toContain('prefers-reduced-motion');
    expect(filterJs).not.toContain('maxHeight');
    expect(filterJs).not.toContain('requestAnimationFrame');
    expect(readFileSync('shared/civilization/SCHEMA.md', 'utf8')).toContain('總覽四線篩選');
  });
});

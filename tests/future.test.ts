import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { civChars } from '../shared/civilization/contract';
import { CHRONICLE_STAGES } from '../shared/civilization/chronicle';
import {
  FUTURE_CLADE,
  FUTURE_COUNTDOWNS,
  FUTURE_DOMAINS,
  FUTURE_HORIZONS,
  FUTURE_TIERS,
  FUTURE_TIER_ROWS,
  LEVEL_BANDS,
  STAGE10_BRIDGE,
  countdownSentence,
  futureHrefAllowed,
  futureIssues,
  renderFutureBridge,
  renderFuturePanel,
} from '../shared/civilization/future';
import { questionHrefAllowed } from '../shared/civilization/questions';
import { SPINE } from '../shared/civilization/spine';
import { renderChroniclePage, renderCivilizationHub } from '../shared/civilizationPage';
import { heritageBlocked } from '../shared/heritage';

const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;
const NOW = new Date('2026-10-19T04:00:00.000Z');
const AFTER = new Date('2027-04-01T00:00:00.000Z');

describe('civilization future P0', () => {
  it('keeps the closed sets and returns no contract issues', () => {
    expect(futureIssues()).toEqual([]);
    expect(FUTURE_DOMAINS.map((domain) => domain.title)).toEqual([
      '能量宜居', '信息可信', '制度協作', '生物譜系', '技術能力階', '生存風險',
    ]);
    expect(FUTURE_DOMAINS.map((domain) => domain.code)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
    expect(FUTURE_DOMAINS.filter((domain) => domain.status === '加厚中').map((domain) => domain.id)).toEqual(['f3']);
    expect([...FUTURE_TIERS]).toEqual(['observe', 'pilot', 'infra', 'civ-scale']);
    expect(FUTURE_TIER_ROWS.filter((row) => row.shown)).toHaveLength(3);
    expect(FUTURE_TIER_ROWS.find((row) => row.tier === 'civ-scale')?.shown).toBe(false);
    expect([...LEVEL_BANDS]).toEqual([
      'e0', 'e1', 'e2', 'e3', 'e4',
      'i0', 'i1', 'i2', 'i3', 'i4',
      'a0', 'a1', 'a2', 'a3', 'a4',
    ]);
    expect(FUTURE_CLADE.kinds).toEqual(['tool-extension', 'niche-continue']);
    expect(FUTURE_CLADE.layers.map((layer) => layer.title)).toEqual(['共享遺產', '共演化', 'SETI尚無確證']);
    expect(FUTURE_HORIZONS.map((horizon) => horizon.title)).toEqual([
      '氣候宜居約束', '信息可信與大規模誤導', '近地／空間天氣監測',
    ]);
    expect(FUTURE_COUNTDOWNS.length).toBeGreaterThanOrEqual(1);
    expect(civChars(STAGE10_BRIDGE)).toBeGreaterThanOrEqual(80);
    expect(civChars(STAGE10_BRIDGE)).toBeLessThanOrEqual(120);
    expect(futureHrefAllowed('/civilization/#future')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-f1')).toBe(true);
    expect(futureHrefAllowed('/civilization/future/')).toBe(false);
    expect(questionHrefAllowed('/civilization/#future-f6')).toBe(true);
    expect(questionHrefAllowed('/civilization/future/')).toBe(false);
  });

  it('places future on the spine and the hub, and bridges stage 10 without a new route', () => {
    expect(SPINE.map((node) => node.id)).toEqual(['cosmos', 'earth', 'origins', 'tech', 'city', 'future', 'today']);
    expect(SPINE.find((node) => node.id === 'future')?.href).toBe('/civilization/#future');
    const hub = renderCivilizationHub(NOW);
    const chronicle = renderChroniclePage();
    const panelAt = hub.html.indexOf('id="future"');
    expect(panelAt).toBeGreaterThan(hub.html.indexOf('class="chronicle-board"'));
    expect(panelAt).toBeLessThan(hub.html.indexOf('class="civ-article"'));
    const panel = hub.html.slice(panelAt, hub.html.indexOf('class="civ-article"'));
    expect(panel.match(/class="future-domain"/g)).toHaveLength(6);
    expect(panel.match(/class="future-tier"/g)).toHaveLength(3);
    expect(panel).not.toContain('data-tier="civ-scale"');
    expect(panel).toContain('約');
    expect(panel).toContain('示意');
    expect(panel).toContain('假說');
    expect(panel).toContain('id="future-bands"');
    expect(panel).not.toContain('總分');
    expect(panel).not.toMatch(/第[0-9一二三四五六七八九十]+[級级]文明/);
    for (const horizon of FUTURE_HORIZONS) {
      expect(panel).toContain(`id="${horizon.anchor}"`);
      expect(panel).toContain(horizon.title);
      for (const source of horizon.sources) expect(panel).toContain(`href="${source.url}"`);
    }
    expect(panel).toContain('id="future-countdown-wmo"');
    expect(panel).toContain(FUTURE_COUNTDOWNS[0]?.pending ?? '');
    expect(panel).toContain('id="future-clade"');
    expect(panel).toContain('共享遺產');
    expect(panel).toContain('共演化');
    expect(panel).toContain('SETI尚無確證');
    expect(panel).toContain('不寫優生');
    expect(panel).not.toContain('<li>');
    expect(panel).not.toContain('<script');
    expect(hub.html).not.toContain('/civilization/future/');
    expect(hub.html).not.toMatch(REDLINE);
    expect(heritageBlocked(panel)).toBe(false);

    const stage10 = CHRONICLE_STAGES.find((stage) => stage.n === 10);
    expect(stage10?.name).toBe('當代／近未來');
    expect(CHRONICLE_STAGES).toHaveLength(10);
    const start = chronicle.html.indexOf('id="stage-10"');
    const section = chronicle.html.slice(start, chronicle.html.indexOf('四線總結'));
    expect(section).toContain('id="stage-10-bridge"');
    expect(section).toContain(STAGE10_BRIDGE);
    expect(section).toContain('id="stage-10-bands"');
    expect(section).toContain('href="/civilization/#future-f1"');
    expect(section).not.toContain('id="stage-11"');
    const strip = hub.html.slice(hub.html.indexOf('class="chronicle-strip"'), hub.html.indexOf('</nav>', hub.html.indexOf('class="chronicle-strip"')));
    expect(strip.match(/class="stage-dot"/g)).toHaveLength(10);
    expect(strip).not.toContain('#future');
    expect(renderFutureBridge(9)).toBe('');
    expect(renderFutureBridge(11)).toBe('');
    expect(chronicle.html).not.toMatch(REDLINE);

    const expired = renderFuturePanel(AFTER);
    expect(expired).toContain(FUTURE_COUNTDOWNS[0]?.expired ?? '');
    expect(expired).not.toContain(FUTURE_COUNTDOWNS[0]?.pending ?? 'missing');
    expect(countdownSentence(FUTURE_COUNTDOWNS[0]!, NOW)).toBe(FUTURE_COUNTDOWNS[0]?.pending);
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/future/);
    const schema = readFileSync('shared/civilization/SCHEMA.md', 'utf8');
    expect(schema).toContain('今日切片回扣');
    expect(schema).toContain('/civilization/#future-f1');
    expect(schema).toContain('/civilization/#future-f2');
    expect(schema).toContain('/civilization/#future-f6');
    expect(schema).not.toMatch(REDLINE);
    const css = readFileSync('src/App.css', 'utf8');
    const futureCss = css.slice(css.indexOf('.future-panel {'), css.indexOf('.future-panel h2'));
    expect(futureCss).toContain('#f7f1e6');
    expect(futureCss).toContain('#161c24');
    const checkpoint = css.slice(css.indexOf('.future-checkpoint'), css.indexOf('.future-band-row'));
    expect(checkpoint).not.toMatch(/red|#f00|#c00|#b91c1c/i);
  });
});

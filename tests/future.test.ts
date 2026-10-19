import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { civChars } from '../shared/civilization/contract';
import { CHRONICLE_STAGES } from '../shared/civilization/chronicle';
import {
  FUTURE_CLADE,
  FUTURE_COUNTDOWNS,
  FUTURE_DOMAINS,
  FUTURE_HORIZONS,
  FUTURE_INSTANCES,
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
    expect(FUTURE_DOMAINS.map((domain) => domain.status)).toEqual(['有卡', '有卡', '加厚中', '有卡', '有卡', '有卡']);
    for (const domain of FUTURE_DOMAINS) {
      expect(civChars(domain.blurb)).toBeGreaterThanOrEqual(40);
      expect(civChars(domain.blurb)).toBeLessThanOrEqual(80);
    }
    expect(FUTURE_HORIZONS.map((horizon) => horizon.title)).toEqual([
      '氣候宜居約束', '信息可信與大規模誤導', '近地／空間天氣監測', '生物多樣性與生態系服務約束', '抗微生物藥物耐藥性（AMR）', '淡水可用量與衛生服務壓力',
    ]);
    const biodiversity = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-biodiversity-services');
    expect(biodiversity?.domainId).toBe('f6');
    expect(biodiversity?.alsoDomainId).toBe('f4');
    expect(biodiversity?.kind).toBe('biosphere');
    expect(biodiversity?.timeBand).toBe('進行中');
    expect(biodiversity?.confidence).toBe('steady');
    expect(biodiversity?.dataAsOf).toBe('2026-10-19');
    expect(biodiversity?.sources.length).toBeGreaterThanOrEqual(4);
    expect(biodiversity?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    const gbf = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-cbd-gbf-checkpoint');
    expect(gbf?.horizonId).toBe('horizon-biodiversity-services');
    expect(gbf?.checkpoint).toBe('2026-10-30');
    expect(gbf?.title.length).toBeLessThanOrEqual(16);
    const amr = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-antimicrobial-resistance');
    expect(amr?.domainId).toBe('f6');
    expect(amr?.alsoDomainId).toBe('f4');
    expect(amr?.kind).toBe('health');
    expect(amr?.timeBand).toBe('數十年');
    expect(amr?.band).toBe('a1');
    expect(amr?.confidence).toBe('steady');
    expect(amr?.dataAsOf).toBe('2026-10-19');
    expect(amr?.sources.length).toBeGreaterThanOrEqual(4);
    expect(amr?.sources.every((source) => source.url.startsWith('https://www.who.int/'))).toBe(true);
    const tracss = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-who-amr-tracss');
    expect(tracss?.horizonId).toBe('horizon-antimicrobial-resistance');
    expect(tracss?.checkpoint).toBe('2026-12-31');
    expect(tracss?.expired).toContain('等待下一輪自評');
    expect(`${tracss?.pending}\n${tracss?.expired}`).not.toMatch(/只剩/);
    expect(countdownSentence(tracss!, NOW)).toBe(tracss?.pending);
    expect(countdownSentence(tracss!, new Date('2027-01-01T00:00:00.000Z'))).toBe(tracss?.expired);
    expect(FUTURE_COUNTDOWNS.length).toBeGreaterThanOrEqual(4);
    expect(futureHrefAllowed('/civilization/#future-horizon-amr')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-countdown-amr')).toBe(true);
    const freshwater = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-freshwater-stress');
    expect(freshwater?.domainId).toBe('f6');
    expect(freshwater?.alsoDomainId).toBe('f1');
    expect(freshwater?.kind).toBe('resource');
    expect(freshwater?.timeBand).toBe('進行中');
    expect(freshwater?.band).toBe('e2');
    expect(freshwater?.confidence).toBe('steady');
    expect(freshwater?.dataAsOf).toBe('2026-10-19');
    expect(freshwater?.sources.length).toBeGreaterThanOrEqual(4);
    expect(freshwater?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    const sdg = FUTURE_COUNTDOWNS.find((item) => item.id === 'unwater-sdg6');
    expect(sdg?.horizonId).toBe('horizon-freshwater-stress');
    expect(sdg?.checkpoint).toBe('2027-06-30');
    expect(countdownSentence(sdg!, NOW)).toBe(sdg?.pending);
    expect(countdownSentence(sdg!, new Date('2027-07-01T00:00:00.000Z'))).toBe(sdg?.expired);
    expect(civChars(STAGE10_BRIDGE)).toBeGreaterThanOrEqual(80);
    expect(civChars(STAGE10_BRIDGE)).toBeLessThanOrEqual(120);
    expect(futureHrefAllowed('/civilization/#future')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-f1')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-energy-budget')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-verify-flood')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-horizon-biodiversity')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-countdown-cbd')).toBe(true);
    expect(futureHrefAllowed('/civilization/future/')).toBe(false);
    expect(FUTURE_INSTANCES.map((card) => card.id)).toEqual(['energy-budget', 'verify-flood']);
    expect(FUTURE_INSTANCES.map((card) => card.domainId)).toEqual(['f1', 'f2']);
    expect(FUTURE_INSTANCES.map((card) => card.tierId)).toEqual(['observe', 'pilot']);
    expect(FUTURE_INSTANCES.every((card) => card.tierId !== 'civ-scale')).toBe(true);
    for (const card of FUTURE_INSTANCES) {
      expect(civChars(card.blurb)).toBeGreaterThanOrEqual(80);
      expect(civChars(card.blurb)).toBeLessThanOrEqual(120);
      expect(card.mechanism.trim().length).toBeGreaterThan(0);
      expect(card.dataAsOf).toBe('2026-10-19');
      expect(card.sources.length).toBeGreaterThanOrEqual(4);
      expect(card.bands.length).toBeGreaterThan(0);
    }
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
    expect(panel.match(/class="future-domain civ-reveal/g)).toHaveLength(6);
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
    expect(panel.match(/class="future-card future-instance civ-reveal"/g)).toHaveLength(2);
    for (const card of FUTURE_INSTANCES) {
      expect(panel).toContain(`id="${card.anchor}"`);
      expect(panel).toContain(card.title);
      expect(panel).toContain(card.blurb);
      expect(panel).toContain(card.mechanism);
      expect(panel).toContain(`datetime="${card.dataAsOf}"`);
      for (const source of card.sources) expect(panel).toContain(`href="${source.url}"`);
    }
    expect(panel).toContain('能量帶 e2');
    expect(panel).toContain('信息帶 i2');
    expect(panel).toContain('data-tier="observe"');
    expect(panel).toContain('data-tier="pilot"');
    expect(panel).not.toContain('id="future-spare-grid"');
    expect(panel).not.toContain('/civilization/future/');
    const f3 = panel.slice(panel.indexOf('id="future-f3"'), panel.indexOf('id="future-f4"'));
    expect(f3).toContain('加厚中');
    expect(f3).not.toContain('future-instance');
    expect(panel).toContain('id="future-countdown-wmo"');
    expect(panel).toContain(FUTURE_COUNTDOWNS[0]?.pending ?? '');
    expect(panel).toContain('id="future-horizon-biodiversity"');
    expect(panel).toContain('id="future-countdown-cbd"');
    expect(panel).toContain('id="future-horizon-amr"');
    expect(panel).toContain('id="future-countdown-amr"');
    expect(panel).toContain('並見');
    expect(panel).toContain('生物圈');
    expect(panel).toContain('時間帶 進行中');
    expect(panel).toContain('時間帶 數十年');
    expect(panel).toContain('href="#future-f4"');
    expect(panel).not.toMatch(/只剩\s*[0-9０-９一二三四五六七八九十]+\s*天/);
    const gbf = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-cbd-gbf-checkpoint');
    expect(panel).toContain(gbf?.pending ?? '');
    expect(panel).not.toContain(gbf?.expired ?? 'missing-expired');
    expect(panel).toContain('id="future-countdown-unwater"');
    expect(panel).toContain('id="future-horizon-freshwater"');
    expect(panel).toContain('SDG 6 淡水進度盤點');
    expect(panel).toContain('href="#future-horizon-freshwater"');
    expect(panel).toContain('href="#future-f1"');
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
    const tracssClosed = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-who-amr-tracss');
    expect(expired).toContain(tracssClosed?.expired ?? '');
    expect(expired).not.toContain(tracssClosed?.pending ?? 'missing-amr');
    expect(expired).toContain('等待下一輪自評');
    expect(expired).not.toMatch(/只剩/);
    const gbfClosed = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-cbd-gbf-checkpoint');
    const atClose = renderFuturePanel(new Date('2026-10-30T00:00:00.000Z'));
    expect(atClose).toContain(gbfClosed?.expired ?? '');
    expect(atClose).not.toContain(gbfClosed?.pending ?? 'missing');
    expect(countdownSentence(gbfClosed!, NOW)).toBe(gbfClosed?.pending);
    expect(expired).toContain(gbfClosed?.expired ?? '');
    expect(expired).not.toContain(gbfClosed?.pending ?? 'missing');
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/future/);
    const schema = readFileSync('shared/civilization/SCHEMA.md', 'utf8');
    expect(schema).toContain('今日切片回扣');
    expect(schema).toContain('/civilization/#future-f1');
    expect(schema).toContain('/civilization/#future-f2');
    expect(schema).toContain('/civilization/#future-f6');
    expect(schema).toContain('energy-budget');
    expect(schema).toContain('verify-flood');
    expect(schema).toContain('抗微生物藥物耐藥性（AMR）');
    expect(schema).toContain('生物多樣性與生態系服務約束');
    expect(schema).toContain('淡水可用量與衛生服務壓力');
    expect(schema).toContain('2026-10-19');
    expect(schema).not.toMatch(REDLINE);
    const sitemap = readFileSync('shared/sitemap.ts', 'utf8');
    expect(sitemap).not.toContain('future-energy-budget');
    expect(sitemap).not.toContain('future-verify-flood');
    expect(sitemap).not.toContain('future-horizon-amr');
    expect(sitemap).not.toContain('future-countdown-amr');
    const pages = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(pages).not.toContain('energy-budget');
    expect(pages).not.toContain('verify-flood');
    expect(pages).not.toContain('antimicrobial');
    expect(pages).not.toContain('future-horizon-amr');
    const css = readFileSync('src/App.css', 'utf8');
    const futureCss = css.slice(css.indexOf('.future-panel {'), css.indexOf('.future-panel h2'));
    expect(futureCss).toContain('#f7f1e6');
    expect(futureCss).toContain('#161c24');
    const checkpoint = css.slice(css.indexOf('.future-checkpoint'), css.indexOf('.future-band-row'));
    expect(checkpoint).not.toMatch(/red|#f00|#c00|#b91c1c/i);
  });

  it('raises future cards with the existing reveal gate', () => {
    const panel = renderFuturePanel(NOW);
    const domains = [...panel.matchAll(/<article class="([^"]*future-domain[^"]*)"/g)].map((match) => match[1]);
    expect(domains).toHaveLength(6);
    expect(domains.filter((name) => name.includes('civ-reveal--above-fold') && name.includes('is-inview'))).toHaveLength(2);
    expect(domains.slice(2).every((name) => !name.includes('civ-reveal--above-fold') && !name.includes('is-inview'))).toBe(true);
    const cards = [...panel.matchAll(/<article class="([^"]*future-card[^"]*)"/g)].map((match) => match[1]);
    expect(cards.length).toBe(2 + 1 + FUTURE_HORIZONS.length + FUTURE_COUNTDOWNS.length + 1);
    expect(cards.every((name) => name.split(/\s+/).includes('civ-reveal'))).toBe(true);
    expect(cards.some((name) => name.includes('above-fold'))).toBe(false);
    expect(cards.some((name) => name.includes('future-checkpoint'))).toBe(true);
    expect(panel).toContain('<h2>展望</h2>');
    expect(panel).toContain('class="future-note"');
    const nav = panel.slice(panel.indexOf('<nav class="future-domain-nav"'), panel.indexOf('</nav>'));
    expect(nav).not.toContain('civ-reveal');
    const legend = panel.slice(panel.indexOf('<aside class="future-legend"'), panel.indexOf('</aside>'));
    expect(legend).not.toContain('civ-reveal');
    expect(panel).not.toContain('civ-ink-rule');
    expect(panel).not.toContain('brass-sweep');
    expect(panel).not.toMatch(/#(?:f00|c00|b91c1c)\b|color:\s*red/i);

    const css = readFileSync('src/App.css', 'utf8');
    const motion = css.slice(css.indexOf('Civilization axis motion'));
    expect(motion).toContain('html.civ-motion body:not(.static) .civ-reveal:not(.is-inview):not(.civ-reveal--above-fold)');
    expect(motion).toContain('opacity: 0');
    expect(motion).toContain('translateY(12px)');
    expect(motion).toContain('.civ-page .future-panel');
    expect(motion).toContain('.civ-page .future-panel [id^="future"]');
    expect(motion).toContain('scroll-margin-top: var(--civ-anchor-offset)');
    expect(motion).toContain('--motion-stagger');
    expect(motion).toContain('300ms');
    expect(motion).toContain('body.static .civ-reveal');
    expect(motion).not.toContain('civ-ink-rule');
    expect(motion).not.toContain('.future-domain.is-inview::after');
    expect(motion).not.toContain('@keyframes');
    const ink = css.slice(css.indexOf('.future-panel {'), css.indexOf('.future-panel h2'));
    expect(ink).toContain('#161c24');

    const js = readFileSync('public/columns.js', 'utf8');
    const fold = js.slice(js.indexOf('function revealFutureFold'), js.indexOf('function stopMotion'));
    expect(fold).toContain('#future .civ-reveal');
    expect(fold).toContain('civ-reveal--above-fold');
    expect(fold).toContain('is-inview');
    expect(fold).toContain('hashchange');
    expect(fold).toContain('.future-domain-nav');
    expect(fold).toContain('function forceFutureHash');
    expect(fold).not.toContain('setInterval');
    expect(fold).not.toContain('IntersectionObserver');
    expect(js).toContain('querySelectorAll(\'.civ-reveal\')');
  });
});

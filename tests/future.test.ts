import { existsSync, readFileSync, statSync } from 'node:fs';
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
  STAGE10_BRIDGE_EXTRA,
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
    expect(FUTURE_DOMAINS.map((domain) => domain.plate.chip)).toEqual([
      'F1 功率與宜居帶', 'F2 校驗成本', 'F3 規則與公共品', 'F4 共演化遺產', 'F5 條件帶示意', 'F6 監測與緩解',
    ]);
    expect(FUTURE_DOMAINS.map((domain) => domain.plate.cover)).toEqual([
      '/static/civilization/future-f1-cover',
      '/static/civilization/future-f2-cover',
      '/static/civilization/future-f3-cover',
      '/static/civilization/future-f4-cover',
      '/static/civilization/future-f5-cover',
      '/static/civilization/future-f6-cover',
    ]);
    const biodiversityPlate = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-biodiversity-services')?.plate;
    expect(biodiversityPlate?.cover).toBe('/static/civilization/future-horizon-biodiversity-cover');
    expect(biodiversityPlate?.chip).toBe('H-bio 生態系服務');
    expect(biodiversityPlate?.alt).toMatch(/紙感/);
    expect(FUTURE_HORIZONS.filter((horizon) => horizon.id !== 'horizon-biodiversity-services').every((horizon) => !horizon.plate)).toBe(true);
    expect(FUTURE_DOMAINS.filter((domain) => domain.status === '加厚中').map((domain) => domain.id)).toEqual([]);
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
    expect(FUTURE_DOMAINS.map((domain) => domain.status)).toEqual(['有卡', '有卡', '有卡', '有卡', '有卡', '有卡']);
    for (const domain of FUTURE_DOMAINS) {
      expect(civChars(domain.blurb)).toBeGreaterThanOrEqual(40);
      expect(civChars(domain.blurb)).toBeLessThanOrEqual(80);
    }
    expect(FUTURE_HORIZONS.map((horizon) => horizon.title)).toEqual([
      '氣候宜居約束', '信息可信與大規模誤導', '近地／空間天氣監測', '生物多樣性與生態系服務約束', '抗微生物藥物耐藥性（AMR）', '淡水可用量與衛生服務壓力', '極端熱與健康服務壓力', '海洋熱含量與酸化約束', '土壤與土地退化對糧食／碳庫服務', '大流行防備與國際衛生條例能力', '關鍵礦物與能源轉型物料約束', '臭氧層與地表紫外輻射約束',
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
    const heat = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-heat-health');
    expect(heat?.title).toBe('極端熱與健康服務壓力');
    expect(heat?.domainId).toBe('f6');
    expect(heat?.alsoDomainId).toBe('f1');
    expect(heat?.kind).toBe('health');
    expect(heat?.band).toBe('a1');
    expect(heat?.timeBand).toBe('進行中');
    expect(heat?.confidence).toBe('steady');
    expect(heat?.dataAsOf).toBe('2026-10-20');
    expect(heat?.sources.length).toBeGreaterThanOrEqual(4);
    expect(heat?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    expect(FUTURE_COUNTDOWNS.some((item) => item.horizonId === 'horizon-heat-health')).toBe(false);
    expect(futureHrefAllowed('/civilization/#future-horizon-heat-health')).toBe(true);
    const ocean = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-ocean-heat-acid');
    expect(ocean?.title).toBe('海洋熱含量與酸化約束');
    expect(ocean?.anchor).toBe('future-horizon-ocean-heat-acid');
    expect(ocean?.domainId).toBe('f1');
    expect(ocean?.alsoDomainId).toBe('f6');
    expect(ocean?.kind).toBe('biosphere');
    expect(ocean?.band).toBe('e2');
    expect(ocean?.timeBand).toBe('進行中');
    expect(ocean?.confidence).toBe('steady');
    expect(ocean?.dataAsOf).toBe('2026-11-09');
    expect(ocean?.sources.length).toBeGreaterThanOrEqual(4);
    expect(ocean?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    const oceanUrls = ocean?.sources.map((source) => source.url) ?? [];
    expect(oceanUrls.some((url) => url.startsWith('https://www.ipcc.ch/'))).toBe(true);
    expect(oceanUrls.some((url) => url.startsWith('https://wmo.int/'))).toBe(true);
    expect(oceanUrls.some((url) => url.startsWith('https://www.climate.gov/'))).toBe(true);
    expect(oceanUrls.some((url) => url.startsWith('https://www.ioc.unesco.org/'))).toBe(true);
    expect(FUTURE_COUNTDOWNS.some((item) => item.horizonId === 'horizon-ocean-heat-acid')).toBe(false);
    expect(futureHrefAllowed('/civilization/#future-horizon-ocean-heat-acid')).toBe(true);
    const soil = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-soil-land-degradation');
    expect(soil?.title).toBe('土壤與土地退化對糧食／碳庫服務');
    expect(soil?.anchor).toBe('future-horizon-soil-land');
    expect(soil?.domainId).toBe('f1');
    expect(soil?.alsoDomainId).toBe('f4');
    expect(soil?.kind).toBe('resource');
    expect(soil?.band).toBe('e2');
    expect(soil?.timeBand).toBe('進行中');
    expect(soil?.confidence).toBe('partial');
    expect(soil?.dataAsOf).toBe('2026-11-09');
    expect(soil?.sources.length).toBeGreaterThanOrEqual(4);
    expect(soil?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    expect(soil?.sources.some((source) => source.url.startsWith('https://www.unccd.int/'))).toBe(true);
    expect(soil?.sources.some((source) => source.url.startsWith('https://www.fao.org/'))).toBe(true);
    expect(soil?.sources.some((source) => source.url.startsWith('https://www.ipcc.ch/'))).toBe(true);
    expect(FUTURE_COUNTDOWNS.some((item) => item.horizonId === 'horizon-soil-land-degradation')).toBe(false);
    expect(futureHrefAllowed('/civilization/#future-horizon-soil-land')).toBe(true);
    const pandemic = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-pandemic-ihr-preparedness');
    expect(pandemic?.title).toBe('大流行防備與國際衛生條例能力');
    expect(pandemic?.anchor).toBe('future-horizon-pandemic-ihr');
    expect(pandemic?.domainId).toBe('f6');
    expect(pandemic?.alsoDomainId).toBe('f4');
    expect(pandemic?.kind).toBe('health');
    expect(pandemic?.band).toBe('a1');
    expect(pandemic?.timeBand).toBe('進行中');
    expect(pandemic?.confidence).toBe('steady');
    expect(pandemic?.dataAsOf).toBe('2026-11-09');
    expect(pandemic?.sources.length).toBeGreaterThanOrEqual(4);
    expect(pandemic?.sources.every((source) => source.url.startsWith('https://www.who.int/'))).toBe(true);
    expect(FUTURE_COUNTDOWNS.some((item) => item.horizonId === 'horizon-pandemic-ihr-preparedness')).toBe(false);
    expect(futureHrefAllowed('/civilization/#future-horizon-pandemic-ihr')).toBe(true);
    const minerals = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-critical-minerals');
    expect(minerals?.title).toBe('關鍵礦物與能源轉型物料約束');
    expect(minerals?.anchor).toBe('future-horizon-critical-minerals');
    expect(minerals?.domainId).toBe('f1');
    expect(minerals?.alsoDomainId).toBe('f6');
    expect(minerals?.kind).toBe('resource');
    expect(minerals?.band).toBe('e2');
    expect(minerals?.timeBand).toBe('進行中');
    expect(minerals?.confidence).toBe('partial');
    expect(minerals?.dataAsOf).toBe('2026-11-09');
    expect(minerals?.sources.length).toBeGreaterThanOrEqual(4);
    expect(minerals?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    expect(minerals?.sources.some((source) => source.url.startsWith('https://iea.blob.core.windows.net/'))).toBe(true);
    expect(minerals?.sources.some((source) => source.url.startsWith('https://www.worldbank.org/'))).toBe(true);
    expect(minerals?.sources.some((source) => source.url.startsWith('https://pubs.usgs.gov/'))).toBe(true);
    expect(minerals?.sources.some((source) => source.url.startsWith('https://www.resourcepanel.org/'))).toBe(true);
    expect(FUTURE_COUNTDOWNS.some((item) => item.horizonId === 'horizon-critical-minerals')).toBe(false);
    expect(futureHrefAllowed('/civilization/#future-horizon-critical-minerals')).toBe(true);
    const ozone = FUTURE_HORIZONS.find((horizon) => horizon.id === 'horizon-ozone-layer');
    expect(ozone?.title).toBe('臭氧層與地表紫外輻射約束');
    expect(ozone?.anchor).toBe('future-horizon-ozone');
    expect(ozone?.domainId).toBe('f1');
    expect(ozone?.alsoDomainId).toBe('f6');
    expect(ozone?.kind).toBeUndefined();
    expect(ozone?.band).toBe('e2');
    expect(ozone?.timeBand).toBe('進行中');
    expect(ozone?.confidence).toBe('partial');
    expect(ozone?.dataAsOf).toBe('2026-11-09');
    expect(ozone?.sources.length).toBeGreaterThanOrEqual(4);
    expect(ozone?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
    expect(ozone?.sources.some((source) => source.url.startsWith('https://ozone.unep.org/'))).toBe(true);
    expect(FUTURE_COUNTDOWNS.filter((item) => item.horizonId === 'climate').map((item) => item.id)).toEqual(['wmo-annual']);
    const sap = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-montreal-ozone-assessment');
    expect(sap?.horizonId).toBe('horizon-ozone-layer');
    expect(sap?.anchor).toBe('future-countdown-ozone');
    expect(sap?.checkpoint).toBe('2026-12-31');
    expect(sap?.title.length).toBeLessThanOrEqual(16);
    expect(sap?.expired).toContain('見最新評估');
    expect(`${sap?.pending}\n${sap?.expired}`).not.toMatch(/只剩|二〇三〇|2030/);
    expect(countdownSentence(sap!, NOW)).toBe(sap?.pending);
    expect(countdownSentence(sap!, new Date('2027-01-01T00:00:00.000Z'))).toBe(sap?.expired);
    expect(futureHrefAllowed('/civilization/#future-horizon-ozone')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-countdown-ozone')).toBe(true);
    expect(civChars(STAGE10_BRIDGE)).toBeGreaterThanOrEqual(80);
    expect(civChars(STAGE10_BRIDGE)).toBeLessThanOrEqual(120);
    expect(STAGE10_BRIDGE_EXTRA).toBe('第十階名為本世紀／當代。展望・分域只把目光送到總覽的六個入口，讓條件句留在總覽面板。');
    expect(STAGE10_BRIDGE).not.toContain('只把目光送到');
    expect(STAGE10_BRIDGE).not.toContain('近未來');
    expect(futureHrefAllowed('/civilization/#future')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-f1')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-energy-budget')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-verify-flood')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-pipe-care')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-horizon-biodiversity')).toBe(true);
    expect(futureHrefAllowed('/civilization/#future-countdown-cbd')).toBe(true);
    expect(futureHrefAllowed('/civilization/future/')).toBe(false);
    expect(FUTURE_INSTANCES.map((card) => card.id)).toEqual(['energy-budget', 'verify-flood', 'pipe-care']);
    expect(FUTURE_INSTANCES.map((card) => card.domainId)).toEqual(['f1', 'f2', 'f3']);
    expect(FUTURE_INSTANCES.map((card) => card.tierId)).toEqual(['observe', 'pilot', 'infra']);
    expect(FUTURE_INSTANCES.every((card) => card.tierId !== 'civ-scale')).toBe(true);
    for (const card of FUTURE_INSTANCES) {
      expect(civChars(card.blurb)).toBeGreaterThanOrEqual(80);
      expect(civChars(card.blurb)).toBeLessThanOrEqual(120);
      expect(card.mechanism.trim().length).toBeGreaterThan(0);
      expect(card.dataAsOf).toBe(card.id === 'pipe-care' ? '2026-10-20' : '2026-10-19');
      expect(card.sources.length).toBeGreaterThanOrEqual(4);
      expect(card.bands.length).toBeGreaterThan(0);
    }
    expect(questionHrefAllowed('/civilization/#future-f6')).toBe(true);
    expect(questionHrefAllowed('/civilization/#future-f1')).toBe(true);
    expect(questionHrefAllowed('/civilization/future/')).toBe(false);
  });

  it('places future on the spine and the hub, and bridges stage 10 without a new route', () => {
    expect(SPINE.map((node) => node.id)).toEqual(['cosmos', 'galaxy', 'earth', 'origins', 'tech', 'city', 'today', 'future']);
    expect(SPINE.find((node) => node.id === 'galaxy')?.href).toBe('/civilization/galaxy/');
    expect(SPINE.find((node) => node.id === 'today')?.href).toBe('/today/');
    expect(SPINE.find((node) => node.id === 'future')?.href).toBe('/civilization/#future');
    const hub = renderCivilizationHub(NOW);
    const chronicle = renderChroniclePage();
    const panelAt = hub.html.indexOf('id="future"');
    expect(panelAt).toBeGreaterThan(hub.html.indexOf('class="civ-hub-hero"'));
    expect(panelAt).toBeLessThan(hub.html.indexOf('class="civ-article"'));
    const panel = hub.html.slice(panelAt, hub.html.indexOf('class="civ-article"'));
    expect(panel).not.toContain('class="future-domain');
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
    expect(panel).not.toContain('future-instance');
    for (const card of FUTURE_INSTANCES) {
      expect(panel).toContain(`id="${card.anchor}"`);
      expect(panel).toContain(card.title);
      expect(panel).toContain(card.blurb);
      expect(panel).toContain(card.mechanism);
      expect(panel).toContain(card.dataAsOf);
      for (const source of card.sources) expect(panel).toContain(`href="${source.url}"`);
    }
    expect(panel).toContain('能量帶 e2');
    expect(panel).toContain('信息帶 i2');
    expect(panel).toContain('觀測');
    expect(panel).toContain('試點');
    expect(panel).not.toContain('id="future-spare-grid"');
    expect(panel).not.toContain('/civilization/future/');
    const f3 = panel.slice(panel.indexOf('id="future-f3"'), panel.indexOf('id="future-f4"'));
    expect(f3).not.toContain('尚未寫入卡片');
    expect(f3).not.toContain('加厚中');
    expect(f3).toContain('id="future-pipe-care"');
    expect(f3).toContain('標準與公共品維修');
    expect(panel).toContain('id="future-pipe-care"');
    expect(panel).toContain('id="future-horizon-heat-health"');
    expect(panel).toContain('極端熱與健康服務壓力');
    expect(panel).toContain('id="future-horizon-ocean-heat-acid"');
    expect(panel).toContain('海洋熱含量與酸化約束');
    expect(panel).toContain('id="future-horizon-soil-land"');
    expect(panel).toContain('土壤與土地退化對糧食／碳庫服務');
    expect(panel).toContain('id="future-horizon-pandemic-ihr"');
    expect(panel).toContain('大流行防備與國際衛生條例能力');
    expect(panel).toContain('id="future-horizon-critical-minerals"');
    expect(panel).toContain('關鍵礦物與能源轉型物料約束');
    const f1 = panel.slice(panel.indexOf('id="future-f1"'), panel.indexOf('id="future-f2"'));
    expect(f1).toContain('能量宜居');
    expect(panel).not.toContain('有卡');
    expect(panel).not.toContain('加厚中');
    expect(panel).toContain('六個入口各自回答一件事');
    expect(panel).toContain('能量宜居回答功率受什麼收支約束');
    expect(panel).toContain('信息可信回答底本靠什麼留下');
    expect(panel).toContain('制度協作回答規則如何維修');
    expect(panel).toContain('生物譜系回答延續而不分高下');
    expect(panel).toContain('技術能力階回答成熟到哪一檔');
    expect(panel).toContain('生存風險回答如何被事後核對');
    expect(panel).toContain('這裡不另開網址');
    expect(panel).toContain('e2 記行星能量收支、宜居窗口與淡水可用量正在被監測的這一層，不是文明等級。');
    expect(panel).toContain('i2 記底本與更正能否被後來的複本認出，不是文明等級。');
    expect(panel).toContain('a1 記擾動或耐藥能否被寫成可核對的維修條件，不是文明等級。');
    expect(panel).toContain('成熟度記號');
    expect(panel).not.toContain('外逸');
    expect(panel).not.toContain('這筆帳');
    expect(panel).not.toContain('變寬');
    const energy = panel.slice(panel.indexOf('id="future-energy-budget"'), panel.indexOf('id="future-verify-flood"'));
    expect(energy).toContain('向外長波輻射');
    expect(energy).toContain('這一收支');
    const observeAt = energy.indexOf('「觀測」只標這一收支的監測');
    const gridAt = energy.indexOf('BAL-002-3');
    expect(observeAt).toBeGreaterThan(energy.indexOf('本段只記載這一收支如何被監測'));
    expect(gridAt).toBeGreaterThan(observeAt);
    const grid = energy.slice(gridAt, energy.indexOf('成熟度取'));
    expect(grid).toContain('北美可靠性標準下的應急備用');
    expect(grid).not.toContain('觀測');
    expect(energy.indexOf('觀測')).toBe(observeAt + 1);
    const flood = panel.slice(panel.indexOf('id="future-verify-flood"'), panel.indexOf('id="future-tier"'));
    expect(flood).toContain('一併擴散');
    expect(flood).toContain('撤稿鏈只以美國國家信息標準組織的撤稿傳遞頁，以及 Crossref 的版本、更正、撤稿頁為據。');
    const floodCard = FUTURE_INSTANCES.find((card) => card.id === 'verify-flood');
    expect(floodCard?.sources.filter((source) => source.scope === '撤稿鏈').map((source) => source.url)).toEqual([
      'https://www.niso.org/standards-committees/crec',
      'https://www.crossref.org/documentation/principles-practices/best-practices/versioning/',
    ]);
    expect(floodCard?.sources.filter((source) => source.scope !== '撤稿鏈').every((source) => source.scope === '不作為撤稿鏈依據')).toBe(true);
    expect(flood).toContain('（撤稿鏈）');
    expect(flood).toContain('（不作為撤稿鏈依據）');
    const trust = FUTURE_HORIZONS.find((horizon) => horizon.id === 'trust');
    expect(trust?.mechanism).toContain('萬維網簡史只說明複製變便宜，不支撐大規模誤導');
    expect(trust?.sources.find((source) => source.url.includes('home.cern'))?.scope).toBe('只說明複製變便宜');
    expect(panel).toContain('只說明複製變便宜');
    expect(panel).toContain('抗微生物藥物耐藥性（AMR）');
    expect(panel).toContain('生物多樣性與生態系服務約束');
    expect(panel).toContain('id="future-countdown-wmo"');
    expect(panel).toContain(FUTURE_COUNTDOWNS[0]?.pending ?? '');
    expect(panel).not.toContain('class="future-cover"');
    for (const domain of FUTURE_DOMAINS) {
      for (const width of [400, 640, 1280]) {
        const file = `public${domain.plate.cover}-${width}w.webp`;
        expect(existsSync(file), file).toBe(true);
      }
    }
    const bioCard = panel.slice(panel.indexOf('id="future-horizon-biodiversity"'), panel.indexOf('id="future-horizon-amr"'));
    expect(bioCard).toContain('生物多樣性');
    for (const width of [400, 640, 1280]) {
      const file = `public/static/civilization/future-horizon-biodiversity-cover-${width}w.webp`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(10_000);
    }
    const amrCard = panel.slice(panel.indexOf('id="future-horizon-amr"'), panel.indexOf('id="future-horizon-freshwater"'));
    expect(amrCard).not.toContain('future-cover');
    expect(amrCard).toContain('抗微生物藥物耐藥性（AMR）');
    const freshCard = panel.slice(panel.indexOf('id="future-horizon-freshwater"'), panel.indexOf('id="future-horizon-heat-health"'));
    expect(freshCard).not.toContain('future-cover');
    expect(freshCard).toContain('淡水可用量與衛生服務壓力');
    const heatCard = panel.slice(panel.indexOf('id="future-horizon-heat-health"'), panel.indexOf('id="future-horizon-pandemic-ihr"'));
    expect(heatCard).not.toContain('future-cover');
    expect(heatCard).toContain('極端熱與健康服務壓力');
    expect(panel).toContain('href="#future-horizon-ocean-heat-acid"');
    const climateAt = panel.indexOf('id="future-horizon-climate"');
    const wmoAt = panel.indexOf('id="future-countdown-wmo"');
    const oceanAt = panel.indexOf('id="future-horizon-ocean-heat-acid"');
    const soilAt = panel.indexOf('id="future-horizon-soil-land"');
    const mineralsAt = panel.indexOf('id="future-horizon-critical-minerals"');
    const ozoneAt = panel.indexOf('id="future-horizon-ozone"');
    const f2At = panel.indexOf('id="future-f2"');
    expect(wmoAt).toBeGreaterThan(climateAt);
    expect(oceanAt).toBeGreaterThan(wmoAt);
    expect(soilAt).toBeGreaterThan(oceanAt);
    expect(mineralsAt).toBeGreaterThan(soilAt);
    expect(ozoneAt).toBeGreaterThan(mineralsAt);
    expect(f2At).toBeGreaterThan(ozoneAt);
    const oceanCard = panel.slice(oceanAt, soilAt);
    expect(oceanCard).not.toContain('future-cover');
    expect(oceanCard).toContain('海洋熱含量與酸化約束');
    expect(oceanCard).toContain('能量帶 e2');
    expect(oceanCard).toContain('生物圈');
    expect(oceanCard).toContain('日期戳 2026-11-09');
    expect(oceanCard).toContain('https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-9/');
    expect(oceanCard).toContain('https://www.ioc.unesco.org/en/ocean-acidification');
    const soilCard = panel.slice(soilAt, mineralsAt);
    expect(soilCard).not.toContain('future-cover');
    expect(soilCard).toContain('土壤與土地退化對糧食／碳庫服務');
    expect(soilCard).toContain('能量帶 e2');
    expect(soilCard).toContain('種類是資源');
    expect(soilCard).toContain('時間帶 進行中');
    expect(soilCard).toContain('信心標為部分');
    expect(soilCard).toContain('2026-11-09');
    expect(soilCard).toContain('空間覆蓋、方法與時滯並不均勻');
    expect(soilCard).toContain('href="https://www.unccd.int/resources/global-land-outlook/overview"');
    expect(soilCard).toContain('href="https://www.fao.org/global-soil-partnership/Scientific-and-technical-support/itps/status-of-the-worlds-soil-resources/en"');
    expect(soilCard).toContain('href="https://www.ipcc.ch/srccl/chapter/chapter-4/"');
    expect(panel).toContain('href="#future-horizon-soil-land"');
    const mineralCard = panel.slice(mineralsAt, ozoneAt);
    const ozoneCard = panel.slice(ozoneAt, f2At);
    expect(ozoneCard).not.toContain('future-cover');
    expect(ozoneCard).toContain('臭氧層與地表紫外輻射約束');
    expect(ozoneCard).toContain('能量帶 e2');
    expect(ozoneCard).toContain('時間帶 進行中');
    expect(ozoneCard).toContain('信心標為部分');
    expect(ozoneCard).toContain('日期戳 2026-11-09');
    expect(ozoneCard).toContain('href="https://ozone.unep.org/science/assessment/sap"');
    expect(panel).toContain('href="#future-horizon-ozone"');
    expect(mineralCard).not.toContain('future-cover');
    expect(mineralCard).toContain('關鍵礦物與能源轉型物料約束');
    expect(mineralCard).toContain('能量帶 e2');
    expect(mineralCard).toContain('種類是資源');
    expect(mineralCard).toContain('時間帶 進行中');
    expect(mineralCard).toContain('信心標為部分');
    expect(mineralCard).toContain('日期戳 2026-11-09');
    expect(mineralCard).toContain('不是國別高下');
    expect(mineralCard).toContain('不是災變時鐘');
    expect(mineralCard).toContain('href="https://iea.blob.core.windows.net/assets/ef5e9b70-3374-4caa-ba9d-19c72253bfc4/GlobalCriticalMineralsOutlook2025.pdf"');
    expect(mineralCard).toContain('href="https://www.worldbank.org/en/topic/extractiveindustries/brief/climate-smart-mining-minerals-for-climate-action"');
    expect(mineralCard).toContain('href="https://pubs.usgs.gov/publication/mcs2026"');
    expect(mineralCard).toContain('href="https://www.resourcepanel.org/sites/default/files/documents/document/media/gro24_full_report_29feb_final_for_web.pdf"');
    expect(panel).toContain('href="#future-horizon-critical-minerals"');
    const ihrCard = panel.slice(panel.indexOf('id="future-horizon-pandemic-ihr"'), panel.indexOf('id="future-tier"'));
    expect(ihrCard).not.toContain('future-cover');
    expect(ihrCard).toContain('大流行防備與國際衛生條例能力');
    expect(ihrCard).toContain('能動帶 a1');
    expect(ihrCard).toContain('種類是健康');
    expect(ihrCard).toContain('時間帶 進行中');
    expect(ihrCard).toContain('日期戳 2026-11-09');
    expect(ihrCard).toContain('https://www.who.int/emergencies/operations/international-health-regulations-monitoring-evaluation-framework/states-parties-self-assessment-annual-reporting');
    expect(ihrCard).toContain('https://www.who.int/emergencies/operations/international-health-regulations-monitoring-evaluation-framework/joint-external-evaluations');
    const drawn = renderFuturePanel(NOW);
    const oceanArticle = drawn.slice(
      drawn.indexOf('id="future-horizon-ocean-heat-acid"'),
      drawn.indexOf('id="future-horizon-soil-land"'),
    );
    expect(oceanArticle).toContain('F1 能量宜居');
    expect(oceanArticle).toContain('F6 生存風險');
    expect(oceanArticle).not.toContain('class="future-cover"');
    const drawnSoil = drawn.slice(drawn.indexOf('id="future-horizon-soil-land"'), drawn.indexOf('id="future-horizon-pandemic-ihr"'));
    expect(drawn.indexOf('id="future-horizon-heat-health"')).toBeLessThan(drawn.indexOf('id="future-horizon-ocean-heat-acid"'));
    expect(drawn.indexOf('id="future-horizon-ocean-heat-acid"')).toBeLessThan(drawn.indexOf('id="future-horizon-soil-land"'));
    expect(drawn.indexOf('id="future-horizon-soil-land"')).toBeLessThan(drawn.indexOf('id="future-horizon-pandemic-ihr"'));
    expect(drawn.indexOf('id="future-horizon-pandemic-ihr"')).toBeLessThan(drawn.indexOf('id="future-horizon-critical-minerals"'));
    expect(drawnSoil).toContain('信心 部分');
    expect(drawnSoil).toContain('href="#future-f1"');
    expect(drawnSoil).toContain('href="#future-f4"');
    expect(drawnSoil).not.toContain('future-cover');
    const ihrArticle = drawn.slice(
      drawn.indexOf('id="future-horizon-pandemic-ihr"'),
      drawn.indexOf('id="future-horizon-critical-minerals"'),
    );
    expect(ihrArticle).toContain('F6 生存風險');
    expect(ihrArticle).toContain('F4 生物譜系');
    expect(ihrArticle).toContain('截至 2026-11-09');
    expect(ihrArticle).not.toContain('class="future-cover"');
    expect(drawn.indexOf('id="future-horizon-critical-minerals"')).toBeLessThan(drawn.indexOf('id="future-horizon-ozone"'));
    expect(drawn.indexOf('id="future-horizon-ozone"')).toBeLessThan(drawn.indexOf('id="future-countdown-wmo"'));
    const mineralArticle = drawn.slice(
      drawn.indexOf('id="future-horizon-critical-minerals"'),
      drawn.indexOf('id="future-horizon-ozone"'),
    );
    expect(mineralArticle).toContain('F1 能量宜居');
    expect(mineralArticle).toContain('F6 生存風險');
    expect(mineralArticle).toContain('信心 部分');
    expect(mineralArticle).toContain('截至 2026-11-09');
    expect(mineralArticle).not.toContain('class="future-cover"');
    const ozoneArticle = drawn.slice(
      drawn.indexOf('id="future-horizon-ozone"'),
      drawn.indexOf('id="future-countdown-wmo"'),
    );
    expect(ozoneArticle).toContain('F1 能量宜居');
    expect(ozoneArticle).toContain('F6 生存風險');
    expect(ozoneArticle).toContain('能量帶 e2');
    expect(ozoneArticle).toContain('信心 部分');
    expect(ozoneArticle).toContain('截至 2026-11-09');
    expect(ozoneArticle).toContain('https://ozone.unep.org/science/assessment/sap');
    expect(ozoneArticle).not.toContain('class="future-cover"');
    expect(ozoneArticle).not.toContain('生物圈');
    const sapPanel = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-montreal-ozone-assessment');
    expect(panel).toContain('id="future-countdown-ozone"');
    expect(panel).toContain('臭氧層科學評估窗');
    expect(panel).toContain(sapPanel?.pending ?? '');
    expect(panel).not.toContain(sapPanel?.expired ?? 'missing-ozone-expired');
    expect(panel).toContain('href="#future-horizon-ozone"');
    expect(drawn).toContain('id="future-countdown-ozone"');
    expect(drawn).toContain(sapPanel?.pending ?? '');
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
    expect(stage10?.name).toBe('本世紀／當代');
    expect(stage10?.name).not.toContain('近未來');
    expect(CHRONICLE_STAGES).toHaveLength(10);
    const start = chronicle.html.indexOf('id="stage-10"');
    const section = chronicle.html.slice(start, chronicle.html.indexOf('四線總結'));
    expect(section).toContain('id="stage-10-bridge"');
    expect(section).toContain(STAGE10_BRIDGE);
    expect(section).toContain(STAGE10_BRIDGE_EXTRA);
    expect(section).toContain('id="stage-10-bands"');
    expect(section).toContain('e2 記行星能量收支、宜居窗口與淡水可用量正在被監測的這一層，不是文明等級。');
    expect(section).toContain('不是文明等級');
    expect(section).toContain('href="/civilization/#future-f1"');
    expect(section).not.toContain('id="stage-11"');
    expect(hub.html).not.toContain('class="volume-card"');
    expect(hub.html).not.toContain('class="stage-dot"');
    expect(hub.html).toContain('id="future"');
    expect(hub.html).toContain('id="future-f1"');
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
    const sapClosed = FUTURE_COUNTDOWNS.find((item) => item.id === 'cd-montreal-ozone-assessment');
    expect(expired).toContain(sapClosed?.expired ?? '');
    expect(expired).toContain('見最新評估');
    expect(expired).not.toContain(sapClosed?.pending ?? 'missing-ozone');
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/future/);
    const futureSrc = readFileSync('shared/civilization/future.ts', 'utf8');
    expect(futureSrc).not.toContain('renderBulletinClock');
    expect(futureSrc).not.toContain('MONITOR_READING');
    expect(futureSrc).not.toContain('./clock');
    const clockSrc = readFileSync('shared/civilization/clock.ts', 'utf8');
    expect(clockSrc).not.toContain('setInterval');
    expect(clockSrc).not.toContain("from './future");
    expect(clockSrc).not.toContain('from "../civilization/future');
    expect(clockSrc).not.toMatch(/末日|滅絕|災變倒數|秒針|紅色倒數/);
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
    expect(schema).toContain('極端熱與健康服務壓力');
    expect(schema).toContain('海洋熱含量與酸化約束');
    expect(schema).toContain('horizon-ocean-heat-acid');
    expect(schema).toContain('土壤與土地退化對糧食／碳庫服務');
    expect(schema).toContain('horizon-soil-land-degradation');
    expect(schema).toContain('大流行防備與國際衛生條例能力');
    expect(schema).toContain('horizon-pandemic-ihr-preparedness');
    expect(schema).toContain('關鍵礦物與能源轉型物料約束');
    expect(schema).toContain('horizon-critical-minerals');
    expect(schema).toContain('臭氧層與地表紫外輻射約束');
    expect(schema).toContain('horizon-ozone-layer');
    expect(schema).toContain('cd-montreal-ozone-assessment');
    expect(schema).toContain('2026-12-31');
    expect(schema).toContain('2026-11-09');
    expect(schema).toContain('pipe-care');
    expect(schema).toContain('階段名仍是第十階');
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
    expect(cards.length).toBe(FUTURE_INSTANCES.length + 1 + FUTURE_HORIZONS.length + FUTURE_COUNTDOWNS.length + 1);
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

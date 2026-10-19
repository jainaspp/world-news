import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ReadingBlock } from '../shared/civilization/blocks';
import { CHRONICLE_STAGES } from '../shared/civilization/chronicle';
import { CHRONICLE_MILESTONE_BLOCKS } from '../shared/civilization/chronicleMilestones';
import {
  CIV_CARD_LIMITS,
  CIV_LINES,
  civCardIssues,
  civChars,
  isCivLine,
  type CivCard,
  type CivReadingShape,
} from '../shared/civilization/contract';
import { PATTERN_CARDS, patternAsReadingBlock } from '../shared/civilization/patterns';
import { renderChroniclePage, renderCivilizationHub } from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';
import { heritageBlocked } from '../shared/heritage';
import type { NewsItem } from '../shared/types';

const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;

const REQUIRED_HEADINGS = ['關鍵產物', '推動力', '不適用邊界', '維修／傳承條件', '今日可問', '來源'];

function cardText(card: CivCard): string {
  return [
    card.title,
    card.problem,
    card.mechanism,
    card.boundary,
    card.maintenance,
    card.ask,
    card.event,
    card.eventDetail,
    card.impact,
    ...card.products.flatMap((item) => [item.name, item.detail, item.kind ?? '']),
    ...card.drivers.flatMap((item) => [item.name, item.detail]),
    ...card.sources.map((source) => source.name),
  ].join('\n');
}

describe('civilization deep-read contract', () => {
  it('keeps CivLine a closed four-line set', () => {
    expect([...CIV_LINES]).toEqual(['能量', '信息', '制度', '貨幣']);
    expect(isCivLine('能量')).toBe(true);
    expect(isCivLine('信息')).toBe(true);
    expect(isCivLine('制度')).toBe(true);
    expect(isCivLine('貨幣')).toBe(true);
    for (const outsider of ['物質', '時間', '度量', '環境', '工具', '能源']) {
      expect(isCivLine(outsider)).toBe(false);
    }
    for (const stage of CHRONICLE_STAGES) {
      expect(stage.lines.length).toBeGreaterThan(0);
      for (const line of stage.lines) expect(isCivLine(line)).toBe(true);
    }
    for (const blocks of Object.values(CHRONICLE_MILESTONE_BLOCKS)) {
      for (const block of blocks) {
        for (const line of block.lines) expect(isCivLine(line)).toBe(true);
      }
    }
  });

  it('assigns reading blocks and milestone blocks to one shape', () => {
    const milestone: CivReadingShape = CHRONICLE_MILESTONE_BLOCKS[1][0];
    const reading: ReadingBlock = {
      anchor: 'earth-1',
      event: '早期生命',
      eventDetail: '代謝與複製。',
      products: [{ name: '含氧水體', detail: '化學前提。' }],
      drivers: [{ name: '推動力', detail: '分化本身。' }],
      impact: '為複雜細胞準備化學前提。',
      cover: null,
      lines: ['環境'],
    };
    const shared: CivReadingShape = reading;
    const card: CivReadingShape = PATTERN_CARDS[0];
    expect(milestone.products.length).toBeGreaterThan(0);
    expect(shared.drivers.length).toBeGreaterThan(0);
    expect(card.event.length).toBeGreaterThan(0);
    expect(patternAsReadingBlock(PATTERN_CARDS[0]).cover).toBeNull();
  });

  it('ships three pattern cards from data, with the required fields and boundaries', () => {
    expect(PATTERN_CARDS.map((card) => card.id)).toEqual(['power-store', 'copy-check', 'measure-promise']);
    const byId = Object.fromEntries(PATTERN_CARDS.map((card) => [card.id, card]));
    expect(byId['power-store'].lines).toEqual(['能量']);
    expect(byId['power-store'].anchor).toBe('/civilization/chronicle/#stage-7');
    expect(byId['power-store'].boundary).toBe('可用功率提高，不等於分配跟著改善');
    expect(byId['power-store'].maintenance).toContain('技術在場，若維修、師徒或備件中斷，可用功率會退回去。');
    expect(byId['copy-check'].lines).toEqual(['信息']);
    expect(byId['copy-check'].anchor).toBe('/civilization/chronicle/#stage-3');
    expect(byId['copy-check'].boundary).toBe('複製變便宜，不等於內容變真');
    expect(byId['copy-check'].maintenance).toContain('複製成本下降之後，若沒有校驗，協作半徑會把錯誤一起放大。');
    expect(byId['measure-promise'].lines).toEqual(['制度', '貨幣']);
    expect(byId['measure-promise'].anchor).toBe('/civilization/chronicle/#stage-6');
    expect(byId['measure-promise'].boundary).toBe('度量互通，不等於出現單一中心');
    const stages = new Set(CHRONICLE_STAGES.map((stage) => stage.n));
    for (const card of PATTERN_CARDS) {
      expect(civCardIssues(card)).toEqual([]);
      expect(civChars(card.problem)).toBeLessThanOrEqual(CIV_CARD_LIMITS.problem);
      expect(civChars(card.mechanism)).toBeLessThanOrEqual(CIV_CARD_LIMITS.mechanism);
      expect(civChars(card.boundary)).toBeLessThanOrEqual(CIV_CARD_LIMITS.boundary);
      expect(civChars(card.ask)).toBeLessThanOrEqual(CIV_CARD_LIMITS.ask);
      expect(card.sources.length).toBeGreaterThanOrEqual(4);
      expect(card.products.length).toBeGreaterThanOrEqual(1);
      expect(card.drivers.length).toBeGreaterThanOrEqual(1);
      expect(card.ask).not.toMatch(/動員|起來/);
      const stageN = Number(card.anchor.split('#stage-')[1]);
      expect(stages.has(stageN)).toBe(true);
      expect(cardText(card)).not.toMatch(REDLINE);
      expect(heritageBlocked(cardText(card))).toBe(false);
    }
  });

  it('documents the schema and does not open a new civilization route', () => {
    const schema = readFileSync('shared/civilization/SCHEMA.md', 'utf8');
    for (const token of ['CivLine', '能量', '信息', '制度', '貨幣', 'power-store', 'copy-check', 'measure-promise', '不適用邊界', '維修', '今日可問', 'PATTERN_CARDS']) {
      expect(schema).toContain(token);
    }
    expect(schema).not.toMatch(REDLINE);
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/power-store|copy-check|measure-promise|methodology|exchange|vault/);
    const renderer = readFileSync('shared/civilization/blocks.ts', 'utf8');
    expect(renderer).not.toContain('power-store');
    expect(renderer).not.toContain('copy-check');
    expect(renderer).not.toContain('measure-promise');
    const chronicle = readFileSync('shared/civilization/chronicle.ts', 'utf8');
    expect(chronicle).toContain('renderPatternCardsForStage');
    expect(chronicle).not.toContain('power-store');
    expect(chronicle).not.toContain("'能量' | '信息' | '制度' | '貨幣'");
  });

  it('shows the three cards on the axis, the hub, and the chronicle stages', () => {
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
    const home = renderHomeFeed([item], new Map(), null, '1234567890', null, '', [], [], new Date('2026-10-17T04:00:00.000Z'));
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z'));
    const chronicle = renderChroniclePage();
    for (const card of PATTERN_CARDS) {
      const href = `/civilization/chronicle/#pattern-${card.id}`;
      expect(home).toContain(href);
      expect(home).toContain(card.title);
      expect(hub.html).toContain(`id="pattern-${card.id}"`);
      expect(hub.html).toContain(`data-pattern="${card.id}"`);
      expect(chronicle.html).toContain(`id="pattern-${card.id}"`);
      const stageN = card.anchor.split('#')[1];
      const start = chronicle.html.indexOf(`id="${stageN}"`);
      const nextN = Number(stageN.replace('stage-', '')) + 1;
      const end = nextN <= 10 ? chronicle.html.indexOf(`id="stage-${nextN}"`) : chronicle.html.indexOf('四線總結');
      const section = chronicle.html.slice(start, end);
      expect(section).toContain(`id="pattern-${card.id}"`);
      expect(section).toContain(card.boundary);
      expect(section).toContain(card.maintenance);
      expect(section).toContain(card.ask);
      expect(section).toContain(card.problem);
      for (const heading of REQUIRED_HEADINGS) expect(section).toContain(heading);
      for (const source of card.sources) expect(section).toContain(`href="${source.url}"`);
      const hubCardAt = hub.html.indexOf(`id="pattern-${card.id}"`);
      const hubCard = hub.html.slice(hubCardAt, hub.html.indexOf('</details>', hubCardAt));
      for (const heading of REQUIRED_HEADINGS) expect(hubCard).toContain(heading);
      expect(hubCard).toContain(card.boundary);
    }
    expect(hub.html).not.toMatch(REDLINE);
    expect(chronicle.html).not.toMatch(REDLINE);
    expect(home).not.toMatch(REDLINE);
    expect(chronicle.html.match(/class="milestone-block"/g)).toHaveLength(10);
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('#161c24');
    expect(css).toContain('.pattern-card { color: #161c24; background: #f7f1e6;');
    expect(css).toContain('html.dark .pattern-card');
  });
});

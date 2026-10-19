import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CASE_LIMITS,
  CASE_STUDIES,
  caseBody,
  caseHref,
  caseIssues,
  casePlain,
  caseRelatedAllowed,
} from '../shared/civilization/cases';
import { CHRONICLE_STAGES } from '../shared/civilization/chronicle';
import { cjkChars } from '../shared/contentPage';
import { civChars } from '../shared/civilization/contract';
import { questionHrefAllowed } from '../shared/civilization/questions';
import { TECH_STAGES } from '../shared/civilization/tech';
import { renderChroniclePage, renderCivilizationHub, renderTechPage } from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';
import { heritageBlocked } from '../shared/heritage';
import { cantoneseLeft } from '../shared/prose';
import type { NewsItem } from '../shared/types';

const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;
const RANKING = /落後|劣等|種族|民族優|最偉大|第一文明|誰最/;
const READINGS = ['界定事件', '關鍵產物', '推動力', '溫和影響', '不適用邊界', '維修／傳承條件', '今日可問', '來源'];

describe('civilization case essays', () => {
  it('ships one success and one conditional loss, with the length and source floors', () => {
    expect(CASE_STUDIES.map((item) => item.id)).toEqual(['print-cost', 'gear-pause']);
    expect(CASE_STUDIES.map((item) => item.outcome)).toEqual(['成', '敗']);
    expect(CASE_STUDIES.map((item) => item.title)).toEqual(['印刷與知識成本', '齒輪裝置的中斷條件']);
    const techStages = new Set(TECH_STAGES.map((stage) => `tech-${stage.n}`));
    const chronicleStages = new Set(CHRONICLE_STAGES.map((stage) => `stage-${stage.n}`));
    for (const item of CASE_STUDIES) {
      expect(caseIssues(item)).toEqual([]);
      expect(cjkChars(caseBody(item))).toBeGreaterThanOrEqual(CASE_LIMITS.minBody);
      expect(item.sources.length).toBeGreaterThanOrEqual(4);
      expect(new Set(item.sources.map((source) => source.url)).size).toBe(item.sources.length);
      for (const source of item.sources) expect(source.url.startsWith('https://')).toBe(true);
      expect(civChars(item.problem)).toBeLessThanOrEqual(CASE_LIMITS.problem);
      expect(civChars(item.mechanism)).toBeLessThanOrEqual(CASE_LIMITS.mechanism);
      expect(civChars(item.boundary)).toBeLessThanOrEqual(CASE_LIMITS.boundary);
      expect(civChars(item.ask)).toBeLessThanOrEqual(CASE_LIMITS.ask);
      expect(item.beside === 'tech-7' ? techStages.has(item.beside) : chronicleStages.has(item.beside)).toBe(true);
      const plain = casePlain(item);
      expect(plain).not.toMatch(REDLINE);
      expect(plain).not.toMatch(RANKING);
      expect(heritageBlocked(plain)).toBe(false);
      expect(cantoneseLeft(plain)).toBe(false);
      for (const link of item.related) {
        expect(caseRelatedAllowed(link.href)).toBe(true);
        if (link.href === '/civilization/#question-index') continue;
        expect(questionHrefAllowed(link.href)).toBe(true);
      }
    }
    const print = CASE_STUDIES[0];
    const gear = CASE_STUDIES[1];
    expect(print.mount).toBe('/civilization/tech/');
    expect(print.beside).toBe('tech-7');
    expect(print.related.some((link) => link.href === '/civilization/chronicle/#pattern-copy-check')).toBe(true);
    expect(gear.mount).toBe('/civilization/chronicle/');
    expect(gear.beside).toBe('stage-4');
    expect(gear.related.some((link) => link.href === '/civilization/chronicle/#pattern-measure-promise')).toBe(true);
    expect(casePlain(gear)).toContain('維修');
    expect(casePlain(gear)).toContain('材料');
    expect(casePlain(gear)).toContain('知識傳遞');
    expect(casePlain(gear)).toContain('若');
    expect(casePlain(print)).toContain('複製');
    expect(casePlain(print)).toContain('校對');
  });

  it('mounts both essays on existing pages and keeps related links inside the allowlist', () => {
    const tech = renderTechPage().html;
    const chronicle = renderChroniclePage().html;
    const print = CASE_STUDIES[0];
    const gear = CASE_STUDIES[1];
    expect(tech).toContain('id="case-print-cost"');
    expect(tech).toContain('印刷與知識成本');
    expect(chronicle).toContain('id="case-gear-pause"');
    expect(chronicle).toContain('齒輪裝置的中斷條件');
    const techStart = tech.indexOf('id="tech-7"');
    const techSection = tech.slice(techStart, tech.indexOf('id="tech-8"'));
    expect(techSection).toContain('id="case-print-cost"');
    const caseTag = techSection.slice(techSection.lastIndexOf('<section', techSection.indexOf('id="case-print-cost"')), techSection.indexOf('id="case-print-cost"'));
    expect(caseTag).toContain('class="case-study"');
    expect(caseTag).not.toContain('civ-reveal');
    expect(caseTag).not.toContain('civ-figure');
    const gearStart = chronicle.indexOf('id="stage-4"');
    const gearSection = chronicle.slice(gearStart, chronicle.indexOf('id="stage-5"'));
    expect(gearSection).toContain('id="case-gear-pause"');
    expect(gearSection).not.toContain('/civilization/origins/');
    for (const item of [print, gear]) {
      const html = item.mount === '/civilization/tech/' ? techSection : gearSection;
      expect(html).toContain(`data-case="${item.id}"`);
      expect(html).toContain(`data-outcome="${item.outcome}"`);
      expect(html).toContain('案例專篇');
      for (const heading of READINGS) expect(html).toContain(heading);
      for (const source of item.sources) expect(html).toContain(`href="${source.url}"`);
      for (const link of item.related) expect(html).toContain(`href="${link.href}"`);
      expect(html).toContain('href="/civilization/#question-index"');
      expect(html).not.toMatch(REDLINE);
    }
    expect(tech).not.toContain('>制度<');
    expect(tech).not.toContain('>貨幣<');
    expect(tech).not.toMatch(REDLINE);
    expect(chronicle).not.toMatch(REDLINE);
    expect(heritageBlocked(tech)).toBe(false);
    expect(heritageBlocked(chronicle)).toBe(false);
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/print-cost|gear-pause|CASE_STUDIES/);
    expect(route).toContain('tech: renderTechPage');
    expect(route).toContain('chronicle: renderChroniclePage');
    const schema = readFileSync('shared/civilization/SCHEMA.md', 'utf8');
    expect(schema).toContain('print-cost');
    expect(schema).toContain('gear-pause');
    expect(schema).not.toMatch(REDLINE);
  });

  it('hangs both essays on the axis without opening a new route', () => {
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
    for (const essay of CASE_STUDIES) {
      const href = caseHref(essay);
      expect(href.startsWith('/civilization/tech/') || href.startsWith('/civilization/chronicle/')).toBe(true);
      expect(href).not.toContain('/civilization/cases/');
      expect(home).toContain(`href="${href}"`);
      expect(hub.html).toContain(`href="${href}"`);
      expect(home).toContain(essay.title);
    }
    expect(home).not.toMatch(REDLINE);
    expect(hub.html).not.toMatch(REDLINE);
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('.case-study {');
    expect(css).toMatch(/\.case-study \{[^}]*background:\s*#f7f1e6/);
    expect(css).toMatch(/\.case-study \{[^}]*color:\s*#161c24/);
    expect(css).toContain('html.dark .case-study');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cjkChars } from '../shared/contentPage';
import { CHRONICLE_CHAPTERS, CHRONICLE_STAGES, renderChronicleArticle } from '../shared/civilization/chronicle';
import { MONITOR_READING } from '../shared/civilization/clock';
import { milestoneBlocksFor } from '../shared/civilization/milestoneBlock';
import { futureIssues } from '../shared/civilization/future';
import { patternsForStage } from '../shared/civilization/patterns';
import { renderChroniclePage, renderCivilizationHub, renderTodayPin } from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';

function httpsCount(html: string): number {
  return new Set([...html.matchAll(/href="(https:\/\/[^"]+)"/g)].map((match) => match[1])).size;
}

function stageSlice(html: string, n: number): string {
  const start = html.indexOf(`id="stage-${n}"`);
  const end = n < 10 ? html.indexOf(`id="stage-${n + 1}"`) : html.indexOf('四線總結');
  return html.slice(start, end);
}

describe('chronicle three volumes P0', () => {
  it('keeps ten stage anchors and adds three chapter doors', () => {
    const page = renderChroniclePage();
    expect(CHRONICLE_STAGES.map((stage) => stage.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (let n = 1; n <= 10; n += 1) {
      expect(page.html.match(new RegExp(`id="stage-${n}"`, 'g'))).toHaveLength(1);
    }
    for (const chapter of CHRONICLE_CHAPTERS) {
      expect(page.html).toContain(`id="${chapter.id}"`);
      expect(page.html).toContain(`>${chapter.name}<`);
    }
    expect(page.html.indexOf('id="ch-ancient"')).toBeLessThan(page.html.indexOf('id="stage-1"'));
    expect(page.html.indexOf('id="stage-5"')).toBeLessThan(page.html.indexOf('id="ch-now"'));
    expect(page.html.indexOf('id="ch-now"')).toBeLessThan(page.html.indexOf('id="stage-6"'));
    expect(page.html.indexOf('id="stage-10"')).toBeLessThan(page.html.indexOf('id="ch-future"'));
    expect(page.html).not.toContain('id="stage-11"');
    expect(page.html).not.toContain('/civilization/future/');
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).not.toMatch(/future:\s*render/);
  });

  it('drops the ten-card copies from the home page and the hub', () => {
    const home = renderHomeFeed([], new Map(), null, '', null, '', [], [], new Date('2026-10-17T04:00:00.000Z'), true);
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z')).html;
    for (const html of [home, hub]) {
      expect(html).not.toContain('class="stage-dot"');
      expect(html).not.toContain('class="stage-card"');
      expect(html).not.toContain('id="stage-grid"');
      expect(html).not.toContain('十個階段');
      expect(html.match(/class="volume-card"/g)).toHaveLength(3);
      expect(html).toContain('href="/civilization/chronicle/#ch-ancient"');
      expect(html).toContain('href="/civilization/chronicle/#ch-now"');
      expect(html).toContain('href="/civilization/chronicle/#ch-future"');
    }
    expect(hub).toContain('id="future"');
    expect(hub).toContain('id="future-f1"');
  });

  it('renames stage 10, separates 08 and 09, and keeps 今天 off era labels', () => {
    const stage8 = CHRONICLE_STAGES.find((stage) => stage.n === 8);
    const stage9 = CHRONICLE_STAGES.find((stage) => stage.n === 9);
    const stage10 = CHRONICLE_STAGES.find((stage) => stage.n === 10);
    expect(stage8?.era).toBe('約公元 1870 年至 1969 年');
    expect(stage9?.era).toBe('約公元 1970 年至 2009 年');
    expect(stage10?.era).toBe('約公元 2010 年起');
    expect(stage10?.name).toBe('本世紀／當代');
    expect(stage10?.name).not.toContain('近未來');
    expect(stage10?.short).not.toContain('近未來');
    for (const stage of CHRONICLE_STAGES) {
      expect(stage.era).not.toContain('今天');
    }
    const article = renderChronicleArticle();
    const eras = [...article.matchAll(/<p class="era">([^<]*)<\/p>/g)].map((match) => match[1] ?? '');
    for (const era of eras) expect(era).not.toContain('今天');
    expect(cjkChars(stage10?.prose ?? '')).toBeGreaterThanOrEqual(400);
  });

  it('thickens volume 2 and leaves the future door on the existing anchors', () => {
    const page = renderChroniclePage().html;
    for (const n of [6, 7, 8, 9, 10]) {
      const stage = CHRONICLE_STAGES.find((item) => item.n === n);
      const blocks = milestoneBlocksFor(n);
      expect(blocks.some((block) => block.products.length >= 1)).toBe(true);
      expect(blocks.some((block) => block.drivers.length >= 1)).toBe(true);
      const section = stageSlice(page, n);
      const hasPatternAsk = patternsForStage(n).some((card) => card.ask.trim().length > 0);
      const hasStageAsk = Boolean(stage?.mechanismAsk) && section.includes(`機制問題：${stage?.mechanismAsk}`);
      expect(hasPatternAsk || hasStageAsk).toBe(true);
      expect(httpsCount(section)).toBeGreaterThanOrEqual(4);
    }
    const door = page.slice(page.indexOf('id="ch-future"'), page.indexOf('四線總結'));
    expect(door).toContain('href="/civilization/#future"');
    for (let n = 1; n <= 6; n += 1) expect(door).toContain(`href="/civilization/#future-f${n}"`);
    expect(door).not.toContain(MONITOR_READING.note);
    expect(door).not.toContain('距午夜');
    expect(door).not.toContain('setInterval');
    expect(futureIssues()).toEqual([]);
  });

  it('does not fall back an empty on-this-day pin onto stage 9', () => {
    const pin = renderTodayPin(new Date('2026-02-03T04:00:00.000Z'));
    expect(pin).toContain('此日沒有收錄紀事');
    expect(pin).not.toContain('#stage-9');
    expect(pin).not.toContain('信息革命');
    expect(pin).toContain('href="/#slice"');
  });
});

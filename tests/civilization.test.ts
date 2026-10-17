import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';
import { cjkChars } from '../shared/contentPage';
import { coordinateChipHtml, renderCivilizationSlice } from '../shared/civilization/renderSlice';
import {
  civilizationPublicPaths,
  hubIndexable,
  hubProse,
  originsIndexable,
  originsProse,
  renderCivilizationHub,
  renderCivilizationMiss,
  renderOriginsPage,
  renderTodayPin,
} from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';
import { renderMustRead } from '../shared/mustRead';
import { staticSitemapXml } from '../shared/sitemap';
import type { NewsItem } from '../shared/types';

const BLOCKED = /主權|台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|MOCK|紅線：無/;

function explainer(key: string): ContentDoc {
  return {
    kind: 'compare',
    key,
    title: '公開模型可以在個人電腦試行',
    description: '多間媒體報道同一項工具更新。',
    blocks: [
      { title: '事件經過', sentences: ['公開模型可以在個人電腦試行。', '安裝步驟已經公開。'], sources: [] },
      { title: '各方回應', sentences: ['開發者公布相容系統。'], sources: [] },
    ],
    publishedAt: '2026-10-17T02:00:00.000Z',
    hkt: '2026-10-17 10:00',
    mode: 'ai',
    points: ['公開模型可以在個人電腦試行。', '開發者公布相容系統。'],
  };
}

describe('civilization thick pages', () => {
  it('indexes the origins longform and the hub, and keeps thin layers out', () => {
    expect(cjkChars(originsProse())).toBeGreaterThanOrEqual(1200);
    expect(originsIndexable()).toBe(true);
    expect(cjkChars(hubProse())).toBeGreaterThanOrEqual(500);
    expect(hubIndexable()).toBe(true);
    expect(civilizationPublicPaths()).toEqual(['/civilization/', '/civilization/origins/']);
    const xml = staticSitemapXml();
    expect(xml).toContain('https://world-news.xyz/civilization/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/origins/</loc>');
    expect(xml).not.toContain('/civilization/tech');
    expect(xml).not.toContain('/civilization/cities');
    const file = readFileSync('public/sitemap.xml', 'utf8');
    expect(file).toBe(xml);
  });

  it('mounts the origins body with one AI label, local anchors, and no blocked wording', () => {
    const page = renderOriginsPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('人類起源時間線');
    expect(page.html).toContain('href="/hk/landmarks/science-museum/"');
    expect(page.html).toContain('href="/hk/landmarks/space-museum/"');
    expect(page.html).toContain('Jebel Irhoud');
    expect(page.html).toContain('學術爭議');
    expect(page.html).toContain('href="https://iho.asu.edu/accessible-timeline"');
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect(page.html).toContain('參考與研究入口');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html).not.toContain('pagead2.googlesyndication.com');
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toContain('寫作與上線備註');
  });

  it('gives the hub a real origins summary and does not promote thin layer URLs', () => {
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z'));
    expect(hub.status).toBe(200);
    expect(hub.indexable).toBe(true);
    expect(hub.html).toContain('導語');
    expect(hub.html).toContain('起源摘要');
    expect(hub.html).toContain('解剖學現代人');
    expect(hub.html).toContain('主要走出非洲');
    expect(hub.html).toContain('全新世銜接');
    expect(hub.html).toContain('href="/civilization/origins/"');
    expect(hub.html).not.toContain('href="/civilization/tech/');
    expect(hub.html).not.toContain('href="/civilization/cities/');
    expect(hub.html).not.toContain('adsbygoogle');
    expect(hub.html).not.toMatch(BLOCKED);
    expect(hub.html).toContain('今日落點');
    expect(hub.html).toContain('尚未收錄紀事');
    const missed = renderCivilizationMiss();
    expect(missed.status).toBe(404);
    expect(missed.indexable).toBe(false);
    expect(missed.html).toContain('noindex,follow');
  });
});

describe('homepage today slice', () => {
  it('keeps real briefing and explainer paths inside the slice, with no invented coordinate', () => {
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
    const html = renderHomeFeed([item], new Map(), null, '1234567890', null, '', [
      { href: '/briefing/2026-10-17-am/', label: '每日香港導讀' },
    ], [
      { href: '/explainer/unmatched/', title: '沒有文明對照', description: '這則沒有手寫座標。' },
    ], new Date('2026-10-17T04:00:00.000Z'));
    expect(html.indexOf('id="civ"')).toBeLessThan(html.indexOf('今日落點'));
    expect(html.indexOf('今日落點')).toBeLessThan(html.indexOf('id="slice"'));
    expect(html.indexOf('id="slice"')).toBeLessThan(html.indexOf('今日必讀'));
    expect(html).toContain('href="/briefing/2026-10-17-am/"');
    expect(html).toContain('href="/explainer/unmatched/"');
    expect(html).toContain('href="/explainer/"');
    expect(html).toContain('class="home-cards"');
    expect(html).not.toContain('coord-chip');
    expect(html).not.toContain('adsbygoogle');
    expect(html).not.toMatch(BLOCKED);
    const pin = renderTodayPin(new Date('2026-10-09T04:00:00.000Z'));
    expect(pin).toContain('廣華醫院');
    expect(pin).toContain('pin-seal');
  });
});

describe('civilization slice', () => {
  const key = '2026-10-17-huggingface-llama-windows-0d4a780afe2e';

  it('renders equal filled slots and nothing when there is no match', () => {
    expect(renderCivilizationSlice('missing')).toBe('');
    expect(coordinateChipHtml('/explainer/missing/')).toBe('');
    const slice = renderCivilizationSlice(key);
    expect(slice.match(/class="civ-slot"/g)).toHaveLength(2);
    expect(slice).toContain('今');
    expect(slice).toContain('遠');
    expect(slice).not.toContain('>近<');
    expect(slice).not.toContain('jd-tech');
    expect(slice).not.toContain('jainaspp');
    const page = renderContentPage(explainer(key), `https://world-news.xyz/explainer/${key}/`);
    expect(page.indexOf('class="civ-slice"')).toBeGreaterThan(-1);
    expect(page.indexOf('class="civ-slice"')).toBeLessThan(page.indexOf('jd-tool-card'));
    const plain = renderContentPage(explainer('plain-explainer'), 'https://world-news.xyz/explainer/plain-explainer/');
    expect(plain).not.toContain('civ-slice');
    expect(plain).not.toContain('jd-tool-card');
    const must = renderMustRead([
      { href: `/explainer/${key}/`, title: '模型', description: '試行。' },
      { href: '/explainer/plain/', title: '其他', description: '無對照。' },
    ]);
    expect(must.match(/coord-chip/g)).toHaveLength(1);
    expect(must).toContain('科技史 · 1991');
  });
});

import { existsSync, readFileSync } from 'node:fs';
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
import { focusPages } from '../shared/focus';
import { heritageBlocked } from '../shared/heritage';
import { renderHomeFeed } from '../shared/homePage';
import { renderMustRead } from '../shared/mustRead';
import { staticSitemapXml } from '../shared/sitemap';
import type { NewsItem } from '../shared/types';

const BLOCKED = /主權|台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|MOCK|紅線：無/;

function explainer(key: string, title = '公開模型可以在個人電腦試行'): ContentDoc {
  return {
    kind: 'compare',
    key,
    title,
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
    expect(page.html).toContain('<strong><a href="/hk/landmarks/science-museum/">香港科學館</a></strong>');
    expect(page.html).toContain('<strong><a href="/hk/landmarks/space-museum/">香港太空館</a></strong>');
    expect(page.html).not.toMatch(/%%CIV/);
    expect(page.html).toContain('<strong>Ma</strong>');
    expect(page.html).toContain('<em>Homo</em>');
    expect(page.html).not.toContain('站在一條很長的時間軸上');
    expect(page.html).toContain('Jebel Irhoud');
    expect(page.html).toContain('學術爭議');
    expect(page.html).toContain('href="https://iho.asu.edu/accessible-timeline"');
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect(page.html).toContain('參考與研究入口');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html).not.toContain('pagead2.googlesyndication.com');
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toContain('寫作與上線備註');
    const heroAt = page.html.indexOf('class="civ-origins-hero"');
    const titleAt = page.html.indexOf('<h1>人類起源時間線');
    const stage1 = page.html.indexOf('data-stage="1"');
    const stage2 = page.html.indexOf('data-stage="2"');
    const stage3 = page.html.indexOf('data-stage="3"');
    const deep = page.html.indexOf('<h3>一、深層分離');
    const africa = page.html.indexOf('<h3>二、非洲現代人多樣性');
    const spread = page.html.indexOf('<h3>三、全球擴張');
    const next = page.html.indexOf('<h2>各里程碑溫和說明</h2>');
    expect(titleAt).toBeGreaterThan(-1);
    expect(heroAt).toBeGreaterThan(titleAt);
    expect(deep).toBeGreaterThan(heroAt);
    expect(stage1).toBeGreaterThan(deep);
    expect(stage1).toBeLessThan(africa);
    expect(stage2).toBeGreaterThan(africa);
    expect(stage2).toBeLessThan(spread);
    expect(stage3).toBeGreaterThan(spread);
    expect(stage3).toBeLessThan(next);
    expect(page.html).toContain('src="/static/civilization/civ-origins-hero-1200w.webp"');
    expect(page.html).toContain('civ-origins-hero-640w.webp 640w');
    expect(page.html).toContain('src="/static/civilization/civ-origins-stage1-800w.webp"');
    expect(page.html).toContain('src="/static/civilization/civ-origins-stage2-800w.webp"');
    expect(page.html).toContain('src="/static/civilization/civ-origins-stage3-800w.webp"');
    expect(page.html).toContain('示意·非遷徙路線');
    expect(page.html).toContain('loading="eager"');
    expect(page.html).toContain('fetchpriority="high"');
    expect(page.html.match(/class="civ-figure"/g)).toHaveLength(3);
    expect(page.html).not.toContain('/static/heritage/');
    expect(page.html).not.toContain('node-today');
    expect(page.html).toContain('href="/static/civilization/MANIFEST.md"');
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
    expect(hub.html).toContain('<h1 class="column-title civ-page-title">人類文明</h1>');
    expect(hub.html).not.toContain('<h1 class="axis-title">');
    expect(hub.html).toContain('<p class="axis-title">站在一條很長的時間軸上</p>');
    expect(hub.html).toContain('今日落點');
    expect(hub.html).not.toContain('尚未收錄');
    const pin = hub.html.slice(hub.html.indexOf('class="today-pin"'), hub.html.indexOf('aria-label="文明層"'));
    expect(pin).toContain('深時間 · 起源里程碑');
    expect(pin).toContain('href="/civilization/origins/"');
    expect(heritageBlocked(pin)).toBe(false);
    const missed = renderCivilizationMiss();
    expect(missed.status).toBe(404);
    expect(missed.indexable).toBe(false);
    expect(missed.html).toContain('noindex,follow');
    expect(hub.html.indexOf('class="civ-hub-hero"')).toBeGreaterThan(hub.html.indexOf('class="axis-hero"'));
    expect(hub.html.indexOf('class="civ-hub-hero"')).toBeLessThan(hub.html.indexOf('class="civ-article"'));
    expect(hub.html).toContain('src="/static/civilization/overview-hero-v1.jpg"');
    expect(hub.html).toContain('class="axis-vignette"');
    expect(hub.html).toContain('src="/static/civilization/civ-layer-origins-640w.webp"');
    expect(hub.html).toContain('civ-layer-origins-400w.webp 400w');
    expect(hub.html).toContain('civ-layer-origins-640x400.webp');
    expect(hub.html).toContain('src="/static/civilization/node-tech-v1.jpg"');
    expect(hub.html).toContain('src="/static/civilization/node-city-v1.jpg"');
    expect(hub.html).not.toContain('node-today');
    expect(hub.html).not.toContain('/static/heritage/');
    const primary = hub.html.slice(hub.html.indexOf('layer-primary'), hub.html.indexOf('layer-secondary'));
    expect(primary).toContain('class="layer-cover"');
    expect(primary).toContain('人類起源：深時間溫和示意');
    for (const file of [
      'civ-home-axis-bg-640w.webp',
      'civ-home-axis-bg-960w.webp',
      'civ-home-axis-bg-1280w.webp',
      'civ-home-axis-bg-1920w.webp',
      'civ-layer-origins-400w.webp',
      'civ-layer-origins-640w.webp',
      'civ-layer-origins-640x400.webp',
      'civ-origins-hero-640w.webp',
      'civ-origins-hero-960w.webp',
      'civ-origins-hero-1200w.webp',
      'civ-origins-stage1-640w.webp',
      'civ-origins-stage1-800w.webp',
      'civ-origins-stage2-640w.webp',
      'civ-origins-stage2-800w.webp',
      'civ-origins-stage3-640w.webp',
      'civ-origins-stage3-800w.webp',
      'overview-hero-v1.jpg',
      'node-city-v1.jpg',
      'node-tech-v1.jpg',
      'MANIFEST.md',
    ]) {
      expect(existsSync(`public/static/civilization/${file}`), file).toBe(true);
    }
    const css = readFileSync('src/App.css', 'utf8');
    const vignette = css.slice(css.indexOf('.axis-vignette {'), css.indexOf('.axis-hero .kicker'));
    expect(vignette).toContain('pointer-events: none');
    expect(vignette).toContain('civ-home-axis-bg-1280w.webp');
    expect(vignette).toContain('civ-home-axis-bg-640w.webp');
    expect(vignette).toContain('civ-home-axis-bg-960w.webp');
    expect(vignette).toContain('civ-home-axis-bg-1920w.webp');
    expect(vignette).toContain('opacity: 0.4');
    expect(vignette).toContain('opacity: 0.45');
    expect(vignette).not.toContain('invert');
    expect(css).toContain('html.dark .axis-vignette::after');
    expect(css).toContain('html.dark .layer-cover img');
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
    expect(html).toContain('<h1 class="axis-title">站在一條很長的時間軸上</h1>');
    expect(html.indexOf('class="axis-vignette"')).toBeLessThan(html.indexOf('class="axis-title"'));
    expect(html).toContain('class="axis-node"');
    expect(html).toContain('class="layer-cover"');
    expect(html).not.toContain('node-today');
    expect(html).not.toContain('<p class="axis-title">');
    expect(html).not.toContain('adsbygoogle');
    expect(html).not.toMatch(BLOCKED);
    const pin = renderTodayPin(new Date('2026-10-09T04:00:00.000Z'));
    expect(pin).toContain('廣華醫院');
    expect(pin).toContain('pin-seal');
    expect(pin).toContain('當年今日');
    expect(pin).not.toContain('起源里程碑');
  });

  it('uses an origins milestone when the calendar day has no heritage fact', () => {
    const empty = renderTodayPin(new Date('2026-02-03T04:00:00.000Z'));
    const later = renderTodayPin(new Date('2026-10-17T04:00:00.000Z'));
    const blockedDay = renderTodayPin(new Date('2026-06-04T04:00:00.000Z'));
    for (const pin of [empty, later, blockedDay]) {
      expect(pin).not.toContain('尚未收錄');
      expect(pin).toContain('深時間 · 起源里程碑');
      expect(pin).toContain('href="/civilization/origins/"');
      expect(pin).toContain('class="pin-fact"');
      const fact = pin.slice(pin.indexOf('pin-fact'), pin.indexOf('pin-links'));
      expect(heritageBlocked(fact)).toBe(false);
      expect(fact).not.toMatch(/台灣|臺灣|台湾|Taiwan|六四|主權|示威|06-04|07-01/);
    }
    expect(renderTodayPin(new Date('2026-02-02T16:00:00.000Z'))).toBe(empty);
    expect(later).not.toBe(empty);
  });

  it('keeps the poetic axis title as the only home h1', () => {
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
    const home = renderHomeFeed([item]);
    expect(home.match(/<h1\b/g)).toHaveLength(1);
    expect(home).toContain('<h1 class="axis-title">站在一條很長的時間軸上</h1>');
    expect(focusPages().length).toBeGreaterThanOrEqual(19);
    for (const page of focusPages()) {
      const html = renderHomeFeed([item], new Map(), null, '', null, '', [], [], new Date('2026-10-17T04:00:00.000Z'), false, {}, page.label);
      expect(html).not.toContain('<h1 class="axis-title">');
      expect(html).toContain('<p class="axis-title">站在一條很長的時間軸上</p>');
      expect(html).toContain(`<h1 class="focus-title">${page.label}</h1>`);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
    }
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('html.dark .axis-hero');
    expect(css).toContain('html.dark .today-pin');
    expect(css).toContain('html.dark .today-slice');
    expect(css).toContain('html.dark .today-slice .story-title');
    expect(css).toContain('html.dark .coord-chip');
    expect(css).toContain('html.dark .layer-card');
    expect(css).toMatch(/\.today-slice \{[^}]*background:\s*#f3f5f8/);
    expect(css).toMatch(/\.today-pin \{[^}]*background-color:\s*#f7f1e6/);
    expect(css).toMatch(/\.axis-hero \{[^}]*background:\s*#161c24/);
    expect(readFileSync('functions/focus/page.ts', 'utf8')).toContain('known?.label || page.label');
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('asHeading: poeticAxis');
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
    expect(slice).not.toContain('今｜近｜遠');
    const plain = renderContentPage(explainer('plain-explainer', '港鐵公布票價檢討'), 'https://world-news.xyz/explainer/plain-explainer/');
    expect(plain).not.toContain('civ-slice');
    expect(plain).not.toContain('jd-tool-card');
    const must = renderMustRead([
      { href: `/explainer/${key}/`, title: '模型', description: '試行。' },
      { href: '/explainer/plain/', title: '其他', description: '無對照。' },
    ]);
    expect(must.match(/coord-chip/g)).toHaveLength(1);
    expect(must).toContain('科技史 · 1991');
    const rotated = renderMustRead([
      { href: '/explainer/2026-11-02-opaque-a/', title: '新語言模型可在個人電腦試行', description: '開發者公布安裝方式。' },
      { href: '/explainer/2026-11-02-park/', title: '公園翻新工程展開', description: '康樂場地關閉一週。' },
      { href: '/explainer/2026-11-02-opaque-b/', title: '語音轉寫可以整理會議紀錄', description: '工具更新。' },
      { href: '/explainer/2026-11-02-fare/', title: '港鐵公布票價檢討', description: '下月公布結果。' },
      { href: '/explainer/2026-11-02-opaque-c/', title: '長文寫作工具更新', description: '分工對照。' },
    ]);
    expect(rotated.match(/coord-chip/g)?.length).toBeGreaterThanOrEqual(3);
    expect(rotated).toContain('科技史 · 1991');
    expect(rotated).toContain('科技史 · 1980');
    expect(rotated).not.toContain('今｜近｜遠');
    const speech = renderCivilizationSlice({ key: 'dated-out', title: '語音轉寫可以整理會議紀錄' });
    expect(speech).toContain('語音影像');
    expect(speech).toContain('data-slots="2"');
    expect(speech).not.toContain('>近<');
    expect(renderCivilizationSlice({ key: 'dated-out', title: '公園翻新工程展開' })).toBe('');
  });
});

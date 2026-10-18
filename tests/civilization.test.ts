import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';
import { cjkChars } from '../shared/contentPage';
import { coordinateChipHtml, renderCivilizationSlice } from '../shared/civilization/renderSlice';
import { CHRONICLE_STAGES, chronicleCardMilestones, chronicleStagesOrdered } from '../shared/civilization/chronicle';
import { CHRONICLE_MILESTONE_BLOCKS, milestoneBlockAnchor } from '../shared/civilization/chronicleMilestones';
import { milestoneBlockProse, milestoneBlocksFor } from '../shared/civilization/milestoneBlock';
import { CITY_STAGES } from '../shared/civilization/city';
import { COSMOS_STAGES } from '../shared/civilization/cosmos';
import { EARTH_STAGES, earthStageText } from '../shared/civilization/earth';
import { TECH_STAGES } from '../shared/civilization/tech';
import {
  chronicleIndexable,
  chronicleProse,
  cityIndexable,
  cityProse,
  civilizationPublicPaths,
  cosmosIndexable,
  cosmosProse,
  earthIndexable,
  earthProse,
  hubIndexable,
  hubProse,
  originsIndexable,
  originsProse,
  renderChroniclePage,
  renderCityPage,
  renderCivilizationHub,
  renderCivilizationMiss,
  renderCosmosPage,
  renderEarthPage,
  renderOriginsPage,
  renderTechPage,
  renderTodayPin,
  techIndexable,
  techProse,
} from '../shared/civilizationPage';
import { focusPages } from '../shared/focus';
import { heritageBlocked } from '../shared/heritage';
import { renderHomeFeed } from '../shared/homePage';
import { renderMustRead } from '../shared/mustRead';
import { staticSitemapXml } from '../shared/sitemap';
import type { NewsItem } from '../shared/types';

const BLOCKED = /主權|台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|MOCK|紅線：無/;
const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領|RFI|法輪|達賴/i;

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
    expect(cjkChars(chronicleProse())).toBeGreaterThanOrEqual(1200);
    expect(chronicleIndexable()).toBe(true);
    expect(cjkChars(cosmosProse())).toBeGreaterThanOrEqual(1200);
    expect(cosmosIndexable()).toBe(true);
    expect(cjkChars(techProse())).toBeGreaterThanOrEqual(1200);
    expect(techIndexable()).toBe(true);
    expect(cjkChars(cityProse())).toBeGreaterThanOrEqual(1200);
    expect(cityIndexable()).toBe(true);
    expect(civilizationPublicPaths()).toEqual([
      '/civilization/',
      '/civilization/cosmos/',
      '/civilization/earth/',
      '/civilization/origins/',
      '/civilization/tech/',
      '/civilization/city/',
      '/civilization/chronicle/',
    ]);
    const xml = staticSitemapXml();
    expect(xml).toContain('https://world-news.xyz/civilization/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/cosmos/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/earth/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/origins/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/tech/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/city/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/chronicle/</loc>');
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
    const earthReturn = page.html.indexOf('上一層：地球生命');
    const cosmosReturn = page.html.indexOf('更早的深時間：宇宙長河');
    expect(page.html).toContain('href="/civilization/earth/"');
    expect(page.html).toContain('href="/civilization/cosmos/"');
    expect(earthReturn).toBeGreaterThan(titleAt);
    expect(earthReturn).toBeLessThan(cosmosReturn);
    expect(cosmosReturn).toBeGreaterThan(titleAt);
    expect(cosmosReturn).toBeLessThan(heroAt);
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
    expect(hub.html).toContain('href="/civilization/tech/"');
    expect(hub.html).toContain('href="/civilization/city/"');
    expect(hub.html).not.toContain('href="/civilization/cities/');
    expect(hub.html).not.toContain('尚未單獨成頁');
    expect(hub.html).toContain('都已寫成獨立長頁');
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
    expect(hub.html).toContain('civ-hub-hero-640w.webp 640w');
    expect(hub.html).toContain('civ-hub-hero-960w.webp 960w');
    expect(hub.html).toContain('civ-hub-hero-1200w.webp 1200w');
    expect(hub.html).toContain('class="axis-vignette"');
    expect(hub.html).toContain('src="/static/civilization/civ-layer-origins-640w.webp"');
    expect(hub.html).toContain('civ-layer-origins-400w.webp 400w');
    expect(hub.html).toContain('civ-layer-origins-640x400.webp');
    expect(hub.html).toContain('src="/static/civilization/node-tech-v1.jpg"');
    expect(hub.html).toContain('src="/static/civilization/node-city-v1.jpg"');
    expect(hub.html).not.toContain('node-today');
    expect(hub.html).not.toContain('/static/heritage/');
    const aside = hub.html.slice(hub.html.indexOf('aria-label="文明層"'));
    expect(aside.match(/layer-primary/g)).toHaveLength(3);
    expect(aside).not.toContain('layer-secondary');
    const originsCard = aside.slice(aside.indexOf('href="/civilization/origins/"'), aside.indexOf('href="/civilization/tech/"'));
    expect(originsCard).toContain('class="layer-cover"');
    expect(originsCard).toContain('人類起源：深時間溫和示意');
    const techCard = aside.slice(aside.indexOf('href="/civilization/tech/"'), aside.indexOf('href="/civilization/city/"'));
    expect(techCard).toContain('src="/static/civilization/node-tech-v1.jpg"');
    expect(techCard).toContain('civ-layer-tech-400w.webp 400w');
    expect(techCard).toContain('civ-layer-tech-640w.webp 640w');
    expect(techCard).toContain('科技與發現');
    const cityCard = aside.slice(aside.indexOf('href="/civilization/city/"'));
    expect(cityCard).toContain('src="/static/civilization/node-city-v1.jpg"');
    expect(cityCard).toContain('civ-layer-city-400w.webp 400w');
    expect(cityCard).toContain('civ-layer-city-640w.webp 640w');
    expect(cityCard).toContain('城市・基建・民生');
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
      'civ-hub-hero-640w.webp',
      'civ-hub-hero-960w.webp',
      'civ-hub-hero-1200w.webp',
      'node-city-v1.jpg',
      'node-tech-v1.jpg',
      'civ-layer-tech-400w.webp',
      'civ-layer-tech-640w.webp',
      'civ-layer-city-400w.webp',
      'civ-layer-city-640w.webp',
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
    expect(hub.html.match(/class="stage-card"/g)).toHaveLength(10);
    expect(hub.html.indexOf('class="deep-time"')).toBeLessThan(hub.html.indexOf('class="chronicle-board"'));
    expect(hub.html.indexOf('class="chronicle-board"')).toBeLessThan(hub.html.indexOf('class="civ-article"'));
    const deep = hub.html.slice(hub.html.indexOf('class="deep-time"'), hub.html.indexOf('class="chronicle-board"'));
    expect(deep.indexOf('href="/civilization/cosmos/"')).toBeLessThan(deep.indexOf('href="/civilization/earth/"'));
    expect(deep.indexOf('href="/civilization/earth/"')).toBeLessThan(deep.indexOf('href="/civilization/origins/"'));
    expect(deep).toContain('閱讀地球生命');
    expect(deep).toContain('侏羅紀');
    expect(deep).toContain('閱讀宇宙長河');
    expect(deep).toContain('src="/static/civilization/cosmo-stage-1-cover-640w.webp"');
    expect(deep).toContain('cosmo-stage-1-cover-1280w.webp 1280w');
    expect(deep).toContain('>宇宙<');
    expect(deep).not.toContain('civ-stage-');
    expect(hub.html.indexOf('class="chronicle-strip"')).toBeLessThan(hub.html.indexOf('class="today-pin"'));
    expect(hub.html).toContain('打開完整編年');
    for (const stage of CHRONICLE_STAGES) {
      expect(hub.html).toContain(`href="/civilization/chronicle/#stage-${stage.n}"`);
      expect(hub.html).toContain(stage.name);
      expect(hub.html).toContain(stage.meaning);
      const card = hub.html.slice(hub.html.indexOf(`<article class="stage-card" data-stage="${stage.n}">`));
      const next = card.indexOf('<article class="stage-card"', 1);
      const body = next === -1 ? card.slice(0, card.indexOf('class="civ-article"')) : card.slice(0, next);
      expect(body.match(/<li>/g)).toHaveLength(chronicleCardMilestones(stage).length);
      for (const line of stage.lines) expect(body).toContain(`>${line}<`);
      if (stage.origins) expect(body).toContain('href="/civilization/origins/"');
      else expect(body).not.toContain('詳見起源');
    }
    expect(hub.html).not.toMatch(REDLINE);
    for (let n = 1; n <= 10; n += 1) {
      expect(existsSync(`public/static/civilization/civ-stage-${n}-cover-1280w.webp`), `stage ${n} 1280`).toBe(true);
      expect(existsSync(`public/static/civilization/civ-stage-${n}-cover-640w.webp`), `stage ${n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/civ-stage-${n}-cover-400w.webp`), `stage ${n} 400`).toBe(true);
      expect(hub.html).toContain(`src="/static/civilization/civ-stage-${n}-cover-640w.webp"`);
      expect(hub.html).toContain(`civ-stage-${n}-cover-400w.webp 400w`);
      expect(hub.html).toContain(`civ-stage-${n}-cover-1280w.webp 1280w`);
    }
    expect(hub.html).toContain('onerror="this.hidden=true"');
    const firstCard = hub.html.slice(hub.html.indexOf('<article class="stage-card" data-stage="1">'), hub.html.indexOf('<article class="stage-card" data-stage="2">'));
    const thirdCard = hub.html.slice(hub.html.indexOf('<article class="stage-card" data-stage="3">'), hub.html.indexOf('<article class="stage-card" data-stage="4">'));
    expect(firstCard).toContain('loading="eager"');
    expect(thirdCard).toContain('loading="lazy"');
    const stripOnly = hub.html.slice(hub.html.indexOf('class="chronicle-strip"'), hub.html.indexOf('</nav>', hub.html.indexOf('class="chronicle-strip"')));
    expect(stripOnly).not.toContain('<img');
    expect(stripOnly).not.toContain('civ-stage-');
    expect(stripOnly).not.toContain('/civilization/cosmos/');
    expect(stripOnly).not.toContain('#cosmo-');
  });

  it('publishes an indexable ten-stage chronicle and keeps the copy inside the red lines', () => {
    const page = renderChroniclePage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('文明編年：從採集到智能工具');
    expect(page.html).toContain('href="/civilization/"');
    expect(page.html).toContain('href="/civilization/origins/"');
    expect(page.html).toContain('href="/#slice"');
    expect(page.html).toContain('能量');
    expect(page.html).toContain('信息');
    expect(page.html).toContain('制度');
    expect(page.html).toContain('貨幣');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html.match(/class="civ-figure"/g)).toHaveLength(10);
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toMatch(REDLINE);
    expect(heritageBlocked(page.html)).toBe(false);
    for (const stage of CHRONICLE_STAGES) {
      const start = page.html.indexOf(`id="stage-${stage.n}"`);
      expect(start).toBeGreaterThan(-1);
      const end = stage.n < 10 ? page.html.indexOf(`id="stage-${stage.n + 1}"`) : page.html.indexOf('四線總結');
      const section = page.html.slice(start, end);
      expect(section).toContain(stage.name);
      expect(section).toContain(stage.prose.slice(0, 12));
      expect(section).toContain('class="civ-figure"');
      expect(section).toContain(`src="/static/civilization/civ-stage-${stage.n}-cover-640w.webp"`);
      expect(section).toContain(`civ-stage-${stage.n}-cover-400w.webp 400w`);
      expect(section).toContain(`civ-stage-${stage.n}-cover-1280w.webp 1280w`);
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
      if (stage.origins) expect(section).toContain('href="/civilization/origins/"');
      else expect(section).not.toContain('/civilization/origins/');
      const blocks = milestoneBlocksFor(stage.n);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      for (const [index, block] of blocks.entries()) {
        const anchor = milestoneBlockAnchor(stage.n, block, index);
        expect(section).toContain(`<details class="milestone-block" id="${anchor}" data-stage="${stage.n}" open>`);
        const blockAt = section.indexOf(`id="${anchor}"`);
        const blockEnd = section.indexOf('</details>', blockAt);
        expect(blockEnd).toBeGreaterThan(blockAt);
        const body = section.slice(blockAt, blockEnd);
        expect(body).toContain('里程碑深讀 · 產物與推動力');
        expect(body).toContain(`<summary>`);
        expect(body).toContain(`>${block.event}<`);
        for (const heading of ['界定事件', '關鍵產物', '推動力', '溫和影響']) {
          expect(body).toContain(`<h3 class="milestone-h">${heading}</h3>`);
        }
        expect(body).toContain(block.eventDetail.slice(0, 12));
        for (const product of block.products) {
          expect(body).toContain(`<span class="product-kind">${product.kind}</span>`);
          expect(body).toContain(`<strong>${product.name}</strong>：${product.detail}`);
        }
        for (const driver of block.drivers) {
          expect(body).toContain(`<strong>${driver.name}</strong>：${driver.detail}`);
        }
        expect(body).toContain(block.impact);
        for (const line of block.lines) expect(body).toContain(`>${line}<`);
        expect(body).toContain('class="milestone-frame"');
        expect(body).toContain('class="milestone-seal"');
        if (block.image) {
          expect(body).toContain(`src="/static/civilization/${block.image}-640w.webp"`);
          expect(body).toContain(`${block.image}-400w.webp 400w`);
          expect(body).toContain(`${block.image}-1280w.webp 1280w`);
          expect(body).toContain('onerror="this.hidden=true"');
          const figure = body.match(/<figure class="milestone-figure"[\s\S]*?<\/figure>/)?.[0] ?? '';
          expect(figure).toContain('· 示意 · 約數');
          expect(figure).not.toContain('紙感佔位');
          for (const width of [1280, 640, 400]) {
            const file = `public/static/civilization/${block.image}-${width}w.webp`;
            expect(existsSync(file), file).toBe(true);
            expect(statSync(file).size, file).toBeGreaterThan(10_000);
          }
        }
        expect(body).not.toMatch(REDLINE);
      }
    }
    expect(page.html).toContain('https://iho.asu.edu/');
    expect(page.html).toContain('https://whc.unesco.org/en/list/1405/');
    expect(page.html).toContain('http://www.cnm.com.cn/');
    expect(page.html).toContain('https://home.cern/science/computing/the-birth-of-the-web/short-history-web/');
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect([...CHRONICLE_STAGES.map((stage) => stage.short)].every((name) => [...name].length <= 6 && [...name].length > 0)).toBe(true);
    expect(page.html).not.toContain('/civilization/cosmos/');
    expect(page.html).not.toContain('#cosmo-');
  });

  it('keeps milestone product/driver blocks data-driven, thick, and inside the red lines', () => {
    expect(chronicleStagesOrdered().map((stage) => stage.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const anchors = new Set<string>();
    for (let n = 1; n <= 10; n += 1) {
      const blocks = milestoneBlocksFor(n);
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      expect(cjkChars(milestoneBlockProse(n))).toBeGreaterThanOrEqual(300);
      for (const [index, block] of blocks.entries()) {
        const anchor = milestoneBlockAnchor(n, block, index);
        expect(anchor).toMatch(new RegExp(`^stage-${n}-[a-z0-9-]+$`));
        expect(anchors.has(anchor)).toBe(false);
        anchors.add(anchor);
        expect(block.event.length).toBeGreaterThan(0);
        expect(block.eventDetail.length).toBeGreaterThan(0);
        expect(block.products.length).toBeGreaterThanOrEqual(2);
        expect(block.drivers.length).toBeGreaterThanOrEqual(2);
        expect(block.impact.length).toBeGreaterThan(0);
        for (const product of block.products) expect(['技術', '制度', '媒介']).toContain(product.kind);
        for (const line of block.lines) expect(['能量', '信息', '制度', '貨幣']).toContain(line);
        const all = [block.event, block.eventDetail, block.impact, ...block.products.flatMap((p) => [p.name, p.detail]), ...block.drivers.flatMap((d) => [d.name, d.detail])].join('');
        expect(all).not.toMatch(BLOCKED);
        expect(all).not.toMatch(REDLINE);
      }
    }
    expect(Object.keys(CHRONICLE_MILESTONE_BLOCKS).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(cjkChars(chronicleProse())).toBeGreaterThanOrEqual(4000);
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('.milestone-block {');
    expect(css).toContain('.milestone-block[open] summary::after');
    expect(css).toContain('html.dark .milestone-block');
    expect(css).toContain('#161c24');
    const page = renderChroniclePage();
    expect(page.html.match(/class="milestone-block"/g)).toHaveLength(10);
    expect(page.html).toContain('id="stage-1-product"');
    expect(page.html).toContain('id="stage-10-product"');
  });

  it('publishes an indexable ten-stage cosmos page and hands off to origins', () => {
    const page = renderCosmosPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('宇宙長河・深時間');
    expect(page.html).toContain('class="cosmo-hero"');
    expect(page.html).toContain('class="cosmo-starmap"');
    expect(page.html).toContain('role="navigation"');
    expect(page.html).toContain('aria-label="宇宙長河十階段"');
    expect(page.html).toContain('class="cosmo-scale-nest"');
    expect(page.html).toContain('class="chronicle-nav cosmo-nav cosmo-nav-chips"');
    expect(page.html).toContain('src="/static/civilization/cosmo-starmap-640w.webp"');
    expect(page.html).toContain('cosmo-starmap-400w.webp 400w');
    expect(page.html).toContain('cosmo-starmap-1280w.webp 1280w');
    expect(page.html).toContain('src="/static/civilization/cosmo-scale-nest-640w.webp"');
    expect(page.html).toContain('cosmo-scale-nest-400w.webp 400w');
    expect(page.html).toContain('cosmo-scale-nest-1280w.webp 1280w');
    expect(page.html).not.toContain('/static/civilization/cosmo-scale-640w.webp');
    expect(page.html).not.toContain('/civilization/starmap/');
    expect(page.html).toContain('數字為約數，採主流綜述');
    expect(page.html).toContain('--x:12.1%');
    expect(page.html).toContain('--y:52.5%');
    expect(page.html).toContain('--x:87.2%');
    expect(page.html).toContain('--y:35.4%');
    for (const [name, size] of [
      ['可觀測宇宙', '約 930 億光年'],
      ['宇宙網', '約數億光年'],
      ['本星系群', '約 1000 萬光年'],
      ['銀河系', '約 10 萬光年'],
      ['日球層', '約 120 天文單位'],
      ['地月系統', '約 38.4 萬公里'],
      ['地球', '約 1.27 萬公里'],
    ]) {
      expect(page.html).toContain(name);
      expect(page.html).toContain(size);
    }
    const heroAt = page.html.indexOf('class="cosmo-hero"');
    const mapAt = page.html.indexOf('class="cosmo-starmap"');
    const nestAt = page.html.indexOf('class="cosmo-scale-nest"');
    const chipsAt = page.html.indexOf('class="chronicle-nav cosmo-nav');
    const stageAt = page.html.indexOf('id="cosmo-1"');
    const handoffAt = page.html.indexOf('交接人類起源');
    expect(heroAt).toBeLessThan(mapAt);
    expect(mapAt).toBeLessThan(chipsAt);
    expect(chipsAt).toBeLessThan(stageAt);
    expect(page.html.indexOf('id="cosmo-10"')).toBeLessThan(nestAt);
    expect(nestAt).toBeLessThan(handoffAt);
    expect(existsSync('public/static/civilization/cosmo-starmap-1280w.webp')).toBe(true);
    expect(existsSync('public/static/civilization/cosmo-starmap-640w.webp')).toBe(true);
    expect(existsSync('public/static/civilization/cosmo-starmap-400w.webp')).toBe(true);
    expect(existsSync('public/static/civilization/cosmo-scale-nest-1280w.webp')).toBe(true);
    expect(existsSync('public/static/civilization/cosmo-scale-nest-640w.webp')).toBe(true);
    expect(existsSync('public/static/civilization/cosmo-scale-nest-400w.webp')).toBe(true);
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('.cosmo-starmap-figure {\n  position: relative;\n  min-width: 560px;');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('aspect-ratio: 16 / 9');
    expect(css).toContain('.cosmo-scale-frame');
    expect(css).toContain('padding-bottom: 56.25%');
    expect(css).toContain('object-fit: contain');
    expect(css).not.toContain('max-height: min(52vh, 360px)');
    expect(page.html).toContain('class="cosmo-scale-frame"');
    expect(page.html).not.toContain('sizes="(max-width: 640px) 100vw, 640px"');
    expect(css).toContain('.cosmo-star-link,\n  .cosmo-star-dot,\n  .cosmo-scale-levels li { animation: none; transition: none; }');
    const jump = readFileSync('public/columns.js', 'utf8');
    expect(jump).toContain('.cosmo-starmap');
    expect(jump).toContain('prefers-reduced-motion: reduce');
    expect(jump).toContain('scrollIntoView');
    expect(page.html).toContain('href="/civilization/"');
    expect(page.html).toContain('href="/civilization/earth/"');
    expect(page.html).toContain('href="/civilization/origins/"');
    expect(page.html).toContain('href="/civilization/chronicle/"');
    expect(page.html).toContain('交接地球生命');
    expect(page.html).toContain('約七百萬年前，演化進入人族階段');
    expect(page.html).toContain('已铺就宜居地球');
    expect(page.html).toContain('假說並存');
    expect(page.html).toContain('能量');
    expect(page.html).toContain('物質');
    expect(page.html).toContain('信息');
    expect(page.html).not.toContain('>制度<');
    expect(page.html).not.toContain('>貨幣<');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html).not.toContain('pagead2.googlesyndication.com');
    expect(page.html.match(/class="civ-figure"/g)).toHaveLength(10);
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect(page.html).toContain('https://science.nasa.gov/universe/overview/');
    expect(page.html).toContain('https://www.esa.int/Science_Exploration/Space_Science/Cosmic_eras');
    expect(page.html).toContain('https://www.nao.cas.cn/ncb/kx/');
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toMatch(REDLINE);
    expect(heritageBlocked(page.html)).toBe(false);
    expect([...COSMOS_STAGES.map((stage) => stage.short)].every((name) => [...name].length <= 6 && [...name].length > 0)).toBe(true);
    for (const stage of COSMOS_STAGES) {
      const start = page.html.indexOf(`id="cosmo-${stage.n}"`);
      expect(start).toBeGreaterThan(-1);
      const end = stage.n < 10 ? page.html.indexOf(`id="cosmo-${stage.n + 1}"`) : page.html.indexOf('交接人類起源');
      const section = page.html.slice(start, end);
      expect(section).toContain(stage.name);
      expect(section).toContain(stage.prose.slice(0, 12));
      expect(section).toContain('class="civ-figure"');
      expect(section).toContain(`src="/static/civilization/cosmo-stage-${stage.n}-cover-640w.webp"`);
      expect(section).toContain(`cosmo-stage-${stage.n}-cover-400w.webp 400w`);
      expect(section).toContain(`cosmo-stage-${stage.n}-cover-1280w.webp 1280w`);
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
      expect(existsSync(`public/static/civilization/cosmo-stage-${stage.n}-cover-1280w.webp`), `cosmo ${stage.n} 1280`).toBe(true);
      expect(existsSync(`public/static/civilization/cosmo-stage-${stage.n}-cover-640w.webp`), `cosmo ${stage.n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/cosmo-stage-${stage.n}-cover-400w.webp`), `cosmo ${stage.n} 400`).toBe(true);
      expect(section).not.toContain('/civilization/chronicle/');
      for (const line of stage.lines) expect(section).toContain(`>${line}<`);
    }
    const seal = css.slice(css.indexOf('.cosmo-stage .stage-seal'), css.indexOf('.stage-cover[data-stage="1"]'));
    expect(seal).toContain('visibility: hidden');
    expect(seal).toContain('.cosmo-stage .stage-frame:has(img[hidden]) .stage-seal');
    expect(seal).toContain('visibility: visible');
    expect(seal).not.toContain('.stage-card .stage-seal');
    const handoff = page.html.slice(page.html.indexOf('交接人類起源'));
    expect(handoff.indexOf('href="/civilization/origins/"')).toBeLessThan(handoff.indexOf('<h2>來源</h2>'));
    expect(handoff).toContain('https://science.nasa.gov/solar-system/solar-system-facts/');
  });

  it('publishes an indexable earth-life page with a thick Jurassic section', () => {
    expect(cjkChars(earthProse())).toBeGreaterThanOrEqual(1200);
    expect(earthIndexable()).toBe(true);
    expect(EARTH_STAGES).toHaveLength(8);
    expect([...EARTH_STAGES.map((stage) => stage.short)].every((name) => [...name].length <= 6 && [...name].length > 0)).toBe(true);
    const jurassic = EARTH_STAGES.find((stage) => stage.name === '侏羅紀');
    expect(jurassic).toBeTruthy();
    expect(cjkChars(earthStageText(jurassic!))).toBeGreaterThanOrEqual(600);
    const page = renderEarthPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('地球生命・深時間');
    expect(page.html).toContain('class="earth-hero"');
    expect(page.html).toContain('href="/civilization/cosmos/"');
    expect(page.html).toContain('href="/civilization/origins/"');
    expect(page.html).toContain('href="/civilization/"');
    expect(page.html).not.toContain('/civilization/starmap/');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html).not.toContain('pagead2.googlesyndication.com');
    expect(page.html.match(/class="civ-figure"/g)).toHaveLength(8);
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect(page.html).toContain('https://stratigraphy.org/chart');
    expect(page.html).toContain('https://ucmp.berkeley.edu/mesozoic/jurassic/jurassic.php');
    expect(page.html).toContain('https://www.nigpas.cas.cn/');
    expect(page.html).toContain('約／主流綜述');
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toMatch(REDLINE);
    expect(heritageBlocked(page.html)).toBe(false);
    const start = page.html.indexOf('id="earth-5"');
    const end = page.html.indexOf('id="earth-6"');
    expect(start).toBeGreaterThan(page.html.indexOf('id="earth-4"'));
    expect(end).toBeGreaterThan(start);
    const section = page.html.slice(start, end);
    expect(section).toContain('侏羅紀');
    expect(section).toContain('id="earth-5-env"');
    expect(section).toContain('id="earth-5-life"');
    expect(section).toContain('id="earth-5-product"');
    expect(section).toContain('id="earth-5-driver"');
    expect(section).toContain('id="jurassic"');
    expect(section).toContain('class="civ-block-seal"');
    expect(section).toContain('>界定事件<');
    expect(section).toContain('>關鍵產物<');
    expect(section).toContain('>溫和影響<');
    expect(section).toContain('>環境<');
    expect(section).toContain('>優勢類群<');
    expect(section).toContain('>產物<');
    expect(section).toContain('>推動力<');
    expect(section).toContain('羽毛');
    expect(section).toContain('翼膜');
    expect(section).toContain('板塊');
    expect(section).toContain('class="civ-figure"');
    expect(section).toContain('src="/static/civilization/earth-stage-5-cover-640w.webp"');
    expect(section).toContain('侏羅紀：溫和示意，年代為約數');
    expect(section).toContain('侏羅紀 · 示意 · 約數');
    expect(section).toContain('onerror="this.hidden=true"');
    expect(cjkChars(section)).toBeGreaterThanOrEqual(600);
    const stageFigures = [...page.html.matchAll(/<figure class="civ-figure"[\s\S]*?<\/figure>/g)].map((match) => match[0]);
    expect(stageFigures).toHaveLength(8);
    for (const figure of stageFigures) {
      expect(figure).toContain('：溫和示意，年代為約數');
      expect(figure).toContain('· 示意 · 約數');
      expect(figure).not.toContain('紙感佔位');
    }
    expect(page.html).not.toContain('階段圖現為紙感佔位');
    for (const stage of EARTH_STAGES) {
      expect(page.html).toContain(`id="earth-${stage.n}"`);
      expect(page.html).toContain(`id="earth-${stage.n}-reading"`);
      expect(page.html).toContain(`src="/static/civilization/earth-stage-${stage.n}-cover-640w.webp"`);
      expect(page.html).toContain(`src="/static/civilization/earth-stage-${stage.n}-product-640w.webp"`);
      expect(page.html).toContain(`earth-stage-${stage.n}-product-400w.webp 400w`);
      expect(page.html).toContain(`earth-stage-${stage.n}-product-1280w.webp 1280w`);
      expect(existsSync(`public/static/civilization/earth-stage-${stage.n}-cover-1280w.webp`), `earth ${stage.n} 1280`).toBe(true);
      expect(statSync(`public/static/civilization/earth-stage-${stage.n}-cover-640w.webp`).size, `earth ${stage.n} 640`).toBeGreaterThan(10_000);
      expect(existsSync(`public/static/civilization/earth-stage-${stage.n}-cover-640w.webp`), `earth ${stage.n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/earth-stage-${stage.n}-cover-400w.webp`), `earth ${stage.n} 400`).toBe(true);
      for (const width of [1280, 640, 400]) {
        const file = `public/static/civilization/earth-stage-${stage.n}-product-${width}w.webp`;
        expect(existsSync(file), file).toBe(true);
        expect(statSync(file).size, file).toBeGreaterThan(10_000);
      }
    }
    const productFigures = [...page.html.matchAll(/<figure class="civ-block-figure"[\s\S]*?<\/figure>/g)].map((match) => match[0]);
    expect(productFigures).toHaveLength(8);
    for (const figure of productFigures) {
      expect(figure).toContain('-product-640w.webp');
      expect(figure).toContain('· 示意 · 約數');
      expect(figure).not.toContain('紙感佔位');
    }
    expect(page.html).not.toContain('紙感佔位');
    const triassic = page.html.slice(page.html.indexOf('id="earth-4"'), page.html.indexOf('id="earth-5"'));
    const cretaceous = page.html.slice(page.html.indexOf('id="earth-6"'), page.html.indexOf('id="earth-7"'));
    expect(triassic).toContain('三疊紀');
    expect(triassic).toContain('>產物<');
    expect(triassic).toContain('>推動力<');
    expect(cretaceous).toContain('白堊紀');
    expect(cretaceous).toContain('>產物<');
    expect(cretaceous).toContain('>推動力<');
    expect(cjkChars(triassic)).toBeGreaterThanOrEqual(280);
    expect(cjkChars(cretaceous)).toBeGreaterThanOrEqual(280);
    const handoff = page.html.slice(page.html.indexOf('交接人類起源'));
    expect(handoff.indexOf('href="/civilization/cosmos/"')).toBeLessThan(handoff.indexOf('<h2>來源</h2>'));
    expect(handoff.indexOf('href="/civilization/origins/"')).toBeLessThan(handoff.indexOf('<h2>來源</h2>'));
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('.earth-hero');
    expect(css).toContain('#161c24');
    expect(css).toContain('.earth-stage .stage-frame:has(img[hidden]) .stage-seal');
    expect(page.html).toContain('href="#jurassic"');
    for (const stage of EARTH_STAGES) {
      expect(page.html).toContain(`id="earth-${stage.n}-product"`);
      expect(page.html).toContain(`id="earth-${stage.n}-driver"`);
    }
    const route = readFileSync('functions/civilization/[[path]].ts', 'utf8');
    expect(route).toContain('export const PAGES');
    expect(route).not.toContain("rest === 'earth'");
    const spine = readFileSync('shared/civilization/spine.ts', 'utf8');
    expect(spine).toContain('export const SPINE');
    expect(spine).toContain("label: '地球'");
    expect(readFileSync('shared/civilizationPage.ts', 'utf8')).toContain('renderSpineAxis');
    expect(readFileSync('shared/civilization/blocks.ts', 'utf8')).toContain('cover: string | null');
    expect(readFileSync('shared/civilization/chronicle.ts', 'utf8')).toContain('milestoneBlock');
  });

  it('publishes an indexable ten-stage tech page and hands off to the chronicle', () => {
    const page = renderTechPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('科技與發現');
    expect(page.html).toContain('class="tech-hero"');
    expect(page.html).toContain('href="/civilization/"');
    expect(page.html).toContain('href="/civilization/origins/"');
    expect(page.html).toContain('href="/civilization/chronicle/"');
    expect(page.html).toContain('href="/civilization/city/"');
    expect(page.html).toContain('href="/#slice"');
    expect(page.html).toContain('工具');
    expect(page.html).toContain('能源');
    expect(page.html).toContain('媒介');
    expect(page.html).toContain('知識');
    expect(page.html).not.toContain('>制度<');
    expect(page.html).not.toContain('>貨幣<');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html).not.toContain('pagead2.googlesyndication.com');
    expect(page.html.match(/class="civ-figure"/g)).toHaveLength(10);
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect(page.html).toContain('src="/static/civilization/node-tech-v1.jpg"');
    expect(page.html).toContain('https://humanorigins.si.edu/evidence/behavior/stone-tools');
    expect(page.html).toContain('https://home.cern/science/computing/the-birth-of-the-web/short-history-web/');
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toMatch(REDLINE);
    expect(heritageBlocked(page.html)).toBe(false);
    expect([...TECH_STAGES.map((stage) => stage.short)].every((name) => [...name].length <= 6 && [...name].length > 0)).toBe(true);
    for (const stage of TECH_STAGES) {
      const start = page.html.indexOf(`id="tech-${stage.n}"`);
      expect(start).toBeGreaterThan(-1);
      const end = stage.n < 10 ? page.html.indexOf(`id="tech-${stage.n + 1}"`) : page.html.indexOf('交接編年與今日');
      const section = page.html.slice(start, end);
      expect(section).toContain(stage.name);
      expect(section).toContain(stage.prose.slice(0, 12));
      expect(section).toContain('class="civ-figure"');
      expect(section).toContain(`src="/static/civilization/tech-stage-${stage.n}-cover-640w.webp"`);
      expect(section).toContain(`tech-stage-${stage.n}-cover-400w.webp 400w`);
      expect(section).toContain(`tech-stage-${stage.n}-cover-1280w.webp 1280w`);
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
      expect(existsSync(`public/static/civilization/tech-stage-${stage.n}-cover-1280w.webp`), `tech ${stage.n} 1280`).toBe(true);
      expect(existsSync(`public/static/civilization/tech-stage-${stage.n}-cover-640w.webp`), `tech ${stage.n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/tech-stage-${stage.n}-cover-400w.webp`), `tech ${stage.n} 400`).toBe(true);
      for (const line of stage.lines) expect(section).toContain(`>${line}<`);
      if (stage.origins) expect(section).toContain('href="/civilization/origins/"');
      if (stage.chronicle) expect(section).toContain(`href="/civilization/chronicle/#stage-${stage.chronicle}"`);
    }
    const handoff = page.html.slice(page.html.indexOf('交接編年與今日'));
    expect(handoff.indexOf('href="/civilization/chronicle/"')).toBeLessThan(handoff.indexOf('<h2>來源</h2>'));
    expect(handoff).toContain('href="/civilization/city/"');
  });

  it('publishes an indexable city page with global stages and local landmark anchors', () => {
    const page = renderCityPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('城市・基建・民生');
    expect(page.html).toContain('class="city-hero"');
    expect(page.html).toContain('href="/civilization/"');
    expect(page.html).toContain('href="/civilization/tech/"');
    expect(page.html).toContain('href="/civilization/chronicle/"');
    expect(page.html).toContain('href="/hk/landmarks/"');
    expect(page.html).toContain('href="/hk/landmarks/science-museum/"');
    expect(page.html).toContain('href="/hk/landmarks/space-museum/"');
    expect(page.html).toContain('href="/hk/landmarks/city-hall/"');
    expect(page.html).toContain('href="/on-this-day/"');
    expect(page.html).toContain('聚落');
    expect(page.html).toContain('工程');
    expect(page.html).toContain('交通');
    expect(page.html).toContain('民生');
    expect(page.html).not.toContain('adsbygoogle');
    expect(page.html).not.toContain('pagead2.googlesyndication.com');
    expect(page.html.match(/class="civ-figure"/g)).toHaveLength(10);
    expect(page.html.match(/AI 整合/g)).toHaveLength(1);
    expect(page.html).toContain('src="/static/civilization/node-city-v1.jpg"');
    expect(page.html).toContain('https://whc.unesco.org/en/list/1405/');
    expect(page.html).toContain('https://whc.unesco.org/en/list/344/');
    expect(page.html).not.toMatch(BLOCKED);
    expect(page.html).not.toMatch(REDLINE);
    expect(heritageBlocked(page.html)).toBe(false);
    expect([...CITY_STAGES.map((stage) => stage.short)].every((name) => [...name].length <= 6 && [...name].length > 0)).toBe(true);
    const local = page.html.indexOf('id="city-9"');
    expect(local).toBeGreaterThan(page.html.indexOf('id="city-1"'));
    expect(page.html.indexOf('定居與聚落')).toBeLessThan(local);
    const localSection = page.html.slice(local, page.html.indexOf('id="city-10"'));
    expect(localSection).toContain('href="/hk/landmarks/"');
    expect(localSection).toContain('香港大會堂');
    for (const stage of CITY_STAGES) {
      const start = page.html.indexOf(`id="city-${stage.n}"`);
      expect(start).toBeGreaterThan(-1);
      const end = stage.n < 10 ? page.html.indexOf(`id="city-${stage.n + 1}"`) : page.html.indexOf('交接編年與本地案例');
      const section = page.html.slice(start, end);
      expect(section).toContain(stage.name);
      expect(section).toContain(stage.prose.slice(0, 12));
      expect(section).toContain('class="civ-figure"');
      expect(section).toContain(`src="/static/civilization/city-stage-${stage.n}-cover-640w.webp"`);
      expect(section).toContain(`city-stage-${stage.n}-cover-400w.webp 400w`);
      expect(section).toContain(`city-stage-${stage.n}-cover-1280w.webp 1280w`);
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
      expect(existsSync(`public/static/civilization/city-stage-${stage.n}-cover-1280w.webp`), `city ${stage.n} 1280`).toBe(true);
      expect(existsSync(`public/static/civilization/city-stage-${stage.n}-cover-640w.webp`), `city ${stage.n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/city-stage-${stage.n}-cover-400w.webp`), `city ${stage.n} 400`).toBe(true);
      for (const line of stage.lines) expect(section).toContain(`>${line}<`);
    }
    expect(page.html.indexOf('id="city-9"')).toBeGreaterThan(page.html.indexOf('id="city-8"'));
    const handoff = page.html.slice(page.html.indexOf('交接編年與本地案例'));
    expect(handoff.indexOf('href="/hk/landmarks/"')).toBeLessThan(handoff.indexOf('<h2>來源</h2>'));
    expect(handoff).toContain('href="/civilization/tech/"');
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
    const axis = html.slice(html.indexOf('class="milestones"'), html.indexOf('class="chronicle-strip"'));
    expect(axis.match(/class="axis-node/g)).toHaveLength(6);
    expect(axis.indexOf('>宇宙<')).toBeGreaterThan(-1);
    expect(axis.indexOf('>宇宙<')).toBeLessThan(axis.indexOf('>地球<'));
    expect(axis.indexOf('>地球<')).toBeLessThan(axis.indexOf('>起源<'));
    expect(axis).toContain('href="/civilization/cosmos/"');
    expect(axis).toContain('href="/civilization/earth/"');
    expect(axis).toContain('>起源<');
    expect(axis).toContain('href="/civilization/tech/"');
    expect(axis).toContain('>技術<');
    expect(axis).toContain('href="/civilization/city/"');
    expect(axis).toContain('>城市<');
    expect(axis).not.toContain('href="/hk/landmarks/"');
    expect(axis).toContain('>今天<');
    const strip = html.slice(html.indexOf('class="chronicle-strip"'), html.indexOf('class="today-pin"'));
    expect(html.indexOf('class="chronicle-strip"')).toBeGreaterThan(html.indexOf('id="civ"'));
    expect(html.indexOf('class="chronicle-strip"')).toBeLessThan(html.indexOf('今日落點'));
    expect(strip.match(/class="stage-dot"/g)).toHaveLength(10);
    expect(strip).not.toContain('<img');
    expect(strip).toContain('>01<');
    expect(strip).toContain('>10<');
    expect(strip).toContain('href="/civilization/chronicle/#stage-1"');
    expect(strip).toContain('href="/civilization/chronicle/#stage-10"');
    expect(strip).not.toContain('/civilization/cosmos/');
    expect(strip).not.toContain('/civilization/earth/');
    expect(strip).not.toContain('#cosmo-');
    expect(strip).not.toContain('#earth-');
    expect(strip).not.toMatch(REDLINE);
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

  it('adds restrained stage reveal classes without hiding the first plate', () => {
    const pages = [
      { html: renderEarthPage().html, first: 'id="earth-1"', count: 8 },
      { html: renderCosmosPage().html, first: 'id="cosmo-1"', count: 10 },
      { html: renderChroniclePage().html, first: 'id="stage-1"', count: 10 },
      { html: renderTechPage().html, first: 'id="tech-1"', count: 10 },
      { html: renderCityPage().html, first: 'id="city-1"', count: 10 },
    ];
    for (const page of pages) {
      const classNames = [...page.html.matchAll(/class="([^"]*)"/g)].map((match) => match[1]);
      const reveals = classNames.filter((name) => name.split(/\s+/).includes('civ-reveal'));
      expect(reveals).toHaveLength(page.count);
      expect(reveals.filter((name) => name.split(/\s+/).includes('civ-reveal--above-fold') && name.split(/\s+/).includes('is-inview'))).toHaveLength(1);
      expect(page.html).toContain('class="civ-progress"');
      expect(page.html).toContain('classList.add("civ-motion")');
      expect(page.html).toContain('data-civ-motion');
      const firstAt = page.html.indexOf(page.first);
      const open = page.html.lastIndexOf('<section', firstAt);
      const first = page.html.slice(open, page.html.indexOf('>', firstAt));
      expect(first).toContain('civ-reveal--above-fold');
      expect(first).toContain('is-inview');
    }
    const earth = renderEarthPage().html;
    const jurassic = earth.slice(earth.indexOf('id="earth-5"'), earth.indexOf('id="earth-6"'));
    expect(jurassic).toContain('id="jurassic"');
    expect(jurassic).toContain(' civ-reveal"');
    expect(jurassic).not.toContain('civ-reveal--above-fold');
    expect(jurassic).not.toContain('is-inview');
    const css = readFileSync('src/App.css', 'utf8');
    const motion = css.slice(css.indexOf('Civilization axis motion'));
    expect(motion).toContain('html.civ-motion body:not(.static) .civ-reveal:not(.is-inview):not(.civ-reveal--above-fold)');
    expect(motion).toContain('scroll-margin-top: 136px');
    expect(motion).toContain('#jurassic');
    expect(motion).toContain('body.static .civ-reveal');
    expect(motion).toContain('opacity: 1');
    expect(motion).toContain('animation: none');
    expect(motion).toContain('scaleX(var(--civ-progress, 0))');
    expect(motion).toContain('height: 2px');
    expect(motion).toContain('position: static');
    expect(motion).toContain('.civ-page .stage-frame img');
    expect(motion).toContain('animation: none');
    expect(motion).not.toContain('img-ken');
    expect(motion).not.toContain('animation-timeline');
    expect(motion).not.toContain('position: sticky');
    expect(motion).not.toContain('paper-texture');
    expect(css).not.toContain('scroll-margin-top: 12px');
    const js = readFileSync('public/columns.js', 'utf8');
    expect(js).toContain('function motionReduced()');
    expect(js).toContain('IntersectionObserver');
    expect(js).toContain('rootMargin: \'0px 0px -10% 0px\'');
    expect(js).toContain('if (!entry.isIntersecting) return;');
    expect(js).toContain('--civ-progress');
    expect(js).toContain('aria-current');
    expect(js).toContain('data-civ-motion');
    expect(js).toContain('.cosmo-starmap');
    expect(js).toContain('prefers-reduced-motion: reduce');
    expect(js).toContain('scrollIntoView');
    expect(js).toContain('body.classList.contains(\'static\')');
    expect(js).not.toContain('lenis');
    expect(js).not.toContain('scroll-behavior');
    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg).not.toMatch(/gsap|lenis|lottie|three|animejs|motion/i);
  });
});

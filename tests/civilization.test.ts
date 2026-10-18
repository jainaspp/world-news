import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';
import { cjkChars } from '../shared/contentPage';
import { coordinateChipHtml, renderCivilizationSlice } from '../shared/civilization/renderSlice';
import { CHRONICLE_STAGES, chronicleCardMilestones } from '../shared/civilization/chronicle';
import { CITY_STAGES } from '../shared/civilization/city';
import { COSMOS_STAGES } from '../shared/civilization/cosmos';
import { TECH_STAGES } from '../shared/civilization/tech';
import {
  chronicleIndexable,
  chronicleProse,
  cityIndexable,
  cityProse,
  civilizationPublicPaths,
  cosmosIndexable,
  cosmosProse,
  hubIndexable,
  hubProse,
  originsIndexable,
  originsProse,
  renderChroniclePage,
  renderCityPage,
  renderCivilizationHub,
  renderCivilizationMiss,
  renderCosmosPage,
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
      '/civilization/origins/',
      '/civilization/tech/',
      '/civilization/city/',
      '/civilization/chronicle/',
    ]);
    const xml = staticSitemapXml();
    expect(xml).toContain('https://world-news.xyz/civilization/</loc>');
    expect(xml).toContain('https://world-news.xyz/civilization/cosmos/</loc>');
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
    const cosmosReturn = page.html.indexOf('更早的深時間：宇宙長河');
    expect(page.html).toContain('href="/civilization/cosmos/"');
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
    expect(techCard).toContain('科技與發現');
    const cityCard = aside.slice(aside.indexOf('href="/civilization/city/"'));
    expect(cityCard).toContain('src="/static/civilization/node-city-v1.jpg"');
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
    expect(hub.html.match(/class="stage-card"/g)).toHaveLength(10);
    expect(hub.html.indexOf('class="deep-time"')).toBeLessThan(hub.html.indexOf('class="chronicle-board"'));
    expect(hub.html.indexOf('class="chronicle-board"')).toBeLessThan(hub.html.indexOf('class="civ-article"'));
    const deep = hub.html.slice(hub.html.indexOf('class="deep-time"'), hub.html.indexOf('class="chronicle-board"'));
    expect(deep.indexOf('href="/civilization/cosmos/"')).toBeLessThan(deep.indexOf('href="/civilization/origins/"'));
    expect(deep).toContain('閱讀宇宙長河');
    expect(deep).toContain('src="/static/civilization/cosmo-stage-1-cover-640w.webp"');
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
      expect(existsSync(`public/static/civilization/civ-stage-${n}-cover-640w.webp`), `stage ${n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/civ-stage-${n}-cover-400w.webp`), `stage ${n} 400`).toBe(true);
      expect(hub.html).toContain(`src="/static/civilization/civ-stage-${n}-cover-640w.webp"`);
      expect(hub.html).toContain(`civ-stage-${n}-cover-400w.webp 400w`);
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
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
      if (stage.origins) expect(section).toContain('href="/civilization/origins/"');
      else expect(section).not.toContain('/civilization/origins/');
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

  it('publishes an indexable ten-stage cosmos page and hands off to origins', () => {
    const page = renderCosmosPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('index,follow');
    expect(page.html).toContain('宇宙長河・深時間');
    expect(page.html).toContain('class="cosmo-hero"');
    expect(page.html).toContain('href="/civilization/"');
    expect(page.html).toContain('href="/civilization/origins/"');
    expect(page.html).toContain('href="/civilization/chronicle/"');
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
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
      expect(existsSync(`public/static/civilization/cosmo-stage-${stage.n}-cover-640w.webp`), `cosmo ${stage.n} 640`).toBe(true);
      expect(existsSync(`public/static/civilization/cosmo-stage-${stage.n}-cover-400w.webp`), `cosmo ${stage.n} 400`).toBe(true);
      expect(section).not.toContain('/civilization/chronicle/');
      for (const line of stage.lines) expect(section).toContain(`>${line}<`);
    }
    const css = readFileSync('src/App.css', 'utf8');
    const seal = css.slice(css.indexOf('.cosmo-stage .stage-seal'), css.indexOf('.stage-cover[data-stage="1"]'));
    expect(seal).toContain('visibility: hidden');
    expect(seal).toContain('.cosmo-stage .stage-frame:has(img[hidden]) .stage-seal');
    expect(seal).toContain('visibility: visible');
    expect(seal).not.toContain('.stage-card .stage-seal');
    const handoff = page.html.slice(page.html.indexOf('交接人類起源'));
    expect(handoff.indexOf('href="/civilization/origins/"')).toBeLessThan(handoff.indexOf('<h2>來源</h2>'));
    expect(handoff).toContain('https://science.nasa.gov/solar-system/solar-system-facts/');
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
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
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
      expect(section).toContain('onerror="this.hidden=true"');
      expect(section).toContain('class="stage-seal"');
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
    expect(axis.match(/class="axis-node/g)).toHaveLength(5);
    expect(axis.indexOf('>宇宙<')).toBeGreaterThan(-1);
    expect(axis.indexOf('>宇宙<')).toBeLessThan(axis.indexOf('>起源<'));
    expect(axis).toContain('href="/civilization/cosmos/"');
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
    expect(strip).not.toContain('#cosmo-');
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
});

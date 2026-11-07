import { siteBrand } from './brand.js';
import { AD_BODY_CHARS, chrome, cjkChars, esc, footer, head, igCard, igCloseCard, igDotsNav, igDotsScript } from './contentPage.js';
import { chronicleCardProse, chronicleIndexable, renderChronicleArticle, renderVolumeCards } from './civilization/chronicle.js';
import { CASE_STUDIES, caseHref, renderCaseAxisLinks } from './civilization/cases.js';
import { PATTERN_CARDS, renderPatternAxisLinks } from './civilization/patterns.js';
import { originsSeedBody, originsSeedSources, placeFigures, realPhotoIndex, renderFutureReading, renderReadingIndex } from './civilization/db/render.js';
import { renderCityArticle, cityIndexable } from './civilization/city.js';
import { cosmosIndexable, renderCosmosArticle } from './civilization/cosmos.js';
import { earthIndexable, renderEarthArticle } from './civilization/earth.js';
import { galaxyIndexable, renderGalaxyArticle } from './civilization/galaxy.js';
import { renderSpineAxis } from './civilization/spine.js';
import { renderTechArticle, techIndexable } from './civilization/tech.js';
import { renderMildMarkdown } from './civilization/markdown.js';
import { renderQuestionIndex } from './civilization/questions.js';
import { renderNearBridge, renderSliceReturns } from './civilization/renderSlice.js';
import { homeFacts, hktMmdd, labelMmdd, type HeritageFact } from './heritage.js';
import { landmarkBySlug } from './heritage.js';
import { renderHeroOpening } from './heroOpening.js';
import { primaryNavHtml } from './primaryNav.js';

export { chronicleIndexable, chronicleProse } from './civilization/chronicle.js';
export { cityIndexable, cityProse } from './civilization/city.js';
export { cosmosIndexable, cosmosProse } from './civilization/cosmos.js';
export { earthIndexable, earthProse } from './civilization/earth.js';
export { galaxyIndexable, galaxyProse } from './civilization/galaxy.js';
export { techIndexable, techProse } from './civilization/tech.js';

const ORIGIN = 'https://world-news.xyz';

/**
 * Head boot for civilization pages. Adds html.civ-motion before first paint so
 * reveal CSS can hide below-fold stages. columns.js sets data-civ-motion once
 * the observer is armed. If that never happens, the timeout removes the class
 * and every stage stays visible. Reduced motion never adds the class.
 */
const CIV_MOTION_BOOT = '<script>try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.classList.add("civ-motion");setTimeout(function(){var root=document.documentElement;if(!root.classList.contains("civ-motion")||root.hasAttribute("data-civ-motion"))return;if(document.querySelector(".civ-reveal:not(.is-inview):not(.civ-reveal--above-fold)"))root.classList.remove("civ-motion")},1500)}}catch(e){}</script>';

const HUB_LEDE = `${siteBrand}把每日新聞放在人類文明的長文旁邊。讀者先讀深時間、技術發現與城市公共生活，再進入今天的標題。遠史只收溫和題材，用來說明今日何以落在這一日。新聞是長文裡的今天，不是整站的皮膚。本頁列出各卷，以及三則可以核對的里程碑。技術與城市已各有長頁。仍未寫厚的層次不另開網址，也不進入網站地圖。`;

export const HUB_MILESTONES: { era: string; title: string; text: string }[] = [
  {
    era: '約 30 萬年前',
    title: '解剖學現代人',
    text: '化石與石器顯示，現代人形態在非洲已可辨認。起源是非洲多區域的長期過程，不是單一洞穴的一日事件。新測年仍可能把節點前移或後移。',
  },
  {
    era: '約 6 至 4.5 萬年前',
    title: '主要走出非洲',
    text: '這一浪潮奠定今日全球現代人分布的主幹。非非洲人群的基因組常見有限的尼安德特來源，部分亞洲與大洋洲人群另見丹尼索瓦人貢獻。個體差異大，精確比例仍有學術爭議。',
  },
  {
    era: '約 1.17 萬年前',
    title: '全新世銜接',
    text: '全新世開始之後，農業、村落與城市基建逐步展開。本站以香港地標和當年今日承接這一段。深時間本身不進入月日卡。',
  },
];

const HUB_READ = '閱讀時按長文的順序：宇宙、銀河、地球生命、人類起源、技術、城市，然後是文明編年的古與今，展望寫在本頁後段。今天的新聞是長文旁邊的標題，入口在今日切片。沒有溫和史對照的電訊不強加年代。宇宙、地球生命、起源、技術與城市都已寫成獨立長頁。展望停在本頁，不另開網址。地球生命頁寫大氧化到侏羅紀、白堊紀與哺乳動物輻射。技術頁記工具、能源、媒介與知識；城市頁記聚落、公共工程與日常公共生活，香港地標只作其中的本地案例。編年以古、今、未來三節連續閱讀。宇宙長河與地球生命都不插進編年正文。';

const HUB_LOCAL = '香港科學館於一九九一年開幕，以常設展覽介紹日常科學與自然現象，可作為城市向公眾講解深時間的節點。香港太空館於一九八〇年開幕，天象廳介紹星空與太陽系，方便把宇宙尺度和人族年表放在一起對照。兩館都是既有地標頁，在科技與發現、城市・基建・民生的長頁裡作為本地錨，而不代替這兩頁。';

export function originsProse(): string {
  return `${originsSeedBody()}\n${originsSeedSources()}`;
}

export function hubProse(): string {
  return [
    HUB_LEDE,
    ...HUB_MILESTONES.flatMap((row) => [row.era, row.title, row.text]),
    HUB_READ,
    HUB_LOCAL,
    chronicleCardProse(),
  ].join('');
}

export function originsIndexable(): boolean {
  return cjkChars(originsProse()) >= AD_BODY_CHARS;
}

export function hubIndexable(): boolean {
  return cjkChars(hubProse()) >= AD_BODY_CHARS && HUB_MILESTONES.length >= 3;
}

/** Thick civilization URLs only. Thin layer stubs stay out. */
export function civilizationPublicPaths(): string[] {
  const paths: string[] = [];
  if (hubIndexable()) paths.push('/civilization/');
  if (cosmosIndexable()) paths.push('/civilization/cosmos/');
  if (galaxyIndexable()) paths.push('/civilization/galaxy/');
  if (earthIndexable()) paths.push('/civilization/earth/');
  if (originsIndexable()) paths.push('/civilization/origins/');
  if (techIndexable()) paths.push('/civilization/tech/');
  if (cityIndexable()) paths.push('/civilization/city/');
  if (chronicleIndexable()) paths.push('/civilization/chronicle/');
  return paths;
}

const CIV = '/static/civilization';

function civImage(options: {
  src: string;
  srcset?: string;
  sizes?: string;
  width: number;
  height: number;
  alt: string;
  eager?: boolean;
}): string {
  const loading = options.eager ? 'eager' : 'lazy';
  const priority = options.eager ? ' fetchpriority="high"' : '';
  const srcset = options.srcset ? ` srcset="${options.srcset}"` : '';
  const sizes = options.sizes ? ` sizes="${options.sizes}"` : '';
  return `<img src="${options.src}"${srcset}${sizes} width="${options.width}" height="${options.height}" alt="${esc(options.alt)}" loading="${loading}"${priority} decoding="async" onerror="this.hidden=true" />`;
}

/** Hide a missing file without a broken-image icon. The slot keeps its paper or ink ground. */
function layerCover(src: string, alt: string, srcset?: string): string {
  return `<div class="layer-cover">${civImage({
    src,
    srcset,
    sizes: '(max-width: 600px) 100vw, 280px',
    width: 640,
    height: 480,
    alt,
  })}</div>`;
}

function originsLayerCover(): string {
  return `<div class="layer-cover"><picture>
    <source media="(min-aspect-ratio: 8/5)" srcset="${CIV}/civ-layer-origins-640x400.webp" type="image/webp" />
    ${civImage({
      src: `${CIV}/civ-layer-origins-640w.webp`,
      srcset: `${CIV}/civ-layer-origins-400w.webp 400w, ${CIV}/civ-layer-origins-640w.webp 640w`,
      sizes: '(max-width: 600px) 100vw, 280px',
      width: 640,
      height: 480,
      alt: '人類起源：深時間溫和示意',
    })}
  </picture></div>`;
}

function hubHero(): string {
  return `<figure class="civ-hub-hero">${civImage({
    src: `${CIV}/overview-hero-v1.jpg`,
    srcset: `${CIV}/civ-hub-hero-640w.webp 640w, ${CIV}/civ-hub-hero-960w.webp 960w, ${CIV}/civ-hub-hero-1200w.webp 1200w`,
    sizes: '(max-width: 960px) 100vw, 812px',
    width: 1280,
    height: 720,
    alt: '人類文明溫和史示意：紙感長河',
    eager: true,
  })}<figcaption>人類文明</figcaption></figure>`;
}

function originsHero(): string {
  return `<figure class="civ-origins-hero">${civImage({
    src: `${CIV}/civ-origins-hero-1200w.webp`,
    srcset: `${CIV}/civ-origins-hero-640w.webp 640w, ${CIV}/civ-origins-hero-960w.webp 960w, ${CIV}/civ-origins-hero-1200w.webp 1200w`,
    sizes: '100vw',
    width: 1200,
    height: 514,
    alt: '深時間：人類起源溫和示意',
    eager: true,
  })}</figure>`;
}

function stageFigure(stage: 1 | 2 | 3, alt: string, caption: string): string {
  const file = `${CIV}/civ-origins-stage${stage}`;
  return `<figure class="civ-figure" data-stage="${stage}">${civImage({
    src: `${file}-800w.webp`,
    srcset: `${file}-640w.webp 640w, ${file}-800w.webp 800w`,
    sizes: '(max-width: 959px) 100vw, 380px',
    width: 800,
    height: 500,
    alt,
  })}<figcaption>${esc(caption)}</figcaption></figure>`;
}

/** Insert after the heading element so its text, and any id, stay the anchor. */
function insertAfterHeading(html: string, level: 1 | 2 | 3, marker: string, insert: string): string {
  const re = new RegExp(`(<h${level}>[^<]*${marker}[^<]*</h${level}>)`);
  const found = re.exec(html);
  if (!found || found.index === undefined) return html;
  const at = found.index + found[0].length;
  return `${html.slice(0, at)}\n${insert}${html.slice(at)}`;
}

function originsArticle(body: string): string {
  let html = body;
  html = insertAfterHeading(html, 1, '人類起源時間線', originsHero());
  html = insertAfterHeading(html, 1, '人類起源時間線', '<p class="deep-time-return"><a href="/civilization/earth/">上一層：地球生命</a><a href="/civilization/cosmos/">更早的深時間：宇宙長河</a></p>');
  html = insertAfterHeading(html, 1, '人類起源時間線', realPhotoIndex('origins'));
  html = insertAfterHeading(html, 3, '一、深層分離', stageFigure(1, '一、深層分離：譜系分叉示意（約 100–30 萬年前）', '深層分離 · 示意 · 約數'));
  html = insertAfterHeading(html, 3, '二、非洲現代人多樣性', stageFigure(2, '二、非洲現代人多樣性：多點柔光示意（約 30–6 萬年前）', '非洲內部多樣 · 示意 · 約數'));
  html = insertAfterHeading(html, 3, '三、全球擴張', stageFigure(3, '三、全球擴張：粒子輻射示意（非遷徙路線、非政治疆界）', '全球擴張 · 示意·非遷徙路線 · 約數'));
  return html;
}

/** Homepage masthead. 「今日切片」is /today/, nested under 地球生物 → 今, not this page. */
export function renderCivNav(topic = false): string {
  void topic;
  return primaryNavHtml('home');
}

/** Plain links into the long-form reading. Replaces the axis, volume cards, and jump lists. */
export function renderReadingLink(level: 'h1' | 'h2' = 'h2'): string {
  const patterns = PATTERN_CARDS.map((card) => `<a href="/civilization/chronicle/#pattern-${card.id}">${esc(card.title)}</a>`).join('、');
  const cases = CASE_STUDIES.map((item) => `<a href="${caseHref(item)}">${esc(item.title)}</a>`).join('、');
  return `<section class="civ-reading-link" aria-label="文明長文">
    <${level}>文明長文</${level}>
    <p>文明記載改以連續文本閱讀。階段軸、卷次跳轉與刻度導覽暫不使用。可從<a href="/civilization/">文明總覽</a>進入各卷，或直接讀<a href="/civilization/chronicle/">文明編年</a>。</p>
    <p>機制文字：${patterns}。</p>
    <p>案例長文：${cases}。</p>
    <p><a href="/learn/">想由基礎立起來？</a></p>
  </section>`;
}

/** Pattern and case chips remain available for older fixtures. The live home no longer mounts them. */
export function renderAxisRails(): string {
  return `<div class="axis-rails" aria-label="模式與案例">${renderPatternAxisLinks()}${renderCaseAxisLinks()}</div>`;
}

export function renderHomeChronicle(): string {
  return `<div class="chronicle-band"><section class="volume-board" aria-label="三卷入口">${renderVolumeCards()}</section></div>`;
}

export function renderAxisBand(options: { primaryHref?: string; primaryLabel?: string; todayHref?: string; asHeading?: boolean; strip?: boolean; rails?: boolean } = {}): string {
  const primaryHref = options.primaryHref ?? '/civilization/';
  const primaryLabel = options.primaryLabel ?? '打開文明總覽';
  const todayHref = options.todayHref ?? '/today/';
  const title = options.asHeading === false
    ? '<p class="axis-title">站在一條很長的時間軸上</p>'
    : '<h1 class="axis-title">站在一條很長的時間軸上</h1>';
  const strip = options.strip ? renderVolumeCards() : '';
  const rails = options.rails === false ? '' : `${renderPatternAxisLinks()}${renderCaseAxisLinks()}`;
  const slim = options.rails === false ? ' axis-slim' : '';
  // N2 sits after the hero. The slim axis box and the eight spine nodes stay as they are.
  return `<section class="axis-hero${slim} motion-fade-rise" id="civ" aria-label="文明軸">
    <div class="axis-vignette" aria-hidden="true"></div>
    <p class="kicker">Human span · 溫和史</p>
    ${title}
    <p class="axis-lede">軸由宇宙走到今天，再望向未來。新聞是軸上的一刀。先看見尺度，再讀今日。</p>
    <div class="deep-axis" aria-label="深時間軸">
      <div class="rail" aria-hidden="true"></div>
      ${renderSpineAxis(todayHref)}
    </div>
    <div class="axis-cta">
      <a class="btn btn-brass" href="${esc(primaryHref)}">${esc(primaryLabel)}</a>
      <a class="btn btn-ghost" href="${esc(todayHref)}">跳到今日切片</a>
    </div>
    ${strip}
    ${rails}
  </section>
  <p class="axis-micro"><a href="/learn/">想由基礎立起來？</a></p>`;
}

function pinFact(fact: HeritageFact): string {
  const place = fact.landmark ? landmarkBySlug(fact.landmark) : undefined;
  const placeNote = place ? ` · ${esc(place.name)}` : '';
  return `<div class="pin-fact">
    <span class="pin-seal"><span class="pin-seal-year">${esc(fact.year)}</span><span class="pin-seal-cat">${esc(fact.category)}</span></span>
    <div>
      <p>${esc(fact.fact)}</p>
      <p class="cap">${esc(fact.category)} · 香港${placeNote}</p>
    </div>
  </div>`;
}

/** Paper card pinned on the axis. An empty calendar day says so, and does not borrow a chronicle stage. */
export function renderTodayPin(now = new Date()): string {
  const mmdd = hktMmdd(now);
  const fact = homeFacts(now, 1)[0];
  const body = fact ? pinFact(fact) : '<p class="pin-empty">此日沒有收錄紀事。</p>';
  const slice = fact ? '' : '<a href="/#slice">今日切片 →</a>';
  const meta = fact ? '當年今日 · 溫和史紀事' : '當年今日 · 此日沒有收錄紀事';
  return `<section class="today-pin" aria-label="今日落點">
    <h2>今日落點 · ${esc(labelMmdd(mmdd))}</h2>
    <p class="meta">${meta}</p>
    ${body}
    <div class="pin-links">
      <a href="/on-this-day/${esc(mmdd)}/">全日編年 →</a>
      <a href="/hk/landmarks/">香港地標 →</a>
      ${slice}
    </div>
  </section>`;
}

/** Origins, tech, and city are primary layer links. Landmark pages stay inside the city long page. */
export function renderLayerAside(): string {
  return `<section class="layers" aria-label="文明層">
    <h2>三大文明層</h2>
    <div class="layer-grid">
      <a class="layer-card layer-primary" href="/civilization/origins/">
        ${originsLayerCover()}
        <div class="era">深時間</div>
        <h3>人類起源</h3>
        <p>解剖學現代人到全球擴張。約三十萬年前起的年表。</p>
      </a>
      <a class="layer-card layer-primary" href="/civilization/tech/">
        ${layerCover(`${CIV}/node-tech-v1.jpg`, '科技與發現：公共科普示意', `${CIV}/civ-layer-tech-400w.webp 400w, ${CIV}/civ-layer-tech-640w.webp 640w`)}
        <div class="era">發現</div>
        <h3>科技與發現</h3>
        <p>工具、能源、媒介與知識。從深時間石器到今日新聞切片。</p>
      </a>
      <a class="layer-card layer-primary" href="/civilization/city/">
        ${layerCover(`${CIV}/node-city-v1.jpg`, '城市・基建・民生示意', `${CIV}/civ-layer-city-400w.webp 400w, ${CIV}/civ-layer-city-640w.webp 640w`)}
        <div class="era">公共生活</div>
        <h3>城市・基建・民生</h3>
        <p>聚落、公共工程與日常公共生活。香港地標只作本地案例。</p>
      </a>
      <a class="layer-card" href="/civilization/#future">
        <div class="era">展望</div>
        <h3>未來</h3>
        <p>軸上今天之後的展望，停在總覽錨點，不另開網址。</p>
      </a>
    </div>
  </section>`;
}

export function sliceHeadHtml(): string {
  return `<div class="slice-head"><h2>今日切片</h2><span class="tag">今日</span></div><p class="slice-note">這裡只列公開標題與出處，方便和文明編年對照；不另起一面牆。</p>`;
}

export function moreTodayHtml(): string {
  return `<p class="more-today"><a href="/today/">更多今日</a><span>港聞時間線在此，按報道時間列標題與出處。</span></p>`;
}

export function wrapCivilizationHome(inner: string, now = new Date(), topic = false, options: { pageH1?: string; hero?: boolean; stories?: string; close?: string } = {}): string {
  const pageH1 = options.pageH1?.trim() ?? '';
  const heading = pageH1 ? `<h1 class="focus-title">${esc(pageH1)}</h1>` : '';
  const opening = options.hero ? igCard(renderHeroOpening(), 'ig-card-lead') : '';
  const stories = options.stories ?? '';
  const close = options.close ?? '';
  return `${renderCivNav(topic)}
  ${igDotsNav()}
  <div class="ig-deck civ-home" id="ig-deck">
    ${opening}
    ${igCard(renderReadingLink(pageH1 ? 'h2' : 'h1'))}
    <section class="today-slice ig-card ig-card-slice" id="slice" aria-label="今日切片">
      <div class="ig-sheet">
      ${heading}
      ${sliceHeadHtml()}
      ${renderNearBridge()}
      ${inner}
      </div>
    </section>
    ${stories}
    ${igCard(renderTodayPin(now))}
    ${igCard(moreTodayHtml())}
    ${igCard(renderLayerAside())}
    ${close}
  </div>`;
}

/** One #ig-deck for a long civilization page. Flow cards shed overflow in the boot script. */
function snapDetail(body: string, title: string): string {
  return `${igDotsNav()}<div class="ig-deck" id="ig-deck">${igCard(body, 'ig-card-lead ig-card-flow')}${igCloseCard(title, footer(false))}</div>`;
}

/** Path segment under /civilization/. The hub itself stays `civilization` (overview, not an L1). */
export function civRouteKey(path: string): 'civilization' | 'cosmos' | 'galaxy' | 'earth' | 'origins' | 'tech' | 'city' | 'chronicle' {
  const rest = path.replace(/\/+$/, '').replace(/^\/civilization\/?/, '');
  const key = rest.split('/').filter(Boolean)[0] ?? '';
  if (key === 'cosmos' || key === 'galaxy' || key === 'earth' || key === 'origins' || key === 'tech' || key === 'city' || key === 'chronicle') return key;
  return 'civilization';
}

function shell(options: {
  title: string;
  description: string;
  path: string;
  body: string;
  indexable: boolean;
  status?: number;
  /** Hub and detail pages snap. The 404 miss stays a short document. */
  snap?: boolean;
}): { html: string; status: number; indexable: boolean } {
  const canonical = `${ORIGIN}${options.path}`;
  const robots = `<meta name="robots" content="${options.indexable ? 'index,follow' : 'noindex,follow'}" />`;
  const snap = options.snap === true;
  const html = `<!doctype html>
<html lang="zh-HK">
${head(options.title, options.description, canonical, '', 'website', `${robots}\n  ${CIV_MOTION_BOOT}`, '', false)}
<body>
  <div class="page column-page heritage-page civ-page${snap ? ' ig-snap' : ''}" data-kind="civilization">
  ${chrome(civRouteKey(options.path))}
  <main id="content" class="column-index civ-main-page${snap ? ' ig-frame' : ''}">
    ${options.body}
  </main>
  ${snap ? '' : footer(false)}
  </div>
  ${snap ? igDotsScript() : ''}
</body>
</html>`;
  return { html, status: options.status ?? 200, indexable: options.indexable };
}

function milestoneList(): string {
  return `<ol class="civ-milestone-list">${HUB_MILESTONES.map((row) => `<li><p class="era">${esc(row.era)}</p><h3>${esc(row.title)}</h3><p>${esc(row.text)}</p></li>`).join('')}</ol>`;
}

export function renderCivilizationHub(now = new Date()): { html: string; status: number; indexable: boolean } {
  const indexable = hubIndexable();
  const sections = [
    igCard(`<nav class="crumb"><a href="/">首頁</a> · 文明</nav>
    ${renderReadingLink()}`, 'ig-card-lead'),
    igCard(`${hubHero()}<h1 class="column-title civ-page-title">人類文明</h1>`),
    igCard(renderReadingIndex()),
    igCard(renderTodayPin(now)),
    igCard(renderNearBridge()),
    igCard(renderQuestionIndex()),
    igCard(renderFutureReading()),
    igCard(`<article class="civ-article"><h2>導語</h2><p>${esc(HUB_LEDE)}</p></article>`, 'ig-card-body'),
    igCard(`<h2>里程碑</h2>${milestoneList()}`, 'ig-card-body'),
    igCard(`<h2>怎樣讀這些長文</h2><p>${esc(HUB_READ)}</p>`, 'ig-card-body'),
    igCard(`<h2>本地科普節點</h2><p>${esc(HUB_LOCAL)}</p><p><a href="/civilization/tech/">科技與發現</a> · <a href="/civilization/city/">城市・基建・民生</a></p><p><a href="/hk/landmarks/science-museum/">香港科學館</a> · <a href="/hk/landmarks/space-museum/">香港太空館</a></p>`, 'ig-card-body'),
    igCard(renderLayerAside()),
    igCard(`<div class="ig-close-only"><p class="ig-kicker">收束</p><h2 class="column-h2">完</h2><p class="dek">人類文明</p><a class="chip" href="/">返回首頁</a></div>${footer(false)}`, 'ig-card-close'),
  ];
  const body = `${igDotsNav()}<div class="ig-deck" id="ig-deck">${sections.join('')}</div>`;
  return shell({
    title: '人類文明',
    description: '從深時間到今日切片的溫和文明總覽。',
    path: '/civilization/',
    body,
    indexable,
    snap: false,
  });
}

export function renderCosmosPage(): { html: string; status: number; indexable: boolean } {
  const indexable = cosmosIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 宇宙長河</nav>
    ${renderCosmosArticle()}`;
  return shell({
    title: '宇宙長河・深時間',
    description: '從大爆炸到人族前生物圈的十階段深時間，約七百萬年前交接入類起源。',
    path: '/civilization/cosmos/',
    body: snapDetail(body, '宇宙長河'),
    indexable,
    snap: false,
  });
}

export function renderEarthPage(): { html: string; status: number; indexable: boolean } {
  const indexable = earthIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 地球生命</nav>
    ${renderEarthArticle()}
    ${renderSliceReturns('earth')}`;
  return shell({
    title: '地球生命・深時間',
    description: '從大氧化、寒武紀到三疊紀、侏羅紀、白堊紀與哺乳動物輻射，約七百萬年前交接入類起源。',
    path: '/civilization/earth/',
    body: snapDetail(body, '地球生命'),
    indexable,
    snap: false,
  });
}

export function renderChroniclePage(): { html: string; status: number; indexable: boolean } {
  const indexable = chronicleIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 編年</nav>
    ${renderChronicleArticle()}
    ${renderSliceReturns('chronicle')}`;
  return shell({
    title: '文明編年',
    description: '編年分作古、今、未來三卷，以能量、信息、制度、貨幣四線標出界定里程碑。',
    path: '/civilization/chronicle/',
    body: snapDetail(body, '文明編年'),
    indexable,
    snap: false,
  });
}

export function renderTechPage(): { html: string; status: number; indexable: boolean } {
  const indexable = techIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 科技與發現</nav>
    ${renderTechArticle()}
    ${renderSliceReturns('tech')}`;
  return shell({
    title: '科技與發現',
    description: '從石器、用火、文字與科學儀器到工業能量、大眾媒介與今日新聞切片。',
    path: '/civilization/tech/',
    body: snapDetail(body, '科技與發現'),
    indexable,
    snap: false,
  });
}

export function renderCityPage(): { html: string; status: number; indexable: boolean } {
  const indexable = cityIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 城市・基建・民生</nav>
    ${renderCityArticle()}`;
  return shell({
    title: '城市・基建・民生',
    description: '從聚落、公共工程與交通樞紐到公民場館與日常公共生活。香港地標只作本地案例。',
    path: '/civilization/city/',
    body: snapDetail(body, '城市・基建・民生'),
    indexable,
    snap: false,
  });
}

export function renderOriginsPage(): { html: string; status: number; indexable: boolean } {
  const indexable = originsIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 人類起源</nav>
    <article class="civ-article">
      ${originsArticle(placeFigures(renderMildMarkdown(originsSeedBody()), 'origins', 'body'))}
      ${renderSliceReturns('origins')}
      <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與學術綜述入口整理，只供對照深時間。</p>
      ${renderMildMarkdown(originsSeedSources())}
      <p class="civ-figure-credit">插圖為深時間示意，年代為約數，並非遷徙路線或政治疆界。圖像說明見<a href="${CIV}/MANIFEST.md">素材目錄</a>。</p>
    </article>`;
  return shell({
    title: '人類起源時間線',
    description: '從深時間到解剖學現代人與全球擴張的約略年表。',
    path: '/civilization/origins/',
    body: snapDetail(body, '人類起源時間線'),
    indexable,
    snap: false,
  });
}

/** Independent thick page. Same snap shell as cosmos and earth. */
export function renderGalaxyPage(): { html: string; status: number; indexable: boolean } {
  const indexable = galaxyIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 銀河系誕生</nav>
    ${renderGalaxyArticle()}`;
  return shell({
    title: '銀河系誕生',
    description: '本星系如何在暗物質暈與氣體冷卻中成形，並如何銜接宇宙長河與地球生命。年代一律為約。',
    path: '/civilization/galaxy/',
    body: snapDetail(body, '銀河系誕生'),
    indexable,
    snap: false,
  });
}

export function renderCivilizationMiss(): { html: string; status: number; indexable: boolean } {
  return shell({
    title: '找不到這一層',
    description: '這一層尚未成頁。',
    path: '/civilization/',
    body: `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a></nav><h1>找不到這一層</h1><p>可返回<a href="/civilization/">文明總覽</a>，或閱讀<a href="/civilization/origins/">人類起源</a>、<a href="/civilization/tech/">科技與發現</a>與<a href="/civilization/city/">城市・基建・民生</a>。</p>`,
    indexable: false,
    status: 404,
  });
}

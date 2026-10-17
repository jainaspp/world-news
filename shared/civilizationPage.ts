import { AD_BODY_CHARS, chrome, cjkChars, esc, footer, head } from './contentPage.js';
import { chronicleCardProse, chronicleIndexable, renderChronicleArticle, renderChronicleStrip, renderStageGrid } from './civilization/chronicle.js';
import { COSMOS_STAGES, cosmoCoverImg, cosmosIndexable, renderCosmosArticle } from './civilization/cosmos.js';
import { ORIGINS_BODY, ORIGINS_SOURCES } from './civilization/originsSource.js';
import { renderMildMarkdown } from './civilization/markdown.js';
import { homeFacts, hktMmdd, labelMmdd, type HeritageFact } from './heritage.js';
import { landmarkBySlug } from './heritage.js';

export { chronicleIndexable, chronicleProse } from './civilization/chronicle.js';
export { cosmosIndexable, cosmosProse } from './civilization/cosmos.js';

const ORIGIN = 'https://world-news.xyz';

const HUB_LEDE = '世界頭條把每日新聞放在人類文明的時間軸上。讀者先看見深時間、技術發現與城市公共生活的尺度，再進入今天的導讀、懶人包與電訊。遠史只收溫和題材，用來說明今日切片何以落在這一日，並不取代新聞主線。本頁寫明閱讀方法、起源層的實質摘要，以及三則可以核對的里程碑。空的層頁不另開網址，也不進入網站地圖。';

const HUB_ORIGINS = '約三十萬年前，解剖學上的現代人已能在非洲化石中辨認。摩洛哥 Jebel Irhoud 等地點常被公共科普引為重要證據之一，但現代人起源是非洲內部的長期過程，不是單一洞穴的一日事件。約六萬至四萬五千年前的主要擴張，使現代人分布到歐亞等地，並與尼安德特人、丹尼索瓦人發生有限的基因交流。比例與時間仍有學術爭議，本站不作人群比較。約一萬一千七百年前全新世開始之後，農業與定居轉入城市和基建，不放進起源的月日卡。全文見人類起源時間線。';

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

const HUB_READ = '閱讀時先看軸上的位置：最左是宇宙，其後為起源、技術、城市、今天。今天的新聞是軸上的切片。沒有溫和史對照的電訊不強加年代座標。技術與城市若尚未寫成獨立長頁，頁面只連到已經夠厚的地標與編年，不製造空殼網址。軸下編年帶仍列出十個文明階段，點進階段可讀完整編年。宇宙十階不掛在這條編年帶上。';

const HUB_LOCAL = '香港科學館於一九九一年開幕，以常設展覽介紹日常科學與自然現象，可作為城市向公眾講解深時間的節點。香港太空館於一九八〇年開幕，天象廳介紹星空與太陽系，方便把宇宙尺度和人族年表放在一起對照。兩館都是既有地標頁。';

export function originsProse(): string {
  return `${ORIGINS_BODY}\n${ORIGINS_SOURCES}`;
}

export function hubProse(): string {
  return [
    HUB_LEDE,
    HUB_ORIGINS,
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
  if (originsIndexable()) paths.push('/civilization/origins/');
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
  html = insertAfterHeading(html, 1, '人類起源時間線', '<p class="deep-time-return"><a href="/civilization/cosmos/">更早的深時間：宇宙長河</a></p>');
  html = insertAfterHeading(html, 3, '一、深層分離', stageFigure(1, '一、深層分離：譜系分叉示意（約 100–30 萬年前）', '深層分離 · 示意 · 約數'));
  html = insertAfterHeading(html, 3, '二、非洲現代人多樣性', stageFigure(2, '二、非洲現代人多樣性：多點柔光示意（約 30–6 萬年前）', '非洲內部多樣 · 示意 · 約數'));
  html = insertAfterHeading(html, 3, '三、全球擴張', stageFigure(3, '三、全球擴張：粒子輻射示意（非遷徙路線、非政治疆界）', '全球擴張 · 示意·非遷徙路線 · 約數'));
  return html;
}

export function renderCivNav(topic = false): string {
  const topicChip = topic ? '<a class="chip" href="/topic/">專題</a>' : '';
  return `<nav class="civ-nav" aria-label="主欄目"><a class="chip civ-chip" href="/civilization/">文明</a><a class="chip" href="#slice">今日</a><a class="chip" href="/briefing/">導讀</a><a class="chip" href="/explainer/">懶人包</a>${topicChip}<a class="chip" href="/data/">數據</a></nav>`;
}

export function renderAxisBand(options: { primaryHref?: string; primaryLabel?: string; todayHref?: string; asHeading?: boolean } = {}): string {
  const primaryHref = options.primaryHref ?? '/civilization/';
  const primaryLabel = options.primaryLabel ?? '打開文明總覽';
  const todayHref = options.todayHref ?? '#slice';
  const title = options.asHeading === false
    ? '<p class="axis-title">站在一條很長的時間軸上</p>'
    : '<h1 class="axis-title">站在一條很長的時間軸上</h1>';
  return `<section class="axis-hero" id="civ" aria-label="文明軸">
    <div class="axis-vignette" aria-hidden="true"></div>
    <p class="kicker">Human span · 溫和史</p>
    ${title}
    <p class="axis-lede">從人類起源到城市公共生活。新聞是軸上「今天」那一刀。先看見尺度，再讀今日。</p>
    <div class="deep-axis" aria-label="深時間軸">
      <div class="rail" aria-hidden="true"></div>
      <ol class="milestones">
        <li><a class="axis-node" href="/civilization/cosmos/"><span class="dot"></span><span class="lab">宇宙</span><span class="yr">~138億</span></a></li>
        <li><a class="axis-node" href="/civilization/origins/"><span class="dot"></span><span class="lab">起源</span><span class="yr">~300ka</span></a></li>
        <li><span class="axis-node"><span class="dot"></span><span class="lab">技術</span><span class="yr">發現</span></span></li>
        <li><a class="axis-node" href="/hk/landmarks/"><span class="dot"></span><span class="lab">城市</span><span class="yr">基建</span></a></li>
        <li><a class="axis-node axis-now" href="${esc(todayHref)}"><span class="dot now"></span><span class="lab">今天</span><span class="yr">切片</span></a></li>
      </ol>
    </div>
    <div class="axis-cta">
      <a class="btn btn-brass" href="${esc(primaryHref)}">${esc(primaryLabel)}</a>
      <a class="btn btn-ghost" href="${esc(todayHref)}">跳到今日切片</a>
    </div>
    ${renderChronicleStrip()}
  </section>`;
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

const PIN_SEALS = ['30萬年', '6萬年', '1萬年'] as const;

/** Stable across the year. Deep time does not need a calendar match. */
function pinFallbackIndex(now: Date): number {
  const [month, day] = hktMmdd(now).split('-').map((part) => Number(part));
  const date = Date.UTC(2024, (month || 1) - 1, day || 1);
  const index = Math.round((date - Date.UTC(2024, 0, 1)) / 86_400_000);
  const count = HUB_MILESTONES.length;
  return ((index % count) + count) % count;
}

function pinFallback(now: Date): string {
  const index = pinFallbackIndex(now);
  const row = HUB_MILESTONES[index];
  const seal = PIN_SEALS[index] ?? '起源';
  if (!row) return '';
  return `<div class="pin-fact">
    <span class="pin-seal"><span class="pin-seal-year">${esc(seal)}</span><span class="pin-seal-cat">起源</span></span>
    <div>
      <p>${esc(row.title)}。${esc(row.text)}</p>
      <p class="cap">${esc(row.era)} · 人類起源</p>
    </div>
  </div>`;
}

/** Paper card pinned on the axis. An empty calendar day shows one origins milestone. */
export function renderTodayPin(now = new Date()): string {
  const mmdd = hktMmdd(now);
  const fact = homeFacts(now, 1)[0];
  const body = fact ? pinFact(fact) : pinFallback(now);
  const origins = fact ? '' : '<a href="/civilization/origins/">人類起源 →</a>';
  const meta = fact ? '當年今日 · 溫和史紀事' : '深時間 · 起源里程碑';
  return `<section class="today-pin" aria-label="今日落點">
    <h2>今日落點 · ${esc(labelMmdd(mmdd))}</h2>
    <p class="meta">${meta}</p>
    ${body}
    <div class="pin-links">
      <a href="/on-this-day/${esc(mmdd)}/">全日編年 →</a>
      <a href="/hk/landmarks/">香港地標 →</a>
      ${origins}
    </div>
  </section>`;
}

/** Origins is the only primary layer link. Tech and cities stay secondary until they are thick pages. */
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
      <article class="layer-card layer-secondary">
        ${layerCover(`${CIV}/node-tech-v1.jpg`, '科技與發現：公共科普示意')}
        <div class="era">發現</div>
        <h3>科技與發現</h3>
        <p>這一層尚未單獨成頁。可先看<a href="/hk/landmarks/science-museum/">香港科學館</a>。</p>
      </article>
      <article class="layer-card layer-secondary">
        ${layerCover(`${CIV}/node-city-v1.jpg`, '城市・基建・民生示意')}
        <div class="era">公共生活</div>
        <h3>城市・基建・民生</h3>
        <p>通車、建築與場館已寫在<a href="/hk/landmarks/">香港地標</a>與<a href="/on-this-day/">當年今日</a>。</p>
      </article>
    </div>
  </section>`;
}

export function sliceHeadHtml(): string {
  return `<div class="slice-head"><h2>今日切片</h2><span class="tag">NEWS ON THE AXIS</span></div><p class="slice-note">導讀、懶人包與最新標題嵌在文明軸之下。有溫和史對照時才顯示層與年代。</p>`;
}

export function wrapCivilizationHome(inner: string, now = new Date(), topic = false, options: { pageH1?: string } = {}): string {
  const pageH1 = options.pageH1?.trim() ?? '';
  const heading = pageH1 ? `<h1 class="focus-title">${esc(pageH1)}</h1>` : '';
  return `${renderCivNav(topic)}
  <div class="civ-home">
    ${renderAxisBand({ asHeading: !pageH1 })}
    <div class="civ-frame">
      <div class="civ-main">
        ${renderTodayPin(now)}
        <section class="today-slice" id="slice" aria-label="今日切片">
          ${heading}
          ${sliceHeadHtml()}
          ${inner}
        </section>
      </div>
      <aside class="civ-side">${renderLayerAside()}</aside>
    </div>
  </div>`;
}

function shell(options: {
  title: string;
  description: string;
  path: string;
  body: string;
  indexable: boolean;
  status?: number;
}): { html: string; status: number; indexable: boolean } {
  const canonical = `${ORIGIN}${options.path}`;
  const robots = `<meta name="robots" content="${options.indexable ? 'index,follow' : 'noindex,follow'}" />`;
  const html = `<!doctype html>
<html lang="zh-HK">
${head(options.title, options.description, canonical, '', 'website', robots, '', false)}
<body>
  <div class="page column-page heritage-page civ-page" data-kind="civilization">
  ${chrome('civilization')}
  <main id="content" class="column-index civ-main-page">
    ${options.body}
  </main>
  ${footer(false)}
  </div>
</body>
</html>`;
  return { html, status: options.status ?? 200, indexable: options.indexable };
}

function milestoneList(): string {
  return `<ol class="civ-milestone-list">${HUB_MILESTONES.map((row) => `<li><p class="era">${esc(row.era)}</p><h3>${esc(row.title)}</h3><p>${esc(row.text)}</p></li>`).join('')}</ol>`;
}

/** Deep-time pair sits above the chronicle grid. Cosmos is the left card. */
function renderDeepTimeBoard(): string {
  const first = COSMOS_STAGES[0];
  const cosmosCover = first
    ? `<a class="stage-cover" data-stage="1" href="/civilization/cosmos/" aria-label="宇宙長河">${cosmoCoverImg(first, true)}<span class="stage-seal">宇宙</span></a>`
    : '';
  const originsCover = `<a class="stage-cover" href="/civilization/origins/" aria-label="人類起源">${civImage({
    src: `${CIV}/civ-layer-origins-640w.webp`,
    srcset: `${CIV}/civ-layer-origins-400w.webp 400w, ${CIV}/civ-layer-origins-640w.webp 640w`,
    sizes: '(max-width: 600px) 100vw, 360px',
    width: 640,
    height: 480,
    alt: '人類起源：深時間溫和示意',
  })}<span class="stage-seal">起源</span></a>`;
  return `<section class="deep-time" aria-label="深時間">
    <div class="chronicle-board-head">
      <h2>深時間</h2>
    </div>
    <p class="chronicle-board-note">宇宙長河接到人類起源。約七百萬年前，演化進入人族階段。下方編年仍是文明十階段。</p>
    <div class="deep-time-grid">
      <article class="deep-time-card">
        ${cosmosCover}
        <div class="stage-body">
          <p class="era">宇宙長河</p>
          <h3><a href="/civilization/cosmos/">宇宙長河・深時間</a></h3>
          <p class="stage-meaning">約一百三十八億年前至約七百萬年前。能量、物質、信息與時間。</p>
          <p class="stage-links"><a href="/civilization/cosmos/">閱讀宇宙長河</a></p>
        </div>
      </article>
      <article class="deep-time-card">
        ${originsCover}
        <div class="stage-body">
          <p class="era">人類起源</p>
          <h3><a href="/civilization/origins/">人類起源</a></h3>
          <p class="stage-meaning">約七百萬年前人族至智人。宇宙長河在此交接。</p>
          <p class="stage-links"><a href="/civilization/origins/">閱讀人類起源</a></p>
        </div>
      </article>
    </div>
  </section>`;
}

export function renderCivilizationHub(now = new Date()): { html: string; status: number; indexable: boolean } {
  const indexable = hubIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · 文明</nav>
    ${renderAxisBand({ asHeading: false, primaryHref: '/civilization/origins/', primaryLabel: '閱讀人類起源', todayHref: '/#slice' })}
    ${hubHero()}
    <h1 class="column-title civ-page-title">人類文明</h1>
    ${renderTodayPin(now)}
    ${renderDeepTimeBoard()}
    ${renderStageGrid()}
    <article class="civ-article">
      <h2>導語</h2>
      <p>${esc(HUB_LEDE)}</p>
      <h2>起源摘要</h2>
      <p>${esc(HUB_ORIGINS)}</p>
      <h2>里程碑</h2>
      ${milestoneList()}
      <h2>怎樣讀這條軸</h2>
      <p>${esc(HUB_READ)}</p>
      <h2>本地科普節點</h2>
      <p>${esc(HUB_LOCAL)}</p>
      <p><a href="/hk/landmarks/science-museum/">香港科學館</a> · <a href="/hk/landmarks/space-museum/">香港太空館</a></p>
    </article>
    ${renderLayerAside()}`;
  return shell({
    title: '人類文明',
    description: '從深時間到今日切片的溫和文明總覽。',
    path: '/civilization/',
    body,
    indexable,
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
    body,
    indexable,
  });
}

export function renderChroniclePage(): { html: string; status: number; indexable: boolean } {
  const indexable = chronicleIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 編年</nav>
    ${renderChronicleArticle()}`;
  return shell({
    title: '文明編年',
    description: '從史前採集到智能工具的十階段編年，以能量、信息、制度、貨幣四線標出界定里程碑。',
    path: '/civilization/chronicle/',
    body,
    indexable,
  });
}

export function renderOriginsPage(): { html: string; status: number; indexable: boolean } {
  const indexable = originsIndexable();
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a> · 人類起源</nav>
    <article class="civ-article">
      ${originsArticle(renderMildMarkdown(ORIGINS_BODY))}
      <p class="civ-ai"><span class="badge">AI 整合</span> 本頁由公開科普與學術綜述入口整理，只供對照深時間。</p>
      ${renderMildMarkdown(ORIGINS_SOURCES)}
      <p class="civ-figure-credit">插圖為深時間示意，年代為約數，並非遷徙路線或政治疆界。圖像說明見<a href="${CIV}/MANIFEST.md">素材目錄</a>。</p>
    </article>`;
  return shell({
    title: '人類起源時間線',
    description: '從深時間到解剖學現代人與全球擴張的約略年表。',
    path: '/civilization/origins/',
    body,
    indexable,
  });
}

export function renderCivilizationMiss(): { html: string; status: number; indexable: boolean } {
  return shell({
    title: '找不到這一層',
    description: '這一層尚未成頁。',
    path: '/civilization/',
    body: `<nav class="crumb"><a href="/">首頁</a> · <a href="/civilization/">文明</a></nav><h1>找不到這一層</h1><p>可返回<a href="/civilization/">文明總覽</a>，或閱讀<a href="/civilization/origins/">人類起源</a>。</p>`,
    indexable: false,
    status: 404,
  });
}

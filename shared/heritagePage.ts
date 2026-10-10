import { AD_BODY_CHARS, cjkChars, chrome, esc, footer, head, type AdConfig } from './contentPage.js';
import {
  LANDMARK_FILTERS,
  allLandmarks,
  datedPaths,
  factsOn,
  hktMmdd,
  homeFacts,
  isMmdd,
  labelMmdd,
  landmarkBySlug,
  shiftMmdd,
  type HeritageFact,
  type Landmark,
  type LandmarkKind,
} from './heritage.js';

const ORIGIN = 'https://world-news.xyz';

const GAZETTEER_NOTE = '世界頭條這欄以香港時間的月日編年，收入建築落成、交通通車、公共場館、節慶與體育場地。每條只寫年份、事情與地點，方便讀者對照地圖。頁面不設帳號，也不把紀事改寫成新聞報道。地圖連結通往公開地圖，只為標示位置。若同一日有多於三條，首頁先列最早的三條，其餘在當日編年頁看完。地標頁寫簡介、時間線與到訪方式，讓一頁足以獨立閱讀。種子檔可再加月日，條件是事情本身屬於地理、建築、民生、節慶、交通、體育或公共文化。';

export interface HeritageAds {
  client: string;
  slot: string;
}

const DEFAULT_ADS: HeritageAds = { client: 'ca-pub-8392975944327076', slot: '' };

export function adsFromEnv(env: Record<string, unknown>): HeritageAds {
  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = env[name];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };
  return {
    client: pick('VITE_GOOGLE_AD_CLIENT', 'GOOGLE_AD_CLIENT') || DEFAULT_ADS.client,
    slot: pick('AD_SLOT_BOTTOM', 'VITE_AD_SLOT_BOTTOM', 'AD_SLOT_MID', 'VITE_AD_SLOT_FEED', 'AD_SLOT_FEED'),
  };
}

function proseChars(parts: string[]): number {
  return cjkChars(parts.join(''));
}

const PAPER_PLATE = '/static/heritage/paper-texture.jpg';

function inkRule(): string {
  return `<img class="ink-rule" src="/static/heritage/ink-divider.png" alt="" width="420" height="70" />`;
}

function plateMark(src: string, name: string): string {
  if (src !== PAPER_PLATE) return '';
  return `<span class="plate-name">${esc(name)}</span>`;
}

function yearSeal(year: string): string {
  return `<span class="year-seal">${esc(year)}</span>`;
}

function chip(fact: HeritageFact): string {
  const place = fact.landmark ? landmarkBySlug(fact.landmark) : undefined;
  if (!place) return '';
  return `<a class="landmark-chip" href="/hk/landmarks/${esc(place.slug)}/">${esc(place.name)}</a>`;
}

function visual(fact: HeritageFact, eager = false): string {
  const place = fact.landmark ? landmarkBySlug(fact.landmark) : undefined;
  const src = place?.image || PAPER_PLATE;
  const alt = place?.imageAlt || '當年今日紀事插畫';
  const paper = src === PAPER_PLATE ? ' plate-paper' : '';
  return `<div class="otd-visual${paper}"><img src="${esc(src)}" alt="${esc(alt)}" width="640" height="360" loading="${eager ? 'eager' : 'lazy'}" decoding="async" />${plateMark(src, place?.name || alt)}${yearSeal(fact.year)}</div>`;
}

function factCard(fact: HeritageFact, eager = false): string {
  return `<div class="otd-card" role="article">
    ${visual(fact, eager)}
    <div class="otd-body">
      <p class="otd-fact">${esc(fact.fact)}</p>
      <p class="otd-caption">${esc(fact.caption)}</p>
      <div class="otd-meta"><span class="tag-cat">${esc(fact.category)}</span>${chip(fact)}</div>
    </div>
  </div>`;
}

function factRow(fact: HeritageFact): string {
  return `<div class="otd-row" role="article">
    ${visual(fact)}
    <div class="otd-body">
      <p class="otd-fact">${esc(fact.fact)}</p>
      <p class="otd-caption">${esc(fact.caption)}</p>
      <div class="otd-meta"><span class="tag-cat">${esc(fact.category)}</span>${chip(fact)}</div>
    </div>
  </div>`;
}

/** Homepage block (collapsed like 懶人包). Empty when today has no safe fact. */
export function renderOnThisDaySection(now = new Date()): string {
  const mmdd = hktMmdd(now);
  const rows = homeFacts(now, 3);
  if (!rows.length) return '';
  // Collapsed by default: defer images until open (no eager).
  const cards = rows.map((row) => factCard(row, false)).join('');
  const count = rows.length;
  return `<details class="otd-pack heritage">
  <summary class="otd-pack-summary">
    <span class="otd-pack-title" id="otd-title">當年今日</span>
    <span class="otd-pack-kicker">溫和史 · ${esc(labelMmdd(mmdd))}</span>
    <span class="otd-pack-teaser">今日 ${count} 則 · 點開睇</span>
  </summary>
  <div class="otd-pack-body">
    <p class="archive-label">地方誌 · 溫和編年</p>
    ${inkRule()}
    <p class="section-lede">舊紙年表式紀事：回望本地建築落成、基建通車與公共生活節點。只記地理與民生。</p>
    <div class="otd-grid">${cards}</div>
    <a class="section-more otd-pack-more" href="/on-this-day/${esc(mmdd)}/">睇晒 →</a>
  </div>
</details>`;
}

function landmarkEssay(slug: string | undefined): string {
  const place = slug ? landmarkBySlug(slug) : undefined;
  if (!place) return '';
  const steps = place.timeline.map((item) => `${item.year}${item.title}。${item.text}`).join('');
  return `${place.lede}${place.visit}${steps}`;
}

function dayProse(mmdd: string): string[] {
  const rows = factsOn(mmdd);
  const linked = [...new Set(rows.map((row) => row.landmark).filter((slug): slug is string => Boolean(slug)))];
  return [
    `${labelMmdd(mmdd)}的溫和紀事，記建築啟用、交通通車、公共場館與節慶。`,
    ...rows.flatMap((row) => [row.fact, row.caption, row.category]),
    ...linked.map((slug) => landmarkEssay(slug)),
    GAZETTEER_NOTE,
  ];
}

export function dayIndexable(mmdd: string): boolean {
  return proseChars(dayProse(mmdd)) >= AD_BODY_CHARS;
}

function landmarkProse(place: Landmark): string[] {
  return [
    place.name,
    place.kindLabel,
    place.district,
    place.summary,
    place.lede,
    place.visit,
    ...place.timeline.flatMap((item) => [item.year, item.title, item.text]),
    GAZETTEER_NOTE,
  ];
}

export function landmarkIndexable(place: Landmark): boolean {
  return proseChars(landmarkProse(place)) >= AD_BODY_CHARS;
}

function shell(options: {
  title: string;
  description: string;
  path: string;
  body: string;
  indexable: boolean;
  ads: HeritageAds;
  status?: number;
}): { html: string; status: number; indexable: boolean } {
  const canonical = `${ORIGIN}${options.path}`;
  const robots = options.indexable ? 'index,follow' : 'noindex,follow';
  const extra = `<meta name="robots" content="${robots}" />`;
  const html = `<!doctype html>
<html lang="zh-HK">
${head(options.title, options.description, canonical, '', 'website', extra, options.ads.client, options.indexable)}
<body>
  <div class="page column-page heritage-page" data-kind="heritage">
  ${chrome('none')}
  <main id="content" class="column-index heritage-main">
    ${options.body}
  </main>
  ${footer(false)}
  </div>
</body>
</html>`;
  return { html, status: options.status ?? 200, indexable: options.indexable };
}

function adUnit(ads: HeritageAds, indexable: boolean): string {
  if (!indexable || !/^\d{6,}$/.test(ads.slot)) return '';
  const config: AdConfig = { client: ads.client, bottom: ads.slot };
  return `<div class="ad-slot ad-slot-banner" data-ad-position="bottom" aria-label="廣告"><span class="ad-label">廣告</span><ins class="adsbygoogle" data-ad-client="${esc(config.client)}" data-ad-slot="${esc(config.bottom || '')}" data-ad-format="auto" data-full-width-responsive="true" style="display:block"></ins></div>`;
}

function dayNav(mmdd: string): string {
  const prev = shiftMmdd(mmdd, -1);
  const next = shiftMmdd(mmdd, 1);
  return `<div class="day-nav">
    <a href="/on-this-day/${prev}/">← ${esc(labelMmdd(prev))}</a>
    <h1 class="day-hero-date">${esc(labelMmdd(mmdd))}</h1>
    <a href="/on-this-day/${next}/">${esc(labelMmdd(next))} →</a>
  </div>`;
}

function linkedLandmarks(rows: HeritageFact[]): string {
  const seen = new Set<string>();
  const blocks: string[] = [];
  for (const row of rows) {
    if (!row.landmark || seen.has(row.landmark)) continue;
    seen.add(row.landmark);
    const place = landmarkBySlug(row.landmark);
    if (!place) continue;
    const steps = place.timeline.map((item) => `<li><div class="ty">${esc(item.year)}</div><p class="tt">${esc(item.title)}</p><p class="td">${esc(item.text)}</p></li>`).join('');
    blocks.push(`<section class="heritage-place" aria-label="${esc(place.name)}">
      <h2 class="section-title">${esc(place.name)}</h2>
      <p class="section-lede">${esc(place.lede)}</p>
      <p>${esc(place.visit)}</p>
      <ol class="heritage-timeline">${steps}</ol>
      <p><a class="section-more" href="/hk/landmarks/${esc(place.slug)}/">地標全文 →</a></p>
    </section>`);
  }
  return blocks.join('');
}

export function renderOnThisDayPage(mmdd: string, ads: HeritageAds = DEFAULT_ADS, today = ''): { html: string; status: number; indexable: boolean } {
  if (!isMmdd(mmdd)) {
    return shell({
      title: '找不到這一日',
      description: '當年今日只收錄有效月日。',
      path: '/on-this-day/',
      body: `<nav class="crumb"><a href="/">首頁</a> · 當年今日</nav><h1 class="section-title">找不到這一日</h1><p class="section-lede">請回到<a href="/on-this-day/">當日編年</a>，或改看<a href="/hk/landmarks/">香港地標</a>。</p>`,
      indexable: false,
      ads,
      status: 404,
    });
  }
  const rows = factsOn(mmdd);
  const indexable = dayIndexable(mmdd);
  const list = rows.length
    ? `<div class="otd-list">${rows.map((row) => factRow(row)).join('')}</div>${linkedLandmarks(rows)}`
    : `<p class="heritage-empty">這一日尚未收錄紀事。可改看前後日期，或先讀<a href="/hk/landmarks/">香港地標</a>。</p>`;
  const note = today === mmdd ? '香港時間的今天。' : '';
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/hk/landmarks/">香港地標</a> · 當年今日</nav>
    ${dayNav(mmdd)}
    <p class="archive-label">當日編年</p>
    ${inkRule()}
    <p class="section-lede">溫和史紀事：建築啟用、基建通車與公共生活節點。${esc(note)}可點地標進入簡介與時間線。</p>
    ${list}
    ${adUnit(ads, indexable)}
    <p class="heritage-note">${esc(GAZETTEER_NOTE)}</p>
    <p class="footnote">本欄只收地理、建築、民生、節慶、交通開幕、體育與公共文化。新增事實時請在種子檔寫上月日與年份。</p>`;
  const description = rows[0]?.fact || `${labelMmdd(mmdd)}尚未收錄紀事。`;
  return shell({
    title: `${labelMmdd(mmdd)} 當年今日`,
    description,
    path: `/on-this-day/${mmdd}/`,
    body,
    indexable,
    ads,
  });
}

export function renderLandmarkHub(kind: string, ads: HeritageAds = DEFAULT_ADS): { html: string; status: number; indexable: boolean } {
  const selected = LANDMARK_FILTERS.some((item) => item.kind === kind) ? kind as '' | LandmarkKind : '';
  const rows = allLandmarks().filter((place) => !selected || place.kind === selected);
  const filters = LANDMARK_FILTERS.map((item) => {
    const href = item.kind ? `/hk/landmarks/?kind=${item.kind}` : '/hk/landmarks/';
    const active = item.kind === selected;
    return `<a class="chip${active ? ' active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${item.label}</a>`;
  }).join('');
  const cards = rows.map((place) => `<a class="lm-card" href="/hk/landmarks/${esc(place.slug)}/">
      <div class="cover${place.image === PAPER_PLATE ? ' plate-paper' : ''}"><img src="${esc(place.image)}" alt="${esc(place.imageAlt)}" width="640" height="480" loading="lazy" decoding="async" />${plateMark(place.image, place.name)}</div>
      <div class="body"><h3>${esc(place.name)}</h3><p>${esc(place.summary)}</p><span class="tag-cat">${esc(place.kindLabel)}</span></div>
    </a>`).join('');
  const prose = allLandmarks().flatMap((place) => [place.name, place.summary, place.lede]);
  const indexable = proseChars(prose) >= AD_BODY_CHARS && !selected;
  const body = `<nav class="crumb"><a href="/">首頁</a> · 香港地標</nav>
    <div class="section-head">
      <h1 class="section-title heritage-page-title">香港地標</h1>
      <span class="section-kicker">地方誌圖錄</span>
    </div>
    <p class="archive-label">香港地標 · 溫和編年</p>
    ${inkRule()}
    <p class="section-lede">以紀事插畫介紹建築、渡輪、山頂與文化場館，閱讀公共空間與日常路徑。</p>
    <div class="heritage-filters" role="navigation" aria-label="地標分類">${filters}</div>
    <div class="lm-grid">${cards}</div>
    ${adUnit(ads, indexable)}
    <p class="footnote">插畫為紀事風格，不是新聞照片。介紹只限地理、建築與民生。</p>`;
  return shell({
    title: '香港地標',
    description: '香港建築、交通、文化場館與觀景點的溫和介紹。',
    path: selected ? `/hk/landmarks/?kind=${selected}` : '/hk/landmarks/',
    body,
    indexable,
    ads,
  });
}

export function renderLandmarkPage(slug: string, ads: HeritageAds = DEFAULT_ADS): { html: string; status: number; indexable: boolean } {
  const place = landmarkBySlug(slug);
  if (!place) {
    return shell({
      title: '找不到此地標',
      description: '這項地標不在圖錄之內。',
      path: '/hk/landmarks/',
      body: `<nav class="crumb"><a href="/">首頁</a> · <a href="/hk/landmarks/">香港地標</a></nav><h1 class="section-title">找不到此地標</h1><p class="section-lede">請返回<a href="/hk/landmarks/">地標圖錄</a>。</p>`,
      indexable: false,
      ads,
      status: 404,
    });
  }
  const indexable = landmarkIndexable(place);
  const map = `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.mapQuery)}`;
  const steps = place.timeline.map((item) => `<li><div class="ty">${esc(item.year)}</div><p class="tt">${esc(item.title)}</p><p class="td">${esc(item.text)}</p></li>`).join('');
  const related = allLandmarks().filter((item) => item.slug !== place.slug && item.kind === place.kind).slice(0, 3);
  const more = related.length
    ? `<h2 class="section-title">相關地標</h2><div class="lm-grid">${related.map((item) => `<a class="lm-card" href="/hk/landmarks/${esc(item.slug)}/"><div class="cover${item.image === PAPER_PLATE ? ' plate-paper' : ''}"><img src="${esc(item.image)}" alt="" width="640" height="480" loading="lazy" decoding="async" />${plateMark(item.image, item.name)}</div><div class="body"><h3>${esc(item.name)}</h3><p>${esc(item.summary)}</p></div></a>`).join('')}</div>`
    : '';
  const body = `<nav class="crumb"><a href="/">首頁</a> · <a href="/hk/landmarks/">香港地標</a> · ${esc(place.name)}</nav>
    <article class="detail-hero">
      <div class="cover${place.image === PAPER_PLATE ? ' plate-paper' : ''}"><img src="${esc(place.image)}" alt="${esc(place.imageAlt)}" width="1200" height="514" loading="eager" decoding="async" />${plateMark(place.image, place.name)}</div>
      <div class="intro">
        <span class="section-kicker">${esc(place.kindLabel)} · ${esc(place.district)}</span>
        <p class="archive-label">地標檔案</p>
        ${inkRule()}
        <h1>${esc(place.name)}</h1>
        <p class="lede">${esc(place.lede)}</p>
        <a class="map-btn" href="${esc(map)}" target="_blank" rel="noopener noreferrer">在地圖開啟 ↗</a>
      </div>
    </article>
    <h2 class="section-title heritage-timeline-title">溫和時間線</h2>
    <ol class="heritage-timeline">${steps}</ol>
    <section class="heritage-place"><h2 class="section-title">到訪</h2><p>${esc(place.visit)}</p></section>
    ${more}
    <p class="heritage-note">${esc(GAZETTEER_NOTE)}</p>
    ${adUnit(ads, indexable)}
    <p class="footnote">外連地圖只作地理定位。本頁記建築、交通與公共生活。</p>`;
  return shell({
    title: place.name,
    description: place.summary,
    path: `/hk/landmarks/${place.slug}/`,
    body,
    indexable,
    ads,
  });
}

export function heritagePublicPaths(): string[] {
  const paths = ['/on-this-day/', '/hk/landmarks/'];
  for (const mmdd of datedPaths()) {
    if (dayIndexable(mmdd)) paths.push(`/on-this-day/${mmdd}/`);
  }
  for (const place of allLandmarks()) {
    if (landmarkIndexable(place)) paths.push(`/hk/landmarks/${place.slug}/`);
  }
  return paths;
}

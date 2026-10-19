import { adsRuntimeEnabled, FEED_AD_EVERY } from './adPolicy.js';
import { demoteGraphic, mustReadBootstrap, renderMustRead, type MustReadLink } from './mustRead.js';
import { adSlotMarkup } from './adSlot.js';
import type { MajorEntry } from './angles.js';
import { breakingIds } from './breaking.js';
import { categoryLabel } from './categories.js';
import { analysisSlug } from './content.js';
import { LAYOUT_CARDS_HK, LAYOUT_LIST_HK, rankHeatCount } from './homeTemplate.js';
import { esc, favicon, footer, media, safeHttp } from './contentPage.js';
import { homeIntroFoot, homeIntroTop, type IntroHref } from './homeIntro.js';
import { renderHkInfo } from './hkInfo.js';
import { renderMajorBanner } from './majorPage.js';
import type { HkNow } from './hk.js';
import type { HsiQuote } from './hsi.js';
import type { NewsItem } from './types.js';
import { wrapCivilizationHome } from './civilizationPage.js';
import { titleLang } from './zh.js';

export interface HomeMarket {
  hk: HkNow | null;
  hsi: HsiQuote | null;
}

const SSR_COUNT = 12;

export const DEFAULT_BRIEFING_LINKS = [
  { href: '/briefing/', label: '每日香港導讀' },
  { href: '/briefing/', label: '國際導讀' },
  { href: '/briefing/', label: '科技財經導讀' },
];

/** Homepage chips for columns that are easy to leave thin. Absent means the chip stays off. */
export interface HomeColumnLinks {
  /** Newest digest that clears columnIndexable. */
  digestHref?: string;
  /** Newest weekly that clears columnIndexable. */
  weeklyHref?: string;
  /** At least one analysis post clears columnIndexable. */
  analysis?: boolean;
  /** The current quiz edition has questions. */
  quiz?: boolean;
  /** At least one topic pack is public. */
  topic?: boolean;
}

export function columnsBootstrap(columns: HomeColumnLinks): string {
  return `<script id="wn-columns" type="application/json">${JSON.stringify(columns).replace(/</g, '\\u003c')}</script>`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function timeAgo(dateStr: string, now = Date.now()): string {
  const published = new Date(dateStr).getTime();
  if (!dateStr || Number.isNaN(published)) return '';
  const diff = now - published;
  if (diff < 0) return '';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '剛剛';
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 日前`;
  const date = new Date(published);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** Homepage link for a column hub. Null keeps the label as text until that column is public. */
export function columnHref(columns: HomeColumnLinks, href: string): string | null {
  if (href === '/digest/') return columns.digestHref || null;
  if (href === '/weekly/') return columns.weeklyHref || null;
  if (href === '/analysis/') return columns.analysis ? href : null;
  if (href === '/topic/') return columns.topic ? href : null;
  return href;
}

function introHref(columns: HomeColumnLinks): IntroHref {
  return (href) => columnHref(columns, href);
}

function templateSwitch(): string {
  return `<div class="template-switch" role="group" aria-label="版面"><button type="button" data-wn-template-switch data-layout="cards" aria-pressed="true">${LAYOUT_CARDS_HK}</button><button type="button" data-wn-template-switch data-layout="list" aria-pressed="false">${LAYOUT_LIST_HK}</button></div><script>try{var on=document.documentElement.classList.contains("wn-list");var box=document.currentScript.previousElementSibling;if(box){var nodes=box.querySelectorAll("[data-wn-template-switch]");for(var i=0;i<nodes.length;i++){var list=nodes[i].getAttribute("data-layout")==="list";nodes[i].setAttribute("aria-pressed",list===on?"true":"false")}}}catch(e){}</script>`;
}

/** Digest strip weights: 導讀＞懶人包＞專題. Thin digest, weekly, analysis, quiz and topic hubs stay off until they clear the public floor. */
function digestStrip(briefingLinks: { href: string; label: string }[], columns: HomeColumnLinks = {}): string {
  const briefs = briefingLinks.map((link) => `<a class="chip digest-keep" href="${esc(link.href)}">${esc(link.label)}</a>`).join('');
  const digest = columns.digestHref ? `<a class="chip digest-primary active" href="${esc(columns.digestHref)}">今日精選</a>` : '';
  const topic = columns.topic ? '<a class="chip digest-keep" href="/topic/">專題懶人包</a>' : '';
  const weekly = columns.weeklyHref ? `<a class="chip digest-keep" href="${esc(columns.weeklyHref)}">週報</a>` : '';
  const analysis = columns.analysis ? '<a class="chip digest-keep" href="/analysis/">熱門分析</a>' : '';
  const quiz = columns.quiz ? '<a class="chip" href="/quiz/">每日小測</a>' : '';
  return `<aside class="digest-strip" aria-label="精選欄目"><span class="badge">AI</span>${digest}${briefs}<a class="chip digest-keep" href="/explainer/">新聞懶人包</a>${topic}${weekly}${analysis}<a class="chip" href="/data/">數據</a>${quiz}</aside>`;
}

function rankList(items: NewsItem[], counts: Map<string, number>, feedSlot: string): string {
  const fresh = breakingIds(items);
  const rows = items.map((item, index) => {
    const rank = index + 1;
    const articleUrl = safeHttp(item.link);
    const title = esc(item.title);
    const lang = titleLang(item.title);
    const langAttr = lang === 'zh' ? 'zh-HK' : lang;
    const titleHtml = articleUrl
      ? `<a class="rank-title" lang="${langAttr}" title="${title}" href="${esc(articleUrl)}" target="_blank" rel="noopener noreferrer">${title}</a>`
      : `<span class="rank-title" lang="${langAttr}" title="${title}">${title}</span>`;
    const sources = counts.get(item.id) ?? 0;
    const heat = rankHeatCount(sources);
    const when = timeAgo(item.pubDate);
    const note = `<span class="rank-note"><span class="source-tag">${esc(item.source)}</span>${when ? `<time datetime="${esc(item.pubDate)}">${esc(when)}</time>` : ''}</span>`;
    const pack = sources >= 3
      ? `<a class="rank-pack" href="/analysis/${esc(analysisSlug(item.title))}/">懶人包</a>`
      : '';
    const badge = fresh.has(item.id) ? '<span class="rank-badge">快訊</span>' : '';
    const heatHtml = heat != null
      ? `<a class="rank-heat" href="/story/${esc(item.id)}/" aria-label="${heat} 間媒體報道">${heat}</a>`
      : '';
    return `<li class="rank-row${rank <= 3 ? ' rank-row-top' : ''}"><span class="rank-num" aria-hidden="true">${rank}</span><div class="rank-main">${titleHtml}${pack}${note}${badge}</div><div class="rank-side">${heatHtml}</div></li>`;
  });
  const parts: string[] = [];
  for (let index = 0; index < rows.length; index += FEED_AD_EVERY) {
    const slice = rows.slice(index, index + FEED_AD_EVERY);
    parts.push(`<ol class="rank-list" aria-label="列表">${slice.join('')}</ol>`);
    if (slice.length === FEED_AD_EVERY) parts.push(adSlotMarkup('feed', feedSlot));
  }
  return `<div class="home-list">${parts.join('')}</div>`;
}

function card(item: NewsItem, featured: boolean, sourceCount: number, showBreaking: boolean): string {
  const articleUrl = safeHttp(item.link);
  const sourceUrl = safeHttp(item.sourceUrl);
  const title = esc(item.title);
  const lang = titleLang(item.title);
  const href = articleUrl ? ` href="${esc(articleUrl)}" target="_blank" rel="noopener noreferrer"` : '';
  const mediaHtml = articleUrl
    ? `<a class="story-media" href="${esc(articleUrl)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">${media(item.image, item.category, item.source, featured)}</a>`
    : `<div class="story-media">${media(item.image, item.category, item.source, featured)}</div>`;
  const fav = favicon(sourceUrl || articleUrl);
  const titleClass = lang === 'zh' ? 'story-title' : 'story-title title-sans';
  return `<article class="story${featured ? ' story-hero' : ''}">
    ${mediaHtml}
    <div class="story-body">
      <div class="story-kicker"><span class="kicker-region">${esc(categoryLabel(item.category ?? 'world'))}</span>${showBreaking ? '<span class="breaking">快訊</span>' : ''}</div>
      <h2 class="${titleClass}" lang="${lang === 'zh' ? 'zh-HK' : lang}">${articleUrl ? `<a${href}>${title}</a>` : title}</h2>
      <div class="story-meta">${fav}${sourceUrl ? `<a class="source-tag" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.source)}</a>` : `<span class="source-tag">${esc(item.source)}</span>`}${item.pubDate ? `<time datetime="${esc(item.pubDate)}">${esc(timeAgo(item.pubDate))}</time>` : ''}${sourceCount >= 2 ? `<a class="cluster-badge cluster-link" href="/story/${esc(item.id)}/">${sourceCount} 間媒體報道 →</a>` : ''}</div>
      ${articleUrl ? `<div class="card-links"><a class="read-original" href="${esc(articleUrl)}" target="_blank" rel="noopener noreferrer">閱讀原文</a><a class="read-original story-link" href="/story/${esc(item.id)}/">${sourceCount >= 2 ? '各媒體報道' : '相關頭條'}</a></div>` : ''}
      <p class="card-credit">標題來自 ${esc(item.source)}。全文請到原文網站閱讀。</p>
    </div>
  </article>`;
}

/** First-page feed HTML so mobile LCP does not wait on React + /api/news. */
export function renderHomeFeed(
  items: NewsItem[],
  counts = new Map<string, number>(),
  market: HomeMarket | null = null,
  feedSlot = '',
  banner: MajorEntry | null = null,
  focusHtml = '',
  briefingLinks: { href: string; label: string }[] = DEFAULT_BRIEFING_LINKS,
  mustRead: MustReadLink[] = [],
  now = new Date(),
  settled = false,
  columns: HomeColumnLinks = {},
  pageH1 = '',
): string {
  const frame = (inner: string) => wrapCivilizationHome(inner, now, Boolean(columns.topic), { pageH1 });
  const list = demoteGraphic(items).slice(0, SSR_COUNT);
  if (!list.length) {
    const panel = settled
      ? '<div class="status-panel"><h2>這個範圍暫時沒有標題</h2><p>可以返回首頁，或改看其他地區與分類。</p></div>'
      : '<div class="status-panel" aria-busy="true"><h2>載入頭條中…</h2><p>正在取得最新標題。</p></div>';
    const inner = `${digestStrip(briefingLinks, columns)}${renderMustRead(mustRead)}<div class="template-bar">${templateSwitch()}</div>${panel}`;
    return `<a class="skip-link" href="#slice">跳到今日切片</a>
  <div class="page ssr-home">
    ${frame(inner)}
    ${footer()}
  </div>`;
  }
  const fresh = breakingIds(list);
  const [hero, ...rest] = list;
  const top = hero ? `<div class="top-stories">${card(hero, true, counts.get(hero.id) ?? 0, fresh.has(hero.id))}</div>` : '';
  const grid = rest.map((item, index) => {
    const html = card(item, false, counts.get(item.id) ?? 0, fresh.has(item.id));
    return (index + 1) % FEED_AD_EVERY === 0 ? html + adSlotMarkup('feed', feedSlot) : html;
  }).join('');
  const info = renderHkInfo(market?.hk, market?.hsi);
  const major = banner ? `${renderMajorBanner(banner)}<script>try{var n=document.currentScript.previousElementSibling;if(n&&localStorage.getItem('wn-major-dismiss')===n.getAttribute('data-major-id'))n.remove()}catch(e){}</script>` : '';
  const inner = `<div class="template-bar">${templateSwitch()}</div>
    ${major}
    ${homeIntroTop(introHref(columns))}
    ${digestStrip(briefingLinks, columns)}
    ${renderMustRead(mustRead)}
    ${focusHtml.trim()}
    ${info}
    <p class="feed-divider" role="presentation"><span>最新標題</span></p>
    <div class="home-cards">
      ${top}
      <div class="news-grid">${grid}</div>
    </div>
    ${rankList(list, counts, feedSlot)}`;
  return `<a class="skip-link" href="#slice">跳到今日切片</a>
  <div class="page ssr-home">
    <main id="news">
      ${frame(inner)}
    </main>
    ${homeIntroFoot(introHref(columns))}
    ${footer()}
  </div>`;
}

export function homeBootstrap(items: NewsItem[]): string {
  const payload = {
    items: items.slice(0, 80).map((item) => ({
      id: item.id,
      title: item.title,
      link: item.link,
      source: item.source,
      sourceUrl: item.sourceUrl,
      regions: item.regions,
      pubDate: item.pubDate,
      ...(item.image ? { image: item.image } : {}),
      ...(item.category ? { category: item.category } : {}),
    })),
    fetchedAt: new Date().toISOString(),
    source: 'cache',
    feedErrors: 0,
    stale: false,
  };
  return `<script id="wn-bootstrap" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

export function marketBootstrap(market: HomeMarket | null): string {
  const payload = {
    hk: market?.hk ?? null,
    hsi: market?.hsi ?? null,
  };
  return `<script id="wn-market" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>`;
}

export function signalBootstrap(banner: MajorEntry | null): string {
  return `<script id="wn-major" type="application/json">${JSON.stringify({ banner }).replace(/</g, '\\u003c')}</script>`;
}

export function injectHomeShell(
  shell: string,
  items: NewsItem[],
  counts?: Map<string, number>,
  market: HomeMarket | null = null,
  feedSlot = '',
  banner: MajorEntry | null = null,
  focusHtml = '',
  briefingLinks: { href: string; label: string }[] = DEFAULT_BRIEFING_LINKS,
  mustRead: MustReadLink[] = [],
  settled = false,
  columns: HomeColumnLinks = {},
  pageH1 = '',
): string {
  const feed = renderHomeFeed(items, counts, market, feedSlot, banner, focusHtml, briefingLinks, mustRead, new Date(), settled, columns, pageH1);
  const boot = homeBootstrap(items) + marketBootstrap(market) + signalBootstrap(banner) + mustReadBootstrap(mustRead) + columnsBootstrap(columns);
  const lead = demoteGraphic(items)[0];
  const heroImage = lead?.image && /^https?:\/\//.test(lead.image) ? lead.image : '';
  const preload = heroImage
    ? `<link rel="preload" as="image" href="${esc(heroImage)}" fetchpriority="high" />`
    : '';
  let html = shell;
  if (preload) html = html.replace('</head>', `${preload}\n</head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${feed}</div>${boot}`);
  return gateHomeAds(html);
}

const PAGEAD = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const PAGEAD_SRC = /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i;
/** Inline Auto ads, vignette and anchor bootstraps. Manual units use an external loader plus <ins>, not this push. */
const AUTO_ADS_BOOT = /enable_page_level_ads|google_ad_client|adsbygoogle\s*=/;

/**
 * 逐個 script 移除 pagead 載入器，以及自動廣告、插頁與錨點的內聯啟動碼。
 * 不跨標籤匹配，避免誤刪前面的主題或結構化資料腳本。
 */
function stripAdScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    const external = /\bsrc\s*=/.test(block);
    if (external && PAGEAD_SRC.test(block)) return '';
    if (external) return block;
    if (AUTO_ADS_BOOT.test(block)) return '';
    return block;
  });
}

/** Drop any pagead loader and Auto ads bootstrap. During the review hold, also drop ad units. Otherwise add one manual loader only when a real unit is already in the HTML. */
export function gateHomeAds(html: string, client = 'ca-pub-8392975944327076'): string {
  let stripped = stripAdScripts(html);
  if (!adsRuntimeEnabled()) {
    stripped = stripped.replace(/<div class="ad-slot[^"]*"[\s\S]*?<\/div>/g, '');
    return stripped.replace(/<ins class="adsbygoogle"[\s\S]*?<\/ins>/g, '');
  }
  if (!stripped.includes('<ins class="adsbygoogle"')) return stripped;
  if (stripped.includes(PAGEAD)) return stripped;
  const tag = `<script async src="https://${PAGEAD}?client=${esc(client)}" crossorigin="anonymous"></script>`;
  return stripped.includes('</head>') ? stripped.replace('</head>', `${tag}\n</head>`) : `${tag}${stripped}`;
}

export { SSR_COUNT, hostOf };

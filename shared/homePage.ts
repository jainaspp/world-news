import { FEED_AD_EVERY } from './adPolicy.js';
import { adSlotMarkup } from './adSlot.js';
import type { MajorEntry } from './angles.js';
import { breakingIds } from './breaking.js';
import { CATEGORIES, categoryLabel } from './categories.js';
import { RANK_TAGLINE_HK, TEMPLATE_TO_CLASSIC_HK, TEMPLATE_TO_RANK_HK, rankHeatCount } from './homeTemplate.js';
import { esc, favicon, footer, media, safeHttp } from './contentPage.js';
import { homeIntroFoot, homeIntroTop } from './homeIntro.js';
import { renderHkInfo } from './hkInfo.js';
import { renderMajorBanner } from './majorPage.js';
import type { HkNow } from './hk.js';
import type { HsiQuote } from './hsi.js';
import type { NewsItem } from './types.js';
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

function templateSwitch(): string {
  return `<button type="button" class="template-switch" data-wn-template-switch aria-pressed="false"><span class="template-label-rank">${TEMPLATE_TO_RANK_HK}</span><span class="template-label-classic">${TEMPLATE_TO_CLASSIC_HK}</span></button><script>try{var b=document.currentScript.previousElementSibling;if(b&&b.setAttribute)b.setAttribute("aria-pressed",document.documentElement.classList.contains("wn-rank")?"true":"false")}catch(e){}</script>`;
}

function rankTabs(): string {
  const tabs = CATEGORIES.map((category) => {
    const href = category.id === 'all' ? '/' : `/category/${category.id}`;
    const current = category.id === 'all';
    return `<a class="rank-tab${current ? ' active' : ''}" href="${href}"${current ? ' aria-current="page"' : ''}>${esc(category.label)}</a>`;
  }).join('');
  return `<nav class="rank-tabs" aria-label="分類">${tabs}</nav>`;
}

function rankBoard(items: NewsItem[], counts: Map<string, number>): string {
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
    const heat = rankHeatCount(counts.get(item.id) ?? 0);
    const when = timeAgo(item.pubDate);
    const note = heat != null
      ? `<a class="rank-note" href="/story/${esc(item.id)}/">${heat} 間媒體報道</a>`
      : when
        ? `<time class="rank-note" datetime="${esc(item.pubDate)}">${esc(when)}</time>`
        : '';
    const badge = fresh.has(item.id) ? '<span class="rank-badge">快訊</span>' : '';
    return `<li class="rank-row${rank <= 3 ? ' rank-row-top' : ''}"><span class="rank-num" aria-hidden="true">${rank}</span><div class="rank-main">${titleHtml}${note}</div>${badge}</li>`;
  }).join('');
  return `<section class="home-rank" aria-label="標題榜">
    <div class="rank-band">
      <div class="rank-band-inner">
        <div class="rank-brand">
          <p class="rank-name">世界頭條</p>
          <p class="rank-tagline">${RANK_TAGLINE_HK}</p>
        </div>
        ${templateSwitch()}
      </div>
    </div>
    ${rankTabs()}
    <div class="rank-list-wrap"><ol class="rank-list">${rows}</ol></div>
  </section>`;
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
): string {
  const list = items.slice(0, SSR_COUNT);
  if (!list.length) {
    return `<a class="skip-link" href="#news">跳到新聞</a>
  <div class="page ssr-home">
    <div class="template-bar">${templateSwitch()}</div>
    <div class="status-panel" aria-busy="true"><h2>載入頭條中…</h2><p>正在取得最新標題。</p></div>
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
  return `<a class="skip-link" href="#news">跳到新聞</a>
  <div class="page ssr-home">
    <div class="home-classic">
      <div class="template-bar">${templateSwitch()}</div>
      <main id="news">
        ${major}
        ${homeIntroTop()}
        ${info}
        <aside class="digest-strip"><span class="badge">AI 整合</span><a class="digest-primary" href="/digest/">今日精選</a>${briefingLinks.map((link) => `<a class="digest-keep" href="${esc(link.href)}">${esc(link.label)}</a>`).join('')}<a class="digest-keep" href="/explainer/">新聞懶人包</a><a class="digest-keep" href="/topic/">專題懶人包</a><a href="/today/">今日時間線</a><a href="/data/">數據</a><a href="/weekly/">一週科技 · 一週財經</a><a href="/analysis/">熱門分析</a></aside>
        ${focusHtml.trim()}
        ${top}
        <div class="news-grid">${grid}</div>
      </main>
      ${homeIntroFoot()}
    </div>
    ${rankBoard(list, counts)}
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
): string {
  const feed = renderHomeFeed(items, counts, market, feedSlot, banner, focusHtml, briefingLinks);
  const boot = homeBootstrap(items) + marketBootstrap(market) + signalBootstrap(banner);
  const heroImage = items[0]?.image && /^https?:\/\//.test(items[0].image) ? items[0].image : '';
  const preload = heroImage
    ? `<link rel="preload" as="image" href="${esc(heroImage)}" fetchpriority="high" />`
    : '';
  let html = shell;
  if (preload) html = html.replace('</head>', `${preload}\n</head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${feed}</div>${boot}`);
  return html;
}

export { SSR_COUNT, hostOf };

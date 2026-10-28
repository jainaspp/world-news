import { feedTitle, siteBrand, swCacheName } from './brand.js';
import { readableSourceTitle } from './search.js';
import { CATEGORY_TILE, categoryLabel, isCategoryId } from './categories.js';
import { briefingPublic, briefingScopeOf, columnHeroSources, explainerCurrent, leadImage, sourceList as listedSources, type ContentDoc, type IndexEntry, type SourceRef } from './content.js';
import { bestImage, repairDoubledScheme } from './media.js';
import { listens } from './listen.js';
import { adsRuntimeEnabled } from './adPolicy.js';
import { adSlotMarkup, hasManualSlots, validAdSlot } from './adSlot.js';
import { FOOTER_LINKS } from './siteNav.js';
import { relatedTopics } from './topicPack.js';
import { renderCivilizationSlice } from './civilization/renderSlice.js';
import { jdToolCardMarkup } from './jdToolCard.js';
import { afterLcpBootstrap, criticalStyleTag, parkNonLcpImages } from './criticalCss.js';
import { isMostlyEnglish } from './zh.js';

/**
 * Server-rendered pages for the AI columns (/digest/, /weekly/, /analysis/).
 * They link /site.css, which is the main app's src/App.css copied at build time,
 * so the header, chips, cards, footer and dark mode are the same rules as the homepage.
 * /columns.css only adds column-specific pieces. /columns.js does theme, share, related.
 */

export interface AdConfig {
  client: string;
  /** AdSense ad unit ids. Empty, or the review hold, emits no unit and no pagead script. */
  top?: string;
  mid?: string;
  bottom?: string;
}

export interface PageOptions {
  ads?: AdConfig;
  archive?: IndexEntry[];
  status?: number;
  /** Same-day explainers linked from a briefing. */
  explainers?: IndexEntry[];
}

const DEFAULT_CLIENT = 'ca-pub-8392975944327076';
export const WEB_FONTS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@700&display=swap';

export interface HeadTune {
  /** Inline article critical CSS and keep site.css, columns.css, and webfonts off the LCP path. */
  lcp?: boolean;
  /** Absolute URL of the story LCP image. Omitted when the LCP node is text. */
  imagePreload?: string;
}

/**
 * Briefing and explainer ads stay off the title, dek, and timeline.
 * One optional unit sits after the body and before the source list.
 * The other configured unit (bottom, or top when bottom is empty) sits after sources.
 */
export function packAdSlots(ads: AdConfig | undefined): { inArticle: string; afterSources: string } {
  return {
    inArticle: validAdSlot(ads?.mid),
    afterSources: validAdSlot(ads?.bottom) || validAdSlot(ads?.top),
  };
}

export function esc(value: string): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

export function safeHttp(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(repairDoubledScheme(url));
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    if (parsed.hostname === 'https' || parsed.hostname === 'http') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function hkt(iso: string, withYear = true): string {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return '';
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    ...(withYear ? { year: 'numeric' } : {}),
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(time);
}

function tileOf(category: string | undefined) {
  const id = category && isCategoryId(category) ? category : 'world';
  return { id, ...CATEGORY_TILE[id] };
}

export function readingMinutes(doc: ContentDoc): number {
  const chars = doc.blocks.reduce((sum, block) => sum + block.title.length + block.sentences.join('').length, 0);
  return Math.max(1, Math.round(chars / 400));
}

export function catChip(category: string | undefined): string {
  const tile = tileOf(category);
  return `<a class="chip cat-chip" style="--ph:${tile.color}" href="/category/${tile.id}">${esc(categoryLabel(tile.id))}</a>`;
}

function fallbackTile(category: string | undefined, label: string, hidden = false): string {
  const tile = tileOf(category);
  const icon = `/icons/${tile.icon}.svg`;
  return `<div class="thumb thumb-fallback" style="--ph:${tile.color}" aria-hidden="true"${hidden ? ' hidden' : ''}><span class="region-icon region-icon-lg" style="mask-image:url('${icon}');-webkit-mask-image:url('${icon}')"></span><span class="thumb-source">${esc(label)}</span></div>`;
}

/** Self-hosted topic pictures are root-relative. Everything else must be an http(s) URL. */
export function safeMediaSrc(url: string | undefined): string {
  if (url && /^\/topics\/[a-z0-9-]+\.jpg$/.test(url)) return url;
  return safeHttp(url);
}

/** Feed photo with the same category-colour tile as the homepage when there is none or it fails. */
export function media(image: string | undefined, category: string | undefined, label: string, eager = false, alt = '', lcp = false): string {
  const src = safeMediaSrc(image);
  if (!src) return fallbackTile(category, label);
  const priority = lcp || eager;
  return `<img class="thumb"${lcp ? ' id="wn-lcp"' : ''} src="${esc(src)}" alt="${esc(alt)}" width="640" height="360" loading="${priority ? 'eager' : 'lazy'}"${priority ? ' fetchpriority="high"' : ''} decoding="${lcp ? 'sync' : 'async'}" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />${fallbackTile(category, label, true)}`;
}

export function favicon(url: string): string {
  const host = hostOf(url);
  if (!host) return '';
  return `<img class="favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&amp;sz=32" width="16" height="16" alt="" loading="lazy" decoding="async" />`;
}

function sourceList(sources: SourceRef[]): string {
  const rows = sources.map((source) => {
    const url = safeHttp(source.url);
    if (!url) return '';
    return `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${favicon(url)}<span class="source-name">${esc(source.source)}</span>${source.title && source.title !== source.source && readableSourceTitle(source.title) ? `<span class="source-title">${esc(source.title)}</span>` : ''}</a></li>`;
  }).join('');
  return rows ? `<ul class="source-list">${rows}</ul>` : '';
}

/** A unit is emitted only for a numeric slot id. Empty env vars produce no box and no script. */
export function adUnit(ads: AdConfig | undefined, slot: string | undefined, position: string, inArticle = false): string {
  if (!ads || !hasManualSlots([slot])) return '';
  return adSlotMarkup(inArticle ? 'feed' : 'banner', slot || '', ads.client || DEFAULT_CLIENT, position);
}

function adsForPage(substantial: boolean, ads: AdConfig | undefined): AdConfig | undefined {
  if (!substantial || !ads || !hasManualSlots([ads.top, ads.mid, ads.bottom])) return undefined;
  return ads;
}

/** Manual units only. Page-level auto ads, vignettes and anchor overlays are not emitted. */
const BANNED_AD = /enable_page_level_ads|vignette|anchor_ad|data-ad-format="anchor"|overlays\s*:/i;

/**
 * Explainer and briefing ads: at most one in-article unit, and the default unit after sources.
 * Top is not a third slot. An empty bottom falls back to top so the after-sources unit still has an id.
 */
export function packAdPlan(ads: AdConfig | undefined): { mid: string; afterSources: string } {
  const slots = packAdSlots(ads);
  return { mid: slots.inArticle, afterSources: slots.afterSources };
}

function articleSlot(ads: AdConfig | undefined, id: 'ad-mid' | 'ad-after-sources', slot: string, placeholder: boolean): string {
  const unit = adUnit(ads, slot, id, true);
  if (unit && !BANNED_AD.test(unit)) return unit.replace('<div class="ad-slot', `<div id="${id}" class="ad-slot`);
  return placeholder ? `<div id="${id}" hidden></div>` : '';
}

/**
 * AdSense loader for a pack page. It runs after the first paint, then in an idle callback,
 * so the script does not compete with the H1 or the timeline. The push is a manual unit
 * (`{}`), never enable_page_level_ads, a vignette, or an anchor overlay.
 */
export function deferredAdLoader(client: string): string {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  return `<script data-ad-loader="idle">
(function () {
  function boot() {
    if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = ${JSON.stringify(src)};
    s.onload = function () {
      document.querySelectorAll('ins.adsbygoogle').forEach(function (ins) {
        if (ins.getAttribute('data-adsbygoogle-status')) return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      });
    };
    document.body.appendChild(s);
  }
  function afterPaint() {
    var run = function () {
      if (window.requestIdleCallback) window.requestIdleCallback(boot, { timeout: 2000 });
      else window.setTimeout(boot, 1);
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(function () { window.requestAnimationFrame(run); });
    else window.setTimeout(run, 1);
  }
  afterPaint();
})();
</script>`;
}

export function packToolbar(inner: string): string {
  return `<div class="pack-toolbar">${inner}</div>`;
}

const FILLER = /來源未有提及|未有足夠|沒有足夠資料|資料未有|未有提供/;

function realSentences(sentences: string[]): string[] {
  return sentences.filter((line) => line.trim().length > 0 && !FILLER.test(line));
}

/** "N 間媒體報道" badge; colour steps up with the number of outlets. */
export function heatBadge(outlets: number): string {
  if (outlets < 2) return '';
  const level = outlets >= 5 ? 3 : outlets >= 3 ? 2 : 1;
  return `<span class="heat-badge heat-${level}">${outlets} 間媒體報道</span>`;
}

function originalTitle(title: string | undefined, url: string | undefined): string {
  // Only shown for translated (non-Chinese) headlines.
  if (!title || /[\u3400-\u9fff]/.test(title)) return '';
  const href = safeHttp(url);
  return `<p class="orig-title">原文標題：${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" lang="en">${esc(title)}</a>` : `<span lang="en">${esc(title)}</span>`}</p>`;
}

function outletAngles(sources: SourceRef[]): string {
  const seen = new Set<string>();
  const rows = sources.filter((source) => (seen.has(source.source) ? false : (seen.add(source.source), true)));
  if (rows.length < 2) return '';
  const cards = rows.map((source) => {
    const url = safeHttp(source.url);
    const when = source.pubDate ? hkt(source.pubDate, false) : '';
    return `<li class="angle-card">
          <div class="angle-head">${favicon(url)}<strong>${esc(source.source)}</strong>${when ? `<time datetime="${esc(source.pubDate || '')}">${esc(when)}</time>` : ''}</div>
          <p class="angle-text">${esc(source.angle || source.title)}</p>
          ${url ? `<a class="read-original" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${source.angle ? `<span lang="en">${esc(source.title)}</span>` : '閱讀原文'} →</a>` : ''}
        </li>`;
  }).join('');
  return `<details class="topic-fold pack-fold"><summary>各媒體角度</summary><ul class="angle-grid">${cards}</ul></details>`;
}

function timelineRows(sources: SourceRef[]): SourceRef[] {
  return sources
    .filter((source) => source.pubDate && !Number.isNaN(Date.parse(source.pubDate)))
    .sort((a, b) => Date.parse(a.pubDate || '') - Date.parse(b.pubDate || ''));
}

function timeline(sources: SourceRef[]): string {
  const rows = timelineRows(sources);
  if (rows.length < 2) return '';
  return `<section class="story column-block timeline-card" aria-label="報道時間線"><div class="story-body">
        <h2 class="column-h2">報道時間線（香港時間）</h2>
        <ol class="timeline">${rows.map((source) => `<li><time datetime="${esc(source.pubDate || '')}">${esc(hkt(source.pubDate || '', false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><strong>${esc(source.source)}</strong> <a href="${esc(safeHttp(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.angle || source.title)}</a></span></li>`).join('')}</ol>
      </div></section>`;
}

/** Vertical timeline for a 新聞懶人包. Links stay in the single source list at the bottom. */
function phaseName(index: number, total: number): string {
  if (index === 0) return '開端';
  if (index === total - 1) return '結尾';
  return '經過';
}

function eventTimeline(sources: SourceRef[]): string {
  const rows = timelineRows(sources);
  if (rows.length < 2) return '';
  const items = rows.map((source, index) => `<li><time datetime="${esc(source.pubDate || '')}">${esc(hkt(source.pubDate || '', false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><strong class="tl-phase">${phaseName(index, rows.length)}</strong> <strong>${esc(source.source)}</strong> ${esc(source.title)}</span></li>`).join('');
  return `<section class="story column-block timeline-card" aria-label="事件時間線"><div class="story-body"><h2 class="column-h2">事件時間線</h2><ol class="timeline" data-timeline="scroll">${items}</ol></div></section>`;
}

const KIND_LABEL: Record<ContentDoc['kind'], string> = {
  digest: '日報',
  weekly: '週報',
  analysis: '分析',
  briefing: '導讀',
  compare: '懶人包',
};

const KIND_NAME: Record<ContentDoc['kind'], string> = {
  ...KIND_LABEL,
  briefing: '每日香港導讀',
  compare: '新聞懶人包',
};

function modelCredit(doc: ContentDoc): string {
  if (doc.mode !== 'ai') return '';
  if (doc.provider === 'minimax' || doc.model?.toLowerCase().includes('minimax')) return 'MiniMax';
  if (doc.provider === 'grok' || doc.model?.includes('grok')) return 'xAI Grok 4.3';
  if (doc.provider === 'workers-ai' || doc.model) return 'Workers AI';
  return '';
}

function columnName(doc: ContentDoc): string {
  if (doc.kind === 'briefing') {
    const scope = briefingScopeOf(doc.key);
    if (scope === 'world') return '國際導讀';
    if (scope === 'techfin') return '科技財經導讀';
  }
  return KIND_NAME[doc.kind];
}

export function cjkChars(text: string): number {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

/** Chinese characters in the article itself. Boilerplate is not counted. */
export function pageBodyChars(doc: ContentDoc): number {
  const sentences = doc.blocks.flatMap((block) => realSentences(block.sentences));
  return cjkChars([doc.title, doc.description, ...(doc.points ?? []), ...sentences].join(''));
}

/**
 * Ads need a finished AI article. This matches the 500-character publish floor.
 * Title, description and points are included, so a real body clears it easily.
 * A list of source titles does not.
 */
export const AD_BODY_CHARS = 500;

const MODEL_FAILED_NOTICE = '模型暫時未能完成。這一版只列出來源標題，沒有加寫情節。';

/** Pages worth indexing: a finished AI body, or a briefing/explainer that already clears its public floor. */
export function columnIndexable(doc: ContentDoc): boolean {
  if (doc.mode !== 'ai') return false;
  if (doc.kind === 'briefing') return briefingPublic(doc);
  if (doc.kind === 'compare') return explainerCurrent(doc);
  if (doc.kind === 'digest' || doc.kind === 'weekly' || doc.kind === 'analysis') return pageBodyChars(doc) >= AD_BODY_CHARS;
  return false;
}

export function head(title: string, description: string, canonical: string, image: string, type: string, extra: string, client: string, loadAds = true, tune?: HeadTune): string {
  const lcp = Boolean(tune?.lcp);
  const preload = tune?.imagePreload
    ? `<link rel="preload" as="image" href="${esc(tune.imagePreload)}" fetchpriority="high" />`
    : '';
  const styles = lcp
    ? `${criticalStyleTag()}${preload}<noscript><link rel="stylesheet" href="/site.css" /><link rel="stylesheet" href="/columns.css" /></noscript>`
    : `<link rel="stylesheet" href="/site.css" />
  <link rel="stylesheet" href="/columns.css" />`;
  const fonts = lcp
    ? `<noscript><link rel="stylesheet" href="${WEB_FONTS}" /></noscript>`
    : `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${WEB_FONTS}" media="print" onload="this.media='all'" />`;
  const runtime = lcp
    ? `<noscript><script src="/live-translate.js"></script><script src="/columns.js"></script></noscript>`
    : `<script defer src="/live-translate.js"></script>
  <script defer src="/columns.js"></script>`;
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)} — ${siteBrand}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="alternate" hreflang="zh-HK" href="${esc(canonical)}" />
  <link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />
  <link rel="alternate" type="application/rss+xml" title="${esc(feedTitle)}" href="/feed.xml" />
  <meta name="theme-color" content="#161c24" />
  <meta property="og:site_name" content="${esc(siteBrand)}" />
  <meta property="og:locale" content="zh_HK" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:image" content="${esc(image || 'https://world-news.xyz/og-image.png')}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:image" content="${esc(image || 'https://world-news.xyz/og-image.png')}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png" />
  <link rel="manifest" href="/manifest.json" />
  <script>try{var s=localStorage.getItem('darkMode');if(s==='true'||(s!=='false'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');var l=localStorage.getItem('wn_lang');if(l==='en'||l==='zh-CN'||l==='zh-HK')document.documentElement.lang=l}catch(e){}</script>
  ${styles}
  ${fonts}
  ${!lcp && loadAds && client && adsRuntimeEnabled() ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(client)}" crossorigin="anonymous"></script>` : ''}
  ${runtime}
  ${extra}
</head>`;
}

/** Story, briefing, and explainer documents. Other column kinds keep blocking CSS. */
export function withLcpShell(html: string, options: { imageId?: string; adsSrc?: string } = {}): string {
  const scripts = [
    ...(options.adsSrc ? [options.adsSrc] : []),
    '/live-translate.js',
    '/columns.js',
  ];
  const boot = afterLcpBootstrap({
    stylesheets: ['/site.css', '/columns.css'],
    scripts,
    fonts: WEB_FONTS,
    imageId: options.imageId || '',
    scriptCrossOrigin: Boolean(options.adsSrc),
  });
  const parked = parkNonLcpImages(html);
  return parked.includes('</body>') ? parked.replace('</body>', `${boot}</body>`) : `${parked}${boot}`;
}

export function chrome(active: ContentDoc['kind'] | 'none' | 'data' | 'today' | 'topic' | 'quiz' | 'search' | 'saved' | 'civilization' | 'learn'): string {
  const column = (kind: ContentDoc['kind'], href: string) => `<a class="chip${active === kind ? ' active' : ''}" href="${href}"${active === kind ? ' aria-current="page"' : ''}>${KIND_LABEL[kind]}</a>`;
  const current = (key: typeof active) => active === key ? ' aria-current="page"' : '';
  const primary = `<nav class="civ-nav" aria-label="主欄目"><a class="chip civ-chip${active === 'civilization' ? ' active' : ''}" href="/civilization/"${current('civilization')}>文明</a><a class="chip" href="/civilization/chronicle/">編年</a><a class="chip" href="/#slice">今天</a><a class="chip${active === 'learn' ? ' active' : ''}" href="/learn/"${current('learn')}>開蒙</a></nav>`;
  return `<a class="skip-link" href="#content">跳到內容</a>
  <div class="chrome">
    <header class="masthead">
      <div class="masthead-title">
        <a class="logo-link" href="/" aria-label="${esc(siteBrand)}">
          <span class="logo-frame">
            <img class="logo-full logo-light" src="/brand/logo.svg?v=${swCacheName}" alt="" />
            <img class="logo-full logo-dark" src="/brand/logo-dark.svg?v=${swCacheName}" alt="" />
            <img class="logo-compact logo-light" src="/brand/logo-compact.svg?v=${swCacheName}" alt="" />
            <img class="logo-compact logo-dark" src="/brand/logo-compact-dark.svg?v=${swCacheName}" alt="" />
          </span>
        </a>
      </div>
      <div class="tab-bar">
        <div class="chip-scroller">
          ${primary}
        </div>
        <details class="nav-more">
          <summary>更多</summary>
          <nav class="filters" aria-label="更多欄目">
            ${column('digest', '/digest/')}${column('weekly', '/weekly/')}${column('analysis', '/analysis/')}${column('briefing', '/briefing/')}${column('compare', '/explainer/')}<a class="chip${active === 'topic' ? ' active' : ''}" href="/topic/"${active === 'topic' ? ' aria-current="page"' : ''}>專題</a><a class="chip${active === 'today' ? ' active' : ''}" href="/today/" title="多方報道時間線，不是軸上的今天"${current('today')}>多方時間線</a><a class="chip${active === 'data' ? ' active' : ''}" href="/data/"${active === 'data' ? ' aria-current="page"' : ''}>數據</a><a class="chip${active === 'quiz' ? ' active' : ''}" href="/quiz/"${active === 'quiz' ? ' aria-current="page"' : ''}>小測</a>
          </nav>
        </details>
        ${subscribeMenu()}
      </div>
      <form class="search-bar" role="search" action="/search/" method="get">
        <label class="sr-only" for="news-search">搜尋</label>
        <button type="button" class="icon-btn search-toggle" aria-label="搜尋" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.75" /><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" /></svg>
        </button>
        <input id="news-search" name="q" placeholder="搜尋" />
      </form>
      <details class="chrome-overflow">
        <summary class="chrome-overflow-btn" aria-label="工具">⋯</summary>
        <div class="header-actions">
          <button type="button" class="icon-btn theme-toggle" aria-label="切換深淺色模式">
            <svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" /></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.75" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" /></svg>
          </button>
        </div>
      </details>
    </header>
    <div class="hk-info column-hk" id="hk-info" hidden aria-label="香港天氣與恒生指數"></div>
  </div>
  <div id="major-slot"></div>
  <div id="alert-slot"></div>`;
}

export function footer(note = true): string {
  const links = FOOTER_LINKS.map((link) => `<a href="${link.href}">${link.label}</a>`).join('');
  const footnote = note
    ? '<p class="ai-footnote"><span class="badge">AI 整合</span> 日報、週報、分析、導讀及懶人包由 AI 根據公開標題整理，只供參考。</p>'
    : '';
  return `<footer class="app-footer">
      <p>${esc(siteBrand)}是文明時間軸。新聞是軸上的今天一片，只列出標題與出處連結，不轉載內文。<a href="https://world-news.xyz">world-news.xyz</a> · <a href="/data/">數據</a> · <a href="/major/">重大更新</a></p>
      <nav class="footer-nav" aria-label="網站資料">${links}<a href="/feed.xml">RSS</a><a class="subscribe-telegram" hidden>Telegram</a></nav>
      ${footnote}
    </footer>`;
}

/** Hidden until columns.js confirms speechSynthesis. */
export function listenControls(): string {
  return `<div class="listen" data-listen hidden>
        <button type="button" class="chip listen-play" aria-pressed="false">收聽</button>
        <button type="button" class="chip listen-stop" hidden>停止</button>
        <label class="listen-rate">語速
          <select class="listen-rate-select" aria-label="語速">
            <option value="0.75">較慢</option>
            <option value="1" selected>正常</option>
            <option value="1.25">較快</option>
            <option value="1.5">快速</option>
          </select>
        </label>
      </div>`;
}

export function bookmarkButton(input: { page: string; key: string; title: string; link: string; publishedAt: string; category?: string }): string {
  return `<button type="button" class="chip bookmark-article" data-page="${esc(input.page)}" data-key="${esc(input.key)}" data-title="${esc(input.title)}" data-link="${esc(input.link)}" data-published="${esc(input.publishedAt)}" data-category="${esc(input.category || '')}" aria-pressed="false">收藏</button>`;
}

/** Telegram link stays hidden until /api/subscribe returns a channel URL. RSS is always listed. */
export function subscribeMenu(): string {
  return `<details class="subscribe-menu">
        <summary class="chip">訂閱</summary>
        <div class="subscribe-panel" role="group" aria-label="訂閱">
          <a href="/feed.xml">RSS</a>
          <a class="subscribe-telegram" hidden rel="noopener noreferrer">Telegram</a>
        </div>
      </details>`;
}

export function share(title: string, canonical: string): string {
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${canonical}`)}`;
  return `<div class="share-buttons" data-url="${esc(canonical)}" data-title="${esc(title)}">
        <button type="button" class="chip share-copy">複製連結</button>
        <a class="chip share-wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <button type="button" class="chip share-native" hidden>分享</button>
      </div>`;
}

function archiveCard(entries: IndexEntry[], kind: ContentDoc['kind'], currentKey: string): string {
  const rows = entries.filter((entry) => entry.key !== currentKey).slice(0, 8);
  if (!rows.length) return '';
  const titled = kind === 'analysis' || kind === 'briefing' || kind === 'compare';
  const base = kind === 'compare' ? '/explainer/' : `/${kind}/`;
  const more = kind === 'analysis' ? '更多分析' : kind === 'briefing' ? '更多導讀' : kind === 'compare' ? '更多懶人包' : '往期';
  const all = kind === 'analysis' ? '全部分析' : kind === 'briefing' ? '全部導讀' : kind === 'compare' ? '全部懶人包' : '';
  return `<section class="side-card archive" aria-label="往期">
        <h2>${more}</h2>
        <ol>${rows.map((entry) => `<li><a href="${base}${encodeURIComponent(entry.key)}${titled ? '/' : ''}">${esc(titled ? entry.title : entry.key)}</a><span>${esc(hkt(entry.publishedAt, false))}</span></li>`).join('')}</ol>
        ${all ? `<a class="read-original" href="${base}">${all} →</a>` : ''}
      </section>`;
}

function keyPoints(doc: ContentDoc): string[] {
  if (doc.points?.length) return doc.points.slice(0, 4);
  if (doc.kind === 'digest') return doc.blocks.slice(0, 5).map((block) => block.title);
  return doc.blocks.map((block) => realSentences(block.sentences)[0] || '').filter(Boolean).slice(0, 4);
}

/** Up to three points already on the page: key points, else the first line of each section. */
export function igSwipePoints(doc: ContentDoc, modelFailed = false): string[] {
  if (modelFailed) return [];
  const listed = (doc.points ?? []).map((point) => point.trim()).filter(Boolean);
  if (listed.length) return listed.slice(0, 3);
  const picked: string[] = [];
  for (const block of doc.blocks) {
    if (block.title === '事件時間線') continue;
    const sentence = realSentences(block.sentences)[0];
    if (!sentence) continue;
    picked.push(sentence);
    if (picked.length >= 3) break;
  }
  return picked;
}

export function igPointList(items: string[]): string {
  const rows = items.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  if (!rows.length) return '';
  return `<ul class="ig-points">${rows.map((point) => `<li>${esc(point)}</li>`).join('')}</ul>`;
}

export function igDotsNav(): string {
  return '<nav class="ig-dots" id="ig-dots" aria-hidden="true"></nav>';
}

/** One snap card. `kind` adds a modifier such as `ig-card-lead` or `ig-card-story`. */
export function igCard(inner: string, kind = ''): string {
  const cls = kind ? `ig-card ${kind}` : 'ig-card';
  return `<div class="${cls}"><div class="ig-sheet">${inner}</div></div>`;
}

/**
 * Index deck: lead, then one card per item, then the close card.
 * Dots are a sibling of the deck so they stay put while the deck scrolls.
 */
export function igIndexDeck(head: string, items: string[], emptyHtml: string, closeTitle: string, tail = ''): string {
  const body = items.length ? items.map((item) => igCard(item, 'ig-card-story')).join('') : igCard(emptyHtml);
  return `${igDotsNav()}<div class="ig-deck" id="ig-deck">${igCard(head, 'ig-card-lead')}${body}${igCloseCard(closeTitle, tail)}</div>`;
}

/** Close card. Ad markup, when present, is passed in `rest` so it stays after sources. */
export function igCloseCard(title: string, rest: string): string {
  return `<div class="ig-card ig-card-close"><div class="ig-sheet"><div class="ig-close-only"><p class="ig-kicker">收束</p><h2 class="column-h2">完</h2><p class="dek">${esc(title)}</p><a class="chip" href="/">返回首頁</a></div>${rest}</div></div>`;
}

/**
 * Dots follow the deck at every width. 「↑ 上滑」 paints once, on the first card,
 * until the reader snaps or this session has already seen it. Padding grows past
 * 72px until the sheet edge falls between lines. Timeline cards start at 144px.
 * A line within 12px of the sheet edge counts as a cut, so the last ink stays
 * clearly above the hint. Flow cards (civilization detail) shed overflow onto
 * the next card. Chronicle runs that pass again when a webfont finishes and
 * when the visual viewport settles, then re-seats a card the reader already
 * snapped to, so the bottom line is not left on the old fallback metrics.
 * Cards do not scroll inside. No width gate: wide screens snap too.
 */
export function igDotsScript(): string {
  return `<script id="ig-dots-boot">(function(){function boot(){var deck=document.getElementById("ig-deck");var nav=document.getElementById("ig-dots");if(!deck||!nav||deck.getAttribute("data-ig-boot"))return;deck.setAttribute("data-ig-boot","1");var chronicle=!!deck.querySelector(".chronicle-page");function cards(){return Array.prototype.slice.call(deck.querySelectorAll(".ig-card"));}function sheetOf(card){return card.firstElementChild;}function els(node){return Array.prototype.filter.call(node.children,function(el){return el&&el.nodeType===1;});}function flowHost(sheet){var kids=els(sheet);for(var i=0;i<kids.length;i++)if(kids[i].classList.contains("civ-article"))return kids[i];return sheet;}function clipOf(host){var sheet=host.classList&&host.classList.contains("ig-sheet")?host:(host.closest?host.closest(".ig-sheet"):null);return (sheet||host).getBoundingClientRect();}function overflows(host){var box=clipOf(host);if(box.height<8)return false;var kids=els(host);for(var i=0;i<kids.length;i++){var r=kids[i].getBoundingClientRect();if(r.width<1&&r.height<1)continue;if(r.bottom>box.bottom+0.5)return true;}return false;}function takeTail(node){if(!node||node.nodeType!==1)return null;var tag=node.tagName;if(tag==="IMG"||tag==="PICTURE"||tag==="CANVAS"||tag==="SVG")return null;if(tag==="FIGURE"){var caps=els(node);for(var c=caps.length-1;c>=0;c--)if(caps[c].tagName==="FIGCAPTION")return caps[c];return null;}if(tag==="TABLE"){var body=node.tBodies&&node.tBodies[0];if(body&&body.rows.length>1)return body.rows[body.rows.length-1];return null;}var kids=els(node);if(kids.length>1)return kids[kids.length-1];if(kids.length===1)return takeTail(kids[0]);return null;}function splitNode(node){var total=(node.textContent||"").replace(/\\s/g,"").length;if(total<16)return null;var budget=Math.ceil((node.textContent||"").length/2);var clone=node.cloneNode(true);function trim(root,keepHead){var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);var nodes=[];var n;while((n=walker.nextNode()))nodes.push(n);var count=0;for(var i=0;i<nodes.length;i++){var t=nodes[i].textContent||"";if(keepHead){if(count>=budget)nodes[i].textContent="";else if(count+t.length>budget){nodes[i].textContent=t.slice(0,budget-count);count=budget;}else count+=t.length;}else if(count+t.length<=budget){nodes[i].textContent="";count+=t.length;}else{var cut=Math.max(0,budget-count);nodes[i].textContent=t.slice(cut);count=budget+t.length;}}}trim(node,true);trim(clone,false);if(!(clone.textContent||"").replace(/\\s/g,""))return null;if(node.nextSibling)node.parentNode.insertBefore(clone,node.nextSibling);else node.parentNode.appendChild(clone);return clone;}function continuation(card){var n=card.nextElementSibling;if(n&&n.getAttribute("data-ig-cont")==="1")return n;var born=document.createElement("div");born.className="ig-card ig-card-flow";born.setAttribute("data-ig-cont","1");var sheet=document.createElement("div");sheet.className="ig-sheet";born.appendChild(sheet);card.parentNode.insertBefore(born,n);return born;}function ensureArticle(nextCard,sourceHost){var sheet=sheetOf(nextCard);if(!sourceHost.classList.contains("civ-article"))return sheet;var kids=els(sheet);var article=null;for(var i=0;i<kids.length;i++)if(kids[i].classList.contains("civ-article"))article=kids[i];if(!article){article=document.createElement("article");article.className=sourceHost.className;sheet.appendChild(article);}return article;}function park(node,dest,tableNode){if(node.tagName==="TR"){var table=dest.querySelector("table");if(!table){table=document.createElement("table");if(tableNode)table.className=tableNode.className;var head=tableNode&&tableNode.querySelector("thead");if(head)table.appendChild(head.cloneNode(true));table.appendChild(document.createElement("tbody"));dest.appendChild(table);}var body=table.querySelector("tbody");body.insertBefore(node,body.firstChild);return;}dest.insertBefore(node,dest.firstChild);}function shiftTail(node,sink,box){var kids=els(node);var splitAt=-1;var child=null;for(var i=0;i<kids.length;i++){if(kids[i].getAttribute("data-ig-kept")==="1")continue;var r=kids[i].getBoundingClientRect();if(r.width<1&&r.height<1)continue;if(r.bottom>box.bottom+0.5){splitAt=i;child=kids[i];break;}}if(splitAt<0||!child)return false;var rect=child.getBoundingClientRect();var taller=rect.height>box.height*0.86;if(!taller&&(rect.top>box.top+24||rect.top>=box.bottom-1)){var bin=sink();var moved=false;for(var j=splitAt;j<kids.length;j++){if(kids[j].getAttribute("data-ig-kept")==="1")continue;bin.appendChild(kids[j]);moved=true;}return moved;}if(els(child).length&&shiftTail(child,sink,box))return true;var inner=takeTail(child);if(inner&&inner!==child){park(inner,sink(),inner.tagName==="TR"?(inner.closest?inner.closest("table"):child):null);return true;}var born=splitNode(child);if(born){park(born,sink(),null);return true;}child.setAttribute("data-ig-kept","1");var rest=false;var bin2=null;for(var k=splitAt+1;k<kids.length;k++){if(kids[k].getAttribute("data-ig-kept")==="1")continue;if(!bin2)bin2=sink();bin2.appendChild(kids[k]);rest=true;}return rest;}function relieve(card){var sheet=sheetOf(card);if(!sheet)return false;var host=flowHost(sheet);if(!host)return false;var box=clipOf(host);if(box.height<8)return false;var dest=null;function sink(){if(!dest)dest=ensureArticle(continuation(card),host);return dest;}return shiftTail(host,sink,box);}function paginateAll(){if(!deck.querySelector(".ig-card-flow"))return;var stale=deck.querySelectorAll("[data-ig-kept]");for(var s=0;s<stale.length;s++)stale[s].removeAttribute("data-ig-kept");var pending=[deck.querySelector(".ig-card-flow")];var seen=0;var moves=0;while(pending.length&&seen<240){var card=pending.shift();seen++;var spins=0;while(spins<200&&relieve(card)){spins++;moves++;}var cont=card.nextElementSibling;if(cont&&cont.getAttribute("data-ig-cont")==="1")pending.push(cont);}deck.setAttribute("data-ig-stat",seen+":"+moves);}function hintOnce(){var seen=false;try{seen=sessionStorage.getItem("wn_ig_hint")==="1";}catch(e){}if(seen||deck.scrollTop>24){deck.setAttribute("data-ig-hint","done");return;}function finish(){deck.setAttribute("data-ig-hint","done");try{sessionStorage.setItem("wn_ig_hint","1");}catch(e){}}function onHint(){if(deck.scrollTop>24){deck.removeEventListener("scroll",onHint);finish();}}deck.addEventListener("scroll",onHint,{passive:true});}function sliver(sheet,partial){var box=sheet.getBoundingClientRect();var top=0,bottom=0;if(box.height<8)return {top:0,bottom:0};var atoms=sheet.querySelectorAll(".chip,.line-chip,.pack-toolbar,button,select,img,figure,.stage-frame,.civ-block-figure");for(var a=0;a<atoms.length;a++){var ar=atoms[a].getBoundingClientRect();if(ar.width<2||ar.height<2)continue;if(ar.top>box.top&&ar.top<box.bottom-0.5&&ar.bottom>box.bottom+0.5)bottom=Math.max(bottom,box.bottom-ar.top+2);if(ar.bottom<box.bottom&&ar.bottom>box.top+0.5&&ar.top<box.top-0.5)top=Math.max(top,ar.bottom-box.top+2);}var walker=document.createTreeWalker(sheet,NodeFilter.SHOW_TEXT);var range=document.createRange();var node;while((node=walker.nextNode())){if(!node.textContent||!/\\S/.test(node.textContent))continue;var host=node.parentElement;if(host&&host.closest&&host.closest(".chip,.pack-toolbar,button,select"))continue;range.selectNodeContents(node);var rects=range.getClientRects();for(var i=0;i<rects.length;i++){var r=rects[i];if(r.width<1||r.height<1)continue;if(r.top>box.top&&r.top<box.bottom+2&&r.bottom>box.bottom-0.5)bottom=Math.max(bottom,box.bottom-r.top+2);if(partial&&r.top>box.top&&r.bottom<=box.bottom&&box.bottom-r.bottom<12)bottom=Math.max(bottom,box.bottom-r.top+2);if(partial&&r.height<12&&r.top>box.top&&r.top<box.bottom&&r.bottom>box.bottom-1)bottom=Math.max(bottom,box.bottom-r.top+2);if(r.bottom<box.bottom&&r.bottom>box.top-2&&r.top<box.top+0.5)top=Math.max(top,r.bottom-box.top+2);}}return {top:top,bottom:bottom};}function seat(){var list=cards();for(var i=0;i<list.length;i++){var card=list[i];var sheet=sheetOf(card);if(!sheet)continue;var timeline=card.classList.contains("ig-card-timeline");var floor=timeline?144:72;var flow=card.classList.contains("ig-card-flow");card.style.paddingBottom=floor+"px";sheet.style.paddingTop="0px";if(flow)continue;var guard=0;while(guard<8){var cut=sliver(sheet,timeline);if(cut.top<1&&cut.bottom<1)break;if(cut.top>=1){var pt=parseFloat(getComputedStyle(sheet).paddingTop)||0;sheet.style.paddingTop=(pt+Math.ceil(cut.top))+"px";}if(cut.bottom>=1){var pb=parseFloat(getComputedStyle(card).paddingBottom)||floor;card.style.paddingBottom=(pb+Math.ceil(cut.bottom))+"px";}guard++;}}}function build(){nav.textContent="";cards().forEach(function(_,i){var dot=document.createElement("i");if(i===0)dot.className="on";nav.appendChild(dot);});}function sync(){var list=cards();var dots=nav.children;if(dots.length!==list.length)build();dots=nav.children;var edge=deck.getBoundingClientRect().top+deck.clientHeight*0.35;var idx=0;for(var i=0;i<list.length;i++){if(list[i].getBoundingClientRect().top<=edge+1)idx=i;}for(var j=0;j<dots.length;j++)dots[j].classList.toggle("on",j===idx);for(var k=0;k<list.length;k++)list[k].classList.toggle("ig-on",k===idx);}function reflow(){var mark=0;var restore=chronicle&&deck.scrollTop>1;if(restore){var before=cards();var edge=deck.getBoundingClientRect().top+1;for(var i=0;i<before.length;i++)if(before[i].getBoundingClientRect().top<=edge)mark=i;}paginateAll();seat();paginateAll();build();sync();if(restore){var after=cards();if(after[mark]){var behavior=deck.style.scrollBehavior;deck.style.scrollBehavior="auto";deck.scrollTop=after[mark].offsetTop;deck.style.scrollBehavior=behavior;}}}hintOnce();reflow();deck.addEventListener("scroll",function(){requestAnimationFrame(sync);},{passive:true});window.addEventListener("resize",function(){reflow();});window.addEventListener("load",function(){reflow();});if(document.fonts&&document.fonts.ready)document.fonts.ready.then(reflow);if(chronicle){if(document.fonts)document.fonts.addEventListener("loadingdone",function(){reflow();requestAnimationFrame(reflow);});if(window.visualViewport)window.visualViewport.addEventListener("resize",function(){reflow();});}}window.__wnIgDots=boot;boot();})();</script>`;
}

function blockPieces(block: { title: string; sentences: string[] }): string[] {
  const sentences = block.sentences.filter(Boolean);
  if (!sentences.length) return [];
  const paras = sentences.map((sentence) => `<p>${esc(sentence)}</p>`);
  return [`<h2 class="column-h2">${esc(block.title)}</h2>${paras[0]}`, ...paras.slice(1)];
}

/** One body card, or 3a/3b when the prose is long enough to split. Still a single pack-body. */
export function igBodyCards(blocks: { title: string; sentences: string[] }[], lead = ''): string {
  const pieces = blocks.flatMap(blockPieces);
  const chars = blocks.reduce((sum, block) => sum + block.sentences.join('').length, 0);
  const split = pieces.length >= 2 && (pieces.length >= 5 || blocks.length >= 4 || chars > 700);
  if (!pieces.length && !lead.trim()) return '';
  if (!split) return `<div class="ig-card ig-card-body"><section class="pack-body">${lead}${pieces.join('')}</section></div>`;
  const mid = Math.ceil(pieces.length / 2);
  return `<section class="pack-body"><div class="ig-card ig-card-body ig-body-part" data-ig="3a"><div class="ig-sheet">${lead}${pieces.slice(0, mid).join('')}</div></div><div class="ig-card ig-card-body ig-body-part" data-ig="3b"><div class="ig-sheet">${pieces.slice(mid).join('')}</div></div></section>`;
}

export function renderContentPage(doc: ContentDoc, canonical: string, options: PageOptions = {}): string {
  const sources = [...new Map(doc.blocks.flatMap((block) => block.sources).map((source) => [source.url, source])).values()];
  const listed = doc.kind === 'briefing' || doc.kind === 'compare' ? listedSources(doc) : (doc.citations?.length ? doc.citations.slice(0, 10) : sources);
  const image = safeHttp(doc.kind === 'weekly' || doc.kind === 'digest' || doc.kind === 'analysis' ? leadImage(doc) : bestImage(sources));
  const outlets = new Set(sources.map((source) => source.source)).size;
  const timelineBlock = doc.kind === 'compare' ? doc.blocks.find((block) => block.title === '事件時間線') : undefined;
  const shownBlocks = doc.blocks
    .filter((block) => block !== timelineBlock)
    .map((block) => ({ ...block, sentences: realSentences(block.sentences) }))
    .filter((block) => block.sentences.length > 0);
  // A block of source titles is not a body. Failure pages (mode !== 'ai') show
  // MODEL_FAILED_NOTICE and must not load AdSense even when a slot id is configured.
  const modelFailed = doc.mode !== 'ai';
  const substantial = !modelFailed && shownBlocks.length > 0 && pageBodyChars(doc) >= AD_BODY_CHARS;
  const ads = adsForPage(substantial, options.ads);
  const client = ads ? (ads.client || DEFAULT_CLIENT) : '';
  const categories = [...new Set(doc.blocks.flatMap((block) => [block.category, ...block.sources.map((source) => source.category)]).filter((id): id is string => Boolean(id)))].slice(0, 4);
  const leadCategory = categories[0] || 'world';
  const description = doc.description.slice(0, 180);
  const minutes = readingMinutes(doc);
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        headline: doc.title,
        datePublished: doc.publishedAt,
        ...(doc.updatedAt ? { dateModified: doc.updatedAt } : {}),
        inLanguage: 'zh-HK',
        mainEntityOfPage: canonical,
        ...(image ? { image: [image] } : {}),
        author: { '@type': 'Organization', name: siteBrand },
        isBasedOn: listed.map((source) => ({ '@type': 'NewsArticle', headline: source.title, url: source.url })),
      },
      { '@type': 'Article', headline: doc.title, datePublished: doc.publishedAt, inLanguage: 'zh-HK', mainEntityOfPage: canonical },
    ],
  };
  const comparePublic = doc.kind === 'compare' && explainerCurrent(doc);
  const briefingOk = doc.kind === 'briefing' && briefingPublic(doc);
  const thinColumn = (doc.kind === 'digest' || doc.kind === 'weekly' || doc.kind === 'analysis') && !substantial;
  const robots = modelFailed || thinColumn || ((doc.kind === 'briefing' || doc.kind === 'compare') && !briefingOk && !comparePublic)
    ? '<meta name="robots" content="noindex,follow" />'
    : '<meta name="robots" content="index,follow" />';
  const ld = `${robots}<script type="application/ld+json">${JSON.stringify(json).replace(/</g, '\\u003c')}</script>`;
  const note = modelFailed ? `<p class="notice" role="status">${MODEL_FAILED_NOTICE}</p>` : '';
  const empty = !modelFailed && !shownBlocks.length ? '<p class="notice">這一期暫時沒有足夠的多方來源。</p>' : '';
  const pack = doc.kind === 'briefing' || doc.kind === 'compare';
  const points = modelFailed || pack ? [] : keyPoints(doc);
  const pointsLabel = doc.kind === 'digest' ? '今期重點' : '重點';
  const pointsBox = points.length > 1 ? `<section class="key-points pack-shell" aria-label="${pointsLabel}"><h2>${pointsLabel}</h2><ul>${points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul></section>` : '';
  const highlight = !modelFailed && !pack && doc.highlight?.items.length
    ? `<section class="highlight-box" aria-label="${esc(doc.highlight.label)}"><h2>${esc(doc.highlight.label)}</h2><ul>${doc.highlight.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`
    : '';
  const bodyBlocks = modelFailed ? [] : shownBlocks;
  const looseBlocks = pack ? [] : bodyBlocks;
  const midAt = Math.max(1, Math.ceil(looseBlocks.length / 2));
  const blocks = looseBlocks.map((block, index) => {
    const blockImage = doc.kind === 'analysis' ? '' : safeHttp(bestImage(columnHeroSources(block.sources, doc.kind)));
    const blockCategory = block.category || block.sources[0]?.category;
    const showMedia = doc.kind === 'digest' && index > 0;
    const points = `<ul class="points">${block.sentences.map((sentence) => `<li>${esc(sentence)}</li>`).join('')}</ul>`;
    const secondary = (doc.kind === 'compare' || doc.kind === 'analysis') && /背景|各方|反應|回應|後續|點解要關心|與香港|接落嚟/.test(block.title);
    const section = secondary
      ? `<details class="topic-fold pack-fold"><summary>${esc(block.title)}</summary>${points}</details>`
      : `<section class="story column-block${showMedia ? ' with-media' : ''}" id="s${index + 1}">
        ${showMedia ? `<div class="story-media">${media(blockImage, blockCategory, block.sources[0]?.source || categoryLabel(blockCategory || 'world'))}</div>` : ''}
        <div class="story-body">
          <div class="story-kicker">${doc.kind === 'analysis' ? `<span class="block-no">${index + 1}</span>` : catChip(blockCategory)}${doc.kind !== 'analysis' ? heatBadge(new Set(block.sources.map((s) => s.source)).size) : ''}</div>
          <h2 class="column-h2">${esc(block.title)}</h2>
          ${doc.kind === 'digest' ? originalTitle(block.originalTitle, block.sources[0]?.url) : ''}
          ${points}
        </div>
      </section>`;
    return section + (index + 1 === midAt && looseBlocks.length > 1 ? adUnit(ads, ads?.mid, 'mid', true) : '');
  }).join('');
  const analysisTimeline = !modelFailed && doc.kind === 'analysis' ? timeline(sources) : '';
  const angles = !modelFailed && doc.kind === 'analysis' ? outletAngles(sources) : '';
  const rich = pack;
  const timelineSources = timelineBlock && timelineRows(timelineBlock.sources).length >= 2 ? timelineBlock.sources : sources;
  const explainerTimeline = !modelFailed && pack ? eventTimeline(timelineSources) : '';
  const sourceListHtml = sourceList(listed);
  const sourceSection = sourceListHtml
    ? (pack
      ? `<section class="pack-sources" aria-label="來源"><h2 class="column-h2">來源（${listed.length}）</h2>${sourceListHtml}</section>`
      : `<details class="topic-fold pack-fold"><summary>來源（${listed.length}）</summary>${sourceListHtml}</details>`)
    : '';
  const civSlice = !modelFailed && doc.kind === 'compare'
    ? renderCivilizationSlice({ key: doc.key, title: doc.title, description: doc.description })
    : '';
  const toolCard = comparePublic ? jdToolCardMarkup(doc.key) : '';
  const topicHits = doc.kind === 'compare'
    ? relatedTopics([doc.title, doc.description, ...(doc.points ?? []), ...doc.blocks.flatMap((block) => [block.title, ...block.sentences, ...block.sources.map((source) => source.title)])].join('\n')).slice(0, 2)
    : [];
  const topicLinks = topicHits.length
    ? `<nav class="topic-links" aria-label="相關專題">${topicHits.map((topic) => `<a class="chip" href="/topic/${topic.slug}/">${esc(topic.title)}</a>`).join('')}</nav>`
    : '';
  const explainerLinks = doc.kind === 'briefing' && options.explainers?.length
    ? `<section class="story column-block" aria-label="今日新聞懶人包"><div class="story-body"><h2 class="column-h2">今日新聞懶人包</h2><ul class="points">${options.explainers.slice(0, 8).map((entry) => `<li><a href="/explainer/${encodeURIComponent(entry.key)}/">${esc(entry.title)}</a></li>`).join('')}</ul></div></section>`
    : '';
  const credit = rich ? modelCredit(doc) : '';
  const showDek = doc.kind === 'analysis' || rich;
  const relatedCats = categories.join(',');
  const exclude = sources.map((source) => source.url).slice(0, 30);
  const bookmark = listens(doc.kind) ? `${listenControls()}${bookmarkButton({
    page: doc.kind === 'compare' ? 'explainer' : doc.kind,
    key: doc.key,
    title: doc.title,
    link: (() => { try { return new URL(canonical).pathname; } catch { return canonical; } })(),
    publishedAt: doc.publishedAt,
    category: leadCategory,
  })}` : '';
  const metaInner = `<time datetime="${esc(doc.publishedAt)}">${esc(doc.hkt || hkt(doc.publishedAt))} 香港時間</time><span>· 閱讀約 ${minutes} 分鐘</span>${sources.length ? `<span>· ${outlets} 間媒體 · ${sources.length} 篇報道</span>` : ''}${doc.updatedAt ? `<span>· 最後更新 ${esc(hkt(doc.updatedAt))}</span>` : ''}${credit ? `<span class="model-credit">${esc(credit)}</span>` : ''}`;
  const meta = `<div class="story-meta">${metaInner}${pack && doc.kind === 'compare' ? heatBadge(outlets) : ''}${pack ? categories.map(catChip).join('') : ''}</div>`;
  const titleClass = `story-title column-title${doc.kind === 'compare' && isMostlyEnglish(doc.title) ? ' title-reserve' : ''}`;
  const plan = packAdPlan(options.ads);
  const midHtml = pack ? articleSlot(ads, 'ad-mid', plan.mid, plan.mid !== '') : '';
  const afterHtml = pack ? articleSlot(ads, 'ad-after-sources', plan.afterSources, true) : '';
  const adBoot = (midHtml + afterHtml).includes('adsbygoogle') ? deferredAdLoader(client || options.ads?.client || DEFAULT_CLIENT) : '';
  const packImage = pack ? `<div class="story-media">${media(image, leadCategory, sources[0]?.source || siteBrand, false)}</div>` : '';
  const packOriginal = pack ? originalTitle(doc.originalTitle, doc.originalUrl || sources[0]?.url) : '';
  const packLead = `${packImage}${packOriginal}${note}${empty}`;
  const packBody = pack ? igBodyCards(bodyBlocks, packLead) : '';
  const related = `<section class="related" id="related" data-categories="${esc(relatedCats)}" data-exclude="${esc(JSON.stringify(exclude))}" hidden>
        <h2 class="section-title">相關頭條</h2>
        <div class="news-grid related-grid"></div>
      </section>`;
  const swipePoints = igPointList(igSwipePoints(doc, modelFailed));
  const packMain = `${igDotsNav()}<div class="ig-deck" id="ig-deck">
      <div class="ig-card ig-card-lead"><article class="story story-hero column-hero pack-shell pack-article">
        <div class="story-body">
          <div class="story-kicker">${modelFailed ? '' : '<span class="badge ai-badge">AI 整合</span>'}<span class="kicker-region">${columnName(doc)}</span></div>
          <h1 class="${titleClass}">${esc(doc.title)}</h1>
          ${showDek ? `<p class="dek">${esc(description)}</p>` : ''}
          ${swipePoints}
          ${meta}
          ${packToolbar(`${share(doc.title, canonical)}${bookmark}`)}
        </div>
      </article></div>
      ${explainerTimeline ? `<div class="ig-card ig-card-timeline">${explainerTimeline}</div>` : ''}
      ${packBody}
      ${midHtml}
      ${civSlice ? `<div class="ig-extra">${civSlice}</div>` : ''}
      ${toolCard ? `<div class="ig-extra">${toolCard}</div>` : ''}
      ${sourceSection ? `<div class="ig-card ig-card-sources">${sourceSection}</div>` : ''}
      ${igCloseCard(doc.title, `${afterHtml}${related}${topicLinks}${explainerLinks}`)}
      </div>`;
  const columnMain = `<article class="story story-hero column-hero${doc.kind === 'analysis' ? ' pack-shell' : ''}">
        <div class="story-media">${media(image, leadCategory, sources[0]?.source || siteBrand, true)}</div>
        <div class="story-body">
          <div class="index-title-row">
            <div class="story-kicker">${modelFailed ? '' : '<span class="badge ai-badge">AI 整合</span>'}<span class="kicker-region">${columnName(doc)}</span>${doc.kind === 'analysis' ? heatBadge(outlets) : ''}${credit ? `<span class="model-credit">${esc(credit)}</span>` : ''}${categories.map(catChip).join('')}</div>
            <h1 class="story-title column-title">${esc(doc.title)}</h1>
          </div>
          ${doc.kind === 'analysis' ? originalTitle(doc.originalTitle, doc.originalUrl || sources[0]?.url) : ''}
          ${showDek ? `<p class="dek">${esc(description)}</p>` : ''}
          ${meta}
          ${share(doc.title, canonical)}
          ${bookmark}
        </div>
      </article>
      ${adUnit(ads, ads?.top, 'top')}
      ${note}
      ${empty}
      ${pointsBox || highlight ? `<div class="column-boxes">${pointsBox}${highlight}</div>` : ''}
      ${topicLinks}
      ${angles}
      ${blocks}
      ${explainerLinks}
      ${analysisTimeline}
      ${sourceSection}
      ${adUnit(ads, ads?.bottom, 'bottom')}
      ${related}`;

  const html = `<!doctype html>
<html lang="zh-HK">
${head(doc.title, description, canonical, image, 'article', ld, client, !pack, pack ? { lcp: true } : undefined)}
<body>
  <div class="page column-page" data-kind="${doc.kind}">
  ${chrome(doc.kind)}
  <div class="layout">
    <main id="content" class="column-main">
      ${pack ? packMain : columnMain}
    </main>
    <aside class="sidebar" aria-label="側欄">
      ${archiveCard(options.archive ?? [], doc.kind, doc.key)}
    </aside>
  </div>
  ${footer(!pack)}
  </div>
  ${pack ? igDotsScript() : ''}
  ${adBoot}
</body>
</html>`;
  return pack ? withLcpShell(html) : html;
}

function packPreviewList(entry: IndexEntry): string {
  const lines = (entry.preview ?? []).map((line) => line.trim()).filter(Boolean).slice(0, 2);
  if (lines.length < 2) return '';
  return `<ol class="pack-preview">${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ol>`;
}

/** Index card shared by 新聞懶人包 and 熱門分析: kicker, title, one dek, two preview lines. */
function columnPackCard(entry: IndexEntry, href: string, kicker: string, index: number, sourceWord: string, showOriginal = false): string {
  const dek = entry.description ? `<p class="dek">${esc(entry.description)}</p>` : '';
  const original = showOriginal && entry.originalTitle && !/[\u3400-\u9fff]/.test(entry.originalTitle)
    ? `<p class="orig-title" lang="en">${esc(entry.originalTitle)}</p>`
    : '';
  return `<article class="story pack-shell">
          <a class="story-media" href="${href}" tabindex="-1" aria-hidden="true">${media(entry.image, entry.category, categoryLabel(entry.category || 'world'), index < 2)}</a>
          <div class="story-body">
            <div class="story-kicker"><span class="pack-kicker">${esc(kicker)}</span><span class="badge ai-badge">AI 整合</span>${heatBadge(entry.outlets ?? entry.sources) || `<span class="cluster-badge">${entry.sources} 篇${sourceWord}</span>`}${catChip(entry.category)}</div>
            <h2 class="story-title"><a href="${href}">${esc(entry.title)}</a></h2>
            ${original}
            ${dek}
            ${packPreviewList(entry)}
            <div class="story-meta"><time datetime="${esc(entry.publishedAt)}">${esc(hkt(entry.publishedAt, false))}</time></div>
          </div>
        </article>`;
}

/** Recent pieces (within 48 h of the newest) first, by outlet count then time; older pieces after. */
export function sortByHeat(entries: IndexEntry[]): IndexEntry[] {
  const times = entries.map((entry) => Date.parse(entry.publishedAt)).filter(Number.isFinite);
  const newest = times.length ? Math.max(...times) : 0;
  const fresh = (entry: IndexEntry) => newest - Date.parse(entry.publishedAt) <= 48 * 3600 * 1000;
  const heat = (entry: IndexEntry) => entry.outlets ?? entry.sources ?? 0;
  return [...entries].sort((a, b) => Number(fresh(b)) - Number(fresh(a)) || heat(b) - heat(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function renderAnalysisIndex(entries: IndexEntry[], canonical: string, _options: PageOptions = {}): string {
  // Directory pages stay ad-free. A card grid is not an article body.
  const title = '熱門分析';
  const description = '多個來源同時報道的熱門新聞：背景、各方說法、與香港的關係。AI 根據公開標題整理。';
  const sorted = sortByHeat(entries);
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: sorted.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, name: entry.title, url: `https://world-news.xyz/analysis/${encodeURIComponent(entry.key)}` })),
  }).replace(/</g, '\\u003c')}</script>`;
  const robots = `<meta name="robots" content="${entries.length ? 'index,follow' : 'noindex,follow'}" />`;
  const headHtml = `<header class="index-head">
      <div class="index-title-row">
        <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">分析</span></div>
        <h1 class="column-title">${title}</h1>
      </div>
      <p class="dek">${esc(description)}</p>
    </header>`;
  const itemCards = sorted.map((entry, index) => columnPackCard(entry, `/analysis/${encodeURIComponent(entry.key)}/`, '熱門分析', index, '報道', true));
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, entries.find((entry) => entry.image)?.image || '', 'website', `${robots}${ld}`, '', false)}
<body>
  <div class="page column-page ig-snap" data-kind="analysis-index">
  ${chrome('analysis')}
  <main id="content" class="column-index ig-frame">
    ${igIndexDeck(headHtml, itemCards, '<p class="notice">暫時未有分析。熱門新聞有三個或以上來源報道時，會自動整理一篇。</p>', title, footer(false))}
  </main>
  </div>
  ${igDotsScript()}
</body>
</html>`;
}

const LISTING: Record<'briefing' | 'compare', { title: string; description: string; empty: string; kicker: string }> = {
  briefing: {
    title: '每日導讀',
    description: '每日早上與傍晚：香港與內地、國際、科技與財經，各寫成一篇導讀。',
    empty: '暫時未有導讀。每日 07:30 與 18:30（香港時間）會整理香港、國際和科技財經三篇。',
    kicker: '導讀',
  },
  compare: {
    title: '新聞懶人包',
    description: '多間媒體報道同一件事時，收成一篇懶人包：重點、時間線、數字、經過和後續。',
    empty: '暫時未有懶人包。有多間媒體報道同一件事時，會在這裡列出。',
    kicker: '懶人包',
  },
};

/** Listing page for 每日香港導讀 or 新聞懶人包. */
export function renderColumnIndex(kind: 'briefing' | 'compare', entries: IndexEntry[], canonical: string, _options: PageOptions = {}): string {
  const meta = LISTING[kind];
  const path = kind === 'compare' ? 'explainer' : kind;
  const sorted = [...entries].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const cardKicker = kind === 'compare' ? '新聞懶人包' : meta.kicker;
  const itemCards = sorted.map((entry, index) => columnPackCard(entry, `/${path}/${encodeURIComponent(entry.key)}/`, cardKicker, index, '來源'));
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: meta.title,
    itemListElement: sorted.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.title,
      url: `https://world-news.xyz/${path}/${encodeURIComponent(entry.key)}`,
    })),
  }).replace(/</g, '\\u003c')}</script>`;
  const headHtml = `<header class="index-head">
      <div class="index-title-row">
        <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">${meta.kicker}</span></div>
        <h1 class="column-title">${meta.title}</h1>
      </div>
      <p class="dek">${esc(meta.description)}</p>
    </header>`;
  return `<!doctype html>
<html lang="zh-HK">
${head(meta.title, meta.description, canonical, entries.find((entry) => entry.image)?.image || '', 'website', `<meta name="robots" content="index,follow" />${ld}`, '', false)}
<body>
  <div class="page column-page ig-snap" data-kind="${kind}-index">
  ${chrome(kind)}
  <main id="content" class="column-index ig-frame">
    ${igIndexDeck(headHtml, itemCards, `<p class="notice">${esc(meta.empty)}</p>`, meta.title, footer(false))}
  </main>
  </div>
  ${igDotsScript()}
</body>
</html>`;
}

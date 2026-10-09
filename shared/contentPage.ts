import { readableSourceTitle } from './search.js';
import { CATEGORY_TILE, categoryLabel, isCategoryId } from './categories.js';
import { briefingPublic, briefingScopeOf, explainerCurrent, sourceList as listedSources, type ContentDoc, type IndexEntry, type SourceRef } from './content.js';
import { bestImage } from './media.js';
import { listens } from './listen.js';
import { FOOTER_LINKS } from './siteNav.js';
import { relatedTopics } from './topicPack.js';

/**
 * Server-rendered pages for the AI columns (/digest/, /weekly/, /analysis/).
 * They link /site.css, which is the main app's src/App.css copied at build time,
 * so the header, chips, cards, footer and dark mode are the same rules as the homepage.
 * /columns.css only adds column-specific pieces. /columns.js does theme, share, related.
 */

export interface AdConfig {
  client: string;
  /** AdSense ad unit ids. Empty means no manual unit; Auto ads (if on in AdSense) still place ads. */
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
const FONTS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@700&display=swap';

export function esc(value: string): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char
  ));
}

export function safeHttp(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
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
export function media(image: string | undefined, category: string | undefined, label: string, eager = false, alt = ''): string {
  const src = safeMediaSrc(image);
  if (!src) return fallbackTile(category, label);
  return `<img class="thumb" src="${esc(src)}" alt="${esc(alt)}" width="640" height="360" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />${fallbackTile(category, label, true)}`;
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

function adUnit(ads: AdConfig | undefined, slot: string | undefined, position: string, inArticle = false): string {
  const id = (slot || '').trim();
  if (!ads || !/^\d{6,}$/.test(id)) return '';
  const format = inArticle
    ? 'data-ad-layout="in-article" data-ad-format="fluid" style="display:block;text-align:center"'
    : 'data-ad-format="auto" data-full-width-responsive="true" style="display:block"';
  return `<div class="ad-slot ${inArticle ? 'ad-slot-feed' : 'ad-slot-banner'}" data-ad-position="${position}" aria-label="廣告"><span class="ad-label">廣告</span><ins class="adsbygoogle" data-ad-client="${esc(ads.client)}" data-ad-slot="${esc(id)}" ${format}></ins></div>`;
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
  return `<section class="angles" aria-label="各媒體角度"><h2 class="section-title">各媒體角度</h2><ul class="angle-grid">${cards}</ul></section>`;
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
  return `<section class="story column-block timeline-card" aria-label="事件時間線"><div class="story-body"><h2 class="column-h2">事件時間線</h2><ol class="timeline">${items}</ol></div></section>`;
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

export function head(title: string, description: string, canonical: string, image: string, type: string, extra: string, client: string, loadAds = true): string {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — 世界頭條</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="alternate" hreflang="zh-HK" href="${esc(canonical)}" />
  <link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />
  <link rel="alternate" type="application/rss+xml" title="世界頭條" href="/feed.xml" />
  <meta name="theme-color" content="#1D4F91" />
  <meta property="og:site_name" content="世界頭條" />
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
  <link rel="stylesheet" href="/site.css" />
  <link rel="stylesheet" href="/columns.css" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'" />
  ${loadAds && client ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(client)}" crossorigin="anonymous"></script>` : ''}
  <script defer src="/live-translate.js"></script>
  <script defer src="/columns.js"></script>
  ${extra}
</head>`;
}

export function chrome(active: ContentDoc['kind'] | 'none' | 'data' | 'today' | 'topic' | 'quiz' | 'search' | 'saved'): string {
  const column = (kind: ContentDoc['kind'], href: string) => `<a class="chip${active === kind ? ' active' : ''}" href="${href}"${active === kind ? ' aria-current="page"' : ''}>${KIND_LABEL[kind]}</a>`;
  return `<a class="skip-link" href="#content">跳到內容</a>
  <div class="chrome">
    <header class="masthead">
      <div class="masthead-title">
        <a class="logo-link" href="/" aria-label="世界頭條">
          <span class="logo-frame">
            <span class="logo-live" aria-hidden="true"></span>
            <img class="logo-full logo-light" src="/brand/logo.svg" alt="" />
            <img class="logo-full logo-dark" src="/brand/logo-dark.svg" alt="" />
            <img class="logo-compact logo-light" src="/brand/logo-compact.svg" alt="" />
            <img class="logo-compact logo-dark" src="/brand/logo-compact-dark.svg" alt="" />
          </span>
        </a>
      </div>
      <form class="search-bar" role="search" action="/search/" method="get">
        <label class="sr-only" for="news-search">搜尋</label>
        <button type="button" class="icon-btn search-toggle" aria-label="搜尋" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.75" /><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" /></svg>
        </button>
        <input id="news-search" name="q" placeholder="搜尋" />
      </form>
      <div class="header-actions">
        <button type="button" class="icon-btn theme-toggle" aria-label="切換深淺色模式">
          <svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6 6 0 0 0 20 14.5z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" /></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.75" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" /></svg>
        </button>
      </div>
    </header>
    <div class="tab-bar">
      <nav class="filters" aria-label="欄目">
        <a class="chip" href="/">頭條</a>
        ${column('digest', '/digest/')}${column('weekly', '/weekly/')}${column('analysis', '/analysis/')}${column('briefing', '/briefing/')}${column('compare', '/explainer/')}<a class="chip${active === 'topic' ? ' active' : ''}" href="/topic/"${active === 'topic' ? ' aria-current="page"' : ''}>專題</a><a class="chip${active === 'today' ? ' active' : ''}" href="/today/"${active === 'today' ? ' aria-current="page"' : ''}>時間線</a><a class="chip${active === 'data' ? ' active' : ''}" href="/data/"${active === 'data' ? ' aria-current="page"' : ''}>數據</a><a class="chip${active === 'quiz' ? ' active' : ''}" href="/quiz/"${active === 'quiz' ? ' aria-current="page"' : ''}>小測</a>
      </nav>
      ${subscribeMenu()}
    </div>
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
      <p>世界頭條只列出標題與出處連結，不轉載內文。<a href="https://world-news.xyz">world-news.xyz</a> · <a href="/major/">重大更新</a></p>
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

export function renderContentPage(doc: ContentDoc, canonical: string, options: PageOptions = {}): string {
  const sources = [...new Map(doc.blocks.flatMap((block) => block.sources).map((source) => [source.url, source])).values()];
  const listed = doc.kind === 'briefing' || doc.kind === 'compare' ? listedSources(doc) : (doc.citations?.length ? doc.citations.slice(0, 10) : sources);
  const image = safeHttp(bestImage(sources));
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
  const ads = substantial ? (options.ads ?? { client: DEFAULT_CLIENT }) : undefined;
  const client = substantial ? (ads?.client || DEFAULT_CLIENT) : '';
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
        author: { '@type': 'Organization', name: '世界頭條' },
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
  const points = modelFailed ? [] : keyPoints(doc);
  const pointsLabel = doc.kind === 'digest' ? '今期重點' : '重點';
  const pointsBox = points.length > 1 ? `<section class="key-points" aria-label="${pointsLabel}"><h2>${pointsLabel}</h2><ul>${points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul></section>` : '';
  const highlight = !modelFailed && doc.highlight?.items.length
    ? `<section class="highlight-box" aria-label="${esc(doc.highlight.label)}"><h2>${esc(doc.highlight.label)}</h2><ul>${doc.highlight.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`
    : '';
  const bodyBlocks = modelFailed ? [] : shownBlocks;
  const midAt = Math.max(1, Math.ceil(bodyBlocks.length / 2));
  const blocks = bodyBlocks.map((block, index) => {
    const blockImage = doc.kind === 'analysis' ? '' : safeHttp(bestImage(block.sources));
    const blockCategory = block.category || block.sources[0]?.category;
    const showMedia = doc.kind === 'digest' && index > 0;
    const section = `<section class="story column-block${showMedia ? ' with-media' : ''}" id="s${index + 1}">
        ${showMedia ? `<div class="story-media">${media(blockImage, blockCategory, block.sources[0]?.source || categoryLabel(blockCategory || 'world'))}</div>` : ''}
        <div class="story-body">
          <div class="story-kicker">${doc.kind === 'analysis' ? `<span class="block-no">${index + 1}</span>` : catChip(blockCategory)}${doc.kind !== 'analysis' ? heatBadge(new Set(block.sources.map((s) => s.source)).size) : ''}</div>
          <h2 class="column-h2">${esc(block.title)}</h2>
          ${doc.kind === 'digest' ? originalTitle(block.originalTitle, block.sources[0]?.url) : ''}
          <ul class="points">${block.sentences.map((sentence) => `<li>${esc(sentence)}</li>`).join('')}</ul>
        </div>
      </section>`;
    return section + (index + 1 === midAt && bodyBlocks.length > 1 ? adUnit(ads, ads?.mid, 'mid', true) : '');
  }).join('');
  const analysisTimeline = !modelFailed && doc.kind === 'analysis' ? timeline(sources) : '';
  const angles = !modelFailed && doc.kind === 'analysis' ? outletAngles(sources) : '';
  const rich = doc.kind === 'briefing' || doc.kind === 'compare';
  const timelineSources = timelineBlock && timelineRows(timelineBlock.sources).length >= 2 ? timelineBlock.sources : sources;
  const explainerTimeline = !modelFailed && doc.kind === 'compare' ? eventTimeline(timelineSources) : '';
  const sourceSection = listed.length
    ? `<section class="story column-block"><div class="story-body"><h2 class="column-h2">來源（${listed.length}）</h2>${sourceList(listed)}</div></section>`
    : '';
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
  const empty = !modelFailed && !shownBlocks.length ? '<p class="notice">這一期暫時沒有足夠的多方來源。</p>' : '';

  return `<!doctype html>
<html lang="zh-HK">
${head(doc.title, description, canonical, image, 'article', ld, client)}
<body>
  <div class="page column-page" data-kind="${doc.kind}">
  ${chrome(doc.kind)}
  <div class="layout">
    <main id="content" class="column-main">
      <article class="story story-hero column-hero">
        <div class="story-media">${media(image, leadCategory, sources[0]?.source || '世界頭條', true)}</div>
        <div class="story-body">
          <div class="story-kicker">${modelFailed ? '' : '<span class="badge ai-badge">AI 整合</span>'}<span class="kicker-region">${columnName(doc)}</span>${doc.kind === 'analysis' || doc.kind === 'compare' ? heatBadge(outlets) : ''}${credit ? `<span class="model-credit">${esc(credit)}</span>` : ''}${categories.map(catChip).join('')}</div>
          <h1 class="story-title column-title">${esc(doc.title)}</h1>
          ${doc.kind === 'analysis' || doc.kind === 'compare' ? originalTitle(doc.originalTitle, doc.originalUrl || sources[0]?.url) : ''}
          ${showDek ? `<p class="dek">${esc(description)}</p>` : ''}
          <div class="story-meta"><time datetime="${esc(doc.publishedAt)}">${esc(doc.hkt || hkt(doc.publishedAt))} 香港時間</time><span>· 閱讀約 ${minutes} 分鐘</span>${sources.length ? `<span>· ${outlets} 間媒體 · ${sources.length} 篇報道</span>` : ''}${doc.updatedAt ? `<span>· 最後更新 ${esc(hkt(doc.updatedAt))}</span>` : ''}</div>
          ${share(doc.title, canonical)}
          ${listens(doc.kind) ? `${listenControls()}${bookmarkButton({
            page: doc.kind === 'compare' ? 'explainer' : doc.kind,
            key: doc.key,
            title: doc.title,
            link: (() => { try { return new URL(canonical).pathname; } catch { return canonical; } })(),
            publishedAt: doc.publishedAt,
            category: leadCategory,
          })}` : ''}
        </div>
      </article>
      ${adUnit(ads, ads?.top, 'top')}
      ${note}
      ${empty}
      ${pointsBox || highlight ? `<div class="column-boxes">${pointsBox}${highlight}</div>` : ''}
      ${topicLinks}
      ${explainerTimeline}
      ${angles}
      ${blocks}
      ${explainerLinks}
      ${analysisTimeline}
      ${sourceSection}
      ${adUnit(ads, ads?.bottom, 'bottom')}
      <section class="related" id="related" data-categories="${esc(relatedCats)}" data-exclude="${esc(JSON.stringify(exclude))}" hidden>
        <h2 class="section-title">相關頭條</h2>
        <div class="news-grid related-grid"></div>
      </section>
    </main>
    <aside class="sidebar" aria-label="側欄">
      ${archiveCard(options.archive ?? [], doc.kind, doc.key)}
    </aside>
  </div>
  ${footer()}
  </div>
</body>
</html>`;
}

/** Recent pieces (within 48 h of the newest) first, by outlet count then time; older pieces after. */
export function sortByHeat(entries: IndexEntry[]): IndexEntry[] {
  const times = entries.map((entry) => Date.parse(entry.publishedAt)).filter(Number.isFinite);
  const newest = times.length ? Math.max(...times) : 0;
  const fresh = (entry: IndexEntry) => newest - Date.parse(entry.publishedAt) <= 48 * 3600 * 1000;
  const heat = (entry: IndexEntry) => entry.outlets ?? entry.sources ?? 0;
  return [...entries].sort((a, b) => Number(fresh(b)) - Number(fresh(a)) || heat(b) - heat(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function renderAnalysisIndex(entries: IndexEntry[], canonical: string, options: PageOptions = {}): string {
  const showAds = entries.length > 0;
  const ads = showAds ? (options.ads ?? { client: DEFAULT_CLIENT }) : undefined;
  const client = showAds ? (ads?.client || DEFAULT_CLIENT) : '';
  const title = '熱門分析';
  const description = '多個來源同時報道的熱門新聞：背景、各方說法、與香港的關係。AI 根據公開標題整理。';
  const sorted = sortByHeat(entries);
  const cards = sorted.map((entry, index) => `<article class="story">
          <a class="story-media" href="/analysis/${encodeURIComponent(entry.key)}/" tabindex="-1" aria-hidden="true">${media(entry.image, entry.category, categoryLabel(entry.category || 'world'), index < 2)}</a>
          <div class="story-body">
            <div class="story-kicker"><span class="badge ai-badge">AI 整合</span>${heatBadge(entry.outlets ?? entry.sources) || `<span class="cluster-badge">${entry.sources} 篇報道</span>`}${catChip(entry.category)}</div>
            <h2 class="story-title"><a href="/analysis/${encodeURIComponent(entry.key)}/">${esc(entry.title)}</a></h2>
            ${entry.originalTitle && !/[\u3400-\u9fff]/.test(entry.originalTitle) ? `<p class="orig-title" lang="en">${esc(entry.originalTitle)}</p>` : ''}
            <div class="story-meta"><time datetime="${esc(entry.publishedAt)}">${esc(hkt(entry.publishedAt, false))}</time></div>
          </div>
        </article>`);
  const withAd = cards.flatMap((card, index) => (index === 3 ? [card, adUnit(ads, ads?.mid, 'mid', true)] : [card])).join('');
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: sorted.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, name: entry.title, url: `https://world-news.xyz/analysis/${encodeURIComponent(entry.key)}` })),
  }).replace(/</g, '\\u003c')}</script>`;
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, entries.find((entry) => entry.image)?.image || '', 'website', ld, client)}
<body>
  <div class="page column-page" data-kind="analysis-index">
  ${chrome('analysis')}
  <main id="content" class="column-index">
    <header class="index-head">
      <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">分析</span></div>
      <h1 class="column-title">${title}</h1>
      <p class="dek">${esc(description)}</p>
    </header>
    ${adUnit(ads, ads?.top, 'top')}
    ${entries.length ? `<div class="news-grid analysis-grid">${withAd}</div>` : '<p class="notice">暫時未有分析。熱門新聞有三個或以上來源報道時，會自動整理一篇。</p>'}
    ${adUnit(ads, ads?.bottom, 'bottom')}
  </main>
  ${footer()}
  </div>
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
export function renderColumnIndex(kind: 'briefing' | 'compare', entries: IndexEntry[], canonical: string, options: PageOptions = {}): string {
  const showAds = entries.length > 0;
  const ads = showAds ? (options.ads ?? { client: DEFAULT_CLIENT }) : undefined;
  const client = showAds ? (ads?.client || DEFAULT_CLIENT) : '';
  const meta = LISTING[kind];
  const path = kind === 'compare' ? 'explainer' : kind;
  const sorted = [...entries].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const cards = sorted.map((entry, index) => `<article class="story">
          <a class="story-media" href="/${path}/${encodeURIComponent(entry.key)}/" tabindex="-1" aria-hidden="true">${media(entry.image, entry.category, categoryLabel(entry.category || 'world'), index < 2)}</a>
          <div class="story-body">
            <div class="story-kicker"><span class="badge ai-badge">AI 整合</span>${heatBadge(entry.outlets ?? entry.sources) || `<span class="cluster-badge">${entry.sources} 篇來源</span>`}${catChip(entry.category)}</div>
            <h2 class="story-title"><a href="/${path}/${encodeURIComponent(entry.key)}/">${esc(entry.title)}</a></h2>
            <p class="dek">${esc(entry.description)}</p>
            <div class="story-meta"><time datetime="${esc(entry.publishedAt)}">${esc(hkt(entry.publishedAt, false))}</time></div>
          </div>
        </article>`);
  const withAd = cards.flatMap((card, index) => (index === 3 ? [card, adUnit(ads, ads?.mid, 'mid', true)] : [card])).join('');
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
  return `<!doctype html>
<html lang="zh-HK">
${head(meta.title, meta.description, canonical, entries.find((entry) => entry.image)?.image || '', 'website', `<meta name="robots" content="index,follow" />${ld}`, client)}
<body>
  <div class="page column-page" data-kind="${kind}-index">
  ${chrome(kind)}
  <main id="content" class="column-index">
    ${adUnit(ads, ads?.top, 'top')}
    <header class="index-head">
      <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">${meta.kicker}</span></div>
      <h1 class="column-title">${meta.title}</h1>
      <p class="dek">${esc(meta.description)}</p>
    </header>
    ${entries.length ? `<div class="news-grid analysis-grid">${withAd}</div>` : `<p class="notice">${esc(meta.empty)}</p>`}
    ${adUnit(ads, ads?.bottom, 'bottom')}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

import { CATEGORIES, CATEGORY_TILE, categoryLabel, isCategoryId } from './categories.js';
import type { ContentDoc, IndexEntry, SourceRef } from './content';
import { bestImage } from './media.js';

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

/** Feed photo with the same category-colour tile as the homepage when there is none or it fails. */
export function media(image: string | undefined, category: string | undefined, label: string, eager = false): string {
  const src = safeHttp(image);
  if (!src) return fallbackTile(category, label);
  return `<img class="thumb" src="${esc(src)}" alt="" width="640" height="360" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false" />${fallbackTile(category, label, true)}`;
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
    return `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${favicon(url)}<span class="source-name">${esc(source.source)}</span><span class="source-title">${esc(source.title)}</span></a></li>`;
  }).join('');
  return rows ? `<ul class="source-list">${rows}</ul>` : '';
}

function adUnit(ads: AdConfig | undefined, slot: string | undefined, position: string, inArticle = false): string {
  const id = (slot || '').trim();
  if (!ads || !/^\d{6,}$/.test(id)) return '';
  const format = inArticle
    ? 'data-ad-layout="in-article" data-ad-format="fluid" style="display:block;text-align:center"'
    : 'data-ad-format="auto" data-full-width-responsive="true" style="display:block"';
  return `<div class="ad-slot ${inArticle ? 'ad-slot-feed' : 'ad-slot-banner'}" data-ad-position="${position}" aria-label="廣告"><ins class="adsbygoogle" data-ad-client="${esc(ads.client)}" data-ad-slot="${esc(id)}" ${format}></ins></div>`;
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
          ${url ? `<a class="read-original" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${source.angle ? `<span lang="en">${esc(source.title)}</span>` : '睇原文'} →</a>` : ''}
        </li>`;
  }).join('');
  return `<section class="angles" aria-label="各媒體點報"><h2 class="section-title">各媒體點報</h2><ul class="angle-grid">${cards}</ul></section>`;
}

function timeline(sources: SourceRef[]): string {
  const rows = sources
    .filter((source) => source.pubDate && !Number.isNaN(Date.parse(source.pubDate)))
    .sort((a, b) => Date.parse(a.pubDate || '') - Date.parse(b.pubDate || ''));
  if (rows.length < 2) return '';
  return `<section class="story column-block timeline-card" aria-label="報道時間線"><div class="story-body">
        <h2 class="column-h2">報道時間線（香港時間）</h2>
        <ol class="timeline">${rows.map((source) => `<li><time datetime="${esc(source.pubDate || '')}">${esc(hkt(source.pubDate || '', false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><strong>${esc(source.source)}</strong> <a href="${esc(safeHttp(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.angle || source.title)}</a></span></li>`).join('')}</ol>
      </div></section>`;
}

const KIND_LABEL: Record<ContentDoc['kind'], string> = { digest: '日報', weekly: '週報', analysis: '分析' };

export function head(title: string, description: string, canonical: string, image: string, type: string, extra: string, client: string): string {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — 世界頭條</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="alternate" hreflang="zh-HK" href="${esc(canonical)}" />
  <link rel="alternate" hreflang="x-default" href="${esc(canonical)}" />
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
  <script>try{var s=localStorage.getItem('darkMode');if(s==='true'||(s!=='false'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}</script>
  <link rel="stylesheet" href="/site.css" />
  <link rel="stylesheet" href="/columns.css" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'" />
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(client)}" crossorigin="anonymous"></script>
  <script defer src="/columns.js"></script>
  ${extra}
</head>`;
}

export function chrome(active: ContentDoc['kind'] | 'none'): string {
  const cats = CATEGORIES.map((category) => `<a class="chip" href="${category.id === 'all' ? '/' : `/category/${category.id}`}">${esc(category.label)}</a>`).join('');
  const column = (kind: ContentDoc['kind'], href: string) => `<a class="chip${active === kind ? ' active' : ''}" href="${href}"${active === kind ? ' aria-current="page"' : ''}>${KIND_LABEL[kind]}</a>`;
  return `<a class="skip-link" href="#content">跳到內容</a>
  <div class="chrome">
    <header class="masthead">
      <div class="masthead-title">
        <a class="logo-link" href="/" aria-label="世界頭條">
          <img class="logo-full logo-light" src="/brand/logo.svg" alt="" />
          <img class="logo-full logo-dark" src="/brand/logo-dark.svg" alt="" />
          <img class="logo-compact logo-light" src="/brand/logo-compact.svg" alt="" />
          <img class="logo-compact logo-dark" src="/brand/logo-compact-dark.svg" alt="" />
        </a>
      </div>
      <form class="search-bar" role="search" action="/" method="get">
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
        ${column('digest', '/digest/')}${column('weekly', '/weekly/')}${column('analysis', '/analysis/')}
        <span class="filters-sep" aria-hidden="true"></span>
        ${cats}
      </nav>
    </div>
  </div>`;
}

export function footer(): string {
  return `<footer class="app-footer">
      <p>世界頭條 只列出標題同出處連結，不轉載內文。<a href="https://world-news.xyz"> world-news.xyz</a></p>
      <p class="ai-footnote"><span class="badge">AI 整合</span> 日報、週報同分析由 AI 根據公開標題同短描述整理，只供參考，詳情以來源原文為準。</p>
    </footer>`;
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
  const base = kind === 'analysis' ? '/analysis/' : `/${kind}/`;
  return `<section class="side-card archive" aria-label="往期">
        <h2>${kind === 'analysis' ? '更多分析' : '往期'}</h2>
        <ol>${rows.map((entry) => `<li><a href="${base}${encodeURIComponent(entry.key)}${kind === 'analysis' ? '/' : ''}">${esc(kind === 'analysis' ? entry.title : entry.key)}</a><span>${esc(hkt(entry.publishedAt, false))}</span></li>`).join('')}</ol>
        ${kind === 'analysis' ? '<a class="read-original" href="/analysis/">全部分析 →</a>' : ''}
      </section>`;
}

function aboutCard(): string {
  return `<section class="side-card">
        <h2><span class="badge">AI 整合</span> 點樣整理</h2>
        <p>模型只讀公開 RSS 標題同短描述，綜合多個來源寫成摘要；來源沒有寫的數字、引言同背景不會補上。每段下面都有原文連結。</p>
      </section>`;
}

function keyPoints(doc: ContentDoc): string[] {
  if (doc.kind === 'digest') return doc.blocks.slice(0, 5).map((block) => block.title);
  return doc.blocks.map((block) => realSentences(block.sentences)[0] || '').filter(Boolean).slice(0, 4);
}

export function renderContentPage(doc: ContentDoc, canonical: string, options: PageOptions = {}): string {
  const ads = options.ads ?? { client: DEFAULT_CLIENT };
  const client = ads.client || DEFAULT_CLIENT;
  const sources = [...new Map(doc.blocks.flatMap((block) => block.sources).map((source) => [source.url, source])).values()];
  const image = safeHttp(bestImage(sources));
  const outlets = new Set(sources.map((source) => source.source)).size;
  const shownBlocks = doc.blocks.map((block) => ({ ...block, sentences: realSentences(block.sentences) })).filter((block) => block.sentences.length > 0);
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
        inLanguage: 'zh-HK',
        mainEntityOfPage: canonical,
        ...(image ? { image: [image] } : {}),
        author: { '@type': 'Organization', name: '世界頭條' },
        isBasedOn: sources.map((source) => ({ '@type': 'NewsArticle', headline: source.title, url: source.url })),
      },
      { '@type': 'Article', headline: doc.title, datePublished: doc.publishedAt, inLanguage: 'zh-HK', mainEntityOfPage: canonical },
    ],
  };
  const ld = `<script type="application/ld+json">${JSON.stringify(json).replace(/</g, '\\u003c')}</script>`;
  const note = doc.mode === 'ai' ? '' : '<p class="notice" role="status">模型暫時未能完成。這一版只列出來源標題，沒有加寫情節。</p>';
  const points = keyPoints(doc);
  const pointsBox = points.length > 1 ? `<section class="key-points" aria-label="今期重點"><h2>${doc.kind === 'digest' ? '今期重點' : '重點'}</h2><ul>${points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul></section>` : '';
  const highlight = doc.highlight?.items.length
    ? `<section class="highlight-box" aria-label="${esc(doc.highlight.label)}"><h2>${esc(doc.highlight.label)}</h2><ul>${doc.highlight.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>`
    : '';
  const midAt = Math.max(1, Math.ceil(shownBlocks.length / 2));
  const blocks = shownBlocks.map((block, index) => {
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
          ${doc.kind === 'analysis' ? '' : `<details class="sources"${index === 0 ? ' open' : ''}><summary>來源（${block.sources.length}）</summary>${sourceList(block.sources)}</details>`}
        </div>
      </section>`;
    return section + (index + 1 === midAt && shownBlocks.length > 1 ? adUnit(ads, ads.mid, 'mid', true) : '');
  }).join('');
  const analysisSources = doc.kind === 'analysis' && sources.length
    ? `${timeline(sources)}<section class="story column-block"><div class="story-body"><h2 class="column-h2">來源（${sources.length}）</h2>${sourceList(sources)}</div></section>`
    : '';
  const angles = doc.kind === 'analysis' ? outletAngles(sources) : '';
  const relatedCats = categories.join(',');
  const exclude = sources.map((source) => source.url).slice(0, 30);
  const empty = !shownBlocks.length ? '<p class="notice">這一期暫時沒有足夠的多方來源。</p>' : '';

  return `<!doctype html>
<html lang="zh-HK">
${head(doc.title, description, canonical, image, 'article', ld, client)}
<body>
  <div class="page column-page" data-kind="${doc.kind}">
  ${chrome(doc.kind)}
  <div class="layout">
    <main id="content" class="column-main">
      ${adUnit(ads, ads.top, 'top')}
      <article class="story story-hero column-hero">
        <div class="story-media">${media(image, leadCategory, sources[0]?.source || '世界頭條', true)}</div>
        <div class="story-body">
          <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">${KIND_LABEL[doc.kind]}</span>${doc.kind === 'analysis' ? heatBadge(outlets) : ''}${categories.map(catChip).join('')}</div>
          <h1 class="story-title column-title">${esc(doc.title)}</h1>
          ${doc.kind === 'analysis' ? originalTitle(doc.originalTitle, doc.originalUrl || sources[0]?.url) : ''}
          ${doc.kind === 'analysis' ? `<p class="dek">${esc(description)}</p>` : ''}
          <div class="story-meta"><time datetime="${esc(doc.publishedAt)}">${esc(doc.hkt || hkt(doc.publishedAt))} 香港時間</time><span>· 閱讀約 ${minutes} 分鐘</span>${sources.length ? `<span>· ${outlets} 間媒體 · ${sources.length} 篇報道</span>` : ''}</div>
          ${share(doc.title, canonical)}
        </div>
      </article>
      ${note}
      ${empty}
      ${pointsBox || highlight ? `<div class="column-boxes">${pointsBox}${highlight}</div>` : ''}
      ${doc.kind === 'analysis' ? angles : ''}
      ${blocks}
      ${analysisSources}
      ${adUnit(ads, ads.bottom, 'bottom')}
      <section class="related" id="related" data-categories="${esc(relatedCats)}" data-exclude="${esc(JSON.stringify(exclude))}" hidden>
        <h2 class="section-title">相關頭條</h2>
        <div class="news-grid related-grid"></div>
      </section>
    </main>
    <aside class="sidebar" aria-label="側欄">
      ${archiveCard(options.archive ?? [], doc.kind, doc.key)}
      ${aboutCard()}
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
  const ads = options.ads ?? { client: DEFAULT_CLIENT };
  const client = ads.client || DEFAULT_CLIENT;
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
  const withAd = cards.flatMap((card, index) => (index === 3 ? [card, adUnit(ads, ads.mid, 'mid', true)] : [card])).join('');
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
    ${adUnit(ads, ads.top, 'top')}
    <header class="index-head">
      <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">分析</span></div>
      <h1 class="column-title">${title}</h1>
      <p class="dek">${esc(description)}</p>
    </header>
    ${entries.length ? `<div class="news-grid analysis-grid">${withAd}</div>` : '<p class="notice">暫時未有分析。熱門新聞有三個或以上來源報道時，會自動整理一篇。</p>'}
    ${adUnit(ads, ads.bottom, 'bottom')}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

import { CATEGORY_TILE, categoryLabel, isCategoryId } from './categories.js';
import type { ContentDoc, IndexEntry, SourceRef } from './content';
import { bestImage } from './media.js';
import { FOOTER_LINKS } from './siteNav.js';

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
          ${url ? `<a class="read-original" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${source.angle ? `<span lang="en">${esc(source.title)}</span>` : '睇原文'} →</a>` : ''}
        </li>`;
  }).join('');
  return `<section class="angles" aria-label="各媒體點報"><h2 class="section-title">各媒體點報</h2><ul class="angle-grid">${cards}</ul></section>`;
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
function eventTimeline(sources: SourceRef[]): string {
  const rows = timelineRows(sources);
  if (rows.length < 2) return '';
  const items = rows.map((source) => `<li><time datetime="${esc(source.pubDate || '')}">${esc(hkt(source.pubDate || '', false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><strong>${esc(source.source)}</strong> ${esc(source.title)}</span></li>`).join('');
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
  if (doc.model?.includes('grok')) return 'xAI Grok 4.3';
  if (doc.model) return 'Workers AI';
  return '';
}

/** Publisher intro on every column article. Static, so it does not spend Workers AI. */
export const MIN_BODY_CHARS = 400;

const EDITOR_NOTES: Record<ContentDoc['kind'], string> = {
  digest: '世界頭條日報由編輯部劃定範圍，每日整理多間媒體同時報道的公開標題。我哋只讀 RSS 入面的標題同短描述，不會下載或轉載原文全文。下面各節標明「AI 整合」，由模型按呢啲材料寫成摘要。來源沒有寫明的數字、引言、人物背景同因果，一律不會補上。想知詳情，請用每節下面的連結去讀原文。標題同內文的版權屬於原來的出版者。',
  weekly: '一週科技同一週財經是世界頭條的週報。編輯部每週從已收錄的科技同財經標題做一次回顧，仍然只根據公開 RSS 的標題同短描述，不會轉載全文。下面兩節都標明「AI 整合」，方便你先看我哋點樣把一週的標題歸類，再自己去原文核對。這篇不是投資建議，也不是任何機構的官方摘要。來源沒有寫的數字同判斷，不會在這裡出現。',
  briefing: '每日香港導讀是世界頭條的原創欄目，每日早晚各一期。編輯部從已收錄的香港和內地新聞中選出當日要點，由 xAI Grok 以正式新聞書面語寫成分析：事件為何重要、有甚麼背景，以及值得留意的具體事項。同日的新聞懶人包列在文末。全文標明「AI 整合」。模型只根據已收錄的標題和摘錄，不會轉載原文，也不會補上來源沒有寫的數字、引言或因果。每月用量達到上限或模型未能回應時，才改用 Workers AI。',
  compare: '新聞懶人包把多間媒體對同一件事的報道收成一篇，讓讀者立刻明白發生了甚麼。文首是三行重點，接著是按發布時間排列的事件時間線、來源已經寫出的重點數字、事件經過、各方回應和後續關注。一律由 xAI Grok 以正式新聞書面語撰寫；只有每月用量達到上限，或 Grok 未能回應時，才改用 Workers AI。頁面標明「AI 整合」。來源只在文末列出一次。來源沒有寫的情節不會補上。',
  analysis: '熱門分析針對多間媒體同時報道的同一件事。世界頭條先把各家標題放在一起，再由模型按標題同短描述，寫成背景、各方說法、點解要關心、與香港的關係、接落嚟留意咩。每一節都標明「AI 整合」。我哋不會為了寫得完整而添加來源沒有講的情節。與香港的關係只在材料直接提到香港，或者對香港讀者有明顯影響時才寫。各媒體點報只概括該來源自己的標題，並附上原文連結。',
};

/** Directory page for /analysis/. Long enough that the index is publisher text, not only cards. */
export const ANALYSIS_INDEX_NOTE = '熱門分析是世界頭條自己的欄目，不是把別家新聞原文貼過來。當同一件事有三間或以上媒體報道，香港本地題目有兩間也會考慮，編輯流程會把各家公開 RSS 的標題同短描述放在一起。模型只可以根據這些材料行文，頁面會標明「AI 整合」。來源沒有寫的數字、引言、人物背景同因果不會補上。每篇都有日期、分節標題，以及去原文的連結。你在這一頁看到的是目錄；打開任何一篇，都可以看到編者按、分節內文同出處。世界頭條沒有用戶帳號，也不出售新聞全文。標題、內文同圖片的權利屬於原來的出版者。如果摘要同原文有出入，請以出版者的原文為準。意見可以用網站上的聯絡表格告訴我哋，我哋沒有另設公開電郵。本欄的目的，是幫香港讀者先看清有哪些來源在報道同一件事，再自己決定去讀哪一篇原文。目錄上的每一則都帶有日期同媒體數目。如果暫時未有分析，這段編者說明仍然是本站自己的文字，不是從通訊社複製過來的稿件。請把摘要當成閱讀路線，而不是事件的全部。廣告只會放在這段說明之後，不會擋在標題前面，也不會貼着頁頂的導航。這段文字由編輯部撰寫，歡迎先打開原文再自己判斷。';

export function cjkChars(text: string): number {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

export function editorNote(kind: ContentDoc['kind']): string {
  return EDITOR_NOTES[kind];
}

/**
 * If the model (or the title-only draft) is still short, add prose that only restates
 * the public headlines already on the page. No second model call.
 */
export function coverageParagraphs(doc: ContentDoc, sentences: string[]): string[] {
  const written = [editorNote(doc.kind), ...sentences].join('');
  if (cjkChars(written) >= MIN_BODY_CHARS) return [];
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const block of doc.blocks) {
    for (const source of block.sources) {
      const key = source.url || `${source.source}:${source.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }
  if (!sentences.length && !sources.length) return [];
  const bits = [
    `今次「${doc.title}」只根據公開的標題和摘錄整理，世界頭條沒有轉載任何原文。下面逐則寫明出處，方便你自己核對。`,
    ...sources.map((source) => `${source.source}報道的標題是「${source.title}」。呢句只係標題，不是我哋撰寫的新聞內文，詳情請用該則的原文連結。`),
    `本期「${doc.title}」於${doc.hkt || '香港時間'}整理。日報、週報同分析都標明 AI 整合，內容只供參考，版權屬於原來的出版者。請以各來源網站的原文為準，不要依賴摘要做決定。`,
  ];
  const kept: string[] = [];
  for (const bit of bits) {
    kept.push(bit);
    if (cjkChars(written + kept.join('')) >= MIN_BODY_CHARS) break;
  }
  return kept;
}

export function pageBodyChars(doc: ContentDoc): number {
  const sentences = doc.blocks.flatMap((block) => realSentences(block.sentences));
  return cjkChars([editorNote(doc.kind), ...sentences, ...coverageParagraphs(doc, sentences)].join(''));
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
  ${loadAds && client ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(client)}" crossorigin="anonymous"></script>` : ''}
  <script defer src="/columns.js"></script>
  ${extra}
</head>`;
}

export function chrome(active: ContentDoc['kind'] | 'none'): string {
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
        <a class="chip" href="/">頭條</a>
        ${column('digest', '/digest/')}${column('weekly', '/weekly/')}${column('analysis', '/analysis/')}${column('briefing', '/briefing/')}${column('compare', '/explainer/')}
      </nav>
    </div>
    <div class="hk-info column-hk" id="hk-info" hidden aria-label="香港天氣同恒生指數"></div>
  </div>
  <div id="major-slot"></div>
  <div id="alert-slot"></div>`;
}

export function footer(): string {
  const links = FOOTER_LINKS.map((link) => `<a href="${link.href}">${link.label}</a>`).join('');
  return `<footer class="app-footer">
      <p>世界頭條 只列出標題同出處連結，不轉載內文。<a href="https://world-news.xyz"> world-news.xyz</a> · <a href="/major/">重大更新</a></p>
      <nav class="footer-nav" aria-label="網站資料">${links}</nav>
      <p class="ai-footnote"><span class="badge">AI 整合</span> 日報、週報、分析、導讀和懶人包由 AI 根據公開標題和摘錄整理，只供參考，詳情以來源原文為準。</p>
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

function aboutCard(): string {
  return `<section class="side-card">
        <h2><span class="badge">AI 整合</span> 如何整理</h2>
        <p>模型只讀已經收錄的標題和摘錄，綜合多個來源寫成摘要；來源沒有寫的數字、引言和背景不會補上。每段下面都有原文連結。</p>
      </section>`;
}

function keyPoints(doc: ContentDoc): string[] {
  if (doc.points?.length) return doc.points.slice(0, 4);
  if (doc.kind === 'digest') return doc.blocks.slice(0, 5).map((block) => block.title);
  return doc.blocks.map((block) => realSentences(block.sentences)[0] || '').filter(Boolean).slice(0, 4);
}

export function renderContentPage(doc: ContentDoc, canonical: string, options: PageOptions = {}): string {
  const sources = [...new Map(doc.blocks.flatMap((block) => block.sources).map((source) => [source.url, source])).values()];
  const image = safeHttp(bestImage(sources));
  const outlets = new Set(sources.map((source) => source.source)).size;
  const timelineBlock = doc.kind === 'compare' ? doc.blocks.find((block) => block.title === '事件時間線') : undefined;
  const shownBlocks = doc.blocks
    .filter((block) => block !== timelineBlock)
    .map((block) => ({ ...block, sentences: realSentences(block.sentences) }))
    .filter((block) => block.sentences.length > 0);
  const substantial = shownBlocks.length > 0;
  const ads = substantial ? (options.ads ?? { client: DEFAULT_CLIENT }) : undefined;
  const client = substantial ? (ads?.client || DEFAULT_CLIENT) : '';
  const shownSentences = shownBlocks.flatMap((block) => block.sentences);
  const extraParagraphs = coverageParagraphs(doc, shownSentences);
  const editor = `<section class="editor-note" aria-label="編者按"><h2 class="column-h2">編者按</h2><p>${esc(editorNote(doc.kind))}</p></section>`;
  const supplement = extraParagraphs.length
    ? `<section class="story column-block" aria-label="引用的公開標題"><div class="story-body"><h2 class="column-h2">引用的公開標題</h2>${extraParagraphs.map((line) => `<p>${esc(line)}</p>`).join('')}</div></section>`
    : '';
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
  const robots = doc.kind === 'briefing' || doc.kind === 'compare' ? '<meta name="robots" content="index,follow" />' : '';
  const ld = `${robots}<script type="application/ld+json">${JSON.stringify(json).replace(/</g, '\\u003c')}</script>`;
  const note = doc.mode === 'ai' ? '' : '<p class="notice" role="status">模型暫時未能完成。這一版只列出來源標題，沒有加寫情節。</p>';
  const points = keyPoints(doc);
  const pointsLabel = doc.kind === 'digest' ? '今期重點' : '重點';
  const pointsBox = points.length > 1 ? `<section class="key-points" aria-label="${pointsLabel}"><h2>${pointsLabel}</h2><ul>${points.map((point) => `<li>${esc(point)}</li>`).join('')}</ul></section>` : '';
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
          ${doc.kind === 'analysis' || doc.kind === 'compare' || block.title === '今日值得留意' || !block.sources.length ? '' : `<details class="sources"${index === 0 ? ' open' : ''}><summary>來源（${block.sources.length}）</summary>${sourceList(block.sources)}</details>`}
        </div>
      </section>`;
    return section + (index + 1 === midAt && shownBlocks.length > 1 ? adUnit(ads, ads?.mid, 'mid', true) : '');
  }).join('');
  const analysisSources = doc.kind === 'analysis' && sources.length
    ? `${timeline(sources)}<section class="story column-block"><div class="story-body"><h2 class="column-h2">來源（${sources.length}）</h2>${sourceList(sources)}</div></section>`
    : '';
  const angles = doc.kind === 'analysis' ? outletAngles(sources) : '';
  const rich = doc.kind === 'briefing' || doc.kind === 'compare';
  const explainerTimeline = timelineBlock ? eventTimeline(timelineBlock.sources) : '';
  const explainerSources = doc.kind === 'compare' && sources.length
    ? `<section class="story column-block"><div class="story-body"><h2 class="column-h2">來源（${sources.length}）</h2>${sourceList(sources)}</div></section>`
    : '';
  const explainerLinks = doc.kind === 'briefing' && options.explainers?.length
    ? `<section class="story column-block" aria-label="今日新聞懶人包"><div class="story-body"><h2 class="column-h2">今日新聞懶人包</h2><ul class="points">${options.explainers.slice(0, 8).map((entry) => `<li><a href="/explainer/${encodeURIComponent(entry.key)}/">${esc(entry.title)}</a></li>`).join('')}</ul></div></section>`
    : '';
  const credit = rich ? modelCredit(doc) : '';
  const showDek = doc.kind === 'analysis' || rich;
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
      <article class="story story-hero column-hero">
        <div class="story-media">${media(image, leadCategory, sources[0]?.source || '世界頭條', true)}</div>
        <div class="story-body">
          <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">${KIND_NAME[doc.kind]}</span>${doc.kind === 'analysis' || doc.kind === 'compare' ? heatBadge(outlets) : ''}${credit ? `<span class="model-credit">${esc(credit)}</span>` : ''}${categories.map(catChip).join('')}</div>
          <h1 class="story-title column-title">${esc(doc.title)}</h1>
          ${doc.kind === 'analysis' || doc.kind === 'compare' ? originalTitle(doc.originalTitle, doc.originalUrl || sources[0]?.url) : ''}
          ${showDek ? `<p class="dek">${esc(description)}</p>` : ''}
          <div class="story-meta"><time datetime="${esc(doc.publishedAt)}">${esc(doc.hkt || hkt(doc.publishedAt))} 香港時間</time><span>· 閱讀約 ${minutes} 分鐘</span>${sources.length ? `<span>· ${outlets} 間媒體 · ${sources.length} 篇報道</span>` : ''}</div>
          ${share(doc.title, canonical)}
        </div>
      </article>
      ${editor}
      ${adUnit(ads, ads?.top, 'top')}
      ${note}
      ${empty}
      ${pointsBox || highlight ? `<div class="column-boxes">${pointsBox}${highlight}</div>` : ''}
      ${explainerTimeline}
      ${angles}
      ${blocks}
      ${explainerLinks}
      ${supplement}
      ${analysisSources}
      ${explainerSources}
      ${adUnit(ads, ads?.bottom, 'bottom')}
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
  const editor = `<section class="editor-note" aria-label="編者按"><h2 class="column-h2">編者按</h2><p>${esc(ANALYSIS_INDEX_NOTE)}</p></section>`;
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
    ${editor}
    ${adUnit(ads, ads.top, 'top')}
    ${entries.length ? `<div class="news-grid analysis-grid">${withAd}</div>` : '<p class="notice">暫時未有分析。熱門新聞有三個或以上來源報道時，會自動整理一篇。</p>'}
    ${adUnit(ads, ads.bottom, 'bottom')}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

const LISTING: Record<'briefing' | 'compare', { title: string; description: string; empty: string; kicker: string }> = {
  briefing: {
    title: '每日香港導讀',
    description: '每日早上同傍晚，按當日香港同內地標題寫成一篇導讀，標明出處同原文連結。',
    empty: '暫時未有導讀。每日 07:30 同 18:30（香港時間）會根據當日標題整理一篇。',
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
  const ads = options.ads ?? { client: DEFAULT_CLIENT };
  const client = ads.client || DEFAULT_CLIENT;
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
  const withAd = cards.flatMap((card, index) => (index === 3 ? [card, adUnit(ads, ads.mid, 'mid', true)] : [card])).join('');
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
    ${adUnit(ads, ads.top, 'top')}
    <header class="index-head">
      <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">${meta.kicker}</span></div>
      <h1 class="column-title">${meta.title}</h1>
      <p class="dek">${esc(meta.description)}</p>
    </header>
    ${entries.length ? `<div class="news-grid analysis-grid">${withAd}</div>` : `<p class="notice">${esc(meta.empty)}</p>`}
    ${adUnit(ads, ads.bottom, 'bottom')}
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

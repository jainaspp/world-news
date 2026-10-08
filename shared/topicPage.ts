import type { AdConfig } from './contentPage.js';
import {
  catChip,
  chrome,
  esc,
  favicon,
  footer,
  hkt,
  head,
  media,
  safeHttp,
  share,
} from './contentPage.js';
import { readableSourceTitle } from './search.js';
import type { NewsItem } from './types.js';
import {
  TOPIC_PACKS,
  topicPublic,
  type TopicConfig,
  type TopicFigure,
  type TopicPack,
} from './topicPack.js';

const DEFAULT_CLIENT = 'ca-pub-8392975944327076';

export interface TopicPageModel {
  topic: TopicConfig;
  pack: TopicPack | null;
  /** Live feed matches, newest first. Not stored. */
  headlines: NewsItem[];
  others: { slug: string; title: string; description: string }[];
}

function sourceList(sources: TopicPack['sources']): string {
  const rows = sources.map((source) => {
    const url = safeHttp(source.url);
    if (!url) return '';
    const title = source.title && source.title !== source.source && readableSourceTitle(source.title)
      ? `<span class="source-title">${esc(source.title)}</span>`
      : '';
    return `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${favicon(url)}<span class="source-name">${esc(source.source)}</span>${title}</a></li>`;
  }).join('');
  return rows ? `<ul class="source-list">${rows}</ul>` : '';
}

function zhDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function figureGroups(figures: TopicFigure[], areas: readonly string[]): { area: string; rows: TopicFigure[] }[] {
  const groups = new Map<string, TopicFigure[]>();
  for (const figure of figures) {
    const rows = groups.get(figure.area) ?? [];
    rows.push(figure);
    groups.set(figure.area, rows);
  }
  const ordered = [...areas.filter((area) => groups.has(area)), ...[...groups.keys()].filter((area) => !areas.includes(area))];
  return ordered.map((area) => ({ area, rows: groups.get(area) ?? [] }));
}

function jump(href: string, label: string, on: boolean): string {
  return on ? `<a class="chip" href="${href}">${label}</a>` : '';
}

function fold(id: string, title: string, lines: string[]): string {
  if (!lines.length) return '';
  return `<details class="topic-fold" id="${id}" open><summary>${esc(title)}</summary><ul class="points">${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul></details>`;
}

function headlineList(items: NewsItem[]): string {
  if (!items.length) {
    return '<section class="story column-block" id="headlines" aria-label="相關頭條"><div class="story-body"><h2 class="column-h2">相關頭條</h2><p class="topic-empty">近日未有相關報道。</p></div></section>';
  }
  const rows = items.slice(0, 12).map((item) => {
    const url = safeHttp(item.link);
    const title = esc(item.title);
    const linked = url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;
    const when = item.pubDate ? `<time datetime="${esc(item.pubDate)}">${esc(hkt(item.pubDate, false))}</time>` : '';
    return `<li>${when}<span class="tl-body">${linked}<span class="source-name">${esc(item.source)}</span></span></li>`;
  }).join('');
  return `<section class="story column-block" id="headlines" aria-label="相關頭條"><div class="story-body"><h2 class="column-h2">相關頭條</h2><ol class="topic-wires">${rows}</ol></div></section>`;
}

function packBody(model: TopicPageModel): string {
  const { topic, pack } = model;
  if (!pack || pack.mode !== 'ai' || pack.provider === 'workers-ai') return headlineList(model.headlines);
  const points = pack.points.slice(0, 3);
  // Policy topics list measures; the others list key numbers (a death toll is not a measure).
  const figuresHeading = topic.slug === 'policy-address' || topic.slug === 'budget' ? '主要措施' : '重要數字';
  const pointsBox = points.length > 1
    ? `<section class="key-points" id="summary" aria-label="重點"><h2>重點</h2><ol>${points.map((point) => `<li>${esc(endLine(point))}</li>`).join('')}</ol></section>`
    : '';
  const events = pack.timeline;
  const timeline = events.length
    ? `<section class="story column-block timeline-card" id="timeline" aria-label="時間線"><div class="story-body"><h2 class="column-h2">時間線</h2><ol class="timeline">${events.map((row) => `<li><time datetime="${esc(row.date)}">${esc(zhDate(row.date))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body">${esc(endLine(row.text))}</span></li>`).join('')}</ol></div></section>`
    : '';
  const groups = figureGroups(pack.figures, topic.areas);
  const figures = groups.length
    ? `<section class="topic-measures" id="figures" aria-label="${figuresHeading}"><h2 class="column-h2">${figuresHeading}</h2><div class="topic-areas">${groups.map((group) => `<section class="topic-area"><h3>${esc(group.area)}</h3><ul>${group.rows.map((row) => `<li class="topic-figure"><strong>${esc(row.value)}</strong><span>${esc(row.label)}</span></li>`).join('')}</ul></section>`).join('')}</div></section>`
    : '';
  const nav = `<nav class="topic-jump" aria-label="本頁小節">${jump('#summary', '重點', points.length > 1)}${jump('#timeline', '時間線', events.length > 0)}${jump('#figures', figuresHeading === '主要措施' ? '措施' : '數字', groups.length > 0)}${jump('#impact', '影響', pack.impact.length > 0)}${jump('#reactions', '反應', pack.reactions.length > 0)}${jump('#background', topic.slug === 'policy-address' ? '五年規劃' : '背景', Boolean(topic.background && pack.background?.length))}${jump('#headlines', '頭條', model.headlines.length > 0)}</nav>`;
  const sources = pack.sources.length
    ? `<section class="story column-block" id="sources"><div class="story-body"><h2 class="column-h2">來源（${pack.sources.length}）</h2>${sourceList(pack.sources)}</div></section>`
    : '';
  return `${pointsBox}${nav}${timeline}${figures}${fold('impact', '對市民有什麼影響', pack.impact.map(endLine))}${fold('reactions', '各方反應', pack.reactions.map(endLine))}${topic.background ? fold('background', topic.background.label, (pack.background ?? []).map(endLine)) : ''}${headlineList(model.headlines)}${sources}`;
}

function sideList(model: TopicPageModel): string {
  const rows = model.others.filter((row) => row.slug !== model.topic.slug);
  if (!rows.length) return '';
  return `<section class="side-card archive" aria-label="其他專題"><h2>其他專題</h2><ol>${rows.map((row) => `<li><a href="/topic/${esc(row.slug)}/">${esc(row.title)}</a><span>${esc(row.description)}</span></li>`).join('')}</ol><a class="read-original" href="/topic/">全部專題 →</a></section>`;
}

/**
 * The model title is shown only when it names the topic (its title or a keyword). Otherwise it is
 * usually two stories run together (e.g. 「陳曼琪倡修例規管AI風險江蘇AI課程」) and the topic name reads better.
 */
export function displayTitle(model: string | undefined, topic: { title: string; keywords: readonly string[] }): string {
  const title = (model || '').trim();
  if (!title) return topic.title;
  const names = [topic.title, ...topic.keywords.filter((keyword) => !/\s/.test(keyword))];
  return names.some((name) => title.toLowerCase().includes(name.toLowerCase())) ? title : topic.title;
}

/** Stored lines from before the full-stop rule get one at render time. */
function endLine(line: string): string {
  return /[。！？」』）)]$/.test(line) ? line : `${line}。`;
}

/** One evergreen topic. Live headlines come from the feed; the pack is the last saved version. */
export function renderTopicPage(model: TopicPageModel, canonical: string, ads?: AdConfig): string {
  const { topic, pack } = model;
  const shown = pack && pack.mode === 'ai' && pack.provider !== 'workers-ai' ? pack : null;
  const title = displayTitle(shown?.title, topic);
  const shownDescription = shown?.description && !shown.description.includes('\uFFFD') ? shown.description : '';
  const description = (shownDescription || topic.blurb).slice(0, 180);
  const image = safeHttp(shown?.sources.find((source) => source.image)?.image);
  const client = ads?.client || DEFAULT_CLIENT;
  const indexable = shown ? topicPublic(shown) : false;
  const robots = `<meta name="robots" content="${indexable ? 'index,follow' : 'noindex,follow'}" />`;
  const json = shown
    ? `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      datePublished: shown.publishedAt,
      dateModified: shown.updatedAt,
      inLanguage: 'zh-HK',
      mainEntityOfPage: canonical,
      description,
      author: { '@type': 'Organization', name: '世界頭條' },
      isBasedOn: shown.sources.map((source) => ({ '@type': 'NewsArticle', headline: source.title, url: source.url })),
    }).replace(/</g, '\\u003c')}</script>`
    : '';
  const when = shown
    ? `<div class="story-meta"><time datetime="${esc(shown.updatedAt)}">更新 ${esc(hkt(shown.updatedAt))}</time></div>`
    : '';
  return `<!doctype html>
<html lang="zh-HK">
${head(`${title}專題`, description, canonical, image || '', 'article', `${robots}${json}`, client, Boolean(shown))}
<body>
  <div class="page column-page" data-kind="topic">
  ${chrome('topic')}
  <div class="layout">
    <main id="content" class="column-main">
      <article class="story story-hero column-hero">
        <div class="story-media">${media(image, topic.category, topic.title, true)}</div>
        <div class="story-body">
          <div class="story-kicker">${shown ? '<span class="badge ai-badge">AI 整合</span>' : ''}<span class="kicker-region">專題懶人包</span>${catChip(topic.category)}</div>
          <h1 class="story-title column-title">${esc(title)}</h1>
          <p class="dek">${esc(description)}</p>
          ${when}
          ${share(title, canonical)}
        </div>
      </article>
      ${packBody(model)}
    </main>
    <aside class="sidebar" aria-label="側欄">
      ${sideList(model)}
    </aside>
  </div>
  ${footer(false)}
  </div>
</body>
</html>`;
}

export interface TopicIndexCard {
  topic: TopicConfig;
  description: string;
  updatedAt?: string;
  ready: boolean;
}

export function topicIndexCards(packs: Map<string, TopicPack | null>): TopicIndexCard[] {
  return TOPIC_PACKS.map((topic) => {
    const pack = packs.get(topic.slug) ?? null;
    const ready = Boolean(pack && topicPublic(pack));
    return {
      topic,
      description: ready && pack ? pack.description : topic.blurb,
      ...(ready && pack ? { updatedAt: pack.updatedAt } : {}),
      ready,
    };
  });
}

/** Listing of configured topics. Empty packs still get a card so the section is discoverable. */
export function renderTopicIndex(cards: TopicIndexCard[], canonical: string, ads?: AdConfig): string {
  const client = ads?.client || DEFAULT_CLIENT;
  const title = '專題懶人包';
  const description = '施政報告、財政預算案、樓市、天氣警告、中美關係等持續題目。有新報道才更新。';
  const articles = cards.map((card, index) => {
    const image = '';
    const when = card.updatedAt ? `<div class="story-meta"><time datetime="${esc(card.updatedAt)}">${esc(hkt(card.updatedAt, false))}</time></div>` : '';
    return `<article class="story">
      <a class="story-media" href="/topic/${esc(card.topic.slug)}/" tabindex="-1" aria-hidden="true">${media(image, card.topic.category, card.topic.title, index < 2)}</a>
      <div class="story-body">
        <div class="story-kicker">${card.ready ? '<span class="badge ai-badge">AI 整合</span>' : ''}${catChip(card.topic.category)}</div>
        <h2 class="story-title"><a href="/topic/${esc(card.topic.slug)}/">${esc(card.topic.title)}</a></h2>
        <p class="dek">${esc(card.description)}</p>
        ${when}
      </div>
    </article>`;
  }).join('');
  const ld = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    inLanguage: 'zh-HK',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: cards.map((card, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: card.topic.title,
        url: `https://world-news.xyz/topic/${card.topic.slug}/`,
      })),
    },
  }).replace(/</g, '\\u003c')}</script>`;
  return `<!doctype html>
<html lang="zh-HK">
${head(title, description, canonical, '', 'website', `<meta name="robots" content="index,follow" />${ld}`, client)}
<body>
  <div class="page column-page" data-kind="topic-index">
  ${chrome('topic')}
  <main id="content" class="column-index">
    <header class="index-head">
      <div class="story-kicker"><span class="badge ai-badge">AI 整合</span><span class="kicker-region">專題</span></div>
      <h1 class="column-title">${title}</h1>
      <p class="dek">${esc(description)}</p>
    </header>
    <div class="news-grid analysis-grid">${articles}</div>
  </main>
  ${footer(false)}
  </div>
</body>
</html>`;
}

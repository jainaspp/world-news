import type { StoryCluster } from './angles.js';
import { CATEGORY_IDS, categoryLabel, isCategoryId } from './categories.js';
import { hktParts } from './content.js';
import { chrome, esc, footer, hkt, head } from './contentPage.js';
import { REGIONS } from './feeds.js';
import { titlesAreSameEvent } from './research.js';
import type { NewsItem } from './types.js';

export interface TodayLink {
  key: string;
  title: string;
}

export interface TodayStory {
  title: string;
  time: string;
  sources: { source: string; title: string; url: string }[];
  outlets: number;
  category: string;
  regions: string[];
  explainerKey?: string;
}

export interface TodayModel {
  date: string;
  title: string;
  description: string;
  stories: TodayStory[];
  regions: { code: string; label: string; count: number }[];
  categories: { id: string; label: string; count: number }[];
  index: boolean;
  filtered: boolean;
}

const REGION_CODES = REGIONS.filter((region) => region.code !== 'ALL');

export function parseTodayPath(pathname: string): { ok: boolean; date?: string; region?: string; category?: string } {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'today') return { ok: false };
  if (parts.length === 1) return { ok: true };
  const date = parts[1] || '';
  if (!validDate(date)) return { ok: false };
  if (parts.length === 2) return { ok: true, date };
  if (parts.length === 4 && parts[2] === 'region' && REGION_CODES.some((region) => region.code === parts[3])) {
    return { ok: true, date, region: parts[3] };
  }
  if (parts.length === 4 && parts[2] === 'category' && isCategoryId(parts[3] || '')) {
    return { ok: true, date, category: parts[3] };
  }
  return { ok: false };
}

function validDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

export function onHktDate(item: NewsItem, date: string): boolean {
  const time = Date.parse(item.pubDate);
  if (!Number.isFinite(time)) return false;
  return hktParts(new Date(time)).date === date;
}

function chineseDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function isHk(cluster: StoryCluster): boolean {
  return cluster.items.some((item) => item.category === 'hk' || item.regions.includes('HKG'));
}

function regionOf(cluster: StoryCluster): string[] {
  const codes = new Set<string>();
  for (const item of cluster.items) for (const code of item.regions) codes.add(code);
  if (isHk(cluster)) codes.add('HKG');
  return [...codes];
}

function categoryOf(cluster: StoryCluster): string {
  return cluster.lead.category || cluster.items.find((item) => item.category)?.category || 'world';
}

function storyFrom(cluster: StoryCluster, date: string, explainers: TodayLink[]): TodayStory {
  const timed = [...cluster.items].sort((a, b) => Date.parse(a.pubDate) - Date.parse(b.pubDate));
  const lead = timed[0] ?? cluster.lead;
  const sources = [];
  const seen = new Set<string>();
  for (const item of timed) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    sources.push({ source: item.source, title: item.title, url: item.link });
    if (sources.length >= 6) break;
  }
  const explainer = explainers.find((entry) => entry.key.startsWith(date) && (
    titlesAreSameEvent(entry.title, cluster.lead.title) || cluster.items.some((item) => titlesAreSameEvent(entry.title, item.title))
  ));
  return {
    title: cluster.lead.title,
    time: lead.pubDate,
    sources,
    outlets: cluster.count,
    category: categoryOf(cluster),
    regions: regionOf(cluster),
    ...(explainer ? { explainerKey: explainer.key } : {}),
  };
}

function matches(cluster: StoryCluster, region?: string, category?: string): boolean {
  if (region && !regionOf(cluster).includes(region)) return false;
  if (category && categoryOf(cluster) !== category && !cluster.items.some((item) => item.category === category)) return false;
  return true;
}

/** Fewer multi-outlet stories than this and the day page stays noindex (thin list). */
export const TODAY_INDEX_FLOOR = 5;

/** Most-covered clusters for one Hong Kong day. Hong Kong stories lead the unfiltered list. */
export function buildToday(options: {
  clusters: StoryCluster[];
  date: string;
  explainers?: TodayLink[];
  region?: string;
  category?: string;
  today?: boolean;
}): TodayModel {
  const explainers = options.explainers ?? [];
  const ranked = [...options.clusters]
    .filter((cluster) => cluster.count >= 2)
    .sort((a, b) => b.count - a.count || b.latest - a.latest);
  const regionCounts = REGION_CODES.map((region) => ({
    code: region.code,
    label: region.label,
    count: ranked.filter((cluster) => matches(cluster, region.code)).length,
  })).filter((region) => region.count > 0);
  const categoryCounts = CATEGORY_IDS.map((id) => ({
    id,
    label: categoryLabel(id),
    count: ranked.filter((cluster) => matches(cluster, undefined, id)).length,
  })).filter((category) => category.count > 0);
  const filtered = Boolean(options.region || options.category);
  const pool = ranked.filter((cluster) => matches(cluster, options.region, options.category));
  const ordered = filtered ? pool : [...pool.filter(isHk), ...pool.filter((cluster) => !isHk(cluster))];
  const stories = ordered.slice(0, filtered ? 30 : 10).map((cluster) => storyFrom(cluster, options.date, explainers));
  const when = options.today ? '今日' : chineseDate(options.date);
  const scope = options.region
    ? (REGION_CODES.find((region) => region.code === options.region)?.label || '地區')
    : options.category
      ? categoryLabel(options.category)
      : '香港';
  const hkShare = stories.length ? ordered.slice(0, stories.length).filter(isHk).length / stories.length : 0;
  const title = filtered ? `${when}${scope}新聞時間線` : `${when}${hkShare >= 0.5 ? '香港' : ''}十大新聞時間線`;
  const description = stories.length
    ? `${when}按報道時間排列的多方新聞，共 ${stories.length} 則，列出媒體與原文連結。`
    : `${chineseDate(options.date)}尚未有足夠的多方報道。`;
  return {
    date: options.date,
    title,
    description,
    stories,
    regions: regionCounts,
    categories: categoryCounts,
    index: stories.length >= TODAY_INDEX_FLOOR,
    filtered,
  };
}

export function todayPaths(date: string): string[] {
  const root = `/today/${date}/`;
  return [
    '/today/',
    root,
    ...REGION_CODES.map((region) => `${root}region/${region.code}/`),
    ...CATEGORY_IDS.map((id) => `${root}category/${id}/`),
  ];
}

function chip(href: string, label: string, count: number, current: boolean): string {
  return `<a class="chip${current ? ' active' : ''}" href="${esc(href)}"${current ? ' aria-current="page"' : ''}>${esc(label)} ${count}</a>`;
}

function timeline(model: TodayModel): string {
  const rest = model.stories.slice(model.filtered ? 0 : 1);
  if (!rest.length) return '';
  const rows = rest.map((story) => {
    const sources = story.sources.map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.source)}</a>`).join('、');
    const pack = story.explainerKey ? ` <a href="/explainer/${encodeURIComponent(story.explainerKey)}/">懶人包</a>` : '';
    return `<li><time datetime="${esc(story.time)}">${esc(hkt(story.time, false))}</time><span class="tl-dot" aria-hidden="true"></span><span class="tl-body"><strong>${esc(story.title)}</strong><span class="source-title">${sources}${pack}</span><span class="source-name">${story.outlets} 間媒體</span></span></li>`;
  }).join('');
  return `<section class="story column-block timeline-card" aria-label="時間線"><div class="story-body"><h2 class="column-h2">報道時間線</h2><ol class="timeline">${rows}</ol></div></section>`;
}

function lead(story: TodayStory | undefined): string {
  if (!story) return '';
  const sources = story.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer"><span class="source-name">${esc(source.source)}</span><span class="source-title">${esc(source.title)}</span></a></li>`).join('');
  const pack = story.explainerKey ? `<p><a class="read-original" href="/explainer/${encodeURIComponent(story.explainerKey)}/">閱讀懶人包</a></p>` : '';
  return `<article class="story story-hero column-hero"><div class="story-body">
    <div class="story-kicker"><span class="badge">標題匯編</span><span class="kicker-region">${esc(categoryLabel(story.category))}</span></div>
    <h2 class="story-title">${esc(story.title)}</h2>
    <div class="story-meta"><time datetime="${esc(story.time)}">${esc(hkt(story.time))} 香港時間</time><span>· ${story.outlets} 間媒體</span></div>
    <ul class="source-list">${sources}</ul>
    ${pack}
  </div></article>`;
}

export function renderToday(model: TodayModel, canonical: string): string {
  const robots = model.index
    ? '<meta name="robots" content="index,follow" />'
    : '<meta name="robots" content="noindex,follow" />';
  const dateHref = `/today/${model.date}/`;
  const regions = model.regions.map((region) => chip(`${dateHref}region/${region.code}/`, region.label, region.count, false)).join('');
  const categories = model.categories.map((category) => chip(`${dateHref}category/${category.id}/`, category.label, category.count, false)).join('');
  const empty = model.stories.length
    ? ''
    : '<p class="notice">這一日尚未有足夠的多方報道。稍後會按已收錄標題再排列。</p>';
  const featured = model.filtered ? '' : lead(model.stories[0]);
  const body = `<div class="layout">
    <main id="content" class="column-main">
      <header class="index-head">
        <div class="story-kicker"><span class="kicker-region">時間線</span><span class="badge">標題匯編</span></div>
        <h1 class="column-title">${esc(model.title)}</h1>
        <p class="dek">${esc(model.description)} 本頁只列標題、時間與出處，不轉載內文，亦不經模型生成。</p>
      </header>
      ${featured}
      ${timeline(model)}
      ${empty}
      <section class="story column-block"><div class="story-body"><h2 class="column-h2">當日其他欄目</h2><ul class="points"><li><a href="/briefing/">每日香港導讀</a></li><li><a href="/explainer/">新聞懶人包</a></li><li><a href="/data/">香港數據</a></li></ul></div></section>
    </main>
    <aside class="sidebar" aria-label="側欄">
      <section class="side-card"><h2>按地區</h2><nav class="filters" aria-label="地區">${regions || '<p>這一日未有地區分類。</p>'}</nav></section>
      <section class="side-card"><h2>按分類</h2><nav class="filters" aria-label="分類">${categories || '<p>這一日未有分類。</p>'}</nav></section>
    </aside>
  </div>`;
  return `<!doctype html>
<html lang="zh-HK">
${head(model.title, model.description, canonical, '', 'website', robots, '', false)}
<body>
  <div class="page column-page" data-kind="today">
  ${chrome('today')}
  ${body}
  ${footer()}
  </div>
</body>
</html>`;
}

export function renderTodayMissing(): string {
  const canonical = 'https://world-news.xyz/today/';
  return `<!doctype html>
<html lang="zh-HK">
${head('找不到這一頁', '這個時間線頁不存在。可以返回今日香港十大新聞時間線。', canonical, '', 'website', '<meta name="robots" content="noindex" />', '', false)}
<body>
  <div class="page column-page" data-kind="today">
  ${chrome('today')}
  <main id="content" class="column-index">
    <div class="status-panel"><h2>找不到這一頁</h2><p>時間線只收錄某一日、某一地區或某一分類。</p><a class="primary" href="/today/">返回今日時間線</a></div>
  </main>
  ${footer()}
  </div>
</body>
</html>`;
}

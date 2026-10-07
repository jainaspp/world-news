import { sameEvent, type StoryCluster } from './angles.js';
import { hktParts, type ContentDoc, type SourceRef } from './content.js';
import { XAI_MONTHLY_CAP_USD } from './grok.js';
import type { NewsItem } from './types.js';

/** How long an explainer can receive a follow-up instead of a new piece. */
export const UPDATE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

/** New explainers across both warm runs. The workflow asks for about nine per run. */
export const EXPLAINERS_PER_DAY = 18;

/** Planning figure for one researched article. Used only to stop before the month overshoots. */
export const ARTICLE_BUDGET_USD = 0.015;

/** Follow-up calls per generate. The token cap stays small. */
export const UPDATES_PER_CALL = 2;

export const DELTA_MAX_TOKENS = 640;

export interface ResearchExcerpt {
  url: string;
  source: string;
  title: string;
  text: string;
}

export interface ResearchBundle {
  signature: string;
  title: string;
  date: string;
  urls: string[];
  excerpts: ResearchExcerpt[];
  chars: number;
}

export interface StoredEvent {
  key: string;
  /** Model headline, kept so a later cluster can match the published piece. */
  title: string;
  /** Lead headline from the cluster that created the piece. */
  leadTitle: string;
  links: string[];
  at: number;
  signature: string;
}

export interface ExplainerDelta {
  timeline: { source: string; title: string }[];
  points?: string[];
  follow?: string;
}

export interface DeltaMaterial {
  source: string;
  title: string;
  url: string;
  pubDate?: string;
  excerpt?: string;
}

const EVENTS_KEY = 'explainer-events';

export function eventsKey(): string {
  return EVENTS_KEY;
}

export function bundleKey(date: string, signature: string): string {
  return `research:${date}:${signature}`;
}

export function bundleIndexKey(date: string): string {
  return `research-index:${date}`;
}

export function monthPaceUsd(now = new Date(), cap = XAI_MONTHLY_CAP_USD): number {
  const { date } = hktParts(now);
  const day = Number(date.slice(8, 10));
  const [year, month] = date.split('-').map(Number);
  const days = new Date(Date.UTC(year || 2026, month || 1, 0)).getUTCDate() || 30;
  return (day / days) * cap;
}

/** New full articles still allowed before month-to-date spend passes the linear US$10 pace. */
export function articleRoom(costUsd: number, now = new Date(), each = ARTICLE_BUDGET_USD): number {
  const room = monthPaceUsd(now) - costUsd;
  if (room <= 0) return 0;
  return Math.floor(room / each);
}

export function overPace(costUsd: number, now = new Date()): boolean {
  return articleRoom(costUsd, now) <= 0 && costUsd > 0;
}

function stub(title: string): NewsItem {
  return {
    id: title,
    title,
    link: '',
    source: '',
    sourceUrl: '',
    regions: [],
    pubDate: new Date(0).toISOString(),
  };
}

/** Same-event check with no time window, for a stored title against a new headline. */
export function titlesAreSameEvent(left: string, right: string): boolean {
  if (!left.trim() || !right.trim()) return false;
  if (left.trim() === right.trim()) return true;
  return sameEvent(stub(left), stub(right), 0);
}

export function matchEvent(cluster: StoryCluster, events: StoredEvent[], now = Date.now()): StoredEvent | null {
  const links = new Set(cluster.items.map((item) => item.link));
  for (const event of events) {
    if (now - event.at > UPDATE_WINDOW_MS) continue;
    if (event.links.some((link) => links.has(link))) return event;
    const titles = [event.title, event.leadTitle];
    const headlines = [cluster.lead.title, ...cluster.items.map((item) => item.title)];
    const same = titles.some((title) => headlines.some((headline) => titlesAreSameEvent(title, headline)));
    if (same) return event;
  }
  return null;
}

export function newLinks(cluster: StoryCluster, event: StoredEvent): string[] {
  const known = new Set(event.links);
  const fresh: string[] = [];
  for (const item of cluster.items) {
    if (!item.link || known.has(item.link) || fresh.includes(item.link)) continue;
    fresh.push(item.link);
  }
  return fresh;
}

export function pruneEvents(events: StoredEvent[], now = Date.now()): StoredEvent[] {
  return events.filter((event) => now - event.at <= UPDATE_WINDOW_MS && event.key && event.title);
}

export function bundleFrom(date: string, signature: string, title: string, items: NewsItem[]): ResearchBundle {
  const excerpts: ResearchExcerpt[] = [];
  for (const item of items) {
    const text = (item.excerpt || '').trim();
    if (text.length < 80 || excerpts.some((row) => row.url === item.link)) continue;
    excerpts.push({ url: item.link, source: item.source, title: item.title, text: text.slice(0, 1_200) });
    if (excerpts.length >= 4) break;
  }
  return {
    signature,
    title,
    date,
    urls: [...new Set(items.map((item) => item.link))],
    excerpts,
    chars: excerpts.reduce((sum, row) => sum + row.text.length, 0),
  };
}

/** Copy a same-day explainer bundle onto briefing headlines so the briefing does not search again. */
export function applyBundles(items: NewsItem[], bundles: ResearchBundle[]): NewsItem[] {
  return items.map((item) => {
    if ((item.excerpt || '').length >= 400) return item;
    const bundle = bundles.find((row) => row.urls.includes(item.link) || row.excerpts.some((excerpt) => excerpt.url === item.link))
      || bundles.find((row) => titlesAreSameEvent(row.title, item.title));
    if (!bundle) return item;
    const own = bundle.excerpts.find((excerpt) => excerpt.url === item.link);
    const text = own?.text || bundle.excerpts.map((excerpt) => excerpt.text).join(' ').slice(0, 1_200);
    if (!text) return item;
    return { ...item, excerpt: text.slice(0, 1_200) };
  });
}

export function excerptChars(items: NewsItem[]): number {
  return items.reduce((sum, item) => sum + (item.excerpt || '').trim().length, 0);
}

function stripFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] || text).trim();
}

export function parseDelta(text: string): ExplainerDelta | null {
  try {
    const parsed = JSON.parse(stripFence(text)) as {
      timeline?: { source?: unknown; title?: unknown }[];
      points?: unknown;
      follow?: unknown;
    };
    if (!parsed || typeof parsed !== 'object') return null;
    const timeline = Array.isArray(parsed.timeline)
      ? parsed.timeline.flatMap((row) => {
        const title = typeof row?.title === 'string' ? row.title.trim() : '';
        const source = typeof row?.source === 'string' ? row.source.trim() : '';
        return title ? [{ source, title }] : [];
      }).slice(0, 4)
      : [];
    const points = Array.isArray(parsed.points)
      ? parsed.points.filter((row): row is string => typeof row === 'string' && row.trim().length > 0).map((row) => row.trim()).slice(0, 4)
      : undefined;
    const follow = typeof parsed.follow === 'string' && parsed.follow.trim() ? parsed.follow.trim() : undefined;
    if (!timeline.length && !(points && points.length >= 2) && !follow) return null;
    return { timeline, ...(points && points.length >= 2 ? { points } : {}), ...(follow ? { follow } : {}) };
  } catch {
    return null;
  }
}

function sameRow(source: SourceRef, row: { source: string; title: string }): boolean {
  return source.title.trim() === row.title.trim() && source.source.trim() === row.source.trim();
}

/**
 * Append timeline rows that match the new material. Optional 重點 and 後續關注 replace those parts.
 * The model does not get to invent a URL.
 */
export function applyDelta(doc: ContentDoc, delta: ExplainerDelta, material: DeltaMaterial[], now = new Date()): { doc: ContentDoc; changed: boolean } {
  const blocks = doc.blocks.map((block) => ({ ...block, sources: [...block.sources], sentences: [...block.sentences] }));
  let timeline = blocks.find((block) => block.title === '事件時間線');
  if (!timeline) {
    timeline = { title: '事件時間線', sentences: [], sources: [], category: blocks[0]?.category || 'world' };
    blocks.unshift(timeline);
  }
  let changed = false;
  for (const row of delta.timeline) {
    if (timeline.sources.some((source) => sameRow(source, row))) continue;
    const matched = material.find((item) => item.title.trim() === row.title.trim())
      || material.find((item) => item.source.trim() === row.source.trim() && item.title.includes(row.title.slice(0, 8)));
    if (!matched) continue;
    timeline.sources.push({
      title: matched.title,
      url: matched.url,
      source: matched.source,
      ...(matched.excerpt ? { excerpt: matched.excerpt.slice(0, 1_200) } : {}),
      ...(matched.pubDate ? { pubDate: matched.pubDate } : {}),
    });
    timeline.sentences.push(`${matched.source}：${matched.title}。`);
    changed = true;
  }
  const next: ContentDoc = { ...doc, blocks };
  if (delta.points && delta.points.length >= 2) {
    next.points = delta.points;
    changed = true;
  }
  if (delta.follow) {
    const follow = blocks.find((block) => block.title === '後續關注');
    if (follow) follow.sentences = [delta.follow];
    else {
      blocks.push({
        title: '後續關注',
        sentences: [delta.follow],
        sources: timeline.sources.slice(0, 4),
        category: timeline.category,
      });
    }
    changed = true;
  }
  if (!changed) return { doc, changed: false };
  next.updatedAt = now.toISOString();
  return { doc: next, changed: true };
}

export function deltaPrompt(doc: ContentDoc, material: DeltaMaterial[]): { system: string; user: string; maxTokens: number } {
  const narrative = doc.blocks
    .filter((block) => block.title !== '事件時間線')
    .flatMap((block) => block.sentences)
    .join('')
    .slice(0, 500);
  const system = [
    '你是世界頭條的編輯。一律用繁體中文正式新聞書面語，不要用簡體字，不要用粵語口語。',
    '這是後續更新，不是重寫。只可使用下面的新標題和摘錄。禁止添加摘錄沒有的事實、數字、引言、人名或因果。',
    '沒有新事實就回傳空的 timeline，不要為了填滿而重複已有內容。不要寫「未有回應」。',
    '回覆必須是 JSON，不要用 Markdown。',
  ].join('');
  const shape = '回傳 {"timeline":[{"source":"媒體名稱","title":"新標題"}],"points":["可省略"],"follow":"可省略"}。timeline 只列這次新出現的發展，最多 3 條。points 若有更新就給 3 條，每條 35 字以內，否則省略。follow 是更新後的「後續關注」，100 字以內，沒有新的下一步就省略。';
  const payload = {
    title: doc.title,
    points: doc.points ?? [],
    summary: narrative,
    fresh: material.map((row) => ({
      source: row.source,
      title: row.title,
      excerpt: (row.excerpt || '').slice(0, 1_200),
    })),
  };
  return { system, user: `${shape}\n已有內容與新資料：${JSON.stringify(payload)} /no_think`, maxTokens: DELTA_MAX_TOKENS };
}

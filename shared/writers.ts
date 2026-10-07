import type { StoryCluster } from './angles.js';
import {
  briefingScopeOf,
  formatHkt,
  hktParts,
  slotId,
  type BriefingScope,
  type ContentDoc,
  type DigestBlock,
  type SourceRef,
} from './content.js';
import {
  blocksRewrite,
  briefingFromItems,
  briefingKey,
  compareKey,
  findWritten,
  isChinaItem,
  PROMO_RE,
  selectBriefingItems,
  storySignature,
  type WrittenStory,
} from './grok.js';
import type { NewsItem } from './types.js';

/** MiniMax explainers written in one morning or evening warm run. */
export const MINIMAX_EXPLAINERS_PER_RUN = 15;

/** MiniMax pieces per /api/generate call: each runs draft, check, rewrite, check (about 60 s). */
export const MINIMAX_PER_CALL = 3;

export type ArticleWriter = 'grok' | 'minimax';

export function isBriefingScope(value: string): value is BriefingScope {
  return value === 'hk' || value === 'world' || value === 'techfin';
}

export function scopedBriefingKey(scope: BriefingScope, now = new Date()): string {
  const slot = briefingKey(now);
  return scope === 'hk' ? slot : `${slot}-${scope}`;
}

/** Hong Kong and mainland China stay on Grok. Tech, finance, international, science, health, sport, and entertainment use MiniMax. */
export function clusterWriter(cluster: StoryCluster): ArticleWriter {
  const lead = cluster.lead;
  if (lead.category === 'hk' || lead.category === 'china') return 'grok';
  if (isChinaItem(lead)) return 'grok';
  if (lead.regions.includes('HKG')) return 'grok';
  return 'minimax';
}

/** Region and category intros outside Hong Kong and mainland China use MiniMax. */
export function focusWriter(page: { scope: 'region' | 'category'; id: string }): ArticleWriter {
  if (page.scope === 'category' && (page.id === 'hk' || page.id === 'china')) return 'grok';
  if (page.scope === 'region' && page.id === 'hkg') return 'grok';
  return 'minimax';
}

export function minimaxHeld(written: WrittenStory[], now = new Date()): number {
  const slot = slotId(now);
  return written.filter((row) => row.provider === 'minimax' && slotId(new Date(row.at)) === slot && blocksRewrite(row, now.getTime())).length;
}

export function minimaxRoom(written: WrittenStory[], now = new Date(), perRun = MINIMAX_EXPLAINERS_PER_RUN): number {
  return Math.max(0, perRun - minimaxHeld(written, now));
}

/** Highest outlet-count MiniMax stories, up to the half-day room. Does not spend the Grok daily cap. */
export function pickMiniMaxBatch(
  clusters: StoryCluster[],
  written: WrittenStory[],
  limit = MINIMAX_PER_CALL,
  now = new Date(),
): StoryCluster[] {
  const take = Math.min(Math.max(0, limit), minimaxRoom(written, now));
  if (take <= 0) return [];
  const ranked = clusters
    .filter((cluster) => cluster.count >= 2 && clusterWriter(cluster) === 'minimax')
    .sort((a, b) => b.count - a.count || b.latest - a.latest);
  const picked: StoryCluster[] = [];
  const seen = [...written];
  for (const cluster of ranked) {
    if (picked.length >= take) break;
    if (blocksRewrite(findWritten(cluster, seen, now), now.getTime())) continue;
    picked.push(cluster);
    seen.push({
      key: compareKey(cluster, now),
      signature: storySignature(cluster),
      links: cluster.items.map((item) => item.link),
      mode: 'ai',
      at: now.getTime(),
      ready: true,
      provider: 'minimax',
    });
  }
  return picked;
}

function onToday(item: NewsItem, today: string): boolean {
  const time = Date.parse(item.pubDate);
  if (!Number.isFinite(time)) return false;
  return hktParts(new Date(time)).date === today;
}

function takeItems(items: NewsItem[], pick: (item: NewsItem) => boolean, now: Date, perSide: number): NewsItem[] {
  const today = hktParts(now).date;
  const rows = items.filter((item) => pick(item) && !PROMO_RE.test(item.title)).slice().sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  const current = rows.filter((item) => onToday(item, today));
  return (current.length >= 3 ? current : rows).slice(0, perSide);
}

function toSource(item: NewsItem): SourceRef {
  return {
    title: item.title,
    url: item.link,
    source: item.source,
    ...(item.excerpt ? { excerpt: item.excerpt.slice(0, 2_500) } : {}),
    ...(item.image ? { image: item.image } : {}),
    ...(item.category ? { category: item.category } : {}),
    ...(item.pubDate ? { pubDate: item.pubDate } : {}),
  };
}

function section(title: string, rows: NewsItem[], category: string): DigestBlock | null {
  if (!rows.length) return null;
  const sources = rows.slice(0, 8).map(toSource);
  return {
    title,
    category,
    sources,
    sentences: sources.slice(0, 6).map((source) => `${source.source}報道：${source.title}。`),
  };
}

const SCOPE_NAME: Record<Exclude<BriefingScope, 'hk'>, string> = {
  world: '國際導讀',
  techfin: '科技財經導讀',
};

/** Hong Kong briefing stays on the existing builder. World and tech/finance are separate slots. */
export function briefingDraft(items: NewsItem[], scope: BriefingScope, now = new Date(), perSide = 8): ContentDoc | null {
  const key = scopedBriefingKey(scope, now);
  if (scope === 'hk') {
    const selected = selectBriefingItems(items, now, perSide);
    return briefingFromItems(selected.hk, selected.china, key, now);
  }
  const world = takeItems(items, (item) => (item.category === 'world' || item.category === 'asia') && !isChinaItem(item), now, perSide);
  const tech = takeItems(items, (item) => item.category === 'tech' && !isChinaItem(item), now, perSide);
  const finance = takeItems(items, (item) => item.category === 'business' && !isChinaItem(item), now, perSide);
  const blocks = scope === 'world'
    ? [section('國際', world, 'world')].filter((block): block is DigestBlock => Boolean(block))
    : [section('科技', tech, 'tech'), section('財經', finance, 'business')].filter((block): block is DigestBlock => Boolean(block));
  if (blocks.reduce((sum, block) => sum + block.sources.length, 0) < 2) return null;
  const when = slotId(now).endsWith('pm') ? '傍晚' : '早上';
  blocks.push({
    title: '今日值得留意',
    category: blocks[0]?.category || (scope === 'world' ? 'world' : 'tech'),
    sources: [],
    sentences: ['這一版尚未寫成分析。模型完成後會說明事件為何重要，以及值得留意的具體事項。'],
  });
  return {
    kind: 'briefing',
    key,
    title: `${SCOPE_NAME[scope]} ${key.slice(0, 10)} ${when}`,
    description: blocks[0]?.sentences[0] || SCOPE_NAME[scope],
    blocks,
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function latestBriefingLinks(entries: { key: string }[]): { href: string; label: string }[] {
  const href = (scope: BriefingScope) => {
    const hit = entries.find((entry) => briefingScopeOf(entry.key) === scope);
    return hit ? `/briefing/${encodeURIComponent(hit.key)}/` : '/briefing/';
  };
  return [
    { href: href('hk'), label: '每日香港導讀' },
    { href: href('world'), label: '國際導讀' },
    { href: href('techfin'), label: '科技財經導讀' },
  ];
}

import {
  angleClusters,
  cardsFromClusters,
  majorTimeline,
  sourceCounts,
  type ClusterCard,
  type MajorEntry,
  type StoryCluster,
} from './angles.js';
import type { NewsItem } from './types.js';

/** Newest headlines a request may cluster if the precomputed board is missing. */
export const REQUEST_CLUSTER_LIMIT = 100;

/** How long a stored board may be served before `/api/board` rebuilds it. */
export const BOARD_FRESH_MS = 10 * 60 * 1000;

export const BOARD_KV_KEY = 'board:signals';

export interface BoardHeadline {
  id: string;
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category?: NewsItem['category'];
}

/** Precomputed clusters, major timeline, and slim headlines. Written by `/api/board`. */
export interface BoardSnapshot {
  savedAt: number;
  clusters: ClusterCard[];
  counts: Record<string, number>;
  banner: MajorEntry | null;
  timeline: MajorEntry[];
  headlines: BoardHeadline[];
}

function timeOf(item: NewsItem): number {
  const value = Date.parse(item.pubDate);
  return Number.isNaN(value) ? 0 : value;
}

/** Newest `limit` items. The full list is unchanged when it is already small. */
export function newestItems(items: NewsItem[], limit = REQUEST_CLUSTER_LIMIT): NewsItem[] {
  if (items.length <= limit) return items;
  return [...items].sort((a, b) => timeOf(b) - timeOf(a) || a.id.localeCompare(b.id)).slice(0, limit);
}

/** Capped clustering for a request-path fallback. Never walks the full board. */
export function clusterRecent(items: NewsItem[], limit = REQUEST_CLUSTER_LIMIT): StoryCluster[] {
  return angleClusters(newestItems(items, limit));
}

export function computeBoard(items: NewsItem[], now = Date.now()): BoardSnapshot {
  const clusters = angleClusters(items);
  const counts: Record<string, number> = {};
  for (const [id, count] of sourceCounts(clusters)) counts[id] = count;
  const { banner, timeline } = majorTimeline(items, now);
  return {
    savedAt: now,
    clusters: cardsFromClusters(clusters),
    counts,
    banner,
    timeline,
    headlines: items.map((item) => ({
      id: item.id,
      title: item.title,
      link: item.link,
      source: item.source,
      pubDate: item.pubDate,
      ...(item.category ? { category: item.category } : {}),
    })),
  };
}

export function parseBoard(raw: string | null | undefined): BoardSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as BoardSnapshot;
    if (!value || typeof value !== 'object') return null;
    if (!Array.isArray(value.clusters) || !Array.isArray(value.timeline) || !Array.isArray(value.headlines)) return null;
    if (!value.counts || typeof value.counts !== 'object') return null;
    if (typeof value.savedAt !== 'number') return null;
    return value;
  } catch {
    return null;
  }
}

export function boardIsFresh(snapshot: BoardSnapshot | null, now = Date.now(), ttl = BOARD_FRESH_MS): boolean {
  return Boolean(snapshot && now - snapshot.savedAt < ttl && now >= snapshot.savedAt);
}

function headlineItem(row: BoardHeadline): NewsItem {
  return {
    id: row.id,
    title: row.title,
    link: row.link,
    source: row.source,
    sourceUrl: '',
    regions: [],
    pubDate: row.pubDate,
    category: row.category,
  };
}

/** Rebuild StoryClusters from the stored cards. No title comparison. */
export function clustersFromSnapshot(snapshot: BoardSnapshot): StoryCluster[] {
  const clusters: StoryCluster[] = [];
  for (const card of snapshot.clusters) {
    const items = card.members.map((member) => headlineItem({
      id: member.id,
      title: member.title,
      link: member.link,
      source: member.source,
      pubDate: member.pubDate,
    }));
    const lead = items[0];
    if (!lead) continue;
    const sources = [...new Set(items.map((item) => item.source))];
    const latest = items.reduce((max, item) => Math.max(max, timeOf(item)), 0);
    clusters.push({ id: card.id, lead, items, sources, count: sources.length, latest });
  }
  return clusters;
}

/** One stored cluster, preferring live list rows so images and categories survive. */
export function clusterFromSnapshot(snapshot: BoardSnapshot, id: string, items: NewsItem[] = []): StoryCluster | null {
  const card = snapshot.clusters.find((cluster) => cluster.id === id || cluster.members.some((member) => member.id === id));
  if (!card) return null;
  const byId = new Map(items.map((item) => [item.id, item]));
  const group = card.members.map((member) => byId.get(member.id) ?? headlineItem({
    id: member.id,
    title: member.title,
    link: member.link,
    source: member.source,
    pubDate: member.pubDate,
  }));
  const lead = group[0];
  if (!lead) return null;
  const sources = [...new Set(group.map((item) => item.source))];
  const latest = group.reduce((max, item) => Math.max(max, timeOf(item)), 0);
  return { id: card.id, lead, items: group, sources, count: sources.length, latest };
}

export function headlinesAsItems(snapshot: BoardSnapshot): NewsItem[] {
  return snapshot.headlines.map(headlineItem);
}

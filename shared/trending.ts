import type { NewsItem } from './types';
import { jaccard, textTokens } from './text.js';

export interface StoryCluster {
  id: string;
  lead: NewsItem;
  items: NewsItem[];
  sources: string[];
  count: number;
  latest: number;
}

function timeOf(item: NewsItem): number {
  const value = new Date(item.pubDate).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function clusterStories(items: NewsItem[]): StoryCluster[] {
  const tokens = new Map<string, string[]>();
  for (const item of items) tokens.set(item.id, textTokens(item.title));

  const groups: NewsItem[][] = [];
  for (const item of items) {
    const itemTokens = tokens.get(item.id) ?? [];
    if (itemTokens.length < 2) {
      groups.push([item]);
      continue;
    }
    let placed = false;
    for (const group of groups) {
      const lead = group[0];
      if (!lead) continue;
      const overlap = jaccard(itemTokens, tokens.get(lead.id) ?? []);
      if (overlap.score >= 0.34 || (overlap.shared >= 3 && overlap.score >= 0.22)) {
        group.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([item]);
  }

  return groups
    .map((group) => {
      const sources = [...new Set(group.map((item) => item.source))];
      const lead = [...group].sort((a, b) => {
        if (a.image && !b.image) return -1;
        if (!a.image && b.image) return 1;
        return timeOf(b) - timeOf(a);
      })[0];
      if (!lead) return null;
      const latest = Math.max(...group.map(timeOf));
      return { id: lead.id, lead, items: group, sources, count: sources.length, latest };
    })
    .filter((cluster): cluster is StoryCluster => cluster !== null && cluster.count >= 2)
    .sort((a, b) => b.count - a.count || b.latest - a.latest);
}

export function sourceCounts(clusters: StoryCluster[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const cluster of clusters) {
    for (const item of cluster.items) counts.set(item.id, cluster.count);
  }
  return counts;
}

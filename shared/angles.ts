import type { NewsItem } from './types.js';
import { jaccard, textTokens } from './text.js';

/** Same-event grouping used by story pages, the cluster endpoint, and major-update detection. */
export interface StoryCluster {
  id: string;
  lead: NewsItem;
  items: NewsItem[];
  sources: string[];
  count: number;
  latest: number;
}

export interface ClusterMember {
  id: string;
  source: string;
  title: string;
  link: string;
  pubDate: string;
}

export interface ClusterCard {
  id: string;
  members: ClusterMember[];
}

/** Articles further apart than this are not the same developing story. */
export const ANGLE_WINDOW_MS = 12 * 60 * 60 * 1000;

export const MAJOR_WINDOW_MS = 3 * 60 * 60 * 1000;
export const MAJOR_TIMELINE_MS = 24 * 60 * 60 * 1000;
export const MAJOR_OUTLETS = 4;

const MAJOR_RE = /突發|快訊|breaking/i;

/** Places and countries that show up in unrelated headlines. A match needs something more specific. */
const GENERIC = new Set(['china', 'us', 'hk', 'taiwan', 'russia', 'japan', 'korea', 'eu', 'uk']);

const ENTITIES: Array<[RegExp, string]> = [
  [/特朗普|川普|\btrump\b/i, 'trump'],
  [/拜登|\bbiden\b/i, 'biden'],
  [/普京|普丁|\bputin\b/i, 'putin'],
  [/澤連斯基|泽连斯基|zelensky/i, 'zelensky'],
  [/內塔尼亞胡|内塔尼亚胡|netanyahu/i, 'netanyahu'],
  [/馬斯克|马斯克|\bmusk\b/i, 'musk'],
  [/習近平|习近平/i, 'xi'],
  [/英偉達|英伟达|\bnvidia\b/i, 'nvidia'],
  [/\bopenai\b/i, 'openai'],
  [/哈馬斯|哈马斯|\bhamas\b/i, 'hamas'],
  [/加沙|\bgaza\b/i, 'gaza'],
  [/以色列|\bisrael\b/i, 'israel'],
  [/烏克蘭|乌克兰|\bukraine\b/i, 'ukraine'],
  [/俄羅斯|俄罗斯|\brussia\b/i, 'russia'],
  [/台灣|台湾|\btaiwan\b/i, 'taiwan'],
  [/香港|hong kong/i, 'hk'],
  [/中國|中国|\bchina\b/i, 'china'],
  [/美國|美国|united states|\bu\.s\.|\busa\b/i, 'us'],
  [/日本|\bjapan\b/i, 'japan'],
  [/韓國|韩国|北韓|北朝鮮|朝鲜|\bkorea\b/i, 'korea'],
  [/歐盟|欧盟|\beu\b/i, 'eu'],
  [/英國|英国|\bbritain\b/i, 'uk'],
  [/聯儲局|美聯儲|联邦储备|federal reserve|\bfed\b/i, 'fed'],
  [/恆生指數|恒生指数|hang seng/i, 'hsi'],
  [/港鐵|港铁|\bmtr\b/i, 'mtr'],
  [/颱風|台风|\btyphoon\b/i, 'typhoon'],
  [/立法會|立法会/i, 'legco'],
];

function timeOf(item: NewsItem): number {
  const value = new Date(item.pubDate).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function titleEntities(title: string): Set<string> {
  const keys = new Set<string>();
  for (const [pattern, key] of ENTITIES) {
    pattern.lastIndex = 0;
    if (pattern.test(title)) keys.add(key);
  }
  for (const match of title.match(/\d{2,}/g) ?? []) keys.add(`n:${match}`);
  return keys;
}

/** Same-script lexical overlap, or a shared specific entity plus one more entity or number. */
export function titlesMatch(left: string, right: string): boolean {
  const a = textTokens(left);
  const b = textTokens(right);
  if (a.length >= 2 && b.length >= 2) {
    const overlap = jaccard(a, b);
    if (overlap.score >= 0.34 || (overlap.shared >= 3 && overlap.score >= 0.22)) return true;
  }
  const ea = titleEntities(left);
  const eb = titleEntities(right);
  const shared = [...ea].filter((key) => eb.has(key));
  if (shared.length < 2) return false;
  return shared.some((key) => !GENERIC.has(key) && !key.startsWith('n:'));
}

export function angleClusters(items: NewsItem[], windowMs = ANGLE_WINDOW_MS): StoryCluster[] {
  const sorted = [...items].sort((a, b) => timeOf(b) - timeOf(a) || a.id.localeCompare(b.id));
  const groups: NewsItem[][] = [];
  for (const item of sorted) {
    const published = timeOf(item);
    let placed = false;
    for (const group of groups) {
      const lead = group[0];
      if (!lead) continue;
      if (windowMs > 0 && timeOf(lead) - published > windowMs) continue;
      if (titlesMatch(lead.title, item.title)) {
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

/** Slim cards for `/api/clusters`. Every member id points at the same list. */
export function clusterCards(items: NewsItem[], limit = 8): ClusterCard[] {
  return angleClusters(items).map((cluster) => ({
    id: cluster.id,
    members: [...cluster.items]
      .sort((a, b) => timeOf(b) - timeOf(a))
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        source: item.source,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
      })),
  }));
}

export function headlineIsMajor(title: string): boolean {
  return MAJOR_RE.test(title);
}

export interface MajorEntry {
  id: string;
  title: string;
  href: string;
  source: string;
  outlets: number;
  at: string;
  keyword: boolean;
}

function inRange(published: number, now: number, windowMs: number): boolean {
  const age = now - published;
  return age >= -15 * 60 * 1000 && age <= windowMs;
}

/**
 * Best 3-hour slice with at least {@link MAJOR_OUTLETS} sources.
 * `at` is the newest article inside that slice.
 */
export function outletBurst(items: NewsItem[], now: number, spanMs = MAJOR_TIMELINE_MS): { outlets: number; at: number } | null {
  const rows = items
    .map((item) => ({ t: timeOf(item), source: item.source }))
    .filter((row) => row.t > 0 && inRange(row.t, now, spanMs))
    .sort((a, b) => a.t - b.t);
  let best: { outlets: number; at: number } | null = null;
  for (let start = 0; start < rows.length; start += 1) {
    const open = rows[start]!.t;
    const sources = new Set<string>();
    let at = open;
    for (let index = start; index < rows.length && rows[index]!.t - open <= MAJOR_WINDOW_MS; index += 1) {
      sources.add(rows[index]!.source);
      at = rows[index]!.t;
    }
    if (sources.size < MAJOR_OUTLETS) continue;
    if (!best || sources.size > best.outlets || (sources.size === best.outlets && at > best.at)) {
      best = { outlets: sources.size, at };
    }
  }
  return best;
}

function entryFrom(item: NewsItem, outlets: number, at: number, keyword: boolean): MajorEntry {
  const id = /^[0-9a-f]{6,16}$/.test(item.id) ? item.id : '';
  return {
    id: item.id,
    title: item.title,
    href: id ? `/story/${id}/` : item.link,
    source: item.source,
    outlets,
    at: new Date(at).toISOString(),
    keyword,
  };
}

/** 24-hour major timeline, newest first. Banner is the newest entry still inside the 3-hour window. */
export function majorTimeline(items: NewsItem[], now = Date.now()): { banner: MajorEntry | null; timeline: MajorEntry[] } {
  const clusters = angleClusters(items, MAJOR_TIMELINE_MS);
  const covered = new Set<string>();
  const timeline: MajorEntry[] = [];

  for (const cluster of clusters) {
    for (const item of cluster.items) covered.add(item.id);
    const burst = outletBurst(cluster.items, now);
    const keywords = cluster.items.filter((item) => headlineIsMajor(item.title) && inRange(timeOf(item), now, MAJOR_TIMELINE_MS));
    if (!burst && keywords.length === 0) continue;
    const keywordAt = keywords.reduce((max, item) => Math.max(max, timeOf(item)), 0);
    const at = Math.max(burst?.at ?? 0, keywordAt);
    const lead = [...cluster.items].sort((a, b) => timeOf(b) - timeOf(a))[0] ?? cluster.lead;
    timeline.push(entryFrom(lead, Math.max(burst?.outlets ?? 0, cluster.count), at, keywords.length > 0));
  }

  for (const item of items) {
    if (covered.has(item.id) || !headlineIsMajor(item.title)) continue;
    const published = timeOf(item);
    if (!inRange(published, now, MAJOR_TIMELINE_MS)) continue;
    timeline.push(entryFrom(item, 1, published, true));
  }

  timeline.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const banner = timeline.find((entry) => inRange(Date.parse(entry.at), now, MAJOR_WINDOW_MS)) ?? null;
  return { banner, timeline };
}

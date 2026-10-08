import { briefingScopeOf, type IndexEntry } from './content.js';
import { regionsForSource, type SearchArticle, type SearchCorpus, type SearchHeadline } from './siteSearch.js';
import type { NewsItem } from './types.js';

export interface RollupHeadline {
  title: string;
  url: string;
  source: string;
  category?: string;
  at: string;
}

const KIND_LABEL: Record<SearchArticle['kind'], string> = {
  briefing: '導讀',
  explainer: '懶人包',
  analysis: '分析',
  digest: '日報',
  topic: '專題',
};

export function articlePath(kind: SearchArticle['kind'], key: string): string {
  const id = encodeURIComponent(key);
  if (kind === 'explainer') return `/explainer/${id}/`;
  if (kind === 'analysis') return `/analysis/${id}/`;
  if (kind === 'digest') return `/digest/${id}`;
  if (kind === 'topic') return `/topic/${id}/`;
  return `/briefing/${id}/`;
}

function fromEntry(kind: SearchArticle['kind'], entry: IndexEntry): SearchArticle {
  const regions = kind === 'briefing' && briefingScopeOf(entry.key) === 'hk'
    ? ['HKG']
    : kind === 'topic' && entry.category === 'hk'
      ? ['HKG']
      : [];
  return {
    id: `${kind}:${entry.key}`,
    title: entry.title,
    description: entry.description || '',
    href: articlePath(kind, entry.key),
    publishedAt: entry.publishedAt,
    kind,
    label: KIND_LABEL[kind],
    ...(entry.category ? { category: entry.category } : {}),
    ...(regions.length ? { regions } : {}),
  };
}

function headlineFromNews(item: NewsItem): SearchHeadline {
  const regions = item.regions.length ? item.regions : regionsForSource(item.source);
  return {
    id: item.id,
    title: item.title,
    link: item.link,
    source: item.source,
    regions,
    pubDate: item.pubDate,
    ...(item.category ? { category: item.category } : {}),
  };
}

export function buildCorpus(input: {
  news?: NewsItem[];
  rollup?: RollupHeadline[];
  briefings?: IndexEntry[];
  explainers?: IndexEntry[];
  analyses?: IndexEntry[];
  digests?: IndexEntry[];
  topics?: IndexEntry[];
}): SearchCorpus {
  const headlines: SearchHeadline[] = [];
  const seen = new Set<string>();
  const add = (row: SearchHeadline) => {
    if (!row.title || !row.link || seen.has(row.link)) return;
    seen.add(row.link);
    headlines.push(row);
  };
  for (const item of input.news ?? []) add(headlineFromNews(item));
  for (const row of input.rollup ?? []) {
    add({
      id: row.url,
      title: row.title,
      link: row.url,
      source: row.source,
      regions: regionsForSource(row.source),
      pubDate: row.at,
      ...(row.category ? { category: row.category } : {}),
    });
  }
  const articles = [
    ...(input.briefings ?? []).map((entry) => fromEntry('briefing', entry)),
    ...(input.explainers ?? []).map((entry) => fromEntry('explainer', entry)),
    ...(input.analyses ?? []).map((entry) => fromEntry('analysis', entry)),
    ...(input.digests ?? []).map((entry) => fromEntry('digest', entry)),
    ...(input.topics ?? []).map((entry) => fromEntry('topic', entry)),
  ];
  return { headlines, articles };
}

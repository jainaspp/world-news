import type { NewsItem, TimeRange } from './types';

const WINDOWS: Record<Exclude<TimeRange, 'all'>, number> = {
  hour: 60 * 60 * 1000,
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

export function filterNews(
  items: NewsItem[],
  opts: { region?: string; source?: string; q?: string; time?: TimeRange; now?: number },
): NewsItem[] {
  const region = opts.region && opts.region !== 'ALL' ? opts.region : '';
  const source = opts.source?.trim() ?? '';
  const query = opts.q?.trim().toLowerCase() ?? '';
  const time = opts.time ?? 'all';
  const now = opts.now ?? Date.now();
  const windowMs = time === 'all' ? 0 : WINDOWS[time];

  return items.filter((item) => {
    if (region && !item.regions.includes(region)) return false;
    if (source && item.source !== source) return false;
    if (query && !`${item.title} ${item.source}`.toLowerCase().includes(query)) return false;
    if (windowMs) {
      const published = new Date(item.pubDate).getTime();
      if (Number.isNaN(published) || now - published > windowMs) return false;
    }
    return true;
  });
}

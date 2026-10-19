import { blockedHkChinaStory, removedFromTaiwanPage } from './feeds.js';
import type { NewsItem } from './types';

const TODAY_MS = 24 * 60 * 60 * 1000;
/** Retired chip values. They no longer open their own window; they use today. */
const TODAY_PRESETS = new Set(['today', 'all', 'hour', 'week']);

export function filterNews(
  items: NewsItem[],
  opts: { region?: string; source?: string; category?: string; q?: string; time?: string; now?: number },
): NewsItem[] {
  const region = opts.region && opts.region !== 'ALL' ? opts.region : '';
  const source = opts.source?.trim() ?? '';
  const category = opts.category && opts.category !== 'all' ? opts.category : '';
  const query = opts.q?.trim().toLowerCase() ?? '';
  const now = opts.now ?? Date.now();
  const windowMs = opts.time && TODAY_PRESETS.has(opts.time) ? TODAY_MS : 0;
  const hkChinaDesk = category === 'hk' || category === 'china' || region === 'HKG';

  return items.filter((item) => {
    if (region && !item.regions.includes(region)) return false;
    if (region === 'TWN' && removedFromTaiwanPage(item)) return false;
    if (hkChinaDesk && blockedHkChinaStory(item)) return false;
    if (category && item.category !== category) return false;
    if (source && item.source !== source) return false;
    if (query && !`${item.title} ${item.source}`.toLowerCase().includes(query)) return false;
    if (windowMs) {
      const published = new Date(item.pubDate).getTime();
      if (Number.isNaN(published) || now - published > windowMs) return false;
    }
    return true;
  });
}

import { isCategoryId } from '../shared/categories';
import { REGIONS } from '../shared/feeds';
import type { TimeRange } from '../shared/types';

export interface ViewState {
  region: string;
  category: string;
  source: string;
  q: string;
  time: TimeRange;
  bookmarks: boolean;
}

const TIMES = new Set<TimeRange>(['all', 'hour', 'today', 'week']);

function regionCode(value: string): string {
  const code = value.toUpperCase();
  return REGIONS.some((region) => region.code === code) ? code : 'ALL';
}

function categoryCode(value: string): string {
  const id = value.toLowerCase();
  return id === 'all' || isCategoryId(id) ? id : 'all';
}

export function readView(location: Location = window.location): ViewState {
  const params = new URLSearchParams(location.search);
  const path = location.pathname;
  let region = regionCode(params.get('region') ?? '');
  let category = categoryCode(params.get('category') ?? 'all');
  const regionPath = path.match(/^\/region\/([a-z]+)$/i);
  const categoryPath = path.match(/^\/category\/([a-z]+)$/i);
  if (regionPath?.[1]) region = regionCode(regionPath[1]);
  if (categoryPath?.[1]) category = categoryCode(categoryPath[1]);
  const timeValue = params.get('time') ?? 'all';
  const time = TIMES.has(timeValue as TimeRange) ? (timeValue as TimeRange) : 'all';
  return {
    region,
    category,
    source: params.get('source') ?? '',
    q: params.get('q') ?? '',
    time,
    bookmarks: params.get('view') === 'bookmarks',
  };
}

export function viewHref(state: ViewState): string {
  if (state.bookmarks) {
    const params = new URLSearchParams();
    params.set('view', 'bookmarks');
    if (state.q.trim()) params.set('q', state.q.trim());
    return `/?${params.toString()}`;
  }
  const region = state.region === 'ALL' ? '' : state.region;
  const category = state.category === 'all' ? '' : state.category;
  const source = state.source.trim();
  const q = state.q.trim();
  const time = state.time === 'all' ? '' : state.time;
  if (!q && !time && !source && region && !category) return `/region/${region.toLowerCase()}`;
  if (!q && !time && !source && category && !region) return `/category/${category}`;
  const params = new URLSearchParams();
  if (region) params.set('region', region);
  if (category) params.set('category', category);
  if (source) params.set('source', source);
  if (q) params.set('q', q);
  if (time) params.set('time', time);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

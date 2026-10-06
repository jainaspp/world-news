import { stableId, normalizeLink } from '../shared/rss.js';
import type { NewsItem } from '../shared/types';

const FRESH_MS = 60 * 60 * 1000;
const CACHE_TIMEOUT_MS = 1000;

function creds(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  } catch {
    return null;
  }
  return { url, key };
}

async function requestJson(
  url: string,
  init: { method?: string; headers: Record<string, string>; body?: string },
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    headers: init.headers,
    body: init.body,
    signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
  });
  if (!response.ok) return { ok: false, status: response.status, json: null };
  const text = await response.text();
  return { ok: true, status: response.status, json: text ? JSON.parse(text) : null };
}

function headers(key: string, prefer?: string): Record<string, string> {
  const result: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (prefer) result.Prefer = prefer;
  return result;
}

interface Row {
  id?: string;
  title?: string;
  link?: string;
  source?: string;
  source_url?: string;
  region?: string;
  regions?: string;
  pub_date?: string;
  fetched_at?: string;
}

function fromRow(row: Row): NewsItem | null {
  const link = normalizeLink(row.link ?? '');
  const title = (row.title ?? '').trim();
  if (!link || !title) return null;
  const regions = (row.regions || row.region || 'ALL')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    id: row.id || stableId(link),
    title,
    link,
    source: row.source || 'News',
    sourceUrl: row.source_url || '',
    regions: regions.length ? regions : ['ALL'],
    pubDate: row.pub_date && !Number.isNaN(new Date(row.pub_date).getTime()) ? new Date(row.pub_date).toISOString() : '',
  };
}

export async function readCache(allowStale: boolean): Promise<NewsItem[] | null> {
  const auth = creds();
  if (!auth) return null;
  try {
    const response = await requestJson(
      `${auth.url}/rest/v1/news?select=id,title,link,source,source_url,region,regions,pub_date,fetched_at&order=pub_date.desc&limit=200`,
      { headers: headers(auth.key) },
    );
    if (!response.ok) return null;
    const rows = response.json as Row[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    if (!allowStale) {
      const newest = rows.reduce((max, row) => {
        const time = row.fetched_at ? new Date(row.fetched_at).getTime() : 0;
        return Math.max(max, Number.isNaN(time) ? 0 : time);
      }, 0);
      if (!newest || Date.now() - newest > FRESH_MS) return null;
    }
    return rows.map(fromRow).filter((item): item is NewsItem => item !== null);
  } catch {
    return null;
  }
}

export async function storeNews(
  items: NewsItem[],
): Promise<{ stored: number } | { stored: 0; error: string }> {
  const auth = creds();
  if (!auth) {
    return { stored: 0, error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set' };
  }
  const now = new Date().toISOString();
  const rows = items.slice(0, 200).map((item) => ({
    id: item.id,
    title: item.title,
    link: item.link,
    source: item.source,
    source_url: item.sourceUrl,
    region: item.regions[0] ?? 'ALL',
    regions: item.regions.join(','),
    pub_date: item.pubDate || now,
    fetched_at: now,
  }));
  try {
    const response = await requestJson(`${auth.url}/rest/v1/news?on_conflict=link`, {
      method: 'POST',
      headers: headers(auth.key, 'resolution=merge-duplicates'),
      body: JSON.stringify(rows),
    });
    if (!response.ok) return { stored: 0, error: `supabase_${response.status}` };
    return { stored: rows.length };
  } catch {
    return { stored: 0, error: 'supabase_network' };
  }
}

import { loadHkNow } from './hkService.js';
import { loadMarketQuotes } from './marketService.js';
import {
  DATA_PAGES,
  dayFromAqhi,
  dayFromQuotes,
  dayFromWeather,
  ensureMany,
  hktDate,
  type DataDay,
  type DataPageId,
  type DataSeries,
  type KvLike,
} from '../shared/dataSeries.js';

function kvFrom(env: { CONTENT?: KvLike }): KvLike | null {
  const kv = env.CONTENT;
  if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') return null;
  return kv;
}

async function capture(missing: DataPageId[], today: string): Promise<Partial<Record<DataPageId, DataDay | null>>> {
  const wantHk = missing.some((id) => id === 'weather' || id === 'aqhi');
  const marketIds: Array<'usd' | 'cny' | 'gold' | 'oil'> = [];
  if (missing.includes('fx')) marketIds.push('usd', 'cny');
  if (missing.includes('gold')) marketIds.push('gold');
  if (missing.includes('oil')) marketIds.push('oil');
  const [hk, quotes] = await Promise.all([
    wantHk ? loadHkNow().catch(() => null) : Promise.resolve(null),
    marketIds.length ? loadMarketQuotes(marketIds).catch(() => []) : Promise.resolve([]),
  ]);
  const out: Partial<Record<DataPageId, DataDay | null>> = {};
  for (const id of missing) {
    if (id === 'weather') out.weather = hk ? dayFromWeather(hk, today) : null;
    else if (id === 'aqhi') out.aqhi = hk ? dayFromAqhi(hk, today) : null;
    else out[id] = dayFromQuotes(id, quotes, today);
  }
  return out;
}

/** Read KV and, once per Hong Kong day, store today's reading from the existing HKO and Yahoo sources. */
export async function collectSeries(env: { CONTENT?: KvLike }, ids: DataPageId[], today = hktDate()): Promise<DataSeries[]> {
  return ensureMany(kvFrom(env), today, ids, (missing) => capture(missing, today));
}

export function allDataIds(): DataPageId[] {
  return DATA_PAGES.map((page) => page.id);
}

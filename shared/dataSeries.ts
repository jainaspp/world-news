import { hkDateStamp, type HkNow } from './hk.js';

export type DataPageId = 'weather' | 'aqhi' | 'fx' | 'gold' | 'oil';

export interface MetricSpec {
  key: string;
  label: string;
  unit: string;
  digits: number;
}

export interface DataPageSpec {
  id: DataPageId;
  path: string;
  title: string;
  description: string;
  kicker: string;
  sourceName: string;
  sourceUrl: string;
  blurb: string;
  metrics: MetricSpec[];
  /** Metrics drawn as separate inline charts. */
  chartKeys: string[];
}

export const DATA_PAGES: DataPageSpec[] = [
  {
    id: 'weather',
    path: '/data/weather/',
    title: '香港天氣',
    description: '香港天文台每日氣溫、濕度同雨量記錄，附 30 日走勢。世界頭條原創新聞數據，不是九日預報。',
    kicker: '天文台',
    sourceName: '香港天文台',
    sourceUrl: 'https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm',
    blurb: '呢頁每日記錄香港天文台公布的氣溫、相對濕度同各區最高雨量。數字在香港時間每一日第一次成功讀到時寫低，同日之後沿用這一筆，不會每分鐘改寫。趨勢圖同下表最多保留 30 日。天氣警告的全文同最新實況，請去天文台網站。',
    metrics: [
      { key: 'temp', label: '氣溫', unit: '度', digits: 0 },
      { key: 'humidity', label: '相對濕度', unit: '%', digits: 0 },
      { key: 'rain', label: '最高雨量', unit: '毫米', digits: 0 },
    ],
    chartKeys: ['temp'],
  },
  {
    id: 'aqhi',
    path: '/data/aqhi/',
    title: '空氣質素',
    description: '環境保護署一般監測站最高 AQHI 的每日記錄，附風險級別同 30 日走勢。',
    kicker: '環保署',
    sourceName: '環境保護署',
    sourceUrl: 'https://www.aqhi.gov.hk/',
    blurb: '空氣質素健康指數（AQHI）來自環境保護署的一般監測站。呢頁每日記低當日讀到的最高指數、風險級別同站名。路邊站不算入最高值。指數越高，對健康的影響越大。即時讀數請到環境保護署核對。',
    metrics: [
      { key: 'aqhi', label: '最高 AQHI', unit: '', digits: 1 },
    ],
    chartKeys: ['aqhi'],
  },
  {
    id: 'fx',
    path: '/data/fx/',
    title: '匯率',
    description: '美元兌港元同人民幣兌港元的每日參考價，附 30 日記錄。不是銀行牌價，亦不是投資建議。',
    kicker: '匯市',
    sourceName: 'Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/quote/USDHKD=X/',
    blurb: '匯率頁記錄美元兌港元同人民幣兌港元。報價來自 Yahoo Finance 的公開圖表，是市場參考價，不是銀行櫃位的買賣價，亦不是香港金融管理局的官方牌價。聯繫匯率下美元兌港元通常靠近 7.80。數字只供參考，不是投資建議。',
    metrics: [
      { key: 'usd', label: '美元/港元', unit: '', digits: 4 },
      { key: 'cny', label: '人民幣/港元', unit: '', digits: 4 },
    ],
    chartKeys: ['usd', 'cny'],
  },
  {
    id: 'gold',
    path: '/data/gold/',
    title: '金價',
    description: '黃金期貨每盎司美元的每日記錄同 30 日走勢。不是金店飾金價，亦不是投資建議。',
    kicker: '金屬',
    sourceName: 'Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/quote/GC=F/',
    blurb: '金價按紐約商品交易所黃金期貨（每盎司美元）的公開報價記錄。呢個不是香港金店的飾金價，亦未計手工同買賣差價。每日記一筆，最多保留 30 日。走勢只供參考，不是投資建議。',
    metrics: [
      { key: 'price', label: '金價', unit: '美元/盎司', digits: 0 },
    ],
    chartKeys: ['price'],
  },
  {
    id: 'oil',
    path: '/data/oil/',
    title: '油價',
    description: '布倫特原油期貨每桶美元的每日記錄同 30 日走勢。不是油站零售價，亦不是投資建議。',
    kicker: '能源',
    sourceName: 'Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/quote/BZ=F/',
    blurb: '油價按布倫特原油期貨（每桶美元）的公開報價記錄。呢個不是香港油站的每公升零售價。每日記一筆，最多保留 30 日。走勢只供參考，不是投資建議。',
    metrics: [
      { key: 'price', label: '布倫特原油', unit: '美元/桶', digits: 2 },
    ],
    chartKeys: ['price'],
  },
];

export const DATA_HUB = {
  path: '/data/',
  title: '香港數據',
  description: '世界頭條每日記錄香港天氣、空氣質素、匯率、金價同油價。原創新聞數據，附 30 日表格同走勢。',
};

export interface DataDay {
  date: string;
  updated: string;
  values: Record<string, number>;
  label?: string;
}

export interface DataSeries {
  id: DataPageId;
  days: DataDay[];
}

export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface QuoteTick {
  id: string;
  price: number;
  updated: string;
}

const KEEP = 30;

export function hktDate(now = new Date()): string {
  const stamp = hkDateStamp(now);
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

export function seriesKey(id: DataPageId): string {
  return `data:v1:${id}`;
}

export function emptySeries(id: DataPageId): DataSeries {
  return { id, days: [] };
}

export function pageBySlug(slug: string): DataPageSpec | null {
  return DATA_PAGES.find((page) => page.path === `/data/${slug}/`) ?? null;
}

export function pageById(id: DataPageId): DataPageSpec {
  const page = DATA_PAGES.find((row) => row.id === id);
  if (!page) throw new Error(id);
  return page;
}

function isDay(value: unknown): value is DataDay {
  if (!value || typeof value !== 'object') return false;
  const day = value as DataDay;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !day.values || typeof day.values !== 'object') return false;
  return Object.values(day.values).some((item) => typeof item === 'number' && Number.isFinite(item));
}

function cleanDay(day: DataDay): DataDay {
  const values: Record<string, number> = {};
  for (const [key, value] of Object.entries(day.values)) {
    if (typeof value === 'number' && Number.isFinite(value)) values[key] = value;
  }
  return {
    date: day.date,
    updated: typeof day.updated === 'string' ? day.updated : '',
    values,
    ...(typeof day.label === 'string' && day.label.trim() ? { label: day.label.trim() } : {}),
  };
}

export function parseSeries(id: DataPageId, raw: string | null): DataSeries {
  if (!raw) return emptySeries(id);
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; days?: unknown };
    if (parsed?.id !== id || !Array.isArray(parsed.days)) return emptySeries(id);
    const days = parsed.days.filter(isDay).map(cleanDay).slice(-KEEP);
    days.sort((a, b) => a.date.localeCompare(b.date));
    return { id, days };
  } catch {
    return emptySeries(id);
  }
}

export function mergeDay(series: DataSeries, day: DataDay, keep = KEEP): DataSeries {
  const next = cleanDay(day);
  const days = series.days.filter((row) => row.date !== next.date);
  days.push(next);
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { id: series.id, days: days.slice(-keep) };
}

export function needsSnapshot(series: DataSeries, today: string): boolean {
  return series.days.every((day) => day.date !== today);
}

export async function loadSeries(kv: KvLike, id: DataPageId): Promise<DataSeries> {
  try {
    return parseSeries(id, await kv.get(seriesKey(id)));
  } catch {
    return emptySeries(id);
  }
}

export async function saveSeries(kv: KvLike, series: DataSeries): Promise<void> {
  const body = JSON.stringify({ id: series.id, days: series.days.slice(-KEEP) });
  await kv.put(seriesKey(series.id), body);
}

export async function ensureMany(
  kv: KvLike | null,
  today: string,
  ids: DataPageId[],
  capture: (missing: DataPageId[]) => Promise<Partial<Record<DataPageId, DataDay | null>>>,
): Promise<DataSeries[]> {
  const stored = await Promise.all(ids.map((id) => (kv ? loadSeries(kv, id) : Promise.resolve(emptySeries(id)))));
  const missing = stored.filter((series) => needsSnapshot(series, today)).map((series) => series.id);
  if (!missing.length) return stored;
  let fresh: Partial<Record<DataPageId, DataDay | null>> = {};
  try {
    fresh = await capture(missing);
  } catch {
    fresh = {};
  }
  const next: DataSeries[] = [];
  for (const series of stored) {
    const day = fresh[series.id];
    if (!day || day.date !== today || !Object.keys(cleanDay(day).values).length || !needsSnapshot(series, today)) {
      next.push(series);
      continue;
    }
    const merged = mergeDay(series, day);
    if (kv) {
      try {
        await saveSeries(kv, merged);
      } catch {
        /* still show today's reading */
      }
    }
    next.push(merged);
  }
  return next;
}

export function formatReading(value: number, digits: number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const text = digits <= 0 ? Math.round(abs).toString() : abs.toFixed(digits);
  const [whole, frac] = text.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${frac != null ? `.${frac}` : ''}`;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** Math.max(0, digits);
  return Math.round(value * factor) / factor;
}

function flat(diff: number, digits: number): boolean {
  const tolerance = digits <= 0 ? 0.5 : 5 * 10 ** (-(digits + 1));
  return Math.abs(diff) < tolerance;
}

export function reading(day: DataDay | null | undefined, key: string): number | null {
  const value = day?.values[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatDay(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function priorDay(days: DataDay[]): DataDay | null {
  return days.length >= 2 ? days[days.length - 2]! : null;
}

function changeClause(today: number, prior: number, digits: number, unit: string, priorIsYesterday: boolean): string {
  const when = priorIsYesterday ? '昨日' : '上一個記錄日';
  const left = formatReading(roundTo(prior, digits), digits);
  const diff = roundTo(today, digits) - roundTo(prior, digits);
  const gap = unit ? ` ${unit}` : '';
  const word = diff > 0 ? '高' : '低';
  const moved = formatReading(Math.abs(diff), digits);
  if (flat(diff, digits)) return `同${when} ${left}${gap}持平`;
  if (unit) return `較${when} ${left} ${unit}${word} ${moved} ${unit}`;
  return `較${when} ${left} ${word} ${moved}`;
}

function isPreviousCalendarDay(newer: string, older: string): boolean {
  const [y, m, d] = newer.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10) === older;
}

function firstDaySentence(): string {
  return '呢頁由今日開始記錄，未有昨日可以比較。';
}

export function summarise(spec: DataPageSpec, days: DataDay[]): string {
  const today = days[days.length - 1];
  if (!today) return `今日暫時未有${spec.sourceName}的讀數。頁面會由成功取得數據的第一日開始記錄。`;
  const prior = priorDay(days);
  const adjacent = prior ? isPreviousCalendarDay(today.date, prior.date) : false;
  if (spec.id === 'weather') return summariseWeather(today, prior, adjacent);
  if (spec.id === 'aqhi') return summariseAqhi(today, prior, adjacent);
  if (spec.id === 'fx') return summariseFx(today, prior, adjacent);
  if (spec.id === 'gold') return summarisePrice('今日金價報每盎司', today, prior, adjacent, '美元', 0);
  return summarisePrice('今日布倫特原油報每桶', today, prior, adjacent, '美元', 2);
}

function summariseWeather(today: DataDay, prior: DataDay | null, adjacent: boolean): string {
  const temp = reading(today, 'temp');
  const parts: string[] = [];
  if (temp != null) {
    let line = `今日香港天文台錄得氣溫 ${formatReading(temp, 0)} 度`;
    const before = reading(prior, 'temp');
    if (before != null) line += `，${changeClause(temp, before, 0, '度', adjacent)}`;
    parts.push(`${line}。`);
  }
  const humidity = reading(today, 'humidity');
  if (humidity != null) parts.push(`相對濕度 ${formatReading(humidity, 0)}%。`);
  const rain = reading(today, 'rain');
  if (rain != null) parts.push(`區內最高雨量 ${formatReading(rain, 0)} 毫米。`);
  if (today.label) parts.push(`生效警告：${today.label}。`);
  if (!prior) parts.push(firstDaySentence());
  return parts.join('');
}

function formatAqhi(value: number): string {
  const rounded = Math.round(value * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function summariseAqhi(today: DataDay, prior: DataDay | null, adjacent: boolean): string {
  const value = reading(today, 'aqhi');
  if (value == null) return '今日暫時未有空氣質素讀數。';
  const [station, risk] = (today.label || '').split(' · ');
  const where = station ? `，讀數來自${station}` : '';
  const level = risk ? `，風險屬${risk}` : '';
  let line = `今日一般監測站最高空氣質素健康指數是 ${formatAqhi(value)}${level}${where}。`;
  const before = reading(prior, 'aqhi');
  if (before != null) {
    const diff = Math.round(value * 2) / 2 - Math.round(before * 2) / 2;
    const when = adjacent ? '昨日' : '上一個記錄日';
    if (Math.abs(diff) < 0.25) line += `同${when} ${formatAqhi(before)} 持平。`;
    else line += `較${when} ${formatAqhi(before)} ${diff > 0 ? '高' : '低'} ${formatAqhi(Math.abs(diff))}。`;
  } else {
    line += firstDaySentence();
  }
  return line;
}

function summariseFx(today: DataDay, prior: DataDay | null, adjacent: boolean): string {
  const parts: string[] = [];
  const usd = reading(today, 'usd');
  const cny = reading(today, 'cny');
  if (usd != null) {
    let line = `今日美元兌港元報 ${formatReading(usd, 4)}`;
    const before = reading(prior, 'usd');
    if (before != null) line += `，${changeClause(usd, before, 4, '', adjacent)}`;
    parts.push(`${line}。`);
  }
  if (cny != null) {
    let line = `人民幣兌港元報 ${formatReading(cny, 4)}`;
    const before = reading(prior, 'cny');
    if (before != null) line += `，${changeClause(cny, before, 4, '', adjacent)}`;
    parts.push(`${line}。`);
  }
  if (!parts.length) return '今日暫時未有匯率。';
  if (!prior) parts.push(firstDaySentence());
  return parts.join('');
}

function summarisePrice(lead: string, today: DataDay, prior: DataDay | null, adjacent: boolean, unit: string, digits: number): string {
  const price = reading(today, 'price');
  if (price == null) return '今日暫時未有報價。';
  let line = `${lead} ${formatReading(price, digits)} ${unit}`;
  const before = reading(prior, 'price');
  if (before != null) line += `，${changeClause(price, before, digits, unit, adjacent)}`;
  line += '。';
  if (!prior) line += firstDaySentence();
  return line;
}

export function trendSvg(points: Array<{ date: string; value: number }>, label: string, unit: string, digits: number): string {
  const width = 640;
  const height = 220;
  const pad = { l: 56, r: 16, t: 18, b: 32 };
  const title = points.length
    ? `${label}趨勢，最新 ${formatReading(points[points.length - 1]!.value, digits)}${unit ? ` ${unit}` : ''}，共 ${points.length} 日`
    : `${label}趨勢，未有記錄`;
  if (!points.length) {
    return `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttr(title)}"><title>${escapeText(title)}</title><rect x="0" y="0" width="${width}" height="${height}" fill="none"></rect><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="currentColor">未有記錄</text></svg>`;
  }
  const values = points.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const padY = Math.abs(min) > 0 ? Math.abs(min) * 0.02 : 1;
    min -= padY;
    max += padY;
  } else {
    const span = max - min;
    min -= span * 0.12;
    max += span * 0.12;
  }
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const xAt = (index: number) => (points.length === 1 ? pad.l + innerW / 2 : pad.l + (index / (points.length - 1)) * innerW);
  const yAt = (value: number) => pad.t + (1 - (value - min) / (max - min)) * innerH;
  const coords = points.map((point, index) => `${xAt(index).toFixed(1)},${yAt(point.value).toFixed(1)}`);
  const baseline = height - pad.b;
  const area = `M${coords[0]} L${coords.slice(1).join(' L')} L${xAt(points.length - 1).toFixed(1)},${baseline} L${xAt(0).toFixed(1)},${baseline} Z`;
  const grids = [0, 0.5, 1].map((step) => {
    const y = pad.t + innerH * step;
    return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${width - pad.r}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="1"></line>`;
  }).join('');
  const line = points.length > 1
    ? `<polyline points="${coords.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>`
    : '';
  const areaPath = points.length > 1 ? `<path d="${area}" fill="var(--accent)" opacity="0.12"></path>` : '';
  const dots = points.length === 1
    ? `<circle cx="${xAt(0).toFixed(1)}" cy="${yAt(points[0]!.value).toFixed(1)}" r="6" fill="var(--accent)"></circle>`
    : `<circle cx="${xAt(points.length - 1).toFixed(1)}" cy="${yAt(points[points.length - 1]!.value).toFixed(1)}" r="4" fill="var(--accent)"></circle>`;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const yTop = escapeText(formatReading(Math.max(...values), digits));
  const yBot = escapeText(formatReading(Math.min(...values), digits));
  const dates = points.length === 1
    ? `<text x="${xAt(0).toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="currentColor" font-size="12">${escapeText(shortDate(first.date))}</text>`
    : `<text x="${xAt(0).toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="currentColor" font-size="12">${escapeText(shortDate(first.date))}</text><text x="${xAt(points.length - 1).toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="currentColor" font-size="12">${escapeText(shortDate(last.date))}</text>`;
  return `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeAttr(title)}"><title>${escapeText(title)}</title>${grids}${areaPath}${line}${dots}<text x="${pad.l - 8}" y="${pad.t + 4}" text-anchor="end" fill="currentColor" font-size="12">${yTop}</text><text x="${pad.l - 8}" y="${baseline}" text-anchor="end" fill="currentColor" font-size="12">${yBot}</text>${dates}</svg>`;
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function escapeText(value: string): string {
  return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] || char));
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}

export function dayFromWeather(hk: HkNow, date: string): DataDay | null {
  if (typeof hk.temperature !== 'number' || !Number.isFinite(hk.temperature)) return null;
  const values: Record<string, number> = { temp: hk.temperature };
  if (typeof hk.humidity === 'number' && Number.isFinite(hk.humidity)) values.humidity = hk.humidity;
  if (typeof hk.rainMax === 'number' && Number.isFinite(hk.rainMax)) values.rain = hk.rainMax;
  const warnings = (hk.warnings || []).map((row) => row.name).filter(Boolean).slice(0, 3);
  return {
    date,
    updated: stamp(hk.updated),
    values,
    ...(warnings.length ? { label: warnings.join('、') } : {}),
  };
}

export function dayFromAqhi(hk: HkNow, date: string): DataDay | null {
  if (!hk.aqhi || !Number.isFinite(hk.aqhi.value)) return null;
  const label = [hk.aqhi.station, hk.aqhi.risk].filter(Boolean).join(' · ');
  return {
    date,
    updated: stamp(hk.updated),
    values: { aqhi: hk.aqhi.value },
    ...(label ? { label } : {}),
  };
}

export function dayFromQuotes(id: 'fx' | 'gold' | 'oil', quotes: QuoteTick[], date: string): DataDay | null {
  const values: Record<string, number> = {};
  const times: string[] = [];
  const take = (key: string, storeAs: string) => {
    const row = quotes.find((item) => item.id === key && item.price > 0 && Number.isFinite(item.price));
    if (!row) return;
    values[storeAs] = row.price;
    if (row.updated) times.push(row.updated);
  };
  if (id === 'fx') {
    take('usd', 'usd');
    take('cny', 'cny');
  } else {
    take(id, 'price');
  }
  if (!Object.keys(values).length) return null;
  const updated = times.find((value) => Number.isFinite(Date.parse(value))) || new Date().toISOString();
  return { date, updated, values };
}

function stamp(value: string): string {
  return value && Number.isFinite(Date.parse(value)) ? value : new Date().toISOString();
}

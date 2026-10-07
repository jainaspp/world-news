/** Hong Kong weather, warnings and AQHI from free government open data (HKO, EPD). */

export interface HkWarning {
  code: string;
  name: string;
}

export interface AqhiReading {
  value: number;
  risk: string;
  station: string;
}

export interface HkStationTemp {
  place: string;
  value: number;
}

export interface HkRainRow {
  place: string;
  max: number;
}

export interface HkUv {
  value: number;
  desc: string;
}

export interface HkDay {
  date: string;
  weekday: string;
  icon: number | null;
  min: number | null;
  max: number | null;
  psr: string;
}

export interface HkNow {
  temperature: number | null;
  humidity: number | null;
  icon: number | null;
  warnings: HkWarning[];
  rainMax: number;
  aqhi: AqhiReading | null;
  updated: string;
  source: string;
  /** Regional temperature stations from rhrread. Omitted on the lightweight homepage path. */
  stations?: HkStationTemp[];
  rainfall?: HkRainRow[];
  uv?: HkUv | null;
  forecast?: string;
  days?: HkDay[];
  todayMin?: number | null;
  todayMax?: number | null;
  todayPsr?: string;
  aqhiStations?: AqhiReading[];
}

export const HKO_NOW = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc';
export const HKO_WARN = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc';
export const HKO_FLW = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=tc';
export const HKO_FND = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc';
/** Homepage JSON. Only HomeMaxTemperature / HomeMinTemperature are read; fnd starts tomorrow. */
export const HKO_HOME = 'https://www.hko.gov.hk/wxinfo/json/one_json_uc.xml';
export const EPD_AQHI = 'https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_ChT.xml';
export const HKO_PAGE = 'https://www.hko.gov.hk/tc/wxinfo/currwx/current.htm';
export const AQHI_PAGE = 'https://www.aqhi.gov.hk/';

type Row = { place?: string; value?: number; max?: number };

export function parseHkoNow(json: unknown): Pick<HkNow, 'temperature' | 'humidity' | 'icon' | 'rainMax' | 'updated'> {
  const data = (json && typeof json === 'object' ? json : {}) as {
    temperature?: { data?: Row[] };
    humidity?: { data?: Row[] };
    icon?: number[];
    rainfall?: { data?: Row[] };
    updateTime?: string;
  };
  const temps = data.temperature?.data ?? [];
  const hko = temps.find((row) => row.place === '香港天文台') ?? temps[0];
  const rain = (data.rainfall?.data ?? []).map((row) => Number(row.max) || 0);
  return {
    temperature: typeof hko?.value === 'number' ? hko.value : null,
    humidity: typeof data.humidity?.data?.[0]?.value === 'number' ? data.humidity.data[0].value : null,
    icon: typeof data.icon?.[0] === 'number' ? data.icon[0] : null,
    rainMax: rain.length ? Math.max(...rain) : 0,
    updated: typeof data.updateTime === 'string' ? data.updateTime : '',
  };
}

/** warnsum: { WTCSGNL: { name, code, actionCode }, ... }. Cancelled warnings are skipped. */
export function parseHkoWarnings(json: unknown): HkWarning[] {
  if (!json || typeof json !== 'object') return [];
  return Object.values(json as Record<string, { name?: string; code?: string; actionCode?: string }>)
    .filter((row) => row && typeof row.name === 'string' && row.actionCode !== 'CANCEL')
    .map((row) => ({ code: String(row.code || ''), name: String(row.name) }));
}

/** Highest general-station AQHI from the EPD RSS ("中西區 - 一般監測站: 3 低 - …"). */
export function parseAqhi(xml: string): HkNow['aqhi'] {
  let best: AqhiReading | null = null;
  for (const row of parseAqhiStations(xml)) {
    if (!best || row.value > best.value) best = row;
  }
  return best;
}

export function hkoIconUrl(icon: number | null): string {
  return icon ? `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${icon}.png` : '';
}

function finite(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function parseHkoStations(json: unknown): HkStationTemp[] {
  const data = (json && typeof json === 'object' ? json : {}) as { temperature?: { data?: Row[] } };
  const rows: HkStationTemp[] = [];
  for (const row of data.temperature?.data ?? []) {
    const value = finite(row?.value);
    if (typeof row?.place === 'string' && row.place && value != null) rows.push({ place: row.place, value });
  }
  return rows;
}

export function parseHkoRainfall(json: unknown): HkRainRow[] {
  const data = (json && typeof json === 'object' ? json : {}) as { rainfall?: { data?: Row[] } };
  const rows: HkRainRow[] = [];
  for (const row of data.rainfall?.data ?? []) {
    const max = finite(row?.max);
    if (typeof row?.place === 'string' && row.place && max != null) rows.push({ place: row.place, max });
  }
  return rows;
}

export function parseHkoUv(json: unknown): HkUv | null {
  const data = (json && typeof json === 'object' ? json : {}) as { uvindex?: { data?: { value?: unknown; desc?: unknown }[] } };
  const row = data.uvindex?.data?.[0];
  const value = finite(row?.value);
  if (value == null) return null;
  return { value, desc: typeof row?.desc === 'string' ? row.desc : '' };
}

/** Local forecast one-liner (`flw.forecastDesc`). */
export function parseHkoFlw(json: unknown): string {
  const data = (json && typeof json === 'object' ? json : {}) as { forecastDesc?: unknown };
  return typeof data.forecastDesc === 'string' ? data.forecastDesc.trim() : '';
}

export function hkDateStamp(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${bag.year ?? ''}${bag.month ?? ''}${bag.day ?? ''}`;
}

function dayFromRow(row: {
  forecastDate?: unknown;
  week?: unknown;
  ForecastIcon?: unknown;
  forecastMaxtemp?: { value?: unknown };
  forecastMintemp?: { value?: unknown };
  PSR?: unknown;
}): HkDay | null {
  const date = typeof row.forecastDate === 'string' ? row.forecastDate : '';
  if (!/^\d{8}$/.test(date)) return null;
  return {
    date,
    weekday: typeof row.week === 'string' ? row.week : '',
    icon: finite(row.ForecastIcon),
    min: finite(row.forecastMintemp?.value),
    max: finite(row.forecastMaxtemp?.value),
    psr: typeof row.PSR === 'string' ? row.PSR : '',
  };
}

/**
 * Nine-day forecast. A row dated today supplies today max/min and PSR.
 * The panel shows the next three days after today, or the first three when today is absent
 * (the open-data feed normally starts tomorrow).
 */
export function parseHkoFnd(json: unknown, today = hkDateStamp()): { days: HkDay[]; todayMin: number | null; todayMax: number | null; todayPsr: string } {
  const data = (json && typeof json === 'object' ? json : {}) as { weatherForecast?: unknown[] };
  const parsed = (Array.isArray(data.weatherForecast) ? data.weatherForecast : [])
    .map((row) => (row && typeof row === 'object' ? dayFromRow(row as Parameters<typeof dayFromRow>[0]) : null))
    .filter((row): row is HkDay => row != null);
  const current = parsed.find((row) => row.date === today);
  const upcoming = parsed.filter((row) => row.date !== today).slice(0, 3);
  return {
    days: upcoming,
    todayMin: current?.min ?? null,
    todayMax: current?.max ?? null,
    todayPsr: current?.psr ?? '',
  };
}

/** Today's forecast range from the HKO homepage JSON, used when `fnd` starts tomorrow. */
export function parseHkoHomeTemp(json: unknown): { min: number | null; max: number | null } {
  const hko = (json && typeof json === 'object' ? json : {}) as { hko?: { HomeMinTemperature?: unknown; HomeMaxTemperature?: unknown } };
  return { min: finite(hko.hko?.HomeMinTemperature), max: finite(hko.hko?.HomeMaxTemperature) };
}

/** Every general AQHI station, not only the highest. Roadside stations are skipped. */
export function parseAqhiStations(xml: string): AqhiReading[] {
  const rows: AqhiReading[] = [];
  for (const match of xml.matchAll(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/g)) {
    const row = match[1]!.match(/^(.+?) - 一般監測站:\s*(\d+\+?)\s*(\S+)/);
    if (!row) continue;
    const value = Number(row[2]!.replace('+', '')) + (row[2]!.endsWith('+') ? 0.5 : 0);
    rows.push({ value, risk: row[3]!, station: row[1]! });
  }
  return rows;
}

export function hkoIconEmoji(icon: number | null): string {
  if (!icon) return '';
  if (icon === 50 || icon === 70) return '☀️';
  if (icon === 51 || icon === 52 || icon === 71 || icon === 72) return '🌤️';
  if (icon === 53 || icon === 54 || icon === 73 || icon === 74) return '🌦️';
  if (icon === 60 || icon === 61 || icon === 75 || icon === 76) return '☁️';
  if (icon === 62 || icon === 63 || icon === 64) return '🌧️';
  if (icon === 65 || icon === 77) return '⛈️';
  if (icon >= 80 && icon <= 85) return '🥵';
  if (icon >= 90 && icon <= 93) return '🥶';
  return '🌡️';
}

export interface HkParts {
  now: unknown;
  warn: unknown;
  aqhiXml: string | null;
  flw: unknown;
  fnd: unknown;
  home: unknown;
  today?: string;
}

/** Pure assembly for `/api/hk`. Null when neither temperature nor AQHI arrived. */
export function assembleHkNow(parts: HkParts): HkNow | null {
  const current = parseHkoNow(parts.now);
  const aqhiStations = parts.aqhiXml ? parseAqhiStations(parts.aqhiXml) : [];
  const aqhi = parts.aqhiXml ? parseAqhi(parts.aqhiXml) : null;
  const fnd = parseHkoFnd(parts.fnd, parts.today);
  const home = parseHkoHomeTemp(parts.home);
  const body: HkNow = {
    ...current,
    warnings: parseHkoWarnings(parts.warn),
    aqhi,
    source: '香港天文台、環境保護署',
    stations: parseHkoStations(parts.now),
    rainfall: parseHkoRainfall(parts.now),
    uv: parseHkoUv(parts.now),
    forecast: parseHkoFlw(parts.flw),
    days: fnd.days,
    todayMin: fnd.todayMin ?? home.min,
    todayMax: fnd.todayMax ?? home.max,
    todayPsr: fnd.todayPsr,
    aqhiStations,
  };
  if (body.temperature == null && !body.aqhi) return null;
  return body;
}

export function emptyHkNow(): HkNow {
  return {
    temperature: null,
    humidity: null,
    icon: null,
    warnings: [],
    rainMax: 0,
    aqhi: null,
    updated: '',
    source: '香港天文台、環境保護署',
    stations: [],
    rainfall: [],
    uv: null,
    forecast: '',
    days: [],
    todayMin: null,
    todayMax: null,
    todayPsr: '',
    aqhiStations: [],
  };
}

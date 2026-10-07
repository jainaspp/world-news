/**
 * Weather location choice. Coordinates stay in the browser and are sent only to Open-Meteo.
 * Hong Kong defaults never call geolocation.
 */

import type { AqhiReading, HkDay, HkNow, HkRainRow, HkStationTemp } from './hk.js';
import { hkoIconEmoji } from './hk.js';

export const WX_LOC_KEY = 'wn_wx_loc_v1';
export const WX_OPEN_KEY = 'wn_wx_open_v1';
export const OPEN_METEO_PAGE = 'https://open-meteo.com/';

/** Rough Hong Kong bbox. Inclusive. Outside this, weather comes from Open-Meteo. */
export const HK_BBOX = { latMin: 22.15, latMax: 22.57, lonMin: 113.83, lonMax: 114.43 };

export interface WxStation {
  place: string;
  lat: number;
  lon: number;
  /** rhrread rainfall district name, including 離島區. */
  district: string;
}

/** HKO regional temperature stations. Coordinates are the published station positions. */
export const HKO_STATIONS: readonly WxStation[] = [
  { place: '京士柏', lat: 22.3119, lon: 114.1728, district: '油尖旺' },
  { place: '香港天文台', lat: 22.3019, lon: 114.1742, district: '油尖旺' },
  { place: '黃竹坑', lat: 22.2478, lon: 114.1736, district: '南區' },
  { place: '打鼓嶺', lat: 22.5286, lon: 114.1567, district: '北區' },
  { place: '流浮山', lat: 22.4689, lon: 113.9836, district: '元朗' },
  { place: '大埔', lat: 22.4461, lon: 114.1789, district: '大埔' },
  { place: '沙田', lat: 22.4025, lon: 114.21, district: '沙田' },
  { place: '屯門', lat: 22.3858, lon: 113.9642, district: '屯門' },
  { place: '將軍澳', lat: 22.3158, lon: 114.2556, district: '西貢' },
  { place: '西貢', lat: 22.3756, lon: 114.2744, district: '西貢' },
  { place: '長洲', lat: 22.2011, lon: 114.0267, district: '離島區' },
  { place: '赤鱲角', lat: 22.3094, lon: 113.9219, district: '離島區' },
  { place: '青衣', lat: 22.3442, lon: 114.1097, district: '葵青' },
  { place: '石崗', lat: 22.4361, lon: 114.0847, district: '元朗' },
  { place: '荃灣可觀', lat: 22.3836, lon: 114.1369, district: '荃灣' },
  { place: '荃灣城門谷', lat: 22.3761, lon: 114.1242, district: '荃灣' },
  { place: '香港公園', lat: 22.2753, lon: 114.1619, district: '中西區' },
  { place: '筲箕灣', lat: 22.2817, lon: 114.2361, district: '東區' },
  { place: '九龍城', lat: 22.335, lon: 114.1847, district: '九龍城' },
  { place: '跑馬地', lat: 22.2703, lon: 114.1836, district: '灣仔' },
  { place: '黃大仙', lat: 22.3394, lon: 114.2056, district: '黃大仙' },
  { place: '赤柱', lat: 22.2142, lon: 114.2186, district: '南區' },
  { place: '觀塘', lat: 22.3186, lon: 114.2247, district: '觀塘' },
  { place: '深水埗', lat: 22.3358, lon: 114.1369, district: '深水埗' },
  { place: '啟德跑道公園', lat: 22.3053, lon: 114.2169, district: '九龍城' },
  { place: '元朗公園', lat: 22.4408, lon: 114.0181, district: '元朗' },
  { place: '大美督', lat: 22.4753, lon: 114.2372, district: '大埔' },
];

export interface AqhiSite {
  station: string;
  lat: number;
  lon: number;
}

/** EPD general AQHI stations. Used only to pick a name; readings come from the RSS. */
export const AQHI_SITES: readonly AqhiSite[] = [
  { station: '中西區', lat: 22.2819, lon: 114.1522 },
  { station: '南區', lat: 22.2478, lon: 114.1603 },
  { station: '東區', lat: 22.2844, lon: 114.2194 },
  { station: '觀塘', lat: 22.3097, lon: 114.2314 },
  { station: '深水埗', lat: 22.3308, lon: 114.1594 },
  { station: '葵涌', lat: 22.3572, lon: 114.1297 },
  { station: '荃灣', lat: 22.3717, lon: 114.1147 },
  { station: '將軍澳', lat: 22.3175, lon: 114.2597 },
  { station: '元朗', lat: 22.4453, lon: 114.0225 },
  { station: '屯門', lat: 22.3914, lon: 113.9769 },
  { station: '東涌', lat: 22.2889, lon: 113.9436 },
  { station: '大埔', lat: 22.4506, lon: 114.1644 },
  { station: '沙田', lat: 22.3764, lon: 114.1847 },
  { station: '北區', lat: 22.4967, lon: 114.1286 },
  { station: '塔門', lat: 22.4714, lon: 114.3608 },
];

export type WxChoice =
  | { mode: 'territory' }
  | { mode: 'station'; place: string }
  | { mode: 'geo'; lat: number; lon: number };

export interface WxFocus {
  label: string;
  outside: boolean;
  place: string | null;
  lat: number | null;
  lon: number | null;
  district: string | null;
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 100) / 100;
}

export function isInsideHk(lat: number, lon: number): boolean {
  return lat >= HK_BBOX.latMin && lat <= HK_BBOX.latMax && lon >= HK_BBOX.lonMin && lon <= HK_BBOX.lonMax;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestPlace<T extends { lat: number; lon: number }>(lat: number, lon: number, rows: readonly T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const row of rows) {
    const dist = distanceKm(lat, lon, row.lat, row.lon);
    if (dist < bestD) {
      bestD = dist;
      best = row;
    }
  }
  return best;
}

export function readWxChoice(raw: string | null | undefined): WxChoice {
  if (!raw) return { mode: 'territory' };
  try {
    const data = JSON.parse(raw) as { mode?: unknown; place?: unknown; lat?: unknown; lon?: unknown };
    if (data.mode === 'station' && typeof data.place === 'string' && data.place.trim()) {
      return { mode: 'station', place: data.place.trim() };
    }
    if (data.mode === 'geo' && typeof data.lat === 'number' && typeof data.lon === 'number' && Number.isFinite(data.lat) && Number.isFinite(data.lon)) {
      return { mode: 'geo', lat: round2(data.lat), lon: round2(data.lon) };
    }
  } catch {
    /* default */
  }
  return { mode: 'territory' };
}

export function serializeWxChoice(choice: WxChoice): string {
  if (choice.mode === 'station') return JSON.stringify({ mode: 'station', place: choice.place });
  if (choice.mode === 'geo') return JSON.stringify({ mode: 'geo', lat: round2(choice.lat), lon: round2(choice.lon) });
  return JSON.stringify({ mode: 'territory' });
}

export function readWxOpen(raw: string | null | undefined): boolean {
  return raw === '1';
}

export function resolveFocus(choice: WxChoice): WxFocus {
  if (choice.mode === 'geo') {
    const lat = round2(choice.lat);
    const lon = round2(choice.lon);
    if (!isInsideHk(lat, lon)) {
      return { label: '你所在位置', outside: true, place: null, lat, lon, district: null };
    }
    const station = nearestPlace(lat, lon, HKO_STATIONS);
    return {
      label: station?.place ?? '香港',
      outside: false,
      place: station?.place ?? null,
      lat,
      lon,
      district: station?.district ?? null,
    };
  }
  if (choice.mode === 'station') {
    const station = HKO_STATIONS.find((row) => row.place === choice.place) ?? null;
    return {
      label: choice.place,
      outside: false,
      place: choice.place,
      lat: station?.lat ?? null,
      lon: station?.lon ?? null,
      district: station?.district ?? null,
    };
  }
  return { label: '香港', outside: false, place: null, lat: null, lon: null, district: null };
}

/** Undefined when the station list has not arrived yet; null when the place is missing from it. */
export function stationTemperature(stations: HkStationTemp[] | undefined, place: string): number | null | undefined {
  if (!stations) return undefined;
  const hit = stations.find((row) => row.place === place);
  return hit ? hit.value : null;
}

export function districtRain(district: string | null, rows: HkRainRow[] | undefined): HkRainRow | null {
  if (!district || !rows?.length) return null;
  return rows.find((row) => row.place === district) ?? null;
}

export function territoryRain(rows: HkRainRow[] | undefined): HkRainRow | null {
  if (!rows?.length) return null;
  let best = rows[0]!;
  for (const row of rows) if (row.max > best.max) best = row;
  return best;
}

export function nearestAqhi(lat: number, lon: number, readings: readonly AqhiReading[] | undefined): AqhiReading | null {
  if (!readings?.length) return null;
  const ranked = [...AQHI_SITES].sort((a, b) => distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon));
  for (const site of ranked) {
    const hit = readings.find((row) => row.station === site.station);
    if (hit) return hit;
  }
  return null;
}

export function formatHkClock(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Hong_Kong',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const bag = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const month = Number(bag.month);
  const day = Number(bag.day);
  if (!month || !day || !bag.hour || !bag.minute) return '';
  return `${month}月${day}日 ${bag.hour}:${bag.minute}`;
}

export function formatStamp(stamp: string): string {
  const digits = stamp.replace(/\D/g, '');
  if (digits.length < 8) return stamp;
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!month || !day) return stamp;
  return `${month}月${day}日`;
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export function weekdayFromStamp(stamp: string): string {
  const digits = stamp.replace(/\D/g, '');
  if (digits.length < 8) return '';
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return WEEKDAYS[date.getUTCDay()] ?? '';
}

export function formatLoose(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatRange(min: number | null, max: number | null): string {
  const lo = typeof min === 'number' ? Math.round(min) : null;
  const hi = typeof max === 'number' ? Math.round(max) : null;
  if (lo != null && hi != null) return `${lo}–${hi}°C`;
  if (hi != null) return `最高 ${hi}°C`;
  if (lo != null) return `最低 ${lo}°C`;
  return '';
}

export interface WxRow {
  label: string;
  value: string;
}

export function hkDetailRows(input: {
  todayMin: number | null;
  todayMax: number | null;
  todayPsr: string;
  uv: HkNow['uv'];
  humidity: number | null;
  aqhi: AqhiReading | null;
  rain: { label: string; max: number } | null;
  warnings: { name: string }[];
}): WxRow[] {
  const rows: Array<WxRow | null> = [];
  const range = formatRange(input.todayMin, input.todayMax);
  if (range) rows.push({ label: '今日', value: range });
  if (input.todayPsr.trim()) rows.push({ label: '降雨概率', value: input.todayPsr.trim() });
  if (input.uv && Number.isFinite(input.uv.value)) {
    const desc = input.uv.desc.trim();
    rows.push({ label: '紫外線指數', value: desc ? `${formatLoose(input.uv.value)}（${desc}）` : formatLoose(input.uv.value) });
  }
  if (typeof input.humidity === 'number') rows.push({ label: '濕度', value: `${Math.round(input.humidity)}%` });
  if (input.aqhi && Number.isFinite(input.aqhi.value)) {
    const risk = input.aqhi.risk ? ` ${input.aqhi.risk}` : '';
    const station = input.aqhi.station ? ` · ${input.aqhi.station}` : '';
    rows.push({ label: 'AQHI', value: `${Math.floor(input.aqhi.value)}${risk}${station}`.trim() });
  }
  if (input.rain) rows.push({ label: '雨量', value: `${input.rain.label} ${input.rain.max} 毫米` });
  const warning = input.warnings.map((row) => row.name).filter(Boolean).join('、');
  if (warning) rows.push({ label: '警告', value: warning });
  return rows.filter((row): row is WxRow => row != null && row.value.trim() !== '');
}

export interface AbroadDay {
  date: string;
  weekday: string;
  code: number | null;
  min: number | null;
  max: number | null;
  pop: number | null;
  uv: number | null;
}

export interface AbroadWx {
  temperature: number | null;
  humidity: number | null;
  code: number | null;
  todayMin: number | null;
  todayMax: number | null;
  pop: number | null;
  uv: number | null;
  days: AbroadDay[];
}

function at<T>(rows: T[] | undefined, index: number): T | undefined {
  return rows ? rows[index] : undefined;
}

/** Open-Meteo forecast JSON. Today is daily index 0; `days` are the next three. */
export function parseOpenMeteo(json: unknown): AbroadWx | null {
  const data = (json && typeof json === 'object' ? json : {}) as {
    current?: { temperature_2m?: unknown; relative_humidity_2m?: unknown; weather_code?: unknown };
    daily?: {
      time?: unknown[];
      weather_code?: unknown[];
      temperature_2m_max?: unknown[];
      temperature_2m_min?: unknown[];
      precipitation_probability_max?: unknown[];
      uv_index_max?: unknown[];
    };
  };
  const temperature = finiteNum(data.current?.temperature_2m);
  const daily = data.daily;
  const times = Array.isArray(daily?.time) ? daily.time.filter((row): row is string => typeof row === 'string') : [];
  if (temperature == null && times.length === 0) return null;
  const dayAt = (index: number): AbroadDay | null => {
    const date = times[index];
    if (!date) return null;
    return {
      date,
      weekday: weekdayFromStamp(date),
      code: finiteNum(at(daily?.weather_code, index)),
      min: finiteNum(at(daily?.temperature_2m_min, index)),
      max: finiteNum(at(daily?.temperature_2m_max, index)),
      pop: finiteNum(at(daily?.precipitation_probability_max, index)),
      uv: finiteNum(at(daily?.uv_index_max, index)),
    };
  };
  const today = dayAt(0);
  const days: AbroadDay[] = [];
  for (let index = 1; index <= 3; index += 1) {
    const day = dayAt(index);
    if (day) days.push(day);
  }
  return {
    temperature,
    humidity: finiteNum(data.current?.relative_humidity_2m),
    code: finiteNum(data.current?.weather_code),
    todayMin: today?.min ?? null,
    todayMax: today?.max ?? null,
    pop: today?.pop ?? null,
    uv: today?.uv ?? null,
    days,
  };
}

function finiteNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function openMeteoUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: round2(lat).toFixed(2),
    longitude: round2(lon).toFixed(2),
    current: 'temperature_2m,relative_humidity_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
    forecast_days: '4',
    timezone: 'auto',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function wmoEmoji(code: number | null): string {
  if (code == null) return '';
  if (code === 0 || code === 1) return '☀️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if ((code >= 51 && code <= 57) || (code >= 80 && code <= 82)) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

export function abroadRows(wx: AbroadWx): WxRow[] {
  const rows: WxRow[] = [];
  const range = formatRange(wx.todayMin, wx.todayMax);
  if (range) rows.push({ label: '今日', value: range });
  if (typeof wx.pop === 'number') rows.push({ label: '降雨概率', value: `${Math.round(wx.pop)}%` });
  if (typeof wx.uv === 'number') rows.push({ label: '紫外線指數', value: formatLoose(wx.uv) });
  if (typeof wx.humidity === 'number') rows.push({ label: '濕度', value: `${Math.round(wx.humidity)}%` });
  return rows;
}

export function dayEmoji(day: HkDay): string {
  return hkoIconEmoji(day.icon);
}

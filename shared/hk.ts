/** Hong Kong weather, warnings and AQHI from free government open data (HKO, EPD). */

export interface HkWarning {
  code: string;
  name: string;
}

export interface HkNow {
  temperature: number | null;
  humidity: number | null;
  icon: number | null;
  warnings: HkWarning[];
  rainMax: number;
  aqhi: { value: number; risk: string; station: string } | null;
  updated: string;
  source: string;
}

export const HKO_NOW = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc';
export const HKO_WARN = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=tc';
export const EPD_AQHI = 'https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_ChT.xml';

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
  let best: HkNow['aqhi'] = null;
  for (const match of xml.matchAll(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/g)) {
    const row = match[1]!.match(/^(.+?) - 一般監測站:\s*(\d+\+?)\s*(\S+)/);
    if (!row) continue;
    const value = Number(row[2]!.replace('+', '')) + (row[2]!.endsWith('+') ? 0.5 : 0);
    if (!best || value > best.value) best = { value, risk: row[3]!, station: row[1]! };
  }
  return best;
}

export function hkoIconUrl(icon: number | null): string {
  return icon ? `https://www.hko.gov.hk/images/HKOWxIconOutline/pic${icon}.png` : '';
}

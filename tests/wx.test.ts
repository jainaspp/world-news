import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assembleHkNow, hkoIconEmoji, parseAqhiStations, parseHkoFlw, parseHkoFnd, parseHkoHomeTemp, parseHkoRainfall, parseHkoStations, parseHkoUv } from '../shared/hk';
import {
  districtRain,
  hkDetailRows,
  isInsideHk,
  nearestPlace,
  openMeteoUrl,
  parseOpenMeteo,
  readWxChoice,
  resolveFocus,
  round2,
  serializeWxChoice,
  HKO_STATIONS,
} from '../shared/wx';

const rhrread = {
  temperature: {
    data: [
      { place: '京士柏', value: 27 },
      { place: '香港天文台', value: 26 },
      { place: '沙田', value: 29 },
      { place: '長洲', value: 27 },
    ],
  },
  humidity: { data: [{ value: 58, place: '香港天文台' }] },
  icon: [50],
  rainfall: { data: [{ place: '沙田', max: 0 }, { place: '離島區', max: 2 }, { place: '油尖旺', max: 1 }] },
  uvindex: { data: [{ place: '京士柏', value: 5, desc: '中等' }] },
  updateTime: '2026-10-07T13:02:00+08:00',
};

const fndLater = {
  weatherForecast: [
    { forecastDate: '20261008', week: '星期四', ForecastIcon: 51, forecastMaxtemp: { value: 30 }, forecastMintemp: { value: 25 }, PSR: '低', forecastWeather: '大致天晴。' },
    { forecastDate: '20261009', week: '星期五', ForecastIcon: 60, forecastMaxtemp: { value: 31 }, forecastMintemp: { value: 26 }, PSR: '中低' },
    { forecastDate: '20261010', week: '星期六', ForecastIcon: 62, forecastMaxtemp: { value: 28 }, forecastMintemp: { value: 24 }, PSR: '高' },
    { forecastDate: '20261011', week: '星期日', ForecastIcon: 50, forecastMaxtemp: { value: 31 }, forecastMintemp: { value: 26 }, PSR: '低' },
  ],
};

describe('Hong Kong bbox and nearest station', () => {
  it('treats the bbox edges as inside and the next step as outside', () => {
    expect(isInsideHk(22.15, 113.83)).toBe(true);
    expect(isInsideHk(22.57, 114.43)).toBe(true);
    expect(isInsideHk(22.149, 114)).toBe(false);
    expect(isInsideHk(22.2, 113.829)).toBe(false);
    expect(isInsideHk(22.571, 114)).toBe(false);
    expect(isInsideHk(22.3, 114.431)).toBe(false);
    expect(isInsideHk(51.5, -0.12)).toBe(false);
  });

  it('picks the nearest temperature station and keeps outside points off the list', () => {
    expect(nearestPlace(22.3094, 113.9219, HKO_STATIONS)?.place).toBe('赤鱲角');
    expect(nearestPlace(22.4025, 114.21, HKO_STATIONS)?.place).toBe('沙田');
    expect(nearestPlace(22.28, 114.16, HKO_STATIONS)?.place).toBe('香港公園');
    expect(resolveFocus({ mode: 'geo', lat: 22.31, lon: 113.92 })).toMatchObject({ outside: false, place: '赤鱲角', label: '赤鱲角' });
    expect(resolveFocus({ mode: 'geo', lat: 51.5, lon: -0.12 })).toEqual({
      label: '你所在位置', outside: true, place: null, lat: 51.5, lon: -0.12, district: null,
    });
    expect(resolveFocus({ mode: 'territory' })).toMatchObject({ label: '香港', outside: false, place: null });
    expect(resolveFocus({ mode: 'station', place: '長洲' }).district).toBe('離島區');
  });

  it('rounds stored coordinates to 2 decimals', () => {
    expect(round2(22.156)).toBe(22.16);
    expect(round2(114.444)).toBe(114.44);
    expect(JSON.parse(serializeWxChoice({ mode: 'geo', lat: 22.156, lon: 113.834 }))).toEqual({ mode: 'geo', lat: 22.16, lon: 113.83 });
    expect(readWxChoice('{"mode":"geo","lat":22.156,"lon":114.444}')).toEqual({ mode: 'geo', lat: 22.16, lon: 114.44 });
    expect(readWxChoice('nope')).toEqual({ mode: 'territory' });
    expect(readWxChoice(null)).toEqual({ mode: 'territory' });
  });
});

describe('HKO forecast parsing', () => {
  it('reads stations, rainfall, UV and the local forecast line', () => {
    expect(parseHkoStations(rhrread).map((row) => row.place)).toEqual(['京士柏', '香港天文台', '沙田', '長洲']);
    expect(parseHkoStations(rhrread).find((row) => row.place === '沙田')?.value).toBe(29);
    expect(parseHkoRainfall(rhrread)).toContainEqual({ place: '離島區', max: 2 });
    expect(parseHkoUv(rhrread)).toEqual({ value: 5, desc: '中等' });
    expect(parseHkoUv({})).toBeNull();
    expect(parseHkoFlw({ forecastDesc: '  下午陽光充沛，天氣乾燥。  ' })).toBe('下午陽光充沛，天氣乾燥。');
    expect(parseHkoFlw({})).toBe('');
    expect(hkoIconEmoji(50)).toBe('☀️');
    expect(hkoIconEmoji(65)).toBe('⛈️');
    expect(districtRain('離島區', parseHkoRainfall(rhrread))).toEqual({ place: '離島區', max: 2 });
    expect(districtRain('不存在', parseHkoRainfall(rhrread))).toBeNull();
  });

  it('uses today from fnd when present and otherwise the next three days', () => {
    const withToday = parseHkoFnd({
      weatherForecast: [
        { forecastDate: '20261007', week: '星期三', ForecastIcon: 50, forecastMaxtemp: { value: 33 }, forecastMintemp: { value: 24 }, PSR: '高' },
        ...fndLater.weatherForecast,
      ],
    }, '20261007');
    expect(withToday.todayMin).toBe(24);
    expect(withToday.todayMax).toBe(33);
    expect(withToday.todayPsr).toBe('高');
    expect(withToday.days.map((day) => day.date)).toEqual(['20261008', '20261009', '20261010']);
    expect(withToday.days[0]).toMatchObject({ weekday: '星期四', icon: 51, min: 25, max: 30, psr: '低' });

    const fromTomorrow = parseHkoFnd(fndLater, '20261007');
    expect(fromTomorrow.todayMin).toBeNull();
    expect(fromTomorrow.todayPsr).toBe('');
    expect(fromTomorrow.days).toHaveLength(3);
    expect(fromTomorrow.days.map((day) => day.date)).toEqual(['20261008', '20261009', '20261010']);
    expect(parseHkoHomeTemp({ hko: { HomeMinTemperature: '23', HomeMaxTemperature: '30' } })).toEqual({ min: 23, max: 30 });
  });

  it('assembles a bundle and omits missing detail fields', () => {
    const xml = '<item><description><![CDATA[中西區 - 一般監測站: 3 低 - x]]></description></item><item><description><![CDATA[南區 - 一般監測站: 5 中 - x]]></description></item><item><description><![CDATA[旺角 - 路邊監測站: 9 甚高 - x]]></description></item>';
    expect(parseAqhiStations(xml).map((row) => row.station)).toEqual(['中西區', '南區']);
    const body = assembleHkNow({
      now: rhrread,
      warn: { WFIRE: { name: '火災危險警告', code: 'WFIRER', actionCode: 'ISSUE' } },
      aqhiXml: xml,
      flw: { forecastDesc: '下午陽光充沛，天氣乾燥。' },
      fnd: fndLater,
      home: { hko: { HomeMinTemperature: '23', HomeMaxTemperature: '30' } },
      today: '20261007',
    });
    expect(body?.temperature).toBe(26);
    expect(body?.todayMin).toBe(23);
    expect(body?.todayMax).toBe(30);
    expect(body?.todayPsr).toBe('');
    expect(body?.forecast).toBe('下午陽光充沛，天氣乾燥。');
    expect(body?.days).toHaveLength(3);
    expect(body?.uv).toEqual({ value: 5, desc: '中等' });
    expect(body?.aqhi).toEqual({ value: 5, risk: '中', station: '南區' });
    expect(body?.warnings).toEqual([{ code: 'WFIRER', name: '火災危險警告' }]);
    expect(assembleHkNow({ now: {}, warn: {}, aqhiXml: null, flw: {}, fnd: {}, home: {} })).toBeNull();

    const rows = hkDetailRows({
      todayMin: null,
      todayMax: 30,
      todayPsr: '',
      uv: null,
      humidity: 58,
      aqhi: null,
      rain: null,
      warnings: [],
    });
    expect(rows.map((row) => row.label)).toEqual(['今日', '濕度']);
    expect(rows.find((row) => row.label === '今日')?.value).toBe('最高 30°C');
  });
});

describe('Open-Meteo', () => {
  it('parses today and the next three days', () => {
    const wx = parseOpenMeteo({
      current: { temperature_2m: 18.4, relative_humidity_2m: 70, weather_code: 2 },
      daily: {
        time: ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'],
        weather_code: [2, 3, 61, 80],
        temperature_2m_max: [20, 19, 17, 16],
        temperature_2m_min: [12, 13, 11, 10],
        precipitation_probability_max: [10, 40, 80, 55],
        uv_index_max: [5.2, 4, 2, 3],
      },
    });
    expect(wx?.temperature).toBe(18.4);
    expect(wx?.pop).toBe(10);
    expect(wx?.uv).toBe(5.2);
    expect(wx?.days.map((day) => day.date)).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
    expect(wx?.days[1]).toMatchObject({ code: 61, min: 11, max: 17, pop: 80, weekday: '星期五' });
    expect(parseOpenMeteo({})).toBeNull();
  });

  it('builds a browser Open-Meteo URL with coordinates rounded to 2 decimals', () => {
    const url = openMeteoUrl(22.156, 114.444);
    expect(url.startsWith('https://api.open-meteo.com/v1/forecast?')).toBe(true);
    expect(url).toContain('latitude=22.16');
    expect(url).toContain('longitude=114.44');
    expect(url).not.toContain('world-news');
    expect(readFileSync('server/hkService.ts', 'utf8')).not.toContain('open-meteo');
    expect(readFileSync('functions/api/hk.ts', 'utf8')).toContain('loadHkBundle');
    expect(readFileSync('functions/api/hk.ts', 'utf8')).toContain('hk-cache-v2');
    expect(readFileSync('functions/index.ts', 'utf8')).toContain('loadHkNow(');
    const strip = readFileSync('src/components/HkInfoStrip.tsx', 'utf8');
    const here = strip.indexOf('function useMyLocation');
    expect(here).toBeGreaterThan(0);
    expect(strip.slice(0, here)).not.toContain('getCurrentPosition');
    expect(strip.slice(here, strip.indexOf('const bits'))).toContain('getCurrentPosition');
  });
});

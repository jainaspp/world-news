import { mergeAlerts, MTR_STATUS_URL, parseMtrStatus, weatherAlerts, type LiveAlert } from '../shared/alerts.js';
import { HKO_WARN, parseHkoWarnings } from '../shared/hk.js';

async function fetchText(url: string, ms = 4000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'world-news.xyz', accept: 'application/json, application/xml, text/xml, */*' } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface AlertLoad {
  alerts: LiveAlert[];
  weatherOk: boolean;
  transportOk: boolean;
}

/** Active HKO warnings plus non-green MTR lines. Empty when nothing is in force. */
export async function loadAlerts(): Promise<AlertLoad> {
  const [warnRaw, mtrRaw] = await Promise.all([fetchText(HKO_WARN), fetchText(MTR_STATUS_URL)]);
  let weather: LiveAlert[] = [];
  let weatherOk = false;
  if (warnRaw) {
    try {
      weather = weatherAlerts(parseHkoWarnings(JSON.parse(warnRaw)));
      weatherOk = true;
    } catch {
      weatherOk = false;
    }
  }
  const transportOk = mtrRaw != null;
  const transport = transportOk ? parseMtrStatus(mtrRaw) : [];
  return { alerts: mergeAlerts(weather, transport), weatherOk, transportOk };
}

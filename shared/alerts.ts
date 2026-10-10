import type { HkWarning } from './hk.js';

export interface LiveAlert {
  id: string;
  name: string;
  href: string;
  kind: 'weather' | 'transport';
}

export const HKO_WARN_PAGE = 'https://www.hko.gov.hk/tc/wxinfo/dailywx/wxwarntoday.htm';
export const MTR_STATUS_URL = 'https://www.mtr.com.hk/alert/ryg_line_status.xml';
export const MTR_PAGE = 'https://www.mtr.com.hk/ch/customer/services/train_service_index.html';

const MTR_LINES: Record<string, string> = {
  TWL: '荃灣綫',
  KTL: '觀塘綫',
  ISL: '港島綫',
  SIL: '南港島綫',
  TKL: '將軍澳綫',
  TCL: '東涌綫',
  DRL: '迪士尼綫',
  AEL: '機場快綫',
  EAL: '東鐵綫',
  TML: '屯馬綫',
  LR: '輕鐵',
};

const MTR_STATE: Record<string, string> = {
  red: '服務暫停',
  yellow: '服務受阻',
  typhoon: '颱風安排',
  grey: '服務消息',
};

export function weatherAlerts(warnings: HkWarning[]): LiveAlert[] {
  return warnings
    .filter((warning) => warning.name.trim())
    .map((warning) => ({
      id: `hko-${warning.code || warning.name}`,
      name: warning.name.trim(),
      href: HKO_WARN_PAGE,
      kind: 'weather' as const,
    }));
}

/**
 * MTR red/yellow/green line status. Green lines are omitted.
 * The XML is the keyless status feed on mtr.com.hk (not the next-train API).
 */
export function parseMtrStatus(xml: string): LiveAlert[] {
  if (!xml || !xml.includes('<line')) return [];
  const alerts: LiveAlert[] = [];
  for (const match of xml.matchAll(/<line>([\s\S]*?)<\/line>/g)) {
    const body = match[1] ?? '';
    const code = (/<line_code>([^<]*)<\/line_code>/.exec(body)?.[1] ?? '').trim();
    const status = (/<status>([^<]*)<\/status>/.exec(body)?.[1] ?? '').trim().toLowerCase();
    const url = (/<url_tc>([^<]*)<\/url_tc>/.exec(body)?.[1] ?? '').trim();
    if (!code || !status || status === 'green') continue;
    const line = MTR_LINES[code] ?? code;
    const state = MTR_STATE[status] ?? '服務消息';
    const href = /^https?:\/\//.test(url) ? url : MTR_PAGE;
    alerts.push({ id: `mtr-${code}`, name: `港鐵${line}${state}`, href, kind: 'transport' });
  }
  return alerts;
}

export function mergeAlerts(weather: LiveAlert[], transport: LiveAlert[]): LiveAlert[] {
  const seen = new Set<string>();
  const merged: LiveAlert[] = [];
  for (const alert of [...weather, ...transport]) {
    if (seen.has(alert.id)) continue;
    seen.add(alert.id);
    merged.push(alert);
  }
  return merged;
}

/** Collapse many MTR line pills into one count badge for the alert row. */
export function displayAlerts(alerts: LiveAlert[]): LiveAlert[] {
  const weather: LiveAlert[] = [];
  const transport: LiveAlert[] = [];
  for (const alert of alerts) {
    if (alert.kind === 'transport') transport.push(alert);
    else weather.push(alert);
  }
  if (transport.length <= 1) return [...weather, ...transport];
  return [
    ...weather,
    {
      id: 'mtr-bundle',
      name: `港鐵 · ${transport.length} 條`,
      href: MTR_PAGE,
      kind: 'transport',
    },
  ];
}

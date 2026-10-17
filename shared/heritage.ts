import { hktParts } from './content.js';
import factsJson from './heritage/facts.js';
import landmarksJson from './heritage/landmarks.js';

/**
 * On-this-day facts and Hong Kong landmarks.
 *
 * Add a fact: append an object to shared/heritage/facts.ts.
 *   mmdd     "MM-DD"
 *   year     "1962" or "每年" for a recurring festival
 *   fact     one sentence
 *   caption  one or two sentences of architecture / daily-life context
 *   category short label such as 建築、交通、民生、節慶、體育
 *   landmark optional slug from landmarks.json
 *
 * Add a place: append an object to shared/heritage/landmarks.ts, then
 * point facts at its slug. Keep copy to geography, architecture, daily life,
 * festivals, transport openings, sport and entertainment.
 *
 * Lines matching the block list are dropped at load and failed by tests.
 */

export interface HeritageFact {
  mmdd: string;
  year: string;
  fact: string;
  caption: string;
  category: string;
  landmark?: string;
}

export interface TimelineItem {
  year: string;
  title: string;
  text: string;
}

export type LandmarkKind = 'building' | 'transport' | 'culture' | 'view';

export interface Landmark {
  slug: string;
  name: string;
  kind: LandmarkKind;
  kindLabel: string;
  district: string;
  summary: string;
  lede: string;
  visit: string;
  mapQuery: string;
  image: string;
  imageAlt: string;
  timeline: TimelineItem[];
}

export const LANDMARK_FILTERS: { kind: '' | LandmarkKind; label: string }[] = [
  { kind: '', label: '全部' },
  { kind: 'building', label: '建築' },
  { kind: 'transport', label: '交通' },
  { kind: 'culture', label: '文化' },
  { kind: 'view', label: '自然／觀景' },
];

/**
 * Geography and civic life only. Political wording and Taiwan place names are refused.
 * 「維港兩岸」 is Victoria Harbour, not a political term, and stays in the seed.
 */
const TAIWAN_FORBIDDEN = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|民進黨|國民黨(?!軍)|蔡英文|賴清德|馬英九|陳水扁|台獨|臺獨|台独|九二共識|九二共识|武統|護國神山/i;
const POLITICAL_FORBIDDEN = /六四|六月四日|6月4日|06-04|天安門事件|天安门事件|Tiananmen|港獨|港独|香港獨立|文革|文化大革命|主權|示威|遊行|抗議|佔領|暴動|鎮壓|法輪|法轮|達賴|达赖|Dalai|疆獨|疆独|藏獨|藏独|再教育營|活摘|Free Tibet/i;
const STRAIT_POLITICAL = /兩岸關係|两岸关系|兩岸協議|两岸协议|兩岸局勢|两岸局势|海峽兩岸|海峡两岸|兩岸.{0,6}(?:關係|協議|局勢|海峽|政治)|(?:關係|協議|局勢|海峽|政治).{0,6}兩岸|两岸.{0,6}(?:关系|协议|局势|海峡|政治)|(?:关系|协议|局势|海峡|政治).{0,6}两岸/;

const facts = (factsJson as HeritageFact[]).filter((row) => !heritageBlocked(JSON.stringify(row)));
const landmarks = (landmarksJson as Landmark[]).filter((row) => !heritageBlocked(JSON.stringify(row)));
const bySlug = new Map(landmarks.map((row) => [row.slug, row]));

/** True when copy hits the Taiwan table or a political red line. Harbour 「維港兩岸」 is kept. */
export function heritageBlocked(value: string): boolean {
  if (TAIWAN_FORBIDDEN.test(value) || POLITICAL_FORBIDDEN.test(value)) return true;
  const harbour = value.replace(/維港兩岸/g, '').replace(/維多利亞港兩岸/g, '');
  return STRAIT_POLITICAL.test(harbour);
}

export function seedIssues(): string[] {
  const issues: string[] = [];
  for (const row of factsJson as HeritageFact[]) {
    if (!isMmdd(row.mmdd)) issues.push(`bad date ${row.mmdd}`);
    if (heritageBlocked(JSON.stringify(row))) issues.push(`blocked fact ${row.mmdd} ${row.year}`);
    if (row.landmark && !bySlug.has(row.landmark)) issues.push(`missing landmark ${row.landmark}`);
  }
  for (const row of landmarksJson as Landmark[]) {
    if (!row.slug || bySlug.get(row.slug) !== row && landmarks.filter((item) => item.slug === row.slug).length !== 1) {
      issues.push(`slug ${row.slug}`);
    }
    if (heritageBlocked(JSON.stringify(row))) issues.push(`blocked landmark ${row.slug}`);
  }
  if ((factsJson as HeritageFact[]).some((row) => row.mmdd === '06-04' || row.mmdd === '07-01')) {
    issues.push('blocked calendar day');
  }
  return issues;
}

export function isMmdd(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(2024, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function hktMmdd(now = new Date()): string {
  return hktParts(now).date.slice(5);
}

export function labelMmdd(mmdd: string): string {
  const [month, day] = mmdd.split('-').map((part) => Number(part));
  return `${month}月${day}日`;
}

export function shiftMmdd(mmdd: string, delta: number): string {
  const [month, day] = mmdd.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(2024, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getUTCDate()).padStart(2, '0');
  return `${nextMonth}-${nextDay}`;
}

function byYear(a: HeritageFact, b: HeritageFact): number {
  const year = (row: HeritageFact) => (row.year === '每年' ? 0 : Number(row.year) || 0);
  return year(a) - year(b);
}

export function factsOn(mmdd: string): HeritageFact[] {
  if (!isMmdd(mmdd)) return [];
  return facts.filter((row) => row.mmdd === mmdd).sort(byYear);
}

export function homeFacts(now = new Date(), limit = 3): HeritageFact[] {
  return factsOn(hktMmdd(now)).slice(0, limit);
}

export function allLandmarks(): Landmark[] {
  return landmarks;
}

export function landmarkBySlug(slug: string): Landmark | undefined {
  return bySlug.get(slug);
}

export function datedPaths(): string[] {
  return [...new Set(facts.map((row) => row.mmdd))].sort();
}

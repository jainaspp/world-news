import type { StoryCluster } from './angles.js';
import {
  analysisSlug,
  formatHkt,
  hktParts,
  slotId,
  sourcesFromCluster,
  type ContentDoc,
  type DigestBlock,
  type SourceRef,
} from './content.js';
import { stableId } from './rss.js';
import type { NewsItem } from './types.js';

/** xAI model id. The key stays in the Pages secret XAI_API_KEY. */
export const GROK_MODEL = 'grok-4.3';

export const XAI_URL = 'https://api.x.ai/v1/chat/completions';

/** USD per 1,000,000 tokens. */
export const XAI_INPUT_USD_PER_MILLION = 1.25;
export const XAI_OUTPUT_USD_PER_MILLION = 2.5;

/** Hard stop. At this month-to-date cost, new pieces use Workers AI. */
export const XAI_MONTHLY_CAP_USD = 10;

/** Comparisons written per HKT day, across both scheduled runs. */
export const COMPARE_PER_DAY = 20;

/** Articles per generate call, so one invocation stays inside Workers subrequest and wall-clock limits. */
export const COMPARE_BATCH = 3;

/** A source draft younger than this is left alone; an older draft can be upgraded to AI. */
export const DRAFT_HOLD_MS = 2 * 60 * 60 * 1000;

export interface MonthUsage {
  month: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  requests: number;
  grokBriefing: number;
  grokCompare: number;
  workersBriefing: number;
  workersCompare: number;
}

export interface WrittenStory {
  key: string;
  signature: string;
  links: string[];
  mode: 'ai' | 'sources';
  at: number;
}

export interface ColumnStatus {
  ok: true;
  month: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  capUsd: number;
  remainingUsd: number;
  capped: boolean;
  articles: {
    grokBriefing: number;
    grokCompare: number;
    workersBriefing: number;
    workersCompare: number;
    total: number;
  };
}

export function hktMonth(now = new Date()): string {
  return hktParts(now).date.slice(0, 7);
}

export function usageKey(month: string): string {
  return `xai-usage:${month}`;
}

export function writtenKey(now = new Date()): string {
  return `compare-written:${hktParts(now).date}`;
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function xaiCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * XAI_INPUT_USD_PER_MILLION + (outputTokens / 1_000_000) * XAI_OUTPUT_USD_PER_MILLION;
}

export function emptyUsage(month: string): MonthUsage {
  return {
    month,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    requests: 0,
    grokBriefing: 0,
    grokCompare: 0,
    workersBriefing: 0,
    workersCompare: 0,
  };
}

export function parseUsage(raw: string | null, month: string): MonthUsage {
  if (!raw) return emptyUsage(month);
  try {
    const parsed = JSON.parse(raw) as Partial<MonthUsage>;
    if (!parsed || parsed.month !== month) return emptyUsage(month);
    const base = emptyUsage(month);
    return {
      ...base,
      inputTokens: num(parsed.inputTokens),
      outputTokens: num(parsed.outputTokens),
      requests: num(parsed.requests),
      grokBriefing: num(parsed.grokBriefing),
      grokCompare: num(parsed.grokCompare),
      workersBriefing: num(parsed.workersBriefing),
      workersCompare: num(parsed.workersCompare),
      costUsd: roundUsd(xaiCostUsd(num(parsed.inputTokens), num(parsed.outputTokens))),
    };
  } catch {
    return emptyUsage(month);
  }
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function capReached(usage: MonthUsage | null | undefined): boolean {
  return (usage?.costUsd ?? 0) >= XAI_MONTHLY_CAP_USD;
}

export function withTokens(usage: MonthUsage, input: number, output: number, requests = 1): MonthUsage {
  const inputTokens = usage.inputTokens + Math.max(0, Math.floor(input));
  const outputTokens = usage.outputTokens + Math.max(0, Math.floor(output));
  return {
    ...usage,
    inputTokens,
    outputTokens,
    requests: usage.requests + Math.max(0, requests),
    costUsd: roundUsd(xaiCostUsd(inputTokens, outputTokens)),
  };
}

export function withArticle(usage: MonthUsage, route: 'grok' | 'workers', kind: 'briefing' | 'compare'): MonthUsage {
  const key = route === 'grok'
    ? (kind === 'briefing' ? 'grokBriefing' : 'grokCompare')
    : (kind === 'briefing' ? 'workersBriefing' : 'workersCompare');
  return { ...usage, [key]: usage[key] + 1 };
}

/** Grok only for an HK/China piece while the month is under the cap and a key is configured. */
export function writerFor(input: { route: 'grok' | 'workers'; costUsd: number; hasKey: boolean }): 'grok' | 'workers' {
  if (input.route === 'grok' && input.hasKey && input.costUsd < XAI_MONTHLY_CAP_USD) return 'grok';
  return 'workers';
}

export function statusFrom(usage: MonthUsage): ColumnStatus {
  const articles = usage.grokBriefing + usage.grokCompare + usage.workersBriefing + usage.workersCompare;
  return {
    ok: true,
    month: usage.month,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: usage.costUsd,
    capUsd: XAI_MONTHLY_CAP_USD,
    remainingUsd: roundUsd(Math.max(0, XAI_MONTHLY_CAP_USD - usage.costUsd)),
    capped: capReached(usage),
    articles: {
      grokBriefing: usage.grokBriefing,
      grokCompare: usage.grokCompare,
      workersBriefing: usage.workersBriefing,
      workersCompare: usage.workersCompare,
      total: articles,
    },
  };
}

export function usageTokens(payload: unknown): { input: number; output: number } {
  if (!payload || typeof payload !== 'object') return { input: 0, output: 0 };
  const usage = (payload as { usage?: Record<string, unknown> }).usage;
  if (!usage) return { input: 0, output: 0 };
  return {
    input: num(usage.prompt_tokens ?? usage.input_tokens),
    output: num(usage.completion_tokens ?? usage.output_tokens),
  };
}

export function hanCount(text: string): number {
  return (text.match(/[\u3400-\u9fff]/g) || []).length;
}

/** Chinese characters in the prose a reader actually sees. */
export function richness(doc: ContentDoc): number {
  const text = [doc.title, doc.description, ...(doc.points ?? []), ...doc.blocks.flatMap((block) => block.sentences)].join('');
  return hanCount(text);
}

/**
 * Prefer a Grok piece once it is long enough. Otherwise keep the richer AI text,
 * and any AI text ahead of a source draft.
 */
export function preferWritten(primary: ContentDoc | null, secondary: ContentDoc): ContentDoc {
  const candidates = [primary, secondary].filter((doc): doc is ContentDoc => Boolean(doc));
  const ai = candidates.filter((doc) => doc.mode === 'ai');
  const pool = ai.length ? ai : candidates;
  const enough = pool.filter((doc) => richness(doc) >= 500);
  const ranked = (enough.length ? enough : pool).slice().sort((a, b) => richness(b) - richness(a));
  return ranked[0] ?? secondary;
}

/** HK and mainland stories go to Grok. Tech, finance, and international stay on Workers AI. */
export function routeForCluster(cluster: StoryCluster): 'grok' | 'workers' {
  const categories = cluster.items.map((item) => item.category).filter((id): id is string => Boolean(id));
  const hkChina = categories.filter((id) => id === 'hk' || id === 'china').length;
  if (categories.length > 0 && hkChina * 2 > categories.length) return 'grok';
  if (cluster.lead.category === 'hk' || cluster.lead.category === 'china') return 'grok';
  return 'workers';
}

export function storySignature(cluster: StoryCluster): string {
  const links = [...new Set(cluster.items.map((item) => item.link))].sort();
  return stableId(links.join('\n'));
}

export function compareKey(cluster: StoryCluster, now = new Date()): string {
  return `${hktParts(now).date}-${analysisSlug(cluster.lead.title)}`;
}

export function parseWritten(raw: string | null): WrittenStory[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as WrittenStory[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.key === 'string' && typeof row.signature === 'string' && Array.isArray(row.links)).map((row) => ({
      key: row.key,
      signature: row.signature,
      links: row.links.filter((link) => typeof link === 'string'),
      mode: row.mode === 'ai' ? 'ai' as const : 'sources' as const,
      at: Number.isFinite(row.at) ? row.at : 0,
    }));
  } catch {
    return [];
  }
}

export function findWritten(cluster: StoryCluster, written: WrittenStory[], now = new Date()): WrittenStory | undefined {
  const key = compareKey(cluster, now);
  const signature = storySignature(cluster);
  const links = new Set(cluster.items.map((item) => item.link));
  for (const row of written) {
    if (row.key === key || row.signature === signature) return row;
    if (!row.links.length || links.size === 0) continue;
    let overlap = 0;
    for (const link of row.links) if (links.has(link)) overlap += 1;
    const smaller = Math.min(links.size, row.links.length);
    if (overlap >= 2 && overlap >= smaller * 0.5) return row;
  }
  return undefined;
}

/** AI pieces are never rewritten the same day. A fresh source draft is held briefly so a retry can upgrade it later. */
export function blocksRewrite(row: WrittenStory | undefined, nowMs: number): boolean {
  if (!row) return false;
  if (row.mode === 'ai') return true;
  return nowMs - row.at < DRAFT_HOLD_MS;
}

/**
 * Highest outlet-count stories first (the same ordering as 多方報道).
 * Skips anything already written today and stops at the daily cap.
 */
export function pickCompareBatch(
  clusters: StoryCluster[],
  written: WrittenStory[],
  limit = COMPARE_BATCH,
  now = new Date(),
  dayCap = COMPARE_PER_DAY,
): StoryCluster[] {
  const held = written.filter((row) => blocksRewrite(row, now.getTime())).length;
  const room = Math.max(0, dayCap - held);
  const take = Math.min(Math.max(0, limit), room);
  if (take <= 0) return [];
  const ranked = [...clusters]
    .filter((cluster) => cluster.count >= 2)
    .sort((a, b) => b.count - a.count || b.latest - a.latest);
  const picked: StoryCluster[] = [];
  const seen = [...written];
  for (const cluster of ranked) {
    if (picked.length >= take) break;
    if (blocksRewrite(findWritten(cluster, seen, now), now.getTime())) continue;
    picked.push(cluster);
    seen.push({
      key: compareKey(cluster, now),
      signature: storySignature(cluster),
      links: cluster.items.map((item) => item.link),
      mode: 'ai',
      at: now.getTime(),
    });
  }
  return picked;
}

function onHktDate(item: NewsItem, date: string): boolean {
  const time = Date.parse(item.pubDate);
  if (!Number.isFinite(time)) return false;
  return hktParts(new Date(time)).date === date;
}

/** Today's HK and mainland headlines. If today is thin, use the newest items in that category. */
export function selectBriefingItems(items: NewsItem[], now = new Date(), perSide = 8): { hk: NewsItem[]; china: NewsItem[] } {
  const today = hktParts(now).date;
  const take = (category: 'hk' | 'china'): NewsItem[] => {
    const rows = items
      .filter((item) => item.category === category)
      .slice()
      .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
    const current = rows.filter((item) => onHktDate(item, today));
    return (current.length >= 3 ? current : rows).slice(0, perSide);
  };
  return { hk: take('hk'), china: take('china') };
}

function toSource(item: NewsItem): SourceRef {
  return {
    title: item.title,
    url: item.link,
    source: item.source,
    ...(item.excerpt ? { excerpt: item.excerpt.slice(0, 300) } : {}),
    ...(item.image ? { image: item.image } : {}),
    ...(item.category ? { category: item.category } : {}),
    ...(item.pubDate ? { pubDate: item.pubDate } : {}),
  };
}

export function briefingFromItems(hk: NewsItem[], china: NewsItem[], key: string, now = new Date()): ContentDoc | null {
  if (hk.length + china.length < 2) return null;
  const section = (title: string, rows: NewsItem[], category: string): DigestBlock | null => {
    if (!rows.length) return null;
    const sources = rows.slice(0, 8).map(toSource);
    return {
      title,
      category,
      sources,
      sentences: sources.slice(0, 6).map((source) => `${source.source}報道：${source.title}。`),
    };
  };
  const blocks = [section('香港', hk, 'hk'), section('內地', china, 'china')].filter((block): block is DigestBlock => Boolean(block));
  const all = blocks.flatMap((block) => block.sources);
  blocks.push({
    title: '今日值得留意',
    category: hk.length ? 'hk' : 'china',
    sources: all.slice(0, 8),
    sentences: [
      `這一節綜合 ${all.length} 則香港同內地標題。`,
      ...all.slice(0, 4).map((source) => `${source.source}的標題是：${source.title}。`),
    ],
  });
  const when = key.endsWith('pm') ? '傍晚' : '早上';
  return {
    kind: 'briefing',
    key,
    title: `每日香港導讀 ${key.slice(0, 10)} ${when}`,
    description: blocks[0]?.sentences[0] || '香港同內地標題導讀',
    blocks,
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

export function compareFromCluster(cluster: StoryCluster, now = new Date()): ContentDoc {
  const sources = sourcesFromCluster(cluster, 8);
  const key = compareKey(cluster, now);
  const category = cluster.lead.category || 'world';
  const names = sources.slice(0, 4).map((source) => source.source).join('、');
  return {
    kind: 'compare',
    key,
    title: cluster.lead.title,
    description: `${new Set(sources.map((source) => source.source)).size} 間媒體點樣報道：${cluster.lead.title}`,
    blocks: [{
      title: '各家標題',
      category,
      sources,
      sentences: [
        `${names}都有報道：${cluster.lead.title}。`,
        ...sources.slice(0, 4).map((source) => `${source.source}的標題是「${source.title}」。`),
        '下面比較各家強調的角度、數字同語氣。細節以來源原文為準。',
      ],
    }],
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
    originalUrl: cluster.lead.link,
    ...(/[\u3400-\u9fff]/.test(cluster.lead.title) ? {} : { originalTitle: cluster.lead.title }),
  };
}

export function briefingKey(now = new Date()): string {
  return slotId(now);
}

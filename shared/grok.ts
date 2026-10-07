import { ANGLE_WINDOW_MS, angleClusters, sameEvent, type StoryCluster } from './angles.js';
import { clustersFromSnapshot, type BoardSnapshot } from './board.js';
import {
  analysisSlug,
  briefingHeadings,
  briefingScopeOf,
  formatHkt,
  hktParts,
  slotId,
  sourcesFromCluster,
  type ContentDoc,
  type DigestBlock,
  type SourceRef,
  narrativeSane,
  explainerFloor,
} from './content.js';
import { FEEDS } from './feeds.js';
import { stableId } from './rss.js';
import type { NewsItem } from './types.js';

/** xAI model id. The key stays in the Pages secret XAI_API_KEY. */
export const GROK_MODEL = 'grok-4.3';

export const XAI_URL = 'https://api.x.ai/v1/chat/completions';

/** USD per 1,000,000 tokens. grok-4.3 below 200k prompt tokens. */
export const XAI_INPUT_USD_PER_MILLION = 1.25;
export const XAI_OUTPUT_USD_PER_MILLION = 2.5;

/** xAI web_search is $5 per 1,000 successful calls. Failed attempts are not billed. */
export const XAI_WEB_SEARCH_USD_PER_CALL = 5 / 1000;

/** Hard stop. At this month-to-date cost, new pieces use Workers AI. */
export const XAI_MONTHLY_CAP_USD = 10;

/** New explainers per HKT day, across both scheduled runs (about nine each). */
export const COMPARE_PER_DAY = 18;

/** Articles per generate call, so one invocation stays inside Workers subrequest and wall-clock limits. */
export const COMPARE_BATCH = 3;

/** A long Grok piece. At or above this, the draft is finished even if a section is thin. */
export const MIN_AI_CHARS = 500;

/**
 * Pieces under this stay unpublished. A short draft is not saved as ready.
 */
export const ACCEPT_AI_CHARS = MIN_AI_CHARS;

/** Thin or failed drafts are retried at most this many times in one HKT day. */
export const THIN_ATTEMPTS = 2;

export interface MonthUsage {
  month: string;
  inputTokens: number;
  outputTokens: number;
  /** Successful web_search calls billed this month. Missing on rows written before search. */
  searchCalls: number;
  costUsd: number;
  requests: number;
  grokBriefing: number;
  grokCompare: number;
  workersBriefing: number;
  workersCompare: number;
  grokFocus: number;
  workersFocus: number;
  minimaxBriefing: number;
  minimaxCompare: number;
  minimaxFocus: number;
}

export interface WrittenStory {
  key: string;
  signature: string;
  links: string[];
  mode: 'ai' | 'sources';
  at: number;
  /** Chinese characters in the narrative body. Missing on rows written before this field existed. */
  chars?: number;
  /** How many times this cluster was generated today. Missing means a legacy row. */
  attempts?: number;
  /** True when the saved piece is long enough and, for an explainer, structurally complete. */
  ready?: boolean;
  /** Writer that finished this story. Missing rows count toward the Grok daily cap. */
  provider?: 'grok' | 'minimax' | 'workers-ai';
}

export interface ColumnStatus {
  ok: true;
  month: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  searchCalls: number;
  searchUsd: number;
  capUsd: number;
  remainingUsd: number;
  capped: boolean;
  articles: {
    grokBriefing: number;
    grokCompare: number;
    workersBriefing: number;
    workersCompare: number;
    grokFocus: number;
    workersFocus: number;
    minimaxBriefing: number;
    minimaxCompare: number;
    minimaxFocus: number;
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
  // New key so the 2026-10-07 compare rows are not locked and the next run rewrites them as explainers.
  return `explainer-written:${hktParts(now).date}`;
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function xaiCostUsd(inputTokens: number, outputTokens: number, searchCalls = 0): number {
  return (inputTokens / 1_000_000) * XAI_INPUT_USD_PER_MILLION
    + (outputTokens / 1_000_000) * XAI_OUTPUT_USD_PER_MILLION
    + Math.max(0, searchCalls) * XAI_WEB_SEARCH_USD_PER_CALL;
}

/** One article's token and search cost, rounded the same way as the monthly total. */
export function callCostUsd(inputTokens: number, outputTokens: number, searchCalls: number): number {
  return roundUsd(xaiCostUsd(inputTokens, outputTokens, searchCalls));
}

export function emptyUsage(month: string): MonthUsage {
  return {
    month,
    inputTokens: 0,
    outputTokens: 0,
    searchCalls: 0,
    costUsd: 0,
    requests: 0,
    grokBriefing: 0,
    grokCompare: 0,
    workersBriefing: 0,
    workersCompare: 0,
    grokFocus: 0,
    workersFocus: 0,
    minimaxBriefing: 0,
    minimaxCompare: 0,
    minimaxFocus: 0,
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
      searchCalls: num(parsed.searchCalls),
      requests: num(parsed.requests),
      grokBriefing: num(parsed.grokBriefing),
      grokCompare: num(parsed.grokCompare),
      workersBriefing: num(parsed.workersBriefing),
      workersCompare: num(parsed.workersCompare),
      grokFocus: num(parsed.grokFocus),
      workersFocus: num(parsed.workersFocus),
      minimaxBriefing: num(parsed.minimaxBriefing),
      minimaxCompare: num(parsed.minimaxCompare),
      minimaxFocus: num(parsed.minimaxFocus),
      costUsd: roundUsd(xaiCostUsd(num(parsed.inputTokens), num(parsed.outputTokens), num(parsed.searchCalls))),
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

export function withTokens(usage: MonthUsage, input: number, output: number, requests = 1, searchCalls = 0): MonthUsage {
  const inputTokens = usage.inputTokens + Math.max(0, Math.floor(input));
  const outputTokens = usage.outputTokens + Math.max(0, Math.floor(output));
  const nextSearch = usage.searchCalls + Math.max(0, Math.floor(searchCalls));
  return {
    ...usage,
    inputTokens,
    outputTokens,
    searchCalls: nextSearch,
    requests: usage.requests + Math.max(0, requests),
    costUsd: roundUsd(xaiCostUsd(inputTokens, outputTokens, nextSearch)),
  };
}

export function withArticle(usage: MonthUsage, route: 'grok' | 'workers' | 'minimax', kind: 'briefing' | 'compare' | 'focus'): MonthUsage {
  const key = route === 'minimax'
    ? (kind === 'briefing' ? 'minimaxBriefing' : kind === 'compare' ? 'minimaxCompare' : 'minimaxFocus')
    : route === 'grok'
      ? (kind === 'briefing' ? 'grokBriefing' : kind === 'compare' ? 'grokCompare' : 'grokFocus')
      : (kind === 'briefing' ? 'workersBriefing' : kind === 'compare' ? 'workersCompare' : 'workersFocus');
  return { ...usage, [key]: usage[key] + 1 };
}

/**
 * Every briefing and comparison uses Grok while the month is under the cap and a key is set.
 * Workers AI is only the fallback once the cap is reached or the key is missing.
 * `route` is accepted so older callers still compile; it no longer picks the model.
 */
export function writerFor(input: { route?: 'grok' | 'workers'; costUsd: number; hasKey: boolean }): 'grok' | 'workers' {
  if (input.hasKey && input.costUsd < XAI_MONTHLY_CAP_USD) return 'grok';
  return 'workers';
}

export function statusFrom(usage: MonthUsage): ColumnStatus {
  const articles = usage.grokBriefing + usage.grokCompare + usage.workersBriefing + usage.workersCompare + usage.grokFocus + usage.workersFocus
    + usage.minimaxBriefing + usage.minimaxCompare + usage.minimaxFocus;
  return {
    ok: true,
    month: usage.month,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    searchCalls: usage.searchCalls,
    searchUsd: roundUsd(usage.searchCalls * XAI_WEB_SEARCH_USD_PER_CALL),
    costUsd: usage.costUsd,
    capUsd: XAI_MONTHLY_CAP_USD,
    remainingUsd: roundUsd(Math.max(0, XAI_MONTHLY_CAP_USD - usage.costUsd)),
    capped: capReached(usage),
    articles: {
      grokBriefing: usage.grokBriefing,
      grokCompare: usage.grokCompare,
      workersBriefing: usage.workersBriefing,
      workersCompare: usage.workersCompare,
      grokFocus: usage.grokFocus,
      workersFocus: usage.workersFocus,
      minimaxBriefing: usage.minimaxBriefing,
      minimaxCompare: usage.minimaxCompare,
      minimaxFocus: usage.minimaxFocus,
      total: articles,
    },
  };
}

export function usageTokens(payload: unknown): { input: number; output: number } {
  if (!payload || typeof payload !== 'object') return { input: 0, output: 0 };
  const usage = (payload as { usage?: Record<string, unknown> }).usage;
  if (!usage) return { input: 0, output: 0 };
  // Responses API output_tokens already includes reasoning; chat completion_tokens does not.
  if (usage.completion_tokens == null && usage.output_tokens != null) {
    return { input: num(usage.input_tokens ?? usage.prompt_tokens), output: num(usage.output_tokens) };
  }
  return {
    input: num(usage.prompt_tokens ?? usage.input_tokens),
    // xAI bills reasoning tokens as output but reports them outside completion_tokens.
    output: num(usage.completion_tokens ?? usage.output_tokens) + reasoningTokens(usage),
  };
}

function reasoningTokens(usage: Record<string, unknown>): number {
  const details = (usage.completion_tokens_details ?? usage.output_tokens_details) as Record<string, unknown> | undefined;
  return details ? num(details.reasoning_tokens) : 0;
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

/** Briefings and comparisons all go to Grok. The cap in `writerFor` is what switches a piece to Workers AI. */
export function routeForCluster(cluster: StoryCluster): 'grok' | 'workers' {
  void cluster;
  return 'grok';
}

const CHINA_RE = /中國|中共|北京|上海|台灣|臺灣|歐中|中歐|中美|中日|中方|兩岸|習近平|國務院|人大|大陸|內地/;

/** Mainland and China-related headlines, including ones the category rules filed under business. Hong Kong stories stay in Hong Kong. */
export function isChinaItem(item: NewsItem): boolean {
  if (item.category === 'hk') return false;
  if (item.category === 'china') return true;
  return CHINA_RE.test(`${item.title}\n${item.excerpt || ''}`);
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
      ...(typeof row.chars === 'number' && Number.isFinite(row.chars) ? { chars: Math.max(0, Math.floor(row.chars)) } : {}),
      ...(typeof row.attempts === 'number' && Number.isFinite(row.attempts) ? { attempts: Math.max(0, Math.floor(row.attempts)) } : {}),
      ...(row.ready === true ? { ready: true as const } : row.ready === false ? { ready: false as const } : {}),
      ...(row.provider === 'grok' || row.provider === 'minimax' || row.provider === 'workers-ai' ? { provider: row.provider } : {}),
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

/**
 * A finished piece stays for the day. A thin or failed draft stays open until it has been
 * tried THIN_ATTEMPTS times. Rows saved before `chars` existed stay locked when they were
 * marked as AI, so a finished piece is not regenerated just because the field is new.
 */
export function blocksRewrite(row: WrittenStory | undefined, _nowMs: number): boolean {
  if (!row) return false;
  if (row.ready === true) return true;
  if (row.mode === 'ai' && row.chars == null && row.attempts == null) return true;
  if (row.mode === 'ai' && typeof row.chars === 'number' && row.chars >= MIN_AI_CHARS && row.ready !== false) return true;
  return (row.attempts ?? 0) >= THIN_ATTEMPTS;
}

/** Narrative Chinese characters, excluding the data-built timeline titles. */
export function bodyChars(doc: ContentDoc): number {
  const sentences = doc.blocks
    .filter((block) => block.title !== '事件時間線')
    .flatMap((block) => block.sentences);
  return hanCount([...(doc.points ?? []), ...sentences].join(''));
}

/** An explainer needs the narrative and three summary lines. Empty 後續關注 is omitted, not required. */
export function structureComplete(doc: ContentDoc): boolean {
  const titles = new Set(doc.blocks.map((block) => block.title));
  if (doc.kind === 'compare') {
    return titles.has('事件經過') && (doc.points?.length ?? 0) >= 2;
  }
  if (doc.kind === 'briefing') {
    const scope = briefingScopeOf(doc.key);
    const headings = briefingHeadings(scope);
    const body = headings.filter((heading) => heading !== '今日值得留意');
    const watch = scope !== 'hk' || titles.has('今日值得留意');
    return watch && body.some((heading) => titles.has(heading)) && (doc.points?.length ?? 0) >= 2;
  }
  return true;
}

/** Publish only at the 500-character floor, with the sections a reader needs. */
export function pieceReady(doc: ContentDoc): boolean {
  if (doc.kind !== 'briefing' && doc.kind !== 'compare') return richness(doc) >= MIN_AI_CHARS;
  const floor = doc.kind === 'compare' ? Math.min(MIN_AI_CHARS, explainerFloor(doc)) : MIN_AI_CHARS;
  return bodyChars(doc) >= floor && structureComplete(doc) && narrativeSane(doc);
}

/**
 * Writes chars, ready, and the attempt count onto the existing row.
 * The first save starts at 1. A later save increments, so a thin update cannot drop the counter.
 */
export function upsertWritten(existing: WrittenStory[], row: WrittenStory, cluster: StoryCluster, now = new Date()): WrittenStory[] {
  const next = existing.map((item) => ({ ...item }));
  const previous = findWritten(cluster, next, now);
  if (!previous) {
    next.push({ ...row, attempts: row.attempts ?? 1 });
    return next;
  }
  previous.mode = row.mode;
  previous.at = row.at;
  previous.key = row.key;
  previous.signature = row.signature;
  previous.links = row.links;
  if (typeof row.chars === 'number') previous.chars = row.chars;
  if (typeof row.ready === 'boolean') previous.ready = row.ready;
  if (row.provider) previous.provider = row.provider;
  previous.attempts = (previous.attempts ?? 1) + 1;
  return next;
}

/** HKT morning or evening instant for a briefing slot such as 2026-10-07-pm. */
export function slotInstant(slot: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})-(am|pm)(?:-(world|techfin))?$/.exec(slot);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const hourUtc = match[4] === 'am' ? 0 : 10;
  const when = new Date(Date.UTC(year, month - 1, day, hourUtc, 30));
  const base = `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
  return slotId(when) === base ? when : null;
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
      ready: true,
    });
  }
  return picked;
}

function onHktDate(item: NewsItem, date: string): boolean {
  const time = Date.parse(item.pubDate);
  if (!Number.isFinite(time)) return false;
  return hktParts(new Date(time)).date === date;
}

/** Today's HK and mainland headlines. China includes related stories the category list filed elsewhere. */
/** Lifestyle, promotion, and sponsored items that are not news for a briefing. */
export const PROMO_RE = /優惠|好去處|自助餐|快閃|\d折|半價|著數|食評|試食|抽獎|贊助|Sponsored|\$\d+起|人均\$|攻略|打卡|名車盛會|花園派對|開倉|團購|一日遊|酒店住宿|staycation|優惠碼|開箱/i;

const MAINLAND_RE = /中國|中共|北京|上海|深圳|廣州|歐中|中歐|中美|中日|中方|兩岸|習近平|國務院|人大|大陸|內地|我國|外交部|商務部/;
const FOREIGN_RE = /加州|美國|英國|日本|韓國|歐洲|台灣|臺灣|匈牙利|俄羅斯|印度|澳洲|加拿大|法國|德國/;

/** Briefing material: no promotions, and a 內地 item must be about the mainland rather than a foreign or Taiwan story. */
export function briefingNews(item: NewsItem, side: 'hk' | 'china'): boolean {
  if (PROMO_RE.test(item.title)) return false;
  if (side === 'hk') return item.category === 'hk';
  if (!isChinaItem(item)) return false;
  return !(FOREIGN_RE.test(item.title) && !MAINLAND_RE.test(item.title));
}

const BRIEFING_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Same-day Hong Kong and mainland items for a briefing (HKT date, or the last 12 hours just after
 * midnight), ranked by how many outlets carried the story, at most two outlets per story.
 */
export function selectBriefingItems(items: NewsItem[], now = new Date(), perSide = 8): { hk: NewsItem[]; china: NewsItem[] } {
  const today = hktParts(now).date;
  const nowMs = now.getTime();
  const recent = (item: NewsItem, windowMs: number) => {
    const time = Date.parse(item.pubDate);
    return Number.isFinite(time) && time <= nowMs + 60_000 && time >= nowMs - windowMs;
  };
  const take = (side: 'hk' | 'china'): NewsItem[] => {
    const rows = items.filter((item) => briefingNews(item, side));
    let pool = rows.filter((item) => onHktDate(item, today) || recent(item, BRIEFING_WINDOW_MS));
    if (pool.length < 3) pool = rows.filter((item) => recent(item, 2 * BRIEFING_WINDOW_MS));
    const clusters = angleClusters(pool)
      .sort((a, b) => b.count - a.count || b.latest - a.latest);
    const picked: NewsItem[] = [];
    const seen = new Set<string>();
    for (const cluster of clusters) {
      const outlets = new Set<string>();
      const ordered = [cluster.lead, ...cluster.items.filter((item) => item.id !== cluster.lead.id)];
      for (const item of ordered) {
        if (picked.length >= perSide || outlets.size >= 2) break;
        if (seen.has(item.id) || outlets.has(item.source)) continue;
        outlets.add(item.source);
        seen.add(item.id);
        picked.push(item);
      }
      if (picked.length >= perSide) break;
    }
    // Stories that did not cluster (one outlet) fill the rest, newest first.
    for (const item of pool.slice().sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))) {
      if (picked.length >= perSide) break;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        picked.push(item);
      }
    }
    return picked;
  };
  return { hk: take('hk'), china: take('china') };
}

function toSource(item: NewsItem): SourceRef {
  return {
    title: item.title,
    url: item.link,
    source: item.source,
    ...(item.excerpt ? { excerpt: item.excerpt.slice(0, 1_200) } : {}),
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
  blocks.push({
    title: '今日值得留意',
    category: hk.length ? 'hk' : 'china',
    sources: [],
    sentences: [
      `香港有 ${hk.length} 則，內地有 ${china.length} 則。`,
      '這一版尚未寫成分析。模型完成後會說明事件為何重要，以及值得留意的具體事項。',
    ],
  });
  const when = key.endsWith('pm') ? '傍晚' : '早上';
  return {
    kind: 'briefing',
    key,
    title: `每日香港導讀 ${key.slice(0, 10)} ${when}`,
    description: blocks[0]?.sentences[0] || '香港和內地新聞導讀',
    blocks,
    publishedAt: now.toISOString(),
    hkt: formatHkt(now.toISOString()),
    mode: 'sources',
  };
}

/** Earlier board headlines of this same event, for the explainer timeline. */
export function relatedEarlier(cluster: StoryCluster, items: NewsItem[]): NewsItem[] {
  const ids = new Set(cluster.items.map((item) => item.id));
  const links = new Set(cluster.items.map((item) => item.link));
  const earliest = Math.min(...cluster.items.map((item) => Date.parse(item.pubDate) || Number.POSITIVE_INFINITY));
  return items.filter((item) => {
    if (ids.has(item.id) || links.has(item.link)) return false;
    const time = Date.parse(item.pubDate);
    if (!Number.isFinite(time) || time >= earliest) return false;
    return sameEvent(cluster.lead, item, ANGLE_WINDOW_MS);
  }).sort((a, b) => Date.parse(a.pubDate) - Date.parse(b.pubDate)).slice(0, 4);
}

export function compareFromCluster(cluster: StoryCluster, now = new Date(), earlier: NewsItem[] = []): ContentDoc {
  const sources = sourcesFromCluster(cluster, 8);
  const prior = earlier.filter((item) => !sources.some((source) => source.url === item.link)).slice(0, 4).map(toSource);
  const timed = [...prior, ...sources].sort((a, b) => Date.parse(a.pubDate || '') - Date.parse(b.pubDate || ''));
  const key = compareKey(cluster, now);
  const category = cluster.lead.category || 'world';
  const names = sources.slice(0, 4).map((source) => source.source).join('、');
  const section = (title: string, sentences: string[]): DigestBlock => ({
    title,
    category,
    sources,
    sentences,
  });
  return {
    kind: 'compare',
    key,
    title: cluster.lead.title,
    description: `${new Set(sources.map((source) => source.source)).size} 間媒體報道：${cluster.lead.title}`,
    blocks: [
      {
        title: '事件時間線',
        category,
        sources: timed,
        sentences: timed.slice(0, 6).map((source) => `${source.source}：${source.title}。`),
      },
      section('事件經過', [
        `${names}都報道了同一件事：${cluster.lead.title}。`,
        '這一版尚未寫成懶人包。完成後會按時間說明經過，並只使用來源已經寫出的事實。',
      ]),
      section('各方回應', ['來源若引述了當事人，完成後會寫在這一節。現在只保留各家標題。']),
      section('後續關注', ['後續日期、程序或未決事項，只會在來源已經寫到時才列出。']),
    ],
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

const regionsBySource = new Map<string, string[]>();
for (const feed of FEEDS) {
  const prev = regionsBySource.get(feed.label) ?? [];
  const next = [...prev];
  for (const region of feed.regions) if (!next.includes(region)) next.push(region);
  regionsBySource.set(feed.label, next);
}

function withFeedRegions(item: NewsItem): NewsItem {
  if (item.regions.length) return item;
  const regions = regionsBySource.get(item.source);
  return regions?.length ? { ...item, regions } : item;
}

/**
 * Headlines and clusters already stored on the board. Null when the cache has no headlines,
 * so generate can fail the request instead of crawling every feed.
 */
export function materialFromBoard(snapshot: BoardSnapshot | null): { items: NewsItem[]; clusters: StoryCluster[] } | null {
  if (!snapshot?.headlines.length) return null;
  const items = snapshot.headlines.map((row) => withFeedRegions({
    id: row.id,
    title: row.title,
    link: row.link,
    source: row.source,
    sourceUrl: '',
    regions: [],
    pubDate: row.pubDate,
    ...(row.category ? { category: row.category } : {}),
  }));
  const byId = new Map(items.map((item) => [item.id, item]));
  const clusters = clustersFromSnapshot(snapshot).map((cluster) => {
    const joined = cluster.items.map((item) => {
      const live = byId.get(item.id);
      if (!live) return item;
      return {
        ...item,
        ...(live.category ? { category: live.category } : {}),
        regions: live.regions.length ? live.regions : item.regions,
      };
    });
    const lead = joined[0] ?? cluster.lead;
    const sources = [...new Set(joined.map((item) => item.source))];
    return { ...cluster, lead, items: joined, sources, count: sources.length };
  }).filter((cluster) => cluster.count >= 2);
  return { items, clusters };
}

export interface ColumnDelivery {
  status: number;
  ok: boolean;
  fallback: boolean;
  cold?: boolean;
  error?: string;
  /** Keys saved in this batch that are still thin or not a finished Grok piece. */
  thin: string[];
}

/**
 * HTTP result for one generate call. A cold cache or a sources-only / non-Grok piece is 503
 * so the workflow retries. A Workers AI piece is a normal 200 only when Grok was not available
 * (monthly cap, or no key).
 */
function namedWriter(doc: { model?: string; provider?: string }): boolean {
  if (doc.provider === 'grok' || doc.provider === 'minimax') return true;
  const model = (doc.model || '').toLowerCase();
  return model.includes('grok') || model.includes('minimax');
}

function draftAccepted(doc: { mode: string; model?: string; provider?: string; chars?: number; ready?: boolean }, capped?: boolean): boolean {
  if (doc.ready === true && (doc.chars ?? 0) >= ACCEPT_AI_CHARS) return true;
  if (doc.mode !== 'ai') return false;
  if (capped) return true;
  if (!namedWriter(doc)) return false;
  return (doc.chars ?? 0) >= MIN_AI_CHARS && doc.ready !== false;
}

export function columnDelivery(input: {
  cold?: boolean;
  skipped?: string;
  capped?: boolean;
  docs?: { mode: string; model?: string; provider?: string; chars?: number; key?: string; ready?: boolean }[];
}): ColumnDelivery {
  const thinKeys = (docs: { mode: string; model?: string; provider?: string; chars?: number; key?: string; ready?: boolean }[]) => docs
    .filter((doc) => !draftAccepted(doc, input.capped))
    .map((doc) => doc.key)
    .filter((key): key is string => Boolean(key));
  if (input.cold) return { status: 503, ok: false, fallback: true, cold: true, error: 'cache-cold', thin: [] };
  if (input.skipped === 'exists' || input.skipped === 'none' || input.skipped === 'no-headlines' || input.skipped === 'done' || input.skipped === 'pace') {
    return { status: 200, ok: true, fallback: false, thin: [] };
  }
  const docs = input.docs ?? [];
  if (!docs.length) return { status: 200, ok: true, fallback: false, thin: [] };
  const thin = thinKeys(docs);
  const anyAccepted = docs.some((doc) => draftAccepted(doc, input.capped));
  const prematureWorkers = !input.capped && docs.some((doc) => doc.mode === 'ai' && Boolean(doc.model) && !namedWriter(doc) && doc.ready !== true);
  const allSources = docs.every((doc) => doc.mode !== 'ai');
  if (!anyAccepted && !input.capped && (allSources || prematureWorkers)) {
    return { status: 503, ok: false, fallback: true, thin };
  }
  return { status: 200, ok: true, fallback: false, thin };
}

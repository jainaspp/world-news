import { emptyUsage, hktMonth, parseUsage, usageKey, xaiCostUsd, roundUsd, type MonthUsage } from '../../shared/grok.js';
import type { ContentEnv } from './store.js';
import { readValue } from './store.js';

/**
 * Month spend as a ledger. Every save appends one record under a unique key (never a
 * read-modify-write), so parallel generate calls cannot overwrite each other. A read sums the
 * frozen legacy snapshot (`usage:<month>`) and every record of the month. KV list returns each
 * record's numbers in its metadata, so a read costs one list page per 1,000 records.
 */
export const USAGE_FIELDS = [
  'inputTokens', 'outputTokens', 'searchCalls', 'requests',
  'grokBriefing', 'grokCompare', 'workersBriefing', 'workersCompare', 'grokFocus', 'workersFocus',
  'minimaxBriefing', 'minimaxCompare', 'minimaxFocus',
] as const;

type Field = typeof USAGE_FIELDS[number];
export type UsageDelta = Partial<Record<Field, number>>;

/** Ledger records outlive the month they count toward. */
const LEDGER_TTL_SECONDS = 70 * 24 * 60 * 60;

export function ledgerPrefix(month: string): string {
  return `usage-rec:${month}:`;
}

interface LedgerKv {
  put(key: string, value: string, options?: { expirationTtl?: number; metadata?: unknown }): Promise<void>;
  list(options: { prefix: string; cursor?: string; limit?: number }): Promise<{ keys: { name: string; metadata?: unknown }[]; list_complete: boolean; cursor?: string }>;
}

/** Fallback ledger when the KV binding cannot list (tests, local dev). */
const memoryLedger = new Map<string, UsageDelta>();

function ledgerKv(env: ContentEnv): LedgerKv | null {
  const kv = env.CONTENT as unknown as Partial<LedgerKv> | undefined;
  return kv && typeof kv.list === 'function' && typeof kv.put === 'function' ? kv as LedgerKv : null;
}

/** The usage a caller started from; a save writes only what was added since. */
const BASE = Symbol('usage-base');
type Tracked = MonthUsage & { [BASE]?: MonthUsage };

function cleanDelta(raw: unknown): UsageDelta {
  const out: UsageDelta = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const field of USAGE_FIELDS) {
    const value = Number((raw as Record<string, unknown>)[field]);
    if (Number.isFinite(value) && value > 0) out[field] = Math.floor(value);
  }
  return out;
}

export function addDelta(usage: MonthUsage, delta: UsageDelta): MonthUsage {
  const next: MonthUsage = { ...usage };
  for (const field of USAGE_FIELDS) next[field] = usage[field] + (delta[field] ?? 0);
  next.costUsd = roundUsd(xaiCostUsd(next.inputTokens, next.outputTokens, next.searchCalls));
  return next;
}

export function diffUsage(next: MonthUsage, base: MonthUsage): UsageDelta {
  const out: UsageDelta = {};
  for (const field of USAGE_FIELDS) {
    const value = next[field] - base[field];
    if (value > 0) out[field] = value;
  }
  return out;
}

async function ledgerRecords(env: ContentEnv, month: string): Promise<UsageDelta[]> {
  const kv = ledgerKv(env);
  const prefix = ledgerPrefix(month);
  if (!kv) return [...memoryLedger.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value);
  const out: UsageDelta[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const listed = await kv.list({ prefix, ...(cursor ? { cursor } : {}), limit: 1000 });
    for (const key of listed.keys) out.push(cleanDelta(key.metadata));
    if (listed.list_complete || !listed.cursor) break;
    cursor = listed.cursor;
  }
  return out;
}

/** Legacy snapshot plus every ledger record of the month. */
export async function monthUsage(env: ContentEnv, now = new Date()): Promise<MonthUsage> {
  const month = hktMonth(now);
  let usage = parseUsage(await readValue(env, usageKey(month)).catch(() => null), month);
  try {
    for (const record of await ledgerRecords(env, month)) usage = addDelta(usage, record);
  } catch {
    /* a failed list still returns the snapshot */
  }
  const tracked = usage as Tracked;
  tracked[BASE] = { ...usage };
  return tracked;
}

/** Appends what this caller added since it read `usage` (or since its last save) as one record. */
export async function saveUsage(env: ContentEnv, usage: MonthUsage): Promise<void> {
  const tracked = usage as Tracked;
  const base = tracked[BASE] ?? emptyUsage(usage.month);
  const delta = diffUsage(usage, base);
  if (!Object.keys(delta).length) return;
  await recordUsage(env, usage.month, delta);
  tracked[BASE] = { ...usage };
}

export async function recordUsage(env: ContentEnv, month: string, delta: UsageDelta): Promise<void> {
  const key = `${ledgerPrefix(month)}${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const kv = ledgerKv(env);
  if (!kv) {
    memoryLedger.set(key, delta);
    return;
  }
  await kv.put(key, JSON.stringify(delta), { expirationTtl: LEDGER_TTL_SECONDS, metadata: delta });
}

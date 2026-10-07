import { emptyUsage, hktMonth, parseUsage, usageKey, xaiCostUsd, roundUsd, type MonthUsage } from '../../shared/grok.js';
import type { ContentEnv } from './store.js';
import { isKvLimitError, kvWritesBlocked, markKvWriteLimited, readValue } from './store.js';
import { edgeCache } from '../env.js';

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
  // Spend not yet in KV (batched, or held back by the KV put limit) still counts toward the cap.
  const unsaved = await pendingDelta(month);
  if (Object.keys(unsaved).length) usage = addDelta(usage, unsaved);
  const tracked = usage as Tracked;
  tracked[BASE] = { ...usage };
  return tracked;
}

/**
 * Usage is batched: inside {@link withUsageBatch} a save only adds to an in-memory total and the
 * batch writes one ledger record when the request ends (one KV put per generate call instead of
 * one per model call). Outside a batch a save writes its record at once.
 */
let batchDepth = 0;
const pending = new Map<string, UsageDelta>();

function mergeDelta(a: UsageDelta, b: UsageDelta): UsageDelta {
  const out: UsageDelta = { ...a };
  for (const field of USAGE_FIELDS) {
    const value = (a[field] ?? 0) + (b[field] ?? 0);
    if (value > 0) out[field] = value;
  }
  return out;
}

/** Edge-cache backup of spend that could not reach KV, so a recycled isolate does not lose it. */
function backupKey(month: string): Request {
  return new Request(`https://world-news.xyz/content-store/__usage-unsaved-${month}`);
}

async function readBackup(month: string): Promise<UsageDelta> {
  const cache = edgeCache();
  if (!cache) return {};
  try {
    const hit = await cache.match(backupKey(month));
    return hit ? cleanDelta(JSON.parse(await hit.text())) : {};
  } catch {
    return {};
  }
}

async function writeBackup(month: string, delta: UsageDelta): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    if (!Object.keys(delta).length) await cache.delete(backupKey(month));
    else await cache.put(backupKey(month), new Response(JSON.stringify(delta), { headers: { 'cache-control': 'public, max-age=2592000' } }));
  } catch {
    /* best effort */
  }
}

async function pendingDelta(month: string): Promise<UsageDelta> {
  return mergeDelta(pending.get(month) ?? {}, await readBackup(month));
}

/** Appends what this caller added since it read `usage` (or since its last save). */
export async function saveUsage(env: ContentEnv, usage: MonthUsage): Promise<void> {
  const tracked = usage as Tracked;
  const base = tracked[BASE] ?? emptyUsage(usage.month);
  const delta = diffUsage(usage, base);
  if (!Object.keys(delta).length) return;
  tracked[BASE] = { ...usage };
  pending.set(usage.month, mergeDelta(pending.get(usage.month) ?? {}, delta));
  if (batchDepth === 0) await flushUsage(env);
}

/** Writes every pending month total (plus any edge-cache backup) as one ledger record. Never throws. */
export async function flushUsage(env: ContentEnv): Promise<void> {
  const months = new Set<string>(pending.keys());
  for (const month of months) {
    // Take this month's total synchronously so a parallel flush cannot write it a second time.
    const taken = pending.get(month) ?? {};
    pending.delete(month);
    const delta = mergeDelta(taken, await readBackup(month));
    if (!Object.keys(delta).length) continue;
    try {
      await recordUsage(env, month, delta);
      await writeBackup(month, {});
    } catch (error) {
      if (isKvLimitError(error)) await markKvWriteLimited();
      console.warn('usage record not stored; kept for the next save');
      // delta already includes the old backup: keep it in exactly one place so it is not counted twice.
      if (edgeCache()) await writeBackup(month, delta);
      else pending.set(month, mergeDelta(pending.get(month) ?? {}, delta));
    }
  }
}

/** Runs fn with batched usage, then writes one record per month. */
export async function withUsageBatch<T>(env: ContentEnv, fn: () => Promise<T>): Promise<T> {
  batchDepth += 1;
  try {
    return await fn();
  } finally {
    batchDepth -= 1;
    await flushUsage(env);
  }
}

/** Test hook. */
export function resetUsageState(): void {
  pending.clear();
  memoryLedger.clear();
  batchDepth = 0;
}

export async function recordUsage(env: ContentEnv, month: string, delta: UsageDelta): Promise<void> {
  const key = `${ledgerPrefix(month)}${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const kv = ledgerKv(env);
  if (!kv) {
    memoryLedger.set(key, delta);
    return;
  }
  if (await kvWritesBlocked()) throw new Error('KV put limit (429)');
  await kv.put(key, JSON.stringify(delta), { expirationTtl: LEDGER_TTL_SECONDS, metadata: delta });
}

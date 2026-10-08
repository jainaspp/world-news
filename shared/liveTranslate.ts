import { hasChinese, isMostlyEnglish, toCN, toHK, type UiLang } from './zh.js';

/**
 * Live page translation. Workers AI's m2m100 model only. Script conversion between
 * Traditional and Simplified never calls a model. Results are cached by the route
 * so the same string is not translated again. This module does not write articles,
 * call the paid models, or post anywhere.
 */
export const TRANSLATE_MODEL = '@cf/meta/m2m100-1.2b';

/** Per isolate, per UTC day. Stops a loop from burning the free Workers AI allowance. */
export const TRANSLATE_DAILY_CALLS = 4000;

const CHUNK = 420;
const MAX_CHUNKS = 40;

const ACRONYM = /^[A-Z0-9][A-Z0-9&.'’+-]{0,12}$/;
const KEPT_TOKEN = new Set(['RSS', 'Telegram', 'WhatsApp', 'Google']);

export type ModelLang = 'en' | 'zh';

export type TranslatePlan =
  | { kind: 'keep'; text: string }
  | { kind: 'script'; text: string }
  | { kind: 'model'; text: string; source: ModelLang; target: ModelLang };

export function normalizeLiveText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

/** Already in the target language, or not words: leave the string alone. */
export function planTranslation(input: string, ui: UiLang): TranslatePlan {
  const text = normalizeLiveText(input);
  if (!text) return { kind: 'keep', text: input };
  if (leaveAsIs(text)) return { kind: 'keep', text };
  const chinese = hasChinese(text);
  const english = isMostlyEnglish(text);
  if (ui === 'en') {
    if (!chinese || english) return { kind: 'keep', text };
    return { kind: 'model', text, source: 'zh', target: 'en' };
  }
  if (!chinese || english) {
    if (!/[A-Za-z]{2,}/.test(text)) return { kind: 'keep', text };
    return { kind: 'model', text, source: 'en', target: 'zh' };
  }
  const converted = ui === 'zh-CN' ? toCN(text) : toHK(text);
  if (converted === text) return { kind: 'keep', text };
  return { kind: 'script', text: converted };
}

function leaveAsIs(text: string): boolean {
  if (/^(https?:\/\/|mailto:)/i.test(text)) return true;
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(text)) return true;
  if (/^[\w.-]+\.[a-z]{2,}$/i.test(text)) return true;
  if (text === 'true' || text === 'false') return true;
  if (!/[\p{L}]/u.test(text)) return true;
  if (/^[\d\s.,:%+%％+\-/–—]+$/.test(text)) return true;
  if (ACRONYM.test(text) || KEPT_TOKEN.has(text)) return true;
  return false;
}

export function numbersOf(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)*/g) ?? [];
}

/** Every Arabic number in the source must still be present. Extra digits are fine. */
export function keepsNumbers(source: string, output: string): boolean {
  const bag = numbersOf(output);
  for (const number of numbersOf(source)) {
    const index = bag.indexOf(number);
    if (index < 0) return false;
    bag.splice(index, 1);
  }
  return true;
}

export function chunksForModel(text: string): string[] {
  if (text.length <= CHUNK) return [text];
  const pieces = text.split(/(?<=[。！？!?；;\n])/);
  const grouped: string[] = [];
  let buf = '';
  for (const piece of pieces) {
    if (piece.length > CHUNK) {
      if (buf) grouped.push(buf);
      buf = '';
      grouped.push(...hardSplit(piece));
      continue;
    }
    if (buf && buf.length + piece.length > CHUNK) {
      grouped.push(buf);
      buf = piece;
    } else {
      buf += piece;
    }
  }
  if (buf) grouped.push(buf);
  return grouped.filter((part) => part.length > 0);
}

function hardSplit(text: string): string[] {
  const out: string[] = [];
  let index = 0;
  while (index < text.length) {
    let end = Math.min(text.length, index + CHUNK);
    if (end < text.length) {
      const window = text.slice(index, end);
      const space = window.lastIndexOf(' ');
      if (space > CHUNK / 2) end = index + space + 1;
      else {
        const partial = window.search(/\d+$/);
        if (partial > 0 && /\d/.test(text[end] ?? '')) end = index + partial;
      }
    }
    if (end <= index) end = Math.min(text.length, index + CHUNK);
    out.push(text.slice(index, end));
    index = end;
  }
  return out;
}

export function translatedText(result: unknown): string {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (typeof result !== 'object') return '';
  const row = result as Record<string, unknown>;
  if (typeof row.translated_text === 'string') return row.translated_text;
  const inner = row.result;
  if (inner && typeof inner === 'object') {
    const nested = (inner as Record<string, unknown>).translated_text;
    if (typeof nested === 'string') return nested;
  }
  return '';
}

/** Reject empty output, commentary, and translations that drop a number or stay in the source language. */
export function acceptModelOutput(source: string, output: string, target: ModelLang): string | null {
  const clean = normalizeLiveText(output);
  if (!clean) return null;
  if (/^(translation|translated text|disclaimer)\s*[:：]/i.test(clean)) return null;
  if (/^(譯文|译文|翻譯如下|翻译如下|以下是翻譯|以下是翻译)/.test(clean)) return null;
  if (/\b(as an ai|language model)\b/i.test(clean)) return null;
  if (clean.length > source.length * 4 + 120) return null;
  if (!keepsNumbers(source, clean)) return null;
  if (target === 'en' && hasChinese(clean) && !isMostlyEnglish(clean)) return null;
  if (target === 'zh' && !hasChinese(clean)) return null;
  return clean;
}

export function applyScript(text: string, ui: UiLang): string {
  if (ui === 'zh-HK') return toHK(text);
  if (ui === 'zh-CN') return toCN(text);
  return text;
}

export interface TranslateDeps {
  run?: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  cache?: Cache | null;
  /** Test override. Production uses TRANSLATE_DAILY_CALLS. */
  dailyLimit?: number;
}

export interface TranslateBatch {
  translations: string[];
  /** False when a model call failed or the daily allowance was used up. The original string is returned. */
  final: boolean[];
}

const memory = new Map<string, string>();
const memoryOrder: string[] = [];
const inflight = new Map<string, Promise<string | null>>();
const failedUntil = new Map<string, number>();
let budgetDay = '';
let budgetUsed = 0;

const MEMORY_MAX = 2000;

export function resetLiveTranslateCache(): void {
  memory.clear();
  memoryOrder.length = 0;
  inflight.clear();
  failedUntil.clear();
  budgetDay = '';
  budgetUsed = 0;
}

function remember(key: string, value: string): void {
  if (!memory.has(key)) memoryOrder.push(key);
  memory.set(key, value);
  while (memoryOrder.length > MEMORY_MAX) {
    const drop = memoryOrder.shift();
    if (drop) memory.delete(drop);
  }
}

function edgeRequest(key: string): Request {
  return new Request(`https://world-news.xyz/tr-cache/${encodeURIComponent(key)}`);
}

async function readCached(cache: Cache | null | undefined, key: string): Promise<string | null> {
  const hit = memory.get(key);
  if (hit != null) return hit;
  if (!cache) return null;
  try {
    const response = await cache.match(edgeRequest(key));
    if (!response) return null;
    const text = await response.text();
    remember(key, text);
    return text;
  } catch {
    return null;
  }
}

async function writeCached(cache: Cache | null | undefined, key: string, value: string): Promise<void> {
  remember(key, value);
  if (!cache) return;
  try {
    await cache.put(edgeRequest(key), new Response(value, {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=2592000' },
    }));
  } catch {
    /* the in-memory copy still serves this isolate */
  }
}

async function cacheId(label: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${label}\n${text}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  let hex = '';
  for (const byte of new Uint8Array(buf)) hex += byte.toString(16).padStart(2, '0');
  return `${label}:${hex.slice(0, 40)}`;
}

async function takeBudget(cache: Cache | null | undefined, limit: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `budget:${day}`;
  if (budgetDay !== day) {
    budgetDay = day;
    budgetUsed = Number(await readCached(cache, key) || '0') || 0;
  }
  if (budgetUsed >= limit) return false;
  budgetUsed += 1;
  await writeCached(cache, key, String(budgetUsed));
  return true;
}

async function callModel(
  text: string,
  source: ModelLang,
  target: ModelLang,
  run: NonNullable<TranslateDeps['run']>,
): Promise<string | null> {
  try {
    const result = await run(TRANSLATE_MODEL, {
      text,
      source_lang: source,
      target_lang: target,
    });
    return acceptModelOutput(text, translatedText(result), target);
  } catch {
    return null;
  }
}

async function modelTranslate(
  text: string,
  source: ModelLang,
  target: ModelLang,
  deps: TranslateDeps,
): Promise<string | null> {
  const key = await cacheId(`m2m:${source}:${target}`, text);
  const cached = await readCached(deps.cache, key);
  if (cached != null) return cached;
  if ((failedUntil.get(key) ?? 0) > Date.now()) return null;
  if (!deps.run) return null;
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      if (!(await takeBudget(deps.cache, deps.dailyLimit ?? TRANSLATE_DAILY_CALLS))) return null;
      const output = await callModel(text, source, target, deps.run!);
      if (output == null) {
        failedUntil.set(key, Date.now() + 60_000);
        return null;
      }
      await writeCached(deps.cache, key, output);
      return output;
    })().finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, pending);
  }
  return pending;
}

async function translateOne(plan: TranslatePlan, ui: UiLang, deps: TranslateDeps): Promise<{ text: string; final: boolean }> {
  if (plan.kind === 'keep') return { text: plan.text, final: true };
  if (plan.kind === 'script') return { text: plan.text, final: true };
  const parts = chunksForModel(plan.text).slice(0, MAX_CHUNKS);
  const tail = chunksForModel(plan.text).slice(MAX_CHUNKS).join('');
  const out: string[] = [];
  for (const chunk of parts) {
    const raw = await modelTranslate(chunk, plan.source, plan.target, deps);
    if (raw == null) return { text: plan.text, final: false };
    out.push(applyScript(raw, ui));
  }
  if (tail) return { text: `${out.join('')}${tail}`, final: false };
  return { text: out.join(''), final: true };
}

export async function translateAll(texts: string[], ui: UiLang, deps: TranslateDeps = {}): Promise<TranslateBatch> {
  const plans = texts.map((text) => planTranslation(String(text ?? ''), ui));
  const translations = plans.map((plan) => (plan.kind === 'model' ? plan.text : plan.text));
  const final = plans.map((plan) => plan.kind !== 'model');
  const jobs = new Map<string, Promise<{ text: string; final: boolean }>>();
  await Promise.all(plans.map(async (plan, index) => {
    if (plan.kind !== 'model') {
      translations[index] = plan.text;
      return;
    }
    const id = `${plan.source}:${plan.target}:${plan.text}`;
    let job = jobs.get(id);
    if (!job) {
      job = translateOne(plan, ui, deps);
      jobs.set(id, job);
    }
    const result = await job;
    translations[index] = result.text;
    final[index] = result.final;
  }));
  return { translations, final };
}

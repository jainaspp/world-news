import { AI_MODEL, textFromAi } from '../../shared/content.js';
import {
  FOCUS_BATCH,
  focusBody,
  focusKey,
  focusPages,
  focusPrompt,
  focusSatisfied,
  itemsForFocus,
  type FocusPage,
} from '../../shared/focus.js';
import { GROK_MODEL, capReached, columnDelivery, hktMonth, materialFromBoard, parseUsage, usageKey, withArticle, withTokens, writerFor } from '../../shared/grok.js';
import { readBoard } from '../board/store.js';
import { readValue, writeValue, type ContentEnv } from './store.js';
import { completeText } from './xai.js';

function apiKey(env: ContentEnv): string {
  return typeof env.XAI_API_KEY === 'string' ? env.XAI_API_KEY.trim() : '';
}

async function workersText(env: ContentEnv, system: string, user: string): Promise<string> {
  if (!env.AI?.run) return '';
  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 900,
    });
    return textFromAi(result);
  } catch {
    return '';
  }
}

async function writeIntro(env: ContentEnv, page: FocusPage, text: string, model: string, now: Date): Promise<void> {
  await writeValue(env, focusKey(page, now), JSON.stringify({ text, model, at: now.getTime() }));
}

/** One small batch of region and category intros. Reads the cached board and never crawls feeds. */
export async function generateFocus(
  env: ContentEnv,
  limit = FOCUS_BATCH,
  now = new Date(),
  options: { force?: boolean; scope?: string; id?: string } = {},
): Promise<Record<string, unknown>> {
  const take = Math.max(1, Math.min(FOCUS_BATCH, limit));
  const board = await readBoard(env).catch(() => null);
  const material = materialFromBoard(board);
  if (!material) return { ...columnDelivery({ cold: true }), kind: 'focus', keys: [] };

  const month = hktMonth(now);
  let usage = parseUsage(await readValue(env, usageKey(month)).catch(() => null), month);
  const key = apiKey(env);
  const capped = capReached(usage) || !key;
  const pages = focusPages();
  const stored = await Promise.all(pages.map((page) => readValue(env, focusKey(page, now)).catch(() => null)));
  const pending = pages.filter((page, index) => {
    if (options.scope && page.scope !== options.scope) return false;
    if (options.id && page.id !== options.id) return false;
    if (itemsForFocus(material.items, page, now).length < 3) return false;
    if (options.force) return true;
    return !focusSatisfied(stored[index] ?? null, capped);
  });
  if (!pending.length) return { ...columnDelivery({ skipped: 'done' }), kind: 'focus', keys: [], skipped: 'done' };

  const batch = pending.slice(0, take);
  const written: string[] = [];
  const models: string[] = [];
  const docs: { mode: string; model?: string; chars?: number }[] = [];
  let input = 0;
  let output = 0;
  let requests = 0;

  await Promise.all(batch.map(async (page) => {
    const rows = itemsForFocus(material.items, page, now);
    const prompt = focusPrompt(page, rows);
    let text = '';
    let model = '';
    if (writerFor({ costUsd: usage.costUsd, hasKey: Boolean(key) }) === 'grok') {
      const result = await completeText(key, prompt.system, prompt.user, 900);
      input += result.input;
      output += result.output;
      if (result.status) requests += 1;
      const body = focusBody(result.text);
      if (body) {
        text = body;
        model = GROK_MODEL;
      }
    }
    if (!text && capped) {
      const body = focusBody(await workersText(env, prompt.system, prompt.user));
      if (body) {
        text = body;
        model = AI_MODEL;
      }
    }
    if (!text || !model) {
      docs.push({ mode: 'sources', chars: 0 });
      return;
    }
    await writeIntro(env, page, text, model, now);
    written.push(focusKey(page, now));
    models.push(model);
    docs.push({ mode: 'ai', model, chars: 500 });
  }));

  if (requests) usage = withTokens(usage, input, output, requests);
  for (const model of models) usage = withArticle(usage, model.includes('grok') ? 'grok' : 'workers', 'focus');
  if (requests || models.length) await writeValue(env, usageKey(month), JSON.stringify(usage));

  const delivery = columnDelivery({
    capped,
    docs: docs.map((doc) => ({ ...doc, chars: doc.mode === 'ai' ? 500 : 0 })),
  });
  return { ...delivery, kind: 'focus', keys: written, models };
}

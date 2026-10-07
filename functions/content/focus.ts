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
import { GROK_MODEL, capReached, columnDelivery, materialFromBoard, withArticle, withTokens, writerFor } from '../../shared/grok.js';
import { monthUsage, saveUsage } from './usage.js';
import { focusWriter } from '../../shared/writers.js';
import { readBoard } from '../board/store.js';
import { readValue, writeValue, type ContentEnv } from './store.js';
import { completeMiniMax } from './minimax.js';
import { completeText } from './xai.js';

function apiKey(env: ContentEnv): string {
  return typeof env.XAI_API_KEY === 'string' ? env.XAI_API_KEY.trim() : '';
}

function minimaxKey(env: ContentEnv): string {
  return typeof env.MINIMAX_API_KEY === 'string' ? env.MINIMAX_API_KEY.trim() : '';
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

async function writeIntro(env: ContentEnv, page: FocusPage, text: string, model: string, provider: 'grok' | 'minimax' | 'workers-ai', now: Date): Promise<void> {
  await writeValue(env, focusKey(page, now), JSON.stringify({ text, model, provider, at: now.getTime() }));
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

  let usage = await monthUsage(env, now);
  const key = apiKey(env);
  const mini = minimaxKey(env);
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
  const providers: string[] = [];
  const docs: { mode: string; model?: string; provider?: string; chars?: number }[] = [];
  let input = 0;
  let output = 0;
  let requests = 0;

  await Promise.all(batch.map(async (page) => {
    const rows = itemsForFocus(material.items, page, now);
    const prompt = focusPrompt(page, rows);
    const writer = focusWriter(page);
    let text = '';
    let model = '';
    let provider: 'grok' | 'minimax' | 'workers-ai' | '' = '';
    if (writer === 'minimax' && mini) {
      const result = await completeMiniMax(mini, prompt.system, prompt.user);
      const body = focusBody(result.text);
      if (body) {
        text = body;
        model = result.model;
        provider = 'minimax';
      }
    }
    const grokOpen = writerFor({ costUsd: usage.costUsd, hasKey: Boolean(key) }) === 'grok';
    if (!text && grokOpen && (writer === 'grok' || writer === 'minimax')) {
      const result = await completeText(key, prompt.system, prompt.user, 900);
      input += result.input;
      output += result.output;
      if (result.status) requests += 1;
      const body = focusBody(result.text);
      if (body) {
        text = body;
        model = GROK_MODEL;
        provider = 'grok';
      }
    }
    if (!text && (capped || writer === 'minimax')) {
      const body = focusBody(await workersText(env, prompt.system, prompt.user));
      if (body) {
        text = body;
        model = AI_MODEL;
        provider = 'workers-ai';
      }
    }
    if (!text || !model || !provider) {
      docs.push({ mode: 'sources', chars: 0 });
      return;
    }
    await writeIntro(env, page, text, model, provider, now);
    written.push(focusKey(page, now));
    models.push(model);
    providers.push(provider);
    docs.push({ mode: 'ai', model, provider, chars: 500 });
  }));

  if (requests) usage = withTokens(usage, input, output, requests);
  for (const provider of providers) {
    usage = withArticle(usage, provider === 'minimax' ? 'minimax' : provider === 'grok' ? 'grok' : 'workers', 'focus');
  }
  if (requests || models.length) await saveUsage(env, usage);

  const delivery = columnDelivery({
    capped,
    docs: docs.map((doc) => ({ ...doc, chars: doc.mode === 'ai' ? 500 : 0 })),
  });
  return { ...delivery, kind: 'focus', keys: written, models, providers };
}

import { AI_MODEL, textFromAi } from '../../shared/content.js';
import { materialFromBoard } from '../../shared/grok.js';
import {
  parseQuiz,
  pickQuizSources,
  quizEdition,
  quizKey,
  quizPrompt,
  type QuizDoc,
} from '../../shared/quiz.js';
import type { NewsItem } from '../../shared/types.js';
import type { PagesContext } from '../env.js';
import { readBoard } from '../board/store.js';
import { putLimited, readValue, type ContentEnv } from './store.js';

const KEEP_S = 3 * 24 * 3600;

async function headlines(env: ContentEnv, requestUrl: string): Promise<NewsItem[]> {
  const material = materialFromBoard(await readBoard(env).catch(() => null));
  if (material && material.items.length >= 3) return material.items;
  try {
    const response = await fetch(new URL('/api/news', requestUrl), { headers: { accept: 'application/json' } });
    if (!response.ok) return material?.items ?? [];
    const payload = await response.json() as { items?: NewsItem[] };
    return Array.isArray(payload.items) ? payload.items : (material?.items ?? []);
  } catch {
    return material?.items ?? [];
  }
}

async function ask(env: ContentEnv, sources: ReturnType<typeof pickQuizSources>): Promise<string> {
  if (!env.AI?.run) return '';
  const prompt = quizPrompt(sources);
  const result = await env.AI.run(AI_MODEL, {
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    max_tokens: 1400,
  });
  return textFromAi(result);
}

/** One Workers AI pass (plus a single retry if nothing validated). At most one KV put. */
export async function generateQuiz(context: PagesContext): Promise<Response> {
  const env = context.env as ContentEnv;
  const header = context.request.headers.get('x-generate-secret');
  const secret = typeof env.GENERATE_SECRET === 'string' ? env.GENERATE_SECRET : '';
  if (!secret || header !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  const now = new Date();
  const edition = quizEdition(now);
  const key = quizKey(edition);
  try {
    const existing = await readValue(env, key);
    if (existing) {
      return Response.json({ ok: true, kind: 'quiz', edition, skipped: 'exists' }, { headers: { 'cache-control': 'no-store' } });
    }
    const sources = pickQuizSources(await headlines(env, context.request.url), now.getTime());
    if (sources.length < 3) {
      return Response.json({ ok: false, kind: 'quiz', edition, skipped: 'none' }, { headers: { 'cache-control': 'no-store' } });
    }
    if (!env.AI?.run) {
      return Response.json({ ok: false, kind: 'quiz', edition, skipped: 'no-ai' }, { headers: { 'cache-control': 'no-store' } });
    }
    let questions = parseQuiz(await ask(env, sources), sources);
    if (!questions.length) questions = parseQuiz(await ask(env, sources), sources);
    if (!questions.length) {
      return Response.json({ ok: false, kind: 'quiz', edition, skipped: 'invalid' }, { headers: { 'cache-control': 'no-store' } });
    }
    const doc: QuizDoc = { edition, generatedAt: now.toISOString(), questions };
    const stored = await putLimited(env, key, JSON.stringify(doc), KEEP_S);
    if (stored !== 'ok') {
      return Response.json({ ok: false, kind: 'quiz', edition, stored, count: questions.length }, { headers: { 'cache-control': 'no-store' } });
    }
    return Response.json({ ok: true, kind: 'quiz', edition, count: questions.length, stored }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`quiz skipped: ${message}`);
    return Response.json({ ok: false, kind: 'quiz', edition, error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}

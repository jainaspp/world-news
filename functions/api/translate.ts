import { sameOrigin } from '../../shared/contact.js';
import { translateAll, type TranslateDeps } from '../../shared/liveTranslate.js';
import type { UiLang } from '../../shared/zh.js';
import { edgeCache, type PagesContext } from '../env.js';

const MAX_TEXTS = 40;
const MAX_TEXT = 20_000;
const MAX_BODY = 300_000;

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

function exactLang(raw: unknown): UiLang | null {
  if (raw === 'zh-HK' || raw === 'zh-CN' || raw === 'en') return raw;
  return null;
}

/**
 * Translate the strings a reader is looking at.
 * Workers AI only, then the edge cache. Never the paid writing route.
 */
export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;
  if (request.method !== 'POST') return json({ error: 'method' }, 405, { allow: 'POST' });
  if (!sameOrigin(request.url, request.headers.get('origin'))) return json({ error: 'origin' }, 403);

  const length = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(length) && length > MAX_BODY) return json({ error: 'size' }, 400);
  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'size' }, 400);
    payload = JSON.parse(raw) as unknown;
  } catch {
    return json({ error: 'json' }, 400);
  }
  const body = payload as { target?: unknown; texts?: unknown };
  const target = exactLang(body?.target);
  if (!target) return json({ error: 'lang' }, 400);
  if (!Array.isArray(body?.texts) || body.texts.length > MAX_TEXTS) return json({ error: 'texts' }, 400);
  const texts: string[] = [];
  for (const item of body.texts) {
    if (typeof item !== 'string' || item.length > MAX_TEXT) return json({ error: 'texts' }, 400);
    texts.push(item);
  }

  const ai = context.env.AI as { run?: TranslateDeps['run'] } | undefined;
  const result = await translateAll(texts, target, {
    run: ai?.run ? (model, input) => ai.run!(model, input) : undefined,
    cache: edgeCache(),
  });
  return json(result, 200);
}

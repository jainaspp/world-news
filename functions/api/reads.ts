import { readValue, writeValue, type ContentEnv } from '../content/store.js';
import { clientIp, emptyBook, hashIp, hktDay, isBot, isStoryId, recordRead, type ReadBook } from '../../shared/reads.js';
import type { PagesContext } from '../env.js';

function bookKey(day: string): string {
  return `reads:${day}`;
}

async function loadBook(env: ContentEnv, day: string): Promise<ReadBook> {
  const raw = await readValue(env, bookKey(day));
  if (!raw) return emptyBook();
  try {
    const parsed = JSON.parse(raw) as ReadBook;
    if (!parsed || typeof parsed !== 'object' || !parsed.counts || !parsed.seen) return emptyBook();
    return parsed;
  } catch {
    return emptyBook();
  }
}

function sameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** POST /api/reads: one private click on a story. No third-party tracker. */
export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST', 'cache-control': 'no-store' } });
  }
  const headers = { 'cache-control': 'no-store' };
  if (!sameSite(context.request) || isBot(context.request.headers.get('user-agent'))) {
    return new Response(null, { status: 204, headers });
  }
  let id = '';
  try {
    const text = await context.request.text();
    if (text.length > 200) return new Response(null, { status: 400, headers });
    const body = JSON.parse(text) as { id?: unknown };
    id = typeof body.id === 'string' ? body.id : '';
  } catch {
    return new Response(null, { status: 400, headers });
  }
  if (!isStoryId(id)) return new Response(null, { status: 400, headers });

  const env = context.env as ContentEnv;
  const day = hktDay();
  const ipHash = await hashIp(clientIp(context.request.headers), day);
  const current = await loadBook(env, day);
  const next = recordRead(current, ipHash, id);
  if (next.counted) await writeValue(env, bookKey(day), JSON.stringify(next.book));
  return new Response(null, { status: 204, headers });
}

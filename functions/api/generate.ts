import type { PagesContext } from '../env.js';
import { warmColumns } from '../content/columns.js';
import { warm } from '../content/publish.js';
import { kvWritesBlocked, writeValue, type ContentEnv } from '../content/store.js';
import { withUsageBatch } from '../content/usage.js';

/**
 * Before paid generation, check that KV still takes writes. The probe value changes once an hour,
 * so it costs at most one put per hour. When the daily put limit is hit, nothing is generated:
 * a piece that cannot be stored would be paid for again on the next run.
 */
async function storageReady(env: ContentEnv): Promise<boolean> {
  if (!env.CONTENT) return true;
  if (await kvWritesBlocked()) return false;
  const hour = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 13);
  await writeValue(env, 'kv-probe', hour);
  return !(await kvWritesBlocked());
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return Response.json({ error: 'method' }, { status: 405, headers: { 'cache-control': 'no-store' } });
  }
  const env = context.env as ContentEnv;
  const kind = new URL(context.request.url).searchParams.get('kind');
  const secret = typeof env.GENERATE_SECRET === 'string' ? env.GENERATE_SECRET : '';
  const authorized = Boolean(secret) && context.request.headers.get('x-generate-secret') === secret;
  if (authorized && kind !== 'status' && !(await storageReady(env))) {
    // 200 without "fallback" so the warm workflow neither retries nor fails (no repeated runs or emails).
    return Response.json(
      { ok: true, skipped: 'kv-limit', keys: [], note: 'Workers KV daily put limit reached; generation skipped until 00:00 UTC.' },
      { headers: { 'cache-control': 'no-store' } },
    );
  }
  return withUsageBatch(env, () => {
    if (kind === 'briefing' || kind === 'compare' || kind === 'explainer' || kind === 'status' || kind === 'focus' || kind === 'topic') return warmColumns(context);
    return warm(context);
  });
}

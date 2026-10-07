import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { angleClusters } from '../../shared/angles.js';
import { hktParts } from '../../shared/content.js';
import { materialFromBoard } from '../../shared/grok.js';
import { buildToday, onHktDate, parseTodayPath, renderToday, renderTodayMissing } from '../../shared/todayPage.js';
import { readBoard } from '../board/store.js';
import { readIndex, type ContentEnv } from '../content/store.js';
import type { PagesContext } from '../env.js';

const HTML = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=120, s-maxage=300',
};

function siteUrl(env: ContentEnv): string {
  const configured = env.VITE_SITE_URL;
  return typeof configured === 'string' && configured.startsWith('https://') ? configured.replace(/\/$/, '') : 'https://world-news.xyz';
}

/** /today/ and /today/YYYY-MM-DD/ plus a region or category archive. No model call. */
export async function onRequest(context: PagesContext): Promise<Response> {
  applyRuntimeEnv(context.env);
  const env = context.env as ContentEnv;
  const url = new URL(context.request.url);
  const parsed = parseTodayPath(url.pathname);
  if (!parsed.ok) {
    return new Response(renderTodayMissing(), { status: 404, headers: { ...HTML, 'cache-control': 'no-store' } });
  }
  const today = hktParts(new Date()).date;
  const date = parsed.date || today;
  const board = await readBoard(env).catch(() => null);
  const material = materialFromBoard(board);
  const items = (material?.items ?? []).filter((item) => onHktDate(item, date));
  const clusters = angleClusters(items);
  const index = await readIndex(env, 'compare').catch(() => []);
  const explainers = index
    .filter((entry) => entry.key.startsWith(date))
    .map((entry) => ({ key: entry.key, title: entry.title }));
  const model = buildToday({
    clusters,
    date,
    explainers,
    ...(parsed.region ? { region: parsed.region } : {}),
    ...(parsed.category ? { category: parsed.category } : {}),
    today: date === today,
  });
  const canonical = `${siteUrl(env)}/today/${date}/`;
  return new Response(renderToday(model, canonical), { headers: HTML });
}

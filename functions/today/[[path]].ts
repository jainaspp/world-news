import { applyRuntimeEnv } from '../../server/runtimeEnv.js';
import { angleClusters } from '../../shared/angles.js';
import { hktParts } from '../../shared/content.js';
import { materialFromBoard } from '../../shared/grok.js';
import {
  buildToday,
  onHktDate,
  parseTodayPath,
  renderToday,
  renderTodayMissing,
  TODAY_FALLBACK_UNTIL_HOUR,
  TODAY_INDEX_FLOOR,
  todayNotice,
} from '../../shared/todayPage.js';
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
  const now = new Date();
  const { date: today, hour } = hktParts(now);
  const board = await readBoard(env).catch(() => null);
  const material = materialFromBoard(board);
  const index = await readIndex(env, 'compare').catch(() => []);
  const build = (date: string) => buildToday({
    clusters: angleClusters((material?.items ?? []).filter((item) => onHktDate(item, date))),
    date,
    explainers: index
      .filter((entry) => entry.key.startsWith(date))
      .map((entry) => ({ key: entry.key, title: entry.title })),
    ...(parsed.region ? { region: parsed.region } : {}),
    ...(parsed.category ? { category: parsed.category } : {}),
    today: date === today,
  });
  let date = parsed.date || today;
  let model = build(date);
  // Overnight the new day has only a few multi-outlet stories: plain /today/ shows the previous day
  // until 07:00 HKT, with a link to today's page. After that it shows today, linking yesterday.
  if (!parsed.date && model.stories.length < TODAY_INDEX_FLOOR) {
    const yesterday = hktParts(new Date(now.getTime() - 24 * 60 * 60 * 1000)).date;
    const previous = build(yesterday);
    if (previous.stories.length > model.stories.length) {
      if (hour < TODAY_FALLBACK_UNTIL_HOUR) {
        previous.notice = todayNotice('previous', today, model.stories.length);
        date = yesterday;
        model = previous;
      } else {
        model.notice = todayNotice('thin', yesterday, model.stories.length);
      }
    }
  }
  const canonical = `${siteUrl(env)}/today/${date}/`;
  return new Response(renderToday(model, canonical), { headers: HTML });
}

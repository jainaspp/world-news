import type { IncomingMessage, ServerResponse } from 'node:http';
import { getNews } from '../server/newsService.js';

function unavailable() {
  return {
    items: [],
    fetchedAt: new Date().toISOString(),
    source: 'rss' as const,
    feedErrors: 0,
    stale: false,
    error: '所有新聞來源暫時沒有回應',
  };
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const payload = await getNews();
    const status = payload.items.length > 0 ? 200 : 503;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.end(JSON.stringify(payload));
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(unavailable()));
  }
}

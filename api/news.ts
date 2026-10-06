import type { IncomingMessage, ServerResponse } from 'node:http';
import { getNews } from '../server/newsService';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const payload = await getNews();
  const status = payload.items.length > 0 ? 200 : 503;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.end(JSON.stringify(payload));
}

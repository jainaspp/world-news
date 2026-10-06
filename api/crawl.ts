import type { IncomingMessage, ServerResponse } from 'node:http';
import { isCronAuthorized } from '../server/auth';
import { loadFeeds } from '../server/loadFeeds';
import { clearNewsCache } from '../server/newsService';
import { storeNews } from '../server/supabase';

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }
  const header = req.headers.authorization;
  if (!isCronAuthorized(typeof header === 'string' ? header : undefined)) {
    send(res, 401, { error: 'Unauthorized' });
    return;
  }

  const { items, errors } = await loadFeeds();
  const saved = await storeNews(items);
  if ('error' in saved) {
    const status = saved.error.includes('not set') ? 503 : 502;
    send(res, status, { fetched: items.length, feedErrors: errors, ...saved });
    return;
  }
  clearNewsCache();
  send(res, 200, { fetched: items.length, feedErrors: errors, stored: saved.stored });
}

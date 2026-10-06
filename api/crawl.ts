import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildCrawlResponse } from '../server/responses.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const header = req.headers.authorization;
  const result = await buildCrawlResponse(req.method, typeof header === 'string' ? header : undefined);
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', result.cacheControl);
  res.end(result.body);
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildNewsResponse } from '../server/responses.js';

function send(res: ServerResponse, status: number, body: string, cacheControl: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.end(body);
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const result = await buildNewsResponse();
  send(res, result.status, result.body, result.cacheControl);
}

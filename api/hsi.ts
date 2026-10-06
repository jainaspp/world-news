import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadHsiQuote } from '../server/hsiService.js';

/** Vercel twin of functions/api/hsi.ts. The live site is Cloudflare Pages. */
export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const quote = await loadHsiQuote();
  const ok = quote != null;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', ok ? 'public, max-age=300, s-maxage=600' : 'public, max-age=30');
  res.end(JSON.stringify(ok ? quote : { price: null, change: null, changePercent: null }));
}

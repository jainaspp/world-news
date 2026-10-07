import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { onRequest as alertsApi } from './functions/api/alerts';
import { onRequest as clustersApi } from './functions/api/clusters';
import { onRequest as majorApi } from './functions/api/major';
import { onRequest as marketsApi } from './functions/api/markets';
import { onRequest as popularApi } from './functions/api/popular';
import { onRequest as readsApi } from './functions/api/reads';
import { onRequest as majorPage } from './functions/major/index';
import type { PagesContext } from './functions/env';
import { loadHkNow } from './server/hkService';
import { loadHsiQuote } from './server/hsiService';
import { buildCrawlResponse, buildNewsResponse, type JsonResult } from './server/responses';

function send(res: ServerResponse, result: JsonResult) {
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', result.cacheControl);
  res.end(result.body);
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  const method = req.method || 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks);
  const host = headers.get('host') || '127.0.0.1:5173';
  return new Request(`http://${host}${req.url || '/'}`, { method, headers, body });
}

function pagesContext(request: Request): PagesContext {
  return { request, env: {}, waitUntil() {}, next: async () => new Response(null, { status: 404 }) };
}

async function forward(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

function attach(middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) {
  middlewares.use((req, res, next) => {
    const url = req.url ?? '';
    const handled = url.startsWith('/api/news') || url.startsWith('/api/crawl') || url.startsWith('/api/hsi') || url.startsWith('/api/hk')
      || url.startsWith('/api/markets') || url.startsWith('/api/alerts') || url.startsWith('/api/clusters')
      || url.startsWith('/api/major') || url.startsWith('/api/reads') || url.startsWith('/api/popular') || url.startsWith('/major');
    if (!handled) {
      next();
      return;
    }
    void (async () => {
      try {
        if (url.startsWith('/api/hk')) {
          const hk = await loadHkNow();
          send(res, {
            status: 200,
            body: JSON.stringify(hk ?? { temperature: null, humidity: null, icon: null, warnings: [], rainMax: 0, aqhi: null, updated: '', source: '香港天文台、環境保護署' }),
            cacheControl: hk ? 'public, max-age=300' : 'public, max-age=30',
          });
          return;
        }
        if (url.startsWith('/api/hsi')) {
          const quote = await loadHsiQuote();
          send(res, {
            status: 200,
            body: JSON.stringify(quote ?? { price: null, change: null, changePercent: null }),
            cacheControl: quote ? 'public, max-age=300' : 'public, max-age=30',
          });
          return;
        }
        if (url.startsWith('/api/news')) {
          send(res, await buildNewsResponse());
          return;
        }
        const request = await toWebRequest(req);
        const context = pagesContext(request);
        if (url.startsWith('/api/markets')) { await forward(res, await marketsApi(context)); return; }
        if (url.startsWith('/api/alerts')) { await forward(res, await alertsApi(context)); return; }
        if (url.startsWith('/api/clusters')) { await forward(res, await clustersApi(context)); return; }
        if (url.startsWith('/api/major')) { await forward(res, await majorApi(context)); return; }
        if (url.startsWith('/api/reads')) { await forward(res, await readsApi(context)); return; }
        if (url.startsWith('/api/popular')) { await forward(res, await popularApi(context)); return; }
        if (url.startsWith('/major')) { await forward(res, await majorPage(context)); return; }
        const header = req.headers.authorization;
        send(res, await buildCrawlResponse(req.method, typeof header === 'string' ? header : undefined));
      } catch {
        send(res, {
          status: 503,
          body: JSON.stringify({ items: [], error: 'unavailable', feedErrors: 0, stale: false, source: 'rss', fetchedAt: new Date().toISOString() }),
          cacheControl: 'no-store',
        });
      }
    })();
  });
}

function localApi(): Plugin {
  return {
    name: 'local-news-api',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

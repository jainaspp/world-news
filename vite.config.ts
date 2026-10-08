import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { onRequest as alertsApi } from './functions/api/alerts';
import { onRequest as boardApi } from './functions/api/board';
import { onRequest as clustersApi } from './functions/api/clusters';
import { onRequest as majorApi } from './functions/api/major';
import { onRequest as marketsApi } from './functions/api/markets';
import { onRequest as popularApi } from './functions/api/popular';
import { onRequest as readsApi } from './functions/api/reads';
import { onRequest as dataPage } from './functions/data/[[path]]';
import { onRequest as majorPage } from './functions/major/index';
import { onRequest as searchPage } from './functions/search/index';
import { onRequest as savedPage } from './functions/saved/index';
import { onRequest as quizPage } from './functions/quiz/index';
import { onRequest as feedPage } from './functions/feed.xml';
import { onRequest as searchIndexApi } from './functions/api/search-index';
import { onRequest as subscribeApi } from './functions/api/subscribe';
import { onRequest as briefingPage } from './functions/briefing/[slot]';
import { onRequest as briefingIndex } from './functions/briefing/index';
import type { PagesContext } from './functions/env';
import { previewSeed } from './shared/readerSample';
import { loadHkBundle } from './server/hkService';
import { emptyHkNow } from './shared/hk';
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

function memoryKv(seed: Record<string, string>) {
  const map = new Map(Object.entries(seed));
  return {
    async get(key: string) { return map.get(key) ?? null; },
    async put(key: string, value: string) { map.set(key, value); },
  };
}

const previewContent = memoryKv(previewSeed());

function pagesContext(request: Request): PagesContext {
  return {
    request,
    env: {
      CONTENT: previewContent,
      TELEGRAM_CHANNEL_URL: 'https://t.me/world_news_channel_forever',
    },
    waitUntil() {},
    next: async () => new Response(null, { status: 404 }),
  };
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
      || url.startsWith('/api/markets') || url.startsWith('/api/alerts') || url.startsWith('/api/board') || url.startsWith('/api/clusters')
      || url.startsWith('/api/major') || url.startsWith('/api/reads') || url.startsWith('/api/popular') || url.startsWith('/api/search-index')
      || url.startsWith('/api/subscribe') || url.startsWith('/major')
      || url.startsWith('/data') || url.startsWith('/search') || url.startsWith('/saved') || url.startsWith('/quiz')
      || url.startsWith('/feed.xml') || url.startsWith('/briefing');
    if (!handled) {
      next();
      return;
    }
    void (async () => {
      try {
        if (url.startsWith('/api/hk')) {
          const hk = await loadHkBundle();
          send(res, {
            status: 200,
            body: JSON.stringify(hk ?? emptyHkNow()),
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
        if (url.startsWith('/api/board')) { await forward(res, await boardApi(context)); return; }
        if (url.startsWith('/api/markets')) { await forward(res, await marketsApi(context)); return; }
        if (url.startsWith('/api/alerts')) { await forward(res, await alertsApi(context)); return; }
        if (url.startsWith('/api/clusters')) { await forward(res, await clustersApi(context)); return; }
        if (url.startsWith('/api/major')) { await forward(res, await majorApi(context)); return; }
        if (url.startsWith('/api/reads')) { await forward(res, await readsApi(context)); return; }
        if (url.startsWith('/api/popular')) { await forward(res, await popularApi(context)); return; }
        if (url.startsWith('/major')) { await forward(res, await majorPage(context)); return; }
        if (url.startsWith('/data')) { await forward(res, await dataPage(context)); return; }
        if (url.startsWith('/api/search-index')) { await forward(res, await searchIndexApi(context)); return; }
        if (url.startsWith('/api/subscribe')) { await forward(res, await subscribeApi(context)); return; }
        if (url.startsWith('/search')) { await forward(res, await searchPage(context)); return; }
        if (url.startsWith('/saved')) { await forward(res, await savedPage(context)); return; }
        if (url.startsWith('/quiz')) { await forward(res, await quizPage(context)); return; }
        if (url.startsWith('/feed.xml')) { await forward(res, await feedPage(context)); return; }
        if (url.startsWith('/briefing')) {
          const path = url.split('?')[0] || '';
          const leaf = path.replace(/\/+$/, '').split('/').filter(Boolean);
          await forward(res, leaf.length > 1 ? await briefingPage(context) : await briefingIndex(context));
          return;
        }
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

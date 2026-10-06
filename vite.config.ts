import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { loadHsiQuote } from './server/hsiService';
import { buildCrawlResponse, buildNewsResponse, type JsonResult } from './server/responses';

function send(res: ServerResponse, result: JsonResult) {
  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', result.cacheControl);
  res.end(result.body);
}

function attach(middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) {
  middlewares.use((req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/news') && !url.startsWith('/api/crawl') && !url.startsWith('/api/hsi')) {
      next();
      return;
    }
    void (async () => {
      try {
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

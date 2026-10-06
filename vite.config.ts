import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';
import { isCronAuthorized } from './server/auth';
import { loadFeeds } from './server/loadFeeds';
import { clearNewsCache, getNews } from './server/newsService';
import { storeNews } from './server/supabase';

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function attach(middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) {
  middlewares.use((req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/news') && !url.startsWith('/api/crawl')) {
      next();
      return;
    }
    void (async () => {
      try {
        if (url.startsWith('/api/news')) {
          const payload = await getNews();
          send(res, payload.items.length > 0 ? 200 : 503, payload);
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
          send(res, saved.error.includes('not set') ? 503 : 502, { fetched: items.length, feedErrors: errors, ...saved });
          return;
        }
        clearNewsCache();
        send(res, 200, { fetched: items.length, feedErrors: errors, stored: saved.stored });
      } catch {
        send(res, 503, { items: [], error: 'unavailable', feedErrors: 0, stale: false, source: 'rss', fetchedAt: new Date().toISOString() });
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
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

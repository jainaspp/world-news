import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PagesContext } from '../functions/env';
import { onRequest, SITEMAP_DOC_CAP } from '../functions/sitemap.xml';

const SHELL = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://world-news.xyz/</loc><priority>1.0</priority></url>
  <url><loc>https://world-news.xyz/region/hkg</loc></url>
  <url><loc>https://world-news.xyz/region/twn</loc></url>
  <url><loc>https://world-news.xyz/digest/</loc></url>
  <url><loc>https://world-news.xyz/digest/2026-10-01-am</loc></url>
  <url><loc>https://world-news.xyz/weekly/</loc></url>
</urlset>
`;

function context(env: PagesContext['env']): PagesContext {
  return {
    request: new Request('https://world-news.xyz/sitemap.xml'),
    env,
    waitUntil() {},
    next: async () => new Response('nope', { status: 500 }),
  };
}

function rejectingStore(shell = SHELL) {
  return {
    ASSETS: {
      async fetch() {
        return new Response(shell);
      },
    },
    CONTENT: {
      async get(): Promise<string | null> {
        throw new Error('kv unavailable');
      },
    },
  };
}

describe('sitemap.xml', () => {
  it('returns 200 XML when every store read rejects, and still omits thin locs', async () => {
    const response = await onRequest(context(rejectingStore()));
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
    expect(xml).toContain('https://world-news.xyz/</loc>');
    expect(xml).toContain('https://world-news.xyz/region/hkg');
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('https://world-news.xyz/digest/');
    expect(xml).not.toContain('/digest/2026-10-01-am');
    expect(xml).not.toContain('/weekly/');
  });

  it('returns the public shell when store reads reject', async () => {
    const shell = readFileSync('public/sitemap.xml', 'utf8');
    const response = await onRequest(context(rejectingStore(shell)));
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(xml).toContain('https://world-news.xyz/</loc>');
    expect(xml).toContain('https://world-news.xyz/region/hkg');
    expect(xml).not.toContain('/region/twn');
    expect(response.headers.get('cache-control')).toContain('max-age=600');
  });

  it('returns 200 shell XML when the merge throws after the shell was read', async () => {
    const env = new Proxy(rejectingStore(SHELL), {
      ownKeys() {
        throw new Error('env exploded');
      },
    });
    const response = await onRequest(context(env));
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toContain('max-age=60');
    expect(xml).toContain('https://world-news.xyz/region/hkg');
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('https://world-news.xyz/digest/</loc>');
    expect(xml).not.toContain('https://world-news.xyz/weekly/</loc>');
  });

  it('returns homepage XML when the asset fetch throws and the store rejects', async () => {
    const response = await onRequest(context({
      ASSETS: {
        fetch() {
          throw new Error('assets down');
        },
      },
      CONTENT: {
        async get(): Promise<string | null> {
          throw new Error('kv unavailable');
        },
      },
    }));
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<urlset');
    expect(xml).toContain('https://world-news.xyz/</loc>');
    expect(xml).not.toContain('/region/hkg');
    expect(xml).not.toContain('/region/twn');
  });

  it('does not read an unbounded briefing index', async () => {
    const calls: string[] = [];
    const rows = Array.from({ length: 200 }, (_, index) => ({
      key: `b${index}`,
      title: '導讀',
      description: '摘要',
      publishedAt: '2026-10-01T00:00:00.000Z',
      sources: 2,
    }));
    const response = await onRequest(context({
      ASSETS: { async fetch() { return new Response(SHELL); } },
      CONTENT: {
        async get(key: string) {
          calls.push(key);
          if (key === 'index:briefing') return JSON.stringify(rows);
          if (key.startsWith('doc:briefing:')) return null;
          throw new Error('kv down');
        },
      },
    }));
    expect(response.status).toBe(200);
    const docs = calls.filter((key) => key.startsWith('doc:briefing:'));
    expect(docs.length).toBe(SITEMAP_DOC_CAP);
    expect(docs.length).toBeLessThan(rows.length);
    const xml = await response.text();
    expect(xml).toContain('https://world-news.xyz/</loc>');
    expect(xml).not.toContain('/briefing/b0');
  });
});

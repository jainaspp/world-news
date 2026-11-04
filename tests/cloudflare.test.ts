import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('Cloudflare Pages', () => {
  it('keeps static files and the real 404 out of the SPA rewrite', () => {
    const redirects = readFileSync('public/_redirects', 'utf8');
    const rules = redirects
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    expect(rules).toEqual([
      '/focus https://world-news.xyz/ 301',
      '/focus/ https://world-news.xyz/ 301',
      '/board https://world-news.xyz/ 301',
      '/board/ https://world-news.xyz/ 301',
      '/story https://world-news.xyz/ 301',
      '/story/ https://world-news.xyz/ 301',
      '/galaxy https://world-news.xyz/civilization/galaxy/ 301',
      '/galaxy/ https://world-news.xyz/civilization/galaxy/ 301',
      '/region/:code / 200',
      '/category/:slug / 200',
    ]);
    expect(redirects).toContain('www.world-news.xyz');
    expect(redirects).not.toMatch(/\/story\/\*/);
    expect(redirects).not.toMatch(/\/\*\s+\/index\.html/);
    expect(redirects).toMatch(/REDIRECT_PAGES_DEV/);

    const headers = readFileSync('public/_headers', 'utf8');
    expect(headers).toMatch(/\/ads\.txt[\s\S]*Content-Type: text\/plain; charset=utf-8/);
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(headers).toContain('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
    expect(headers).toMatch(/\/assets\/\*[\s\S]*Cache-Control: public, max-age=31536000, immutable/);
    expect(headers).toMatch(/\/sw\.js[\s\S]*Cache-Control: no-cache/);

    const wrangler = readFileSync('wrangler.toml', 'utf8');
    expect(wrangler).toMatch(/name = "world-news"/);
    expect(wrangler).toMatch(/pages_build_output_dir = "dist"/);
    expect(wrangler).toContain('nodejs_compat');

    const routes = JSON.parse(readFileSync('public/_routes.json', 'utf8')) as {
      version: number;
      include: string[];
      exclude: string[];
    };
    expect(routes.version).toBe(1);
    expect(routes.include).toEqual(['/*']);
    for (const rule of [
      '/assets/*',
      '/static/*',
      '/brand/*',
      '/icons/*',
      '/index.html',
      '/404.html',
      '/offline.html',
      '/ads.txt',
      '/robots.txt',
      '/sitemap.xml',
      '/sw.js',
    ]) {
      expect(routes.exclude).toContain(rule);
    }
    expect(routes.exclude.some((rule) => rule.includes('favicon'))).toBe(true);
    expect(routes.exclude.some((rule) => rule.endsWith('.css'))).toBe(true);
    expect(routes.exclude.some((rule) => rule.endsWith('.js'))).toBe(true);
    const blocked = routes.exclude.join('\n');
    expect(blocked).not.toMatch(/\/civilization|\/explainer|\/learn|\/about|\/feed\.xml|\/api\b/);
    expect(routes.include.length + routes.exclude.length).toBeLessThanOrEqual(100);

    const nodeImports = walk('functions')
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => /(?:from\s+|import\s*\(\s*)['"]node:/.test(readFileSync(file, 'utf8')));
    expect(nodeImports).toEqual([]);
    const store = readFileSync('functions/content/store.ts', 'utf8');
    expect(store).not.toContain('sitemapPublish');
    expect(store).not.toContain('SITEMAP_FILE');
    const publisher = readFileSync('functions/content/sitemapPublish.ts', 'utf8');
    expect(publisher).not.toContain('node:fs');
    expect(publisher).not.toContain('writeFileSync');
    expect(readFileSync('server/sitemapFile.ts', 'utf8')).toContain("from 'node:fs'");
  });

  it('calls the shared news and crawl builders from both runtimes', () => {
    for (const file of ['api/news.ts', 'functions/api/news.ts']) {
      expect(readFileSync(file, 'utf8')).toContain('buildNewsResponse');
    }
    for (const file of ['api/crawl.ts', 'functions/api/crawl.ts']) {
      expect(readFileSync(file, 'utf8')).toContain('buildCrawlResponse');
    }
    expect(readFileSync('functions/api/news.ts', 'utf8')).toContain('edgeCache');
    expect(readFileSync('server/responses.ts', 'utf8')).toContain('s-maxage=300, stale-while-revalidate=600');
    expect(readFileSync('functions/_middleware.ts', 'utf8')).toContain('REDIRECT_PAGES_DEV');
    expect(readFileSync('functions/_middleware.ts', 'utf8')).toContain('world-news.xyz');
    expect(readFileSync('functions/_middleware.ts', 'utf8')).toContain('prepareCachedResponse');
    expect(readFileSync('functions/httpCache.ts', 'utf8')).toContain('cloudflare-cdn-cache-control');
  });
});
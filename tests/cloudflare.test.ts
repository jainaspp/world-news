import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Cloudflare Pages', () => {
  it('keeps static files and the real 404 out of the SPA rewrite', () => {
    const redirects = readFileSync('public/_redirects', 'utf8');
    const rules = redirects
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    expect(rules).toEqual(['/region/:code / 200', '/category/:slug / 200']);
    expect(redirects).not.toMatch(/\/\*\s+\/index\.html/);
    expect(redirects).toMatch(/REDIRECT_PAGES_DEV/);

    const headers = readFileSync('public/_headers', 'utf8');
    expect(headers).toMatch(/\/ads\.txt[\s\S]*Content-Type: text\/plain; charset=utf-8/);
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(headers).toContain('Strict-Transport-Security: max-age=63072000; includeSubDomains; preload');
    expect(headers).toMatch(/\/assets\/\*[\s\S]*Cache-Control: public, max-age=31536000, immutable/);

    const wrangler = readFileSync('wrangler.toml', 'utf8');
    expect(wrangler).toMatch(/name = "world-news"/);
    expect(wrangler).toMatch(/pages_build_output_dir = "dist"/);
    expect(wrangler).toContain('nodejs_compat');
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
  });
});
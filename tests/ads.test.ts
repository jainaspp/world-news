import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ADS_LINE = 'google.com, pub-8392975944327076, DIRECT, f08c47fec0942fa0';

describe('ads.txt', () => {
  it('is the public AdSense record and is not rewritten to the SPA shell', () => {
    const file = readFileSync('public/ads.txt', 'utf8');
    expect(file.trim()).toBe(ADS_LINE);
    expect(file.split('\n').filter((line) => line.trim())).toEqual([ADS_LINE]);

    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      redirects: { source: string; destination: string; has?: { type: string; value: string }[] }[];
      rewrites: { source: string; destination: string }[];
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    expect(config.rewrites.some((rule) => rule.source.includes('ads.txt') || rule.source.includes('.*'))).toBe(false);
    expect(config.rewrites.map((rule) => rule.source)).toEqual(['/region/:code', '/category/:slug']);
    expect(config.redirects.some((rule) => rule.destination.startsWith('https://world-news.xyz/') && rule.has?.some((has) => has.value === 'world-news-tawny.vercel.app'))).toBe(true);

    const adsHeaders = config.headers.find((rule) => rule.source === '/ads.txt');
    expect(adsHeaders?.headers).toContainEqual({ key: 'Content-Type', value: 'text/plain; charset=utf-8' });
  });
});

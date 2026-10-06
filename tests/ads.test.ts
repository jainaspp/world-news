import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ADS_LINE = 'google.com, pub-8392975944327076, DIRECT, f08c47fec0942fa0';

describe('ads.txt', () => {
  it('is the public AdSense record and is excluded from the SPA rewrite', () => {
    const file = readFileSync('public/ads.txt', 'utf8');
    expect(file.trim()).toBe(ADS_LINE);
    expect(file.split('\n').filter((line) => line.trim())).toEqual([ADS_LINE]);

    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      rewrites: { source: string; destination: string }[];
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const rewrite = config.rewrites.find((rule) => rule.destination === '/index.html');
    expect(rewrite).toBeTruthy();
    const pattern = new RegExp(`^${rewrite?.source}$`);
    expect(pattern.test('/ads.txt')).toBe(false);
    expect(pattern.test('/api/news')).toBe(false);
    expect(pattern.test('/')).toBe(true);
    expect(pattern.test('/region')).toBe(true);

    const adsHeaders = config.headers.find((rule) => rule.source === '/ads.txt');
    expect(adsHeaders?.headers).toContainEqual({ key: 'Content-Type', value: 'text/plain; charset=utf-8' });
  });
});

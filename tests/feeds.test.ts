import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../shared/categories';
import { FEEDS } from '../shared/feeds';

describe('feed list', () => {
  it('stays inside the Pages subrequest budget and covers every category', () => {
    expect(FEEDS.length).toBeLessThanOrEqual(45);
    expect(FEEDS.length).toBeGreaterThanOrEqual(30);
    for (const feed of FEEDS) {
      expect(feed.regions.length).toBeGreaterThan(0);
      expect(feed.category).toBeTruthy();
      expect(feed.url.startsWith('https://')).toBe(true);
    }
    for (const id of CATEGORY_IDS) {
      expect(FEEDS.some((feed) => feed.category === id)).toBe(true);
    }
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    for (const id of CATEGORY_IDS) {
      expect(sitemap).toContain(`https://world-news.xyz/category/${id}`);
    }
  });
});

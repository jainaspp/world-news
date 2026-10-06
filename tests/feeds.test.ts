import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../shared/categories';
import { FEEDS, FEEDS_PER_SHARD, feedsInShard } from '../shared/feeds';

describe('feed list', () => {
  it('stays inside the Pages subrequest budget and covers every category', () => {
    expect(FEEDS.length).toBeLessThanOrEqual(FEEDS_PER_SHARD * 2);
    expect(FEEDS.length).toBeGreaterThanOrEqual(30);
    expect(feedsInShard('a').length).toBeLessThanOrEqual(FEEDS_PER_SHARD);
    expect(feedsInShard('b').length).toBeLessThanOrEqual(FEEDS_PER_SHARD);
    expect(feedsInShard('a').length + feedsInShard('b').length).toBe(FEEDS.length);
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

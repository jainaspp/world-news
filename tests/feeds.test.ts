import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../shared/categories';
import { FEEDS, FEEDS_PER_SHARD, SHARD_COUNT, feedsInShard, shardIndex } from '../shared/feeds';

describe('feed list', () => {
  it('stays inside the Pages subrequest budget and covers every category', () => {
    expect(FEEDS.length).toBeLessThanOrEqual(FEEDS_PER_SHARD * SHARD_COUNT);
    expect(FEEDS.length).toBeGreaterThanOrEqual(30);
    expect(shardIndex('a')).toBeNull();
    let total = 0;
    for (let index = 0; index < SHARD_COUNT; index += 1) {
      const rows = feedsInShard(String(index));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(FEEDS_PER_SHARD);
      total += rows.length;
    }
    expect(total).toBe(FEEDS.length);
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

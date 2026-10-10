import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS } from '../shared/categories';
import { FEEDS, FEEDS_PER_SHARD, REGIONS, SHARD_COUNT, feedsInShard, shardIndex, sourcesForRegion } from '../shared/feeds';

describe('feed list', () => {
  it('stays inside the Pages subrequest budget and covers every category', () => {
    expect(FEEDS_PER_SHARD).toBe(2);
    expect(SHARD_COUNT).toBeLessThanOrEqual(40);
    expect(FEEDS.length).toBe(FEEDS_PER_SHARD * SHARD_COUNT);
    expect(FEEDS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(FEEDS.map((feed) => feed.id)).size).toBe(FEEDS.length);
    expect(FEEDS.some((feed) => feed.url.includes('scmp.com'))).toBe(false);
    expect(FEEDS.filter((feed) => feed.category === 'hk').length).toBeGreaterThanOrEqual(8);
    expect(FEEDS.filter((feed) => feed.category === 'china').length).toBeGreaterThanOrEqual(8);
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

  it('keeps the Taiwan page and stops fetching the outlets that used to feed it', () => {
    expect(REGIONS.some((region) => region.code === 'TWN' && region.label === '台灣')).toBe(true);
    expect(FEEDS.some((feed) => feed.regions.includes('TWN'))).toBe(false);
    expect(sourcesForRegion('TWN')).toEqual([]);
    expect(FEEDS.some((feed) => /cna\.com\.tw|rsscna/i.test(`${feed.id} ${feed.url} ${feed.homepage} ${feed.label}`))).toBe(false);
    expect(FEEDS.some((feed) => feed.id === 'icable-hk' && feed.regions.includes('HKG'))).toBe(true);
    expect(FEEDS.some((feed) => feed.id === 'icable-china' && feed.regions.includes('HKG'))).toBe(true);
    expect(FEEDS.some((feed) => feed.id === 'chinanews' && feed.regions.includes('ASI'))).toBe(true);
    expect(FEEDS.some((feed) => feed.id === 'stheadline-china' && feed.regions.includes('HKG'))).toBe(true);
    expect(FEEDS.some((feed) => /rfi\.fr|voachinese|rfa\.org|hongkongfp|ftchinese|zhongwen\/trad/i.test(`${feed.id} ${feed.url} ${feed.homepage}`))).toBe(false);
    expect(FEEDS.some((feed) => feed.id === 'people-politics')).toBe(true);
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    expect(sitemap).toContain('https://world-news.xyz/region/twn');
  });
});

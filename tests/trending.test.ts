import { describe, expect, it } from 'vitest';
import { categorize } from '../shared/categories';
import { clusterStories } from '../shared/trending';
import type { NewsItem } from '../shared/types';

const item = (id: string, title: string, source: string, category = 'world'): NewsItem => ({
  id,
  title,
  link: `https://example.com/${id}`,
  source,
  sourceUrl: 'https://example.com',
  regions: ['INT'],
  pubDate: '2026-10-06T11:00:00Z',
  category,
});

describe('categories and clusters', () => {
  it('derives a category from the headline', () => {
    expect(categorize('Hong Kong legislature opens', 'world')).toBe('hk');
    expect(categorize('NASA delays moon launch', 'world')).toBe('health');
    expect(categorize('Quiet afternoon', 'asia')).toBe('asia');
  });

  it('groups the same event from two sources', () => {
    const clusters = clusterStories([
      item('a', 'Assembly opens annual audit of government agencies', 'Yonhap'),
      item('b', 'Assembly opens annual audit of government agencies today', 'CNA'),
      item('c', 'Ferry timetable changes in Victoria Harbour', 'RTHK', 'hk'),
    ]);
    expect(clusters[0]?.count).toBe(2);
    expect(clusters[0]?.sources.sort()).toEqual(['CNA', 'Yonhap']);
  });
});

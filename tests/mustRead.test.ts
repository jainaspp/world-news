import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { columnIndexable } from '../shared/contentPage';
import type { ContentDoc } from '../shared/content';
import { renderHomeFeed } from '../shared/homePage';
import { demoteGraphic, renderMustRead } from '../shared/mustRead';
import { topicBySlug, type TopicPack } from '../shared/topicPack';
import { renderTopicPage } from '../shared/topicPage';
import type { NewsItem } from '../shared/types';

function item(id: string, title: string, pubDate: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate,
    category: 'hk',
  };
}

describe('今日必讀 and fail-page gates', () => {
  it('features at most five real lazy-packs and leaves graphic leads off the hero', () => {
    const html = renderMustRead([
      { href: '/explainer/a/', title: '睡蓮新種', description: '哥倫比亞雨林發現新品種。' },
      { href: '/explainer/b/', title: '林地清理', description: '肯特郡清理非法垃圾場。' },
      { href: '/explainer/c/', title: '四條紋', description: 'Adidas 提出侵權訴訟。' },
    ]);
    expect(html).toContain('今日必讀');
    expect(html).toContain('href="/explainer/a/"');
    expect(html).not.toContain('adsbygoogle');
    expect(renderMustRead([])).toBe('');
    const home = renderHomeFeed([
      item('bad', 'livestream execution filmed overnight', '2026-10-09T01:00:00Z'),
      item('ok', '港鐵公布票價檢討', '2026-10-09T02:00:00Z'),
    ], new Map(), null, '', null, '', [], [{ href: '/explainer/a/', title: '睡蓮新種', description: '雨林發現新品種。' }]);
    expect(home.indexOf('港鐵公布票價檢討')).toBeGreaterThan(home.indexOf('story-hero'));
    expect(home.indexOf('港鐵公布票價檢討')).toBeLessThan(home.indexOf('livestream execution'));
    expect(home).toContain('今日必讀');
    expect(home).toContain('/explainer/a/');
    expect(demoteGraphic([item('bad', 'execution by firing squad', '2026-10-09T01:00:00Z'), item('ok', '港鐵', '2026-10-09T02:00:00Z')])[0]?.title).toBe('港鐵');
    expect(readFileSync('functions/sitemap.xml.ts', 'utf8')).toContain('indexableEntries');
    expect(readFileSync('functions/content/publish.ts', 'utf8')).toContain('indexableEntries');
  });

  it('keeps a title-only digest out of the indexable set', () => {
    const thin = { kind: 'digest', mode: 'sources', title: '精選', description: '標題', blocks: [], points: [] } as unknown as ContentDoc;
    expect(columnIndexable(thin)).toBe(false);
    const body = '這是一段已經寫成的日報正文。'.repeat(40);
    const ready = { ...thin, mode: 'ai', blocks: [{ title: '港鐵', sentences: [body], sources: [] }] } as unknown as ContentDoc;
    expect(columnIndexable(ready)).toBe(true);
  });

  it('adds 開端、經過、結尾 when a topic pack has no stored timeline', () => {
    const topic = topicBySlug('policy-address')!;
    const pack = {
      slug: topic.slug,
      title: '施政報告',
      description: '行政長官發表施政報告。',
      points: ['提出公屋供應目標。', '差餉有寬免。'],
      timeline: [],
      figures: [],
      impact: [],
      reactions: [],
      sources: [],
      seenLinks: [],
      publishedAt: '2026-10-07T01:00:00.000Z',
      updatedAt: '2026-10-08T01:00:00.000Z',
      mode: 'ai',
      provider: 'grok',
    } as TopicPack;
    const page = renderTopicPage({
      topic,
      pack,
      headlines: [
        item('a', '行政長官發表施政報告', '2026-10-07T01:00:00.000Z'),
        item('b', '立法會展開合併辯論', '2026-10-08T01:00:00.000Z'),
        item('c', '辯論進入答問', '2026-10-09T01:00:00.000Z'),
      ],
      others: [],
    }, 'https://world-news.xyz/topic/policy-address/');
    expect(page).toContain('開端');
    expect(page).toContain('經過');
    expect(page).toContain('結尾');
    expect(page).toContain('行政長官發表施政報告');
  });
});

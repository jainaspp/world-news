import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyModelText,
  cleanHighlight,
  digestFromClusters,
  mergeIndex,
  renderAnalysisIndex,
  renderContentPage,
  weeklyFromHeadlines,
} from '../shared/content';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

function story(id: string, title: string, source: string, image?: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: '2026-10-06T01:00:00Z',
    category: 'hk',
    excerpt: `${title}，涉及 1100 億元`,
    ...(image ? { image } : {}),
  };
}

function cluster(items: NewsItem[]): StoryCluster {
  const lead = items[0]!;
  return { id: lead.id, lead, items, sources: [...new Set(items.map((i) => i.source))], count: items.length, latest: 0 };
}

const digest = () => digestFromClusters([
  cluster([story('a', '港鐵加價建議', '香港電台', 'https://img.example.com/a.jpg'), story('b', '港鐵加價建議交諮詢', 'SCMP')]),
  cluster([story('c', '天文台發出熱帶氣旋警告', '香港電台'), story('d', '颱風逼近', 'SCMP')]),
], '2026-10-06-am', new Date('2026-10-06T00:00:00Z'));

describe('column pages', () => {
  it('uses the main site stylesheet, header, chips, footer and always loads AdSense', () => {
    const html = renderContentPage(digest(), 'https://world-news.xyz/digest/2026-10-06-am');
    expect(html).toContain('href="/site.css"');
    expect(html).toContain('class="masthead"');
    expect(html).toContain('class="chip active" href="/digest/"');
    expect(html).toContain('href="/analysis/"');
    expect(html).toContain('class="app-footer"');
    expect(html).toContain('adsbygoogle.js?client=ca-pub-8392975944327076');
    expect(html).toContain('AI 整合');
    expect(html).toContain('https://img.example.com/a.jpg');
    expect(html).toContain('thumb-fallback');
    expect(html).toContain('wa.me');
    expect(html).toContain('閱讀約');
    expect(html).toContain('s2/favicons');
    expect(html).toContain('id="related"');
    // No slot id configured: no empty manual units, Auto ads only.
    expect(html).not.toContain('<ins class="adsbygoogle"');
  });

  it('renders top, mid and bottom units only when slot ids are set', () => {
    const html = renderContentPage(digest(), 'https://world-news.xyz/digest/x', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' },
    });
    expect(html).toContain('data-ad-position="top"');
    expect(html).toContain('data-ad-slot="2222222222"');
    expect(html).toContain('data-ad-layout="in-article"');
    expect(html).toContain('data-ad-position="bottom"');
  });

  it('keeps a highlight only when its numbers come from the sources', () => {
    const doc = digest();
    expect(cleanHighlight(doc, { label: '重點數字', items: ['1100 億元', '999 人'] })?.items).toEqual(['1100 億元']);
    expect(cleanHighlight(doc, { label: '關鍵詞', items: ['港鐵', '颱風'] })?.label).toBe('關鍵詞');
    expect(cleanHighlight(doc, { label: 'x', items: ['港鐵'] })).toBeUndefined();
    const updated = applyModelText(doc, JSON.stringify({
      items: [{ n: 1, sentences: ['一。', '二。', '三。'] }, { n: 2, sentences: ['一。', '二。', '三。'] }],
      highlight: { label: '重點數字', items: ['1100 億元'] },
    }));
    expect(updated?.highlight?.items).toEqual(['1100 億元']);
    expect(renderContentPage(updated!, 'https://world-news.xyz/digest/x')).toContain('highlight-box');
  });

  it('keeps an archive index and renders the analysis index as image cards', () => {
    const first = digest();
    const later = { ...digest(), key: '2026-10-06-pm', publishedAt: '2026-10-06T10:00:00Z' };
    const index = mergeIndex(mergeIndex([], first), later);
    expect(index.map((entry) => entry.key)).toEqual(['2026-10-06-pm', '2026-10-06-am']);
    expect(index[0]?.image).toBe('https://img.example.com/a.jpg');
    const html = renderContentPage(later, 'https://world-news.xyz/digest/2026-10-06-pm', { archive: index });
    expect(html).toContain('/digest/2026-10-06-am');
    const list = renderAnalysisIndex([{ ...index[0]!, key: 'demo-0123456789ab', title: '示範分析' }], 'https://world-news.xyz/analysis/');
    expect(list).toContain('/analysis/demo-0123456789ab/');
    expect(list).toContain('class="thumb"');
    expect(list).toContain('adsbygoogle.js');
  });

  it('weekly blocks carry category chips', () => {
    const doc = weeklyFromHeadlines([{ title: '晶片', url: 'https://e.com/t', source: 'BBC' }], [], '2026-10-04');
    expect(renderContentPage(doc, 'https://world-news.xyz/weekly/2026-10-04')).toContain('/category/tech');
  });

  it('copies the homepage stylesheet for the column pages at build time', () => {
    expect(readFileSync('scripts/prerender.mjs', 'utf8')).toContain("copyFileSync('src/App.css', 'dist/site.css')");
  });
});

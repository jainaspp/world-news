import { describe, expect, it } from 'vitest';
import type { Feed } from '../shared/feeds';
import { dedupeNews, normalizeLink, parseFeed } from '../shared/rss';
import { filterNews } from '../shared/filter';
import type { NewsItem } from '../shared/types';

const feed: Feed = {
  id: 'demo',
  label: 'Demo Source',
  homepage: 'https://example.com',
  url: 'https://example.com/rss.xml',
  regions: ['HKG'],
  terms: 'uncertain',
};

const rss = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[Harbour &amp; ferry update]]></title>
    <link>https://Example.com/story?utm_source=rss&amp;id=1&amp;at_medium=RSS&amp;at_campaign=rss</link>
    <pubDate>Tue, 06 Oct 2026 01:00:00 GMT</pubDate>
    <description>FULL_ARTICLE_BODY_SHOULD_NOT_LEAK &lt;img src="https://cdn.example.com/harbour.jpg" /&gt;</description>
    <media:thumbnail url="https://cdn.example.com/thumb.jpg" />
  </item>
  <item>
    <title>Same story</title>
    <link>https://example.com/story?id=1</link>
    <pubDate>Tue, 06 Oct 2026 01:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Older note</title>
    <link>https://example.com/old</link>
    <pubDate>Mon, 28 Sep 2026 01:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe('rss parse and dedupe', () => {
  it('keeps headline and link, drops the article body, and collapses tracking params', () => {
    const items = dedupeNews(parseFeed(rss, feed));
    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe('Harbour & ferry update');
    expect(items[0]?.link).toBe('https://example.com/story?id=1');
    expect(items[0]?.id).toMatch(/^[0-9a-f]{12}$/);
    expect(items[0]?.image).toBe('https://cdn.example.com/thumb.jpg');
    expect(items[0]?.source).toBe('Demo Source');
    expect(items[0]?.regions).toEqual(['HKG']);
    expect(JSON.stringify(items)).not.toContain('FULL_ARTICLE_BODY_SHOULD_NOT_LEAK');
    expect(dedupeNews(items)).toEqual(items);
  });

  it('normalizes unsafe links to empty', () => {
    expect(normalizeLink('javascript:alert(1)')).toBe('');
    expect(normalizeLink('https://Example.com/a/?utm_medium=x')).toBe('https://example.com/a');
    expect(normalizeLink('https://www.bbc.com/news/a?at_medium=RSS&at_campaign=rss')).toBe('https://www.bbc.com/news/a');
  });

  it('reads itunes images and pictures escaped inside the description', () => {
    const xml = `<rss><channel><item>
      <title>Show art</title>
      <link>https://example.com/show</link>
      <itunes:image href="https://cdn.example.com/show.jpg" />
      <pubDate>Tue, 06 Oct 2026 01:00:00 GMT</pubDate>
    </item><item>
      <title>Encoded</title>
      <link>https://example.com/encoded</link>
      <content:encoded>&lt;img src="https://cdn.example.com/encoded.jpg" /&gt;</content:encoded>
      <pubDate>Tue, 06 Oct 2026 01:00:00 GMT</pubDate>
    </item></channel></rss>`;
    const items = parseFeed(xml, feed);
    expect(items[0]?.image).toBe('https://cdn.example.com/show.jpg');
    expect(items[1]?.image).toBe('https://cdn.example.com/encoded.jpg');
  });

  it('keeps at most 30 headlines from one feed', () => {
    const body = Array.from({ length: 40 }, (_, index) => `<item><title>T${index}</title><link>https://example.com/${index}</link><pubDate>Tue, 06 Oct 2026 01:00:00 GMT</pubDate></item>`).join('');
    expect(parseFeed(`<rss><channel>${body}</channel></rss>`, feed)).toHaveLength(30);
  });

  it('parses atom entries', () => {
    const atom = `<feed><entry><title>Atom title</title><link href="https://example.com/atom" /><updated>2026-10-06T00:00:00Z</updated><summary>ATOM_BODY</summary></entry></feed>`;
    const items = parseFeed(atom, feed);
    expect(items[0]?.title).toBe('Atom title');
    expect(items[0]?.link).toBe('https://example.com/atom');
    expect(JSON.stringify(items)).not.toContain('ATOM_BODY');
  });
});

describe('filterNews', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  const items: NewsItem[] = [
    { id: '1', title: 'Fresh harbour news', link: 'https://example.com/1', source: 'RTHK', sourceUrl: 'https://news.rthk.hk', regions: ['HKG'], pubDate: '2026-10-06T11:30:00Z' },
    { id: '2', title: 'Morning briefing', link: 'https://example.com/2', source: 'BBC News', sourceUrl: 'https://www.bbc.com/news', regions: ['EUR'], pubDate: '2026-10-06T08:00:00Z' },
    { id: '3', title: 'Last week', link: 'https://example.com/3', source: 'RTHK', sourceUrl: 'https://news.rthk.hk', regions: ['HKG'], pubDate: '2026-09-20T08:00:00Z' },
  ];

  it('filters by region, source, query, and the one-hour window', () => {
    expect(filterNews(items, { region: 'HKG', now }).map((item) => item.id)).toEqual(['1', '3']);
    expect(filterNews(items, { source: 'BBC News', now }).map((item) => item.id)).toEqual(['2']);
    expect(filterNews(items, { q: 'harbour', now }).map((item) => item.id)).toEqual(['1']);
    expect(filterNews(items, { time: 'hour', now }).map((item) => item.id)).toEqual(['1']);
    expect(filterNews(items, { time: 'today', now }).map((item) => item.id)).toEqual(['1', '2']);
    expect(filterNews(items, { time: 'week', now }).map((item) => item.id)).toEqual(['1', '2']);
  });
});

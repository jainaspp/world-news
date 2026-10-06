import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feed } from '../shared/feeds';
import { loadFeeds } from '../server/loadFeeds';

const feeds: Feed[] = [
  { id: 'a', label: 'A', homepage: 'https://a.example', url: 'https://a.example/rss', regions: ['HKG'], terms: 'uncertain' },
  { id: 'b', label: 'B', homepage: 'https://b.example', url: 'https://b.example/rss', regions: ['EUR'], terms: 'uncertain' },
];

const item = (title: string, link: string) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>Tue, 06 Oct 2026 02:00:00 GMT</pubDate><description>BODY</description></item>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadFeeds', () => {
  it('fetches feeds, drops bodies, and dedupes overlapping links', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('a.example')) {
        return new Response(`<rss><channel>${item('One', 'https://a.example/one')} ${item('Shared', 'https://shared.example/x?utm_source=a')}</channel></rss>`);
      }
      if (String(url).includes('b.example')) {
        return new Response(`<rss><channel>${item('Shared copy', 'https://shared.example/x')}</channel></rss>`, { status: 200 });
      }
      return new Response('nope', { status: 500 });
    });

    const { items, errors } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch);
    expect(errors).toBe(0);
    expect(items.map((row) => row.link).sort()).toEqual(['https://a.example/one', 'https://shared.example/x']);
    expect(JSON.stringify(items)).not.toContain('BODY');
    expect(items.find((row) => row.link === 'https://shared.example/x')?.source).toBe('A');
  });

  it('counts a feed that fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 404 }));
    const { items, errors } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch);
    expect(items).toEqual([]);
    expect(errors).toBe(2);
  });
});

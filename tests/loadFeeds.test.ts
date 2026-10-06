import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Feed } from '../shared/feeds';
import { loadFeeds } from '../server/loadFeeds';

const feeds: Feed[] = [
  { id: 'a', label: 'A', homepage: 'https://a.example', url: 'https://a.example/rss', regions: ['HKG'], terms: 'uncertain' },
  { id: 'b', label: 'B', homepage: 'https://b.example', url: 'https://b.example/rss', regions: ['EUR'], terms: 'uncertain' },
];

const item = (title: string, link: string) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>Tue, 06 Oct 2026 02:00:00 GMT</pubDate><description>BODY ${'字'.repeat(220)}TAIL</description></item>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadFeeds', () => {
  it('fetches feeds, drops bodies, and dedupes overlapping links', async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) => {
      if (String(url).includes('a.example')) {
        return new Response(`<rss><channel>${item('One', 'https://a.example/one')} ${item('Shared', 'https://shared.example/x?utm_source=a')}</channel></rss>`);
      }
      if (String(url).includes('b.example')) {
        return new Response(`<rss><channel>${item('Shared copy', 'https://shared.example/x')}</channel></rss>`, { status: 200 });
      }
      return new Response('nope', { status: 500 });
    });

    const { items, errors, errorSources } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(errors).toBe(0);
    expect(errorSources).toEqual([]);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(String((init?.headers as Record<string, string>)?.['User-Agent'])).toContain('Mozilla');
    expect(init?.redirect).toBe('manual');
    expect(items.map((row) => row.link).sort()).toEqual(['https://a.example/one', 'https://shared.example/x']);
    expect(JSON.stringify(items)).not.toContain('TAIL');
    expect(items[0]?.excerpt?.startsWith('BODY')).toBe(true);
    expect(items[0]?.excerpt?.length).toBeLessThanOrEqual(180);
    expect(items.find((row) => row.link === 'https://shared.example/x')?.source).toBe('A');
  });

  it('counts a feed that fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 404 }));
    const { items, errors, errorSources } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(items).toEqual([]);
    expect(errors).toBe(2);
    expect(errorSources.map((row) => row.reason)).toEqual(['HTTP 404', 'HTTP 404']);
  });

  it('follows one redirect and records a network failure', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === 'https://a.example/rss') {
        return new Response(null, { status: 302, headers: { location: 'https://a.example/final' } });
      }
      if (url === 'https://a.example/final') {
        return new Response(`<rss><channel>${item('Moved', 'https://a.example/moved')}</channel></rss>`);
      }
      throw new Error('Too many subrequests');
    });
    const { items, errorSources } = await loadFeeds(feeds, fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(items.map((row) => row.title)).toEqual(['Moved']);
    expect(errorSources).toEqual([{ source: 'B', reason: 'subrequests' }]);
  });

  it('drops items older than 48 hours', async () => {
    const fetchImpl = vi.fn(async () => new Response(`<rss><channel>${item('Fresh', 'https://a.example/new')}<item><title>Old</title><link>https://a.example/old</link><pubDate>Mon, 28 Sep 2026 01:00:00 GMT</pubDate></item></channel></rss>`));
    const { items } = await loadFeeds(feeds.slice(0, 1), fetchImpl as unknown as typeof fetch, Date.parse('2026-10-06T12:00:00Z'));
    expect(items.map((row) => row.title)).toEqual(['Fresh']);
  });
});

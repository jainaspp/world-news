import { describe, expect, it } from 'vitest';
import { blockedHkChinaStory, mentionsTaiwanCoverage, type Feed } from '../shared/feeds';
import { filterNews } from '../shared/filter';
import { itemsForFocus } from '../shared/focus';
import { homeBootstrap, injectHomeShell } from '../shared/homePage';
import { parseFeed } from '../shared/rss';
import type { NewsItem } from '../shared/types';

/** The 2026-11-06 Variety entertainment headline that reached `#wn-bootstrap`. */
const VARIETY_TITLE = 'Taiwan Creative Content Fest opens with regional slate';
const NEUTRAL_TITLE = 'Hollywood box office holds steady over the weekend';

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title'>): NewsItem {
  return {
    link: `https://variety.com/2026/film/news/${partial.id}`,
    source: 'Variety',
    sourceUrl: 'https://variety.com',
    regions: ['USA'],
    pubDate: '2026-11-06T01:00:00.000Z',
    category: 'entertainment',
    ...partial,
  };
}

function bootstrapIds(html: string): string[] {
  const match = html.match(/<script id="wn-bootstrap" type="application\/json">([\s\S]*?)<\/script>/);
  expect(match?.[1]).toBeTruthy();
  const payload = JSON.parse(match![1]!) as { items: { id: string; title: string }[] };
  return payload.items.map((row) => row.id);
}

describe('Taiwan coverage matcher', () => {
  it('matches 臺灣, 台灣, and Taiwan in title, description, and link', () => {
    expect(mentionsTaiwanCoverage({ title: VARIETY_TITLE })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: 'taiwan creative content fest' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: 'TAIWAN CREATIVE CONTENT FEST' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: '影展場次', excerpt: '台灣創作者出席' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: '影展場次', description: '臺灣場次取消' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: 'Festival lineup', link: 'https://variety.com/2026/film/news/taiwan-creative-content-fest/' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: 'Tai wan Creative Content Fest' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: '影展場次', link: 'https://example.com/news/%E5%8F%B0%E7%81%A3' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: NEUTRAL_TITLE, link: 'https://variety.com/2026/film/news/box-office/', excerpt: 'Studios held their weekend estimates.' })).toBe(false);
    expect(blockedHkChinaStory({ title: VARIETY_TITLE, source: 'Variety', link: 'https://variety.com/fest' })).toBe(true);
    expect(blockedHkChinaStory({ title: 'Tai wan Creative Content Fest', source: 'Variety', link: 'https://variety.com/sidebar' })).toBe(true);
    expect(blockedHkChinaStory({ title: NEUTRAL_TITLE, source: 'Variety', link: 'https://variety.com/2026/film/news/box-office/' })).toBe(false);
  });
});

describe('HK, mainland, and ASI homepage bootstrap', () => {
  const variety = item({ id: 'variety-tw', title: VARIETY_TITLE });
  const neutral = item({
    id: 'variety-ok',
    title: NEUTRAL_TITLE,
    link: 'https://variety.com/2026/film/news/box-office/',
    excerpt: 'Studios held their weekend estimates.',
  });
  const excerptOnly = item({
    id: 'excerpt-tw',
    title: 'Festival lineup announced',
    excerpt: 'Reports from the Taiwan Creative Content Fest.',
    link: 'https://variety.com/2026/film/news/lineup/',
  });

  it('drops the Variety title from the homepage bootstrap and keeps a neutral title', () => {
    const home = filterNews([variety, neutral, excerptOnly], {});
    expect(home.map((row) => row.id)).toEqual(['variety-ok']);
    const direct = homeBootstrap([variety, neutral, excerptOnly]);
    expect(direct).not.toContain('Taiwan Creative Content Fest');
    expect(direct).toContain(NEUTRAL_TITLE);

    const shell = '<html><head></head><body><div id="root"></div></body></html>';
    const html = injectHomeShell(shell, [variety, neutral, excerptOnly]);
    expect(html).toContain(NEUTRAL_TITLE);
    expect(html).not.toContain('Taiwan Creative Content Fest');
    expect(html).not.toContain('variety-tw');
    expect(html).not.toContain('excerpt-tw');
    expect(bootstrapIds(html)).toEqual(['variety-ok']);
    const boot = html.match(/<script id="wn-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? '';
    expect(boot).not.toMatch(/taiwan/i);
    expect(boot).not.toContain('臺灣');
    expect(boot).not.toContain('台灣');
  });

  it('drops Taiwan rows on HK, mainland, and ASI channels and keeps them on other desks', () => {
    const rows: NewsItem[] = [
      item({ id: 'variety-tw', title: VARIETY_TITLE, regions: ['USA', 'ASI'] }),
      item({ id: 'variety-ok', title: NEUTRAL_TITLE, regions: ['USA', 'ASI'], link: 'https://variety.com/2026/film/news/box-office/' }),
      item({
        id: 'asi-link',
        title: '亞洲影展公布片單',
        regions: ['ASI'],
        category: 'asia',
        source: 'BBC 亞洲',
        sourceUrl: 'https://www.bbc.com/news',
        link: 'https://www.bbc.com/news/world/asia/taiwan-creative-content-fest',
      }),
      item({
        id: 'hk-tw',
        title: '港聞提及台灣影展',
        regions: ['HKG'],
        category: 'hk',
        source: '香港電台',
        sourceUrl: 'https://news.rthk.hk',
        link: 'https://news.rthk.hk/hk-tw',
      }),
      item({
        id: 'hk-link',
        title: '影展公布片單',
        regions: ['HKG'],
        category: 'hk',
        source: '香港電台',
        sourceUrl: 'https://news.rthk.hk',
        link: 'https://news.rthk.hk/taiwan-fest',
      }),
      item({
        id: 'hk-ok',
        title: '港鐵服務正常',
        regions: ['HKG'],
        category: 'hk',
        source: '香港電台',
        sourceUrl: 'https://news.rthk.hk',
        link: 'https://news.rthk.hk/mtr',
      }),
      item({
        id: 'cn-tw',
        title: '臺灣影展消息',
        regions: ['ASI'],
        category: 'china',
        source: '中新網',
        sourceUrl: 'https://www.chinanews.com.cn',
        link: 'https://www.chinanews.com.cn/tw',
      }),
      item({
        id: 'cn-ok',
        title: '北京召開經貿會議',
        regions: ['ASI'],
        category: 'china',
        source: '中新網',
        sourceUrl: 'https://www.chinanews.com.cn',
        link: 'https://www.chinanews.com.cn/bj',
      }),
      item({
        id: 'tw-page',
        title: '台灣影展公布片單',
        regions: ['TWN'],
        category: 'entertainment',
        source: '其他',
        sourceUrl: 'https://example.com',
        link: 'https://example.com/tw-fest',
      }),
    ];

    expect(filterNews(rows, {}).map((row) => row.id)).toEqual(['variety-ok', 'hk-ok', 'cn-ok']);
    expect(filterNews(rows, { region: 'ASI' }).map((row) => row.id)).toEqual(['variety-ok', 'cn-ok']);
    expect(filterNews(rows, { region: 'HKG' }).map((row) => row.id)).toEqual(['hk-ok']);
    expect(filterNews(rows, { category: 'china' }).map((row) => row.id)).toEqual(['cn-ok']);
    expect(filterNews(rows, { category: 'hk' }).map((row) => row.id)).toEqual(['hk-ok']);
    expect(filterNews(rows, { region: 'USA' }).map((row) => row.id)).toEqual(['variety-ok']);
    expect(filterNews(rows, { region: 'TWN' }).map((row) => row.id)).toEqual(['tw-page']);
    expect(filterNews(rows, { category: 'entertainment' }).map((row) => row.id)).toEqual(['variety-ok']);
    expect(homeBootstrap([rows[0]!, rows[1]!], true)).toContain(VARIETY_TITLE);

    const asiIntro = itemsForFocus(rows, { scope: 'region', id: 'asi', label: '亞洲' }, new Date('2026-11-06T12:00:00.000Z'));
    expect(asiIntro.map((row) => row.id)).toEqual(['variety-ok', 'cn-ok']);
    const entertainment = itemsForFocus(rows, { scope: 'category', id: 'entertainment', label: '娛樂' }, new Date('2026-11-06T12:00:00.000Z'));
    expect(entertainment.map((row) => row.id)).toEqual(['variety-ok']);
  });

  it('drops a Variety entertainment item at ingest and keeps a neutral title', () => {
    const varietyFeed: Feed = {
      id: 'variety',
      label: 'Variety',
      homepage: 'https://variety.com',
      url: 'https://variety.com/feed/',
      regions: ['USA'],
      terms: 'uncertain',
      category: 'entertainment',
    };
    const xml = `<rss><channel>
      <item><title>${VARIETY_TITLE}</title><link>https://variety.com/2026/film/news/taiwan-fest</link><pubDate>Fri, 06 Nov 2026 01:00:00 GMT</pubDate><description>Lineup announced.</description></item>
      <item><title>Tai wan Creative Content Fest sidebar</title><link>https://variety.com/2026/film/news/tai-wan</link><pubDate>Fri, 06 Nov 2026 01:00:00 GMT</pubDate></item>
      <item><title>${NEUTRAL_TITLE}</title><link>https://variety.com/2026/film/news/box-office</link><pubDate>Fri, 06 Nov 2026 01:00:00 GMT</pubDate></item>
    </channel></rss>`;
    expect(parseFeed(xml, varietyFeed).map((row) => row.title)).toEqual([NEUTRAL_TITLE]);
    const twnFeed: Feed = { ...varietyFeed, id: 'twn-desk', regions: ['TWN'] };
    expect(parseFeed(xml, twnFeed).map((row) => row.title)).toEqual([
      VARIETY_TITLE,
      'Tai wan Creative Content Fest sidebar',
      NEUTRAL_TITLE,
    ]);
  });
});

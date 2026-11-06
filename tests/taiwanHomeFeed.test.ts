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

/** The 2026-11-06 Now 兩岸 headline that reached `#wn-bootstrap` after #299. */
const STRAIT_TITLE = '特朗普雙輸美國國會 台海局勢底定看向習近平';
const STRAIT_CLASSIC_TITLE = '美國國會消息 臺海局勢底定';
const NOW_TRADE_TITLE = '北京召開經貿會議';

describe('Taiwan Strait tokens on HK and mainland desks', () => {
  it('blocks a title that contains 台海', () => {
    expect(blockedHkChinaStory({
      title: STRAIT_TITLE,
      source: 'Now 兩岸',
      link: 'https://news.now.com/home/strait',
    })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: STRAIT_TITLE })).toBe(true);
  });

  it('blocks 臺海 in the title, excerpt, description, and link', () => {
    expect(blockedHkChinaStory({
      title: STRAIT_CLASSIC_TITLE,
      source: 'Now 兩岸',
      link: 'https://news.now.com/home/classic',
    })).toBe(true);
    expect(blockedHkChinaStory({
      title: '美國國會消息',
      excerpt: '評論提及臺海',
      source: 'Now 兩岸',
      link: 'https://news.now.com/home/excerpt',
    })).toBe(true);
    expect(blockedHkChinaStory({
      title: '美國國會消息',
      description: '評論提及臺海',
      source: 'Now 兩岸',
      link: 'https://news.now.com/home/description',
    })).toBe(true);
    expect(blockedHkChinaStory({
      title: '美國國會消息',
      source: 'Now 兩岸',
      link: 'https://news.now.com/news/%E8%87%BA%E6%B5%B7',
    })).toBe(true);
    expect(blockedHkChinaStory({
      title: '美國國會消息',
      source: 'Now 兩岸',
      link: 'https://news.now.com/news/%E5%8F%B0%E6%B5%B7',
    })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: '局勢', excerpt: '臺海' })).toBe(true);
    expect(mentionsTaiwanCoverage({ title: '局勢', description: '台海' })).toBe(true);
  });

  it('does not block a Now 兩岸 story that lacks 台海, 臺海, and Taiwan tokens', () => {
    expect(blockedHkChinaStory({
      title: NOW_TRADE_TITLE,
      excerpt: '與會代表討論貿易數字。',
      description: '論壇在廈門閉幕。',
      source: 'Now 兩岸',
      sourceUrl: 'https://news.now.com',
      link: 'https://news.now.com/home/finance',
    })).toBe(false);
    expect(mentionsTaiwanCoverage({
      title: NOW_TRADE_TITLE,
      excerpt: '與會代表討論貿易數字。',
      description: '論壇在廈門閉幕。',
      link: 'https://news.now.com/home/finance',
    })).toBe(false);
  });

  it('still blocks 台灣 and Taiwan', () => {
    expect(blockedHkChinaStory({
      title: '台灣影展公布片單',
      source: 'Now 兩岸',
      link: 'https://news.now.com/home/fest',
    })).toBe(true);
    expect(blockedHkChinaStory({
      title: '臺灣影展消息',
      source: 'Now 兩岸',
      link: 'https://news.now.com/home/fest-classic',
    })).toBe(true);
    expect(blockedHkChinaStory({
      title: VARIETY_TITLE,
      source: 'Variety',
      link: 'https://variety.com/fest',
    })).toBe(true);
  });

  it('drops the 台海 headline from the homepage bootstrap and keeps it on the Taiwan desk', () => {
    const strait = item({
      id: '0b0f93ac7825',
      title: STRAIT_TITLE,
      source: 'Now 兩岸',
      sourceUrl: 'https://news.now.com',
      regions: ['HKG'],
      category: 'china',
      link: 'https://news.now.com/home/strait',
    });
    const classic = item({
      id: 'strait-classic',
      title: STRAIT_CLASSIC_TITLE,
      source: 'Now 兩岸',
      sourceUrl: 'https://news.now.com',
      regions: ['HKG'],
      category: 'china',
      link: 'https://news.now.com/home/classic',
    });
    const trade = item({
      id: 'now-trade',
      title: NOW_TRADE_TITLE,
      source: 'Now 兩岸',
      sourceUrl: 'https://news.now.com',
      regions: ['HKG'],
      category: 'china',
      link: 'https://news.now.com/home/finance',
      excerpt: '與會代表討論貿易數字。',
    });
    const twnStrait = item({
      id: 'twn-strait',
      title: STRAIT_TITLE,
      source: '其他',
      sourceUrl: 'https://example.com',
      regions: ['TWN'],
      category: 'world',
      link: 'https://example.com/strait',
    });

    expect(filterNews([strait, classic, trade], {}).map((row) => row.id)).toEqual(['now-trade']);
    expect(filterNews([strait, classic, trade], { region: 'HKG' }).map((row) => row.id)).toEqual(['now-trade']);
    expect(filterNews([strait, classic, trade], { category: 'china' }).map((row) => row.id)).toEqual(['now-trade']);
    expect(filterNews([strait, classic, trade, twnStrait], { region: 'TWN' }).map((row) => row.id)).toEqual(['twn-strait']);
    expect(homeBootstrap([twnStrait], true)).toContain(STRAIT_TITLE);

    const shell = '<html><head></head><body><div id="root"></div></body></html>';
    const html = injectHomeShell(shell, [strait, classic, trade]);
    expect(html).toContain(NOW_TRADE_TITLE);
    expect(html).not.toContain(STRAIT_TITLE);
    expect(html).not.toContain(STRAIT_CLASSIC_TITLE);
    expect(html).not.toContain('0b0f93ac7825');
    expect(bootstrapIds(html)).toEqual(['now-trade']);
    const boot = html.match(/<script id="wn-bootstrap" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? '';
    expect(boot).not.toContain('台海');
    expect(boot).not.toContain('臺海');

    const nowFeed: Feed = {
      id: 'now-china',
      label: 'Now 兩岸',
      homepage: 'https://news.now.com',
      url: 'https://news.now.com/feed',
      regions: ['HKG'],
      terms: 'uncertain',
      category: 'china',
    };
    const xml = `<rss><channel>
      <item><title>${STRAIT_TITLE}</title><link>https://news.now.com/home/strait</link><pubDate>Fri, 06 Nov 2026 01:00:00 GMT</pubDate><description>局勢評論。</description></item>
      <item><title>${STRAIT_CLASSIC_TITLE}</title><link>https://news.now.com/home/classic</link><pubDate>Fri, 06 Nov 2026 01:00:00 GMT</pubDate></item>
      <item><title>${NOW_TRADE_TITLE}</title><link>https://news.now.com/home/finance</link><pubDate>Fri, 06 Nov 2026 01:00:00 GMT</pubDate><description>與會代表討論貿易數字。</description></item>
    </channel></rss>`;
    expect(parseFeed(xml, nowFeed).map((row) => row.title)).toEqual([NOW_TRADE_TITLE]);
    const twnFeed: Feed = { ...nowFeed, id: 'twn-desk', regions: ['TWN'] };
    expect(parseFeed(xml, twnFeed).map((row) => row.title)).toEqual([
      STRAIT_TITLE,
      STRAIT_CLASSIC_TITLE,
      NOW_TRADE_TITLE,
    ]);
  });
});

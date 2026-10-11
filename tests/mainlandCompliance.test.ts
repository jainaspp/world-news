import { describe, expect, it } from 'vitest';
import { buildWeekly } from '../functions/content/publish';
import type { ContentEnv } from '../functions/content/store';
import { digestFromClusters, leadImage, renderContentPage, weeklyFromHeadlines } from '../shared/content';
import { FEEDS, blockedHkChinaOutlet, blockedHkChinaStory } from '../shared/feeds';
import { filterNews } from '../shared/filter';
import { briefingNews } from '../shared/grok';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title' | 'source' | 'category'>): NewsItem {
  return {
    link: `https://example.com/${partial.id}`,
    sourceUrl: 'https://example.com',
    regions: partial.category === 'hk' ? ['HKG'] : ['ASI'],
    pubDate: '2026-10-10T12:00:00.000Z',
    ...partial,
  };
}

describe('mainland compliance sources', () => {
  it('no longer fetches blocked foreign Chinese outlets or HKFP / RFI', () => {
    const blob = FEEDS.map((feed) => `${feed.id} ${feed.label} ${feed.url} ${feed.homepage}`).join('\n');
    for (const needle of ['rfi.fr', 'voachinese', 'rfa.org', 'nytimes.com', 'zhongwen', 'ftchinese', 'hongkongfp', 'dw.com', 'rss.dw.com', 'Guardian 中國', '自由亞洲', '美國之音', '紐約時報中文', 'BBC 中文', 'RFI 中文', 'HKFP', 'FT中文', '德國之聲']) {
      expect(blob.includes(needle)).toBe(false);
    }
    for (const id of ['rfi-zh', 'voa-zh', 'rfa-zh', 'nyt-zh', 'bbc-zh', 'dw-zh']) {
      expect(FEEDS.some((feed) => feed.id === id)).toBe(false);
    }
    expect(FEEDS.some((feed) => feed.id === 'people-politics')).toBe(true);
    expect(FEEDS.some((feed) => feed.id === 'xinhua-politics')).toBe(true);
    for (const id of ['bbc-world', 'bbc-tech', 'bbc-biz', 'guardian', 'guardian-tech', 'guardian-biz']) {
      expect(FEEDS.some((feed) => feed.id === id)).toBe(true);
    }
  });

  it('blocks outlet labels and hosts used on hk/china desks', () => {
    expect(blockedHkChinaOutlet({ source: 'RFI 中文', link: 'https://www.rfi.fr/cn/a' })).toBe(true);
    expect(blockedHkChinaOutlet({ source: '美國之音', link: 'https://www.voachinese.com/a' })).toBe(true);
    expect(blockedHkChinaOutlet({ source: '德國之聲', link: 'https://www.dw.com/zh/a' })).toBe(true);
    expect(blockedHkChinaOutlet({ source: '港台國際', link: 'https://rss.dw.com/xml/rss-chi-all' })).toBe(true);
    expect(blockedHkChinaOutlet({ source: '香港電台', link: 'https://news.rthk.hk/a' })).toBe(false);
  });
});

describe('taiwan and sensitive keyword strip', () => {
  it('flags Taiwan coverage and sensitive political keywords', () => {
    expect(blockedHkChinaStory(item({ id: '1', title: '賴清德出席活動', source: '中新網', category: 'china' }))).toBe(true);
    expect(blockedHkChinaStory(item({ id: '2', title: '兩岸經貿論壇在廈門舉行', source: '中新網', category: 'china' }))).toBe(true);
    expect(blockedHkChinaStory(item({ id: '3', title: '台湾总统选举临近', source: '中新網', category: 'china' }))).toBe(true);
    expect(blockedHkChinaStory(item({ id: '4', title: '六四紀念活動', source: '香港電台', category: 'hk' }))).toBe(true);
    expect(blockedHkChinaStory(item({ id: '5', title: '北京召開經貿會議', source: '人民網時政', category: 'china' }))).toBe(false);
  });

  it('drops blocked stories from hk/china filter and briefing', () => {
    const rows = [
      item({ id: 'ok', title: '港鐵服務正常', source: '香港電台', category: 'hk' }),
      item({ id: 'tw', title: '台灣半導體供應鏈', source: '香港電台', category: 'hk' }),
      item({ id: 'rfi', title: '歐洲氣候峰會', source: 'RFI 中文', category: 'china', link: 'https://www.rfi.fr/cn/x' }),
    ];
    const filtered = filterNews(rows, { category: 'hk' });
    expect(filtered.map((row) => row.id)).toEqual(['ok']);
    expect(briefingNews(rows[0]!, 'hk')).toBe(true);
    expect(briefingNews(rows[1]!, 'hk')).toBe(false);
    expect(briefingNews(rows[2]!, 'china')).toBe(false);
  });
});

describe('weekly and column heroes', () => {
  it('keeps RFI and HKFP out of weekly sources and column hero images', async () => {
    const bbc = { title: '晶片出口新規', url: 'https://www.bbc.com/news/technology/chips', source: 'BBC 科技', image: 'https://ichef.bbci.co.uk/news/240/chips.jpg' };
    const guardian = { title: '恒指收市升', url: 'https://www.theguardian.com/business/hsi', source: 'Guardian 財經' };
    const weekly = weeklyFromHeadlines(
      [
        { title: '法國科技政策', url: 'https://www.rfi.fr/cn/tech', source: 'RFI 中文', image: 'https://www.rfi.fr/cn/hero.jpg' },
        { title: '本港初創', url: 'https://hongkongfp.com/2026/10/11/startup', source: 'HKFP', image: 'https://hongkongfp.com/1024/hero.jpg' },
        { title: '歐洲晶片', url: 'https://www.rfi.fr/cn/chips', source: '科技速遞' },
        bbc,
      ],
      [
        guardian,
        { title: '歐洲市場', url: 'https://www.rfi.fr/cn/markets', source: 'RFI 中文', image: 'https://hongkongfp.com/1024/markets.jpg' },
      ],
      '2026-10-05',
    );
    const names = weekly.blocks.flatMap((block) => block.sources.map((source) => source.source));
    const urls = weekly.blocks.flatMap((block) => block.sources.map((source) => source.url));
    expect(names).toEqual(['BBC 科技', 'Guardian 財經']);
    expect(urls.some((url) => /rfi\.fr|hongkongfp\.com/.test(url))).toBe(false);
    const html = renderContentPage(weekly, 'https://world-news.xyz/weekly/2026-10-05');
    expect(html).toContain('src="https://ichef.bbci.co.uk/news/240/chips.jpg"');
    expect(html).not.toContain('rfi.fr');
    expect(html).not.toContain('hongkongfp.com');

    const rollup = [
      { title: bbc.title, url: bbc.url, source: bbc.source, category: 'tech', at: '2026-10-01T00:00:00.000Z', image: bbc.image },
      ...Array.from({ length: 8 }, (_, index) => ({
        title: index % 2 === 0 ? '法廣科技' : '本港初創',
        url: index % 2 === 0 ? `https://www.rfi.fr/cn/t${index}` : `https://hongkongfp.com/t${index}`,
        source: index % 2 === 0 ? 'RFI 中文' : 'HKFP',
        category: 'tech',
        at: `2026-10-0${index + 1}T01:00:00.000Z`,
        image: 'https://hongkongfp.com/1024/hero.jpg',
      })),
      { title: guardian.title, url: guardian.url, source: guardian.source, category: 'business', at: '2026-10-04T00:00:00.000Z' },
      { title: '歐洲市場', url: 'https://www.rfi.fr/cn/markets', source: 'RFI 中文', category: 'business', at: '2026-10-05T00:00:00.000Z', image: 'https://hongkongfp.com/1024/markets.jpg' },
    ];
    const env = {
      CONTENT: {
        get: async (key: string) => (key === 'rollup' ? JSON.stringify(rollup) : null),
        put: async () => undefined,
      },
    } as ContentEnv;
    const built = await buildWeekly(env, '2026-10-05');
    expect(built.blocks.flatMap((block) => block.sources.map((source) => source.source))).toEqual(['BBC 科技', 'Guardian 財經']);
    expect(renderContentPage(built, 'https://world-news.xyz/weekly/2026-10-05')).not.toContain('hongkongfp.com');

    const bbcItem = item({
      id: 'bbc',
      title: '晶片出口新規',
      source: 'BBC News',
      category: 'world',
      link: 'https://www.bbc.com/news/technology/chips',
      image: 'https://ichef.bbci.co.uk/news/240/chips.jpg',
    });
    const hkfpItem = item({
      id: 'hkfp',
      title: '本港初創',
      source: 'HKFP',
      category: 'world',
      link: 'https://hongkongfp.com/2026/10/11/startup',
      image: 'https://hongkongfp.com/1024/hero.jpg',
    });
    const cluster: StoryCluster = {
      id: 'chips',
      lead: bbcItem,
      items: [bbcItem, hkfpItem],
      sources: ['BBC News', 'HKFP'],
      count: 2,
      latest: Date.parse(bbcItem.pubDate),
    };
    const digest = digestFromClusters([cluster], '2026-10-11-am');
    expect(leadImage(digest)).toBe('https://ichef.bbci.co.uk/news/240/chips.jpg');
    expect(renderContentPage(digest, 'https://world-news.xyz/digest/2026-10-11-am')).not.toContain('hongkongfp.com/1024/hero.jpg');

    const stale = weeklyFromHeadlines([bbc], [guardian], '2026-10-05');
    stale.blocks[0]?.sources.push({ title: '本港初創', url: 'https://hongkongfp.com/story', source: 'HKFP', image: 'https://hongkongfp.com/1024/hero.jpg' });
    expect(leadImage(stale)).toBe('https://ichef.bbci.co.uk/news/240/chips.jpg');
    expect(renderContentPage(stale, 'https://world-news.xyz/weekly/2026-10-05')).not.toContain('hongkongfp.com/1024/hero.jpg');
  });
});

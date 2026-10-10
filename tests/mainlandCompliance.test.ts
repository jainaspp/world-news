import { describe, expect, it } from 'vitest';
import { FEEDS, blockedHkChinaOutlet, blockedHkChinaStory } from '../shared/feeds';
import { filterNews } from '../shared/filter';
import { briefingNews } from '../shared/grok';
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
    for (const needle of ['rfi.fr', 'voachinese', 'rfa.org', 'nytimes.com', 'zhongwen', 'ftchinese', 'hongkongfp', 'Guardian 中國', '自由亞洲', '美國之音', '紐約時報中文', 'BBC 中文', 'RFI 中文', 'HKFP', 'FT中文']) {
      expect(blob.includes(needle)).toBe(false);
    }
    expect(FEEDS.some((feed) => feed.id === 'people-politics')).toBe(true);
    expect(FEEDS.some((feed) => feed.id === 'xinhua-politics')).toBe(true);
    expect(FEEDS.some((feed) => feed.id === 'dw-zh')).toBe(true); // international-only pending confirm
  });

  it('blocks outlet labels and hosts used on hk/china desks', () => {
    expect(blockedHkChinaOutlet({ source: 'RFI 中文', link: 'https://www.rfi.fr/cn/a' })).toBe(true);
    expect(blockedHkChinaOutlet({ source: '美國之音', link: 'https://www.voachinese.com/a' })).toBe(true);
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

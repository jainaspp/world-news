import { describe, expect, it } from 'vitest';
import { sourceList, type ContentDoc } from '../shared/content';
import { briefingNews, selectBriefingItems } from '../shared/grok';
import { hkWording, proseSane, tidyDisplay, tidyMixedNumbers } from '../shared/prose';
import { buildToday, indexableTodayPaths } from '../shared/todayPage';
import type { NewsItem } from '../shared/types';

function item(id: string, title: string, source: string, category: string, pubDate = '2026-10-07T23:00:00.000Z'): NewsItem {
  return { id, title, link: `https://example.com/${id}`, source, sourceUrl: 'https://example.com', regions: category === 'hk' ? ['HKG'] : ['CHN'], pubDate, category };
}

describe('prose guards', () => {
  it('rejects prose without commas and glued scores', () => {
    const plain = '高芙在首盤舉手要求暫停比賽原因是廣告板燈光閃爍。'.repeat(8);
    expect(proseSane(plain)).toBe(false);
    expect(proseSane('高芙最終以七比56比一取勝。')).toBe(false);
    const ok = '高芙在首盤舉手，要求暫停比賽，原因是廣告板燈光閃爍。'.repeat(8);
    expect(proseSane(ok)).toBe(true);
    expect(proseSane('最終以7比5、6比1取勝。')).toBe(true);
  });

  it('tidies mixed numbers and dates', () => {
    expect(tidyMixedNumbers('罰款二萬8000英鎊')).toBe('罰款2萬8000英鎊');
    expect(tidyMixedNumbers('2026年十月七日作出裁決')).toBe('2026年10月7日作出裁決');
    expect(tidyMixedNumbers('2026年五月爆發')).toBe('2026年5月爆發');
    expect(tidyMixedNumbers('十月革命')).toBe('十月革命');
    expect(tidyMixedNumbers('洪廣玉九月19日被拘留')).toBe('洪廣玉9月19日被拘留');
    expect(tidyDisplay('判處二萬8000英鎊，2026年十月七日')).toBe('判處2萬8000英鎊，2026年10月7日');
  });

  it('maps Taiwan and mainland wording to Hong Kong usage', () => {
    expect(hkWording('川普與普丁通話，俄媒報導')).toBe('特朗普與普京通話，俄媒報道');
    expect(hkWording('我國科研團隊；我國外交部表示')).toBe('內地科研團隊；中國外交部表示');
    expect(hkWording('網路軟體品質')).toBe('網絡軟件質素');
  });
});

describe('source list', () => {
  it('drops bare-domain and same-outlet citations and tidies slugs', () => {
    const doc: ContentDoc = {
      kind: 'compare', key: 'k', title: '標題', description: '', publishedAt: '', hkt: '', mode: 'ai',
      blocks: [{ title: '事件經過', sentences: ['一。'], sources: [{ title: 'Gauff abuse', url: 'https://www.bbc.co.uk/sport/1', source: 'BBC 體育' }] }],
      citations: [
        { title: 'bbc.com', url: 'https://www.bbc.com/news/1', source: 'bbc.com' },
        { title: 'coco gauff racist abuse china open b3061943', url: 'https://edition.cnn.com/x', source: 'cnn.com' },
        { title: 'straitstimes.com', url: 'https://www.straitstimes.com/a', source: 'straitstimes.com' },
        { title: 'Gauff falls to Mertens', url: 'https://www.straitstimes.com/b', source: 'straitstimes.com' },
        { title: 'Gauff second', url: 'https://www.straitstimes.com/c', source: 'straitstimes.com' },
        { title: 'Gauff abuse', url: 'https://www.bbc.co.uk/sport/1', source: 'BBC 體育' },
      ],
    };
    const listed = sourceList(doc);
    expect(listed.map((source) => source.url)).toEqual([
      'https://edition.cnn.com/x',
      'https://www.straitstimes.com/b',
      'https://www.bbc.co.uk/sport/1',
    ]);
    expect(listed[0]?.title).toBe('Coco gauff racist abuse china open');
  });
});

describe('briefing picking', () => {
  it('drops promotions and foreign stories and ranks by coverage', () => {
    const now = new Date('2026-10-08T00:30:00.000Z');
    expect(briefingNews(item('p', '自助餐優惠｜尖沙咀酒店限時5折', 'Yahoo 新聞', 'hk'), 'hk')).toBe(false);
    expect(briefingNews(item('f', '加州虐兒恐怖屋｜華裔夫妻代孕逾21孩', '星島中國', 'china'), 'china')).toBe(false);
    expect(briefingNews(item('c', '歐中貿易談判前夕 中國官媒稱有工具反制', 'CNA 兩岸', 'china'), 'china')).toBe(true);
    const items = [
      item('a1', '東涌地盤工人墮斃 勞工處調查', '香港電台', 'hk'),
      item('a2', '東涌地盤工人墮斃 勞工處發停工令', 'Now 新聞', 'hk'),
      item('a3', '東涌地盤工人墮斃', '有線新聞', 'hk'),
      item('b1', '天文台發出黃色暴雨警告', '香港電台', 'hk', '2026-10-08T00:20:00.000Z'),
      item('p1', '好去處2026｜淺水灣花園派對', 'Yahoo 新聞', 'hk'),
      item('old', '上星期港聞', '香港電台', 'hk', '2026-10-05T00:00:00.000Z'),
    ];
    const picked = selectBriefingItems(items, now).hk.map((row) => row.id);
    expect(picked).not.toContain('p1');
    expect(picked).not.toContain('old');
    expect(picked).toContain('b1');
  });
});

describe('today sitemap paths', () => {
  it('lists nothing but /today/ for a thin day', () => {
    expect(indexableTodayPaths(buildToday({ clusters: [], date: '2026-10-08' }))).toEqual(['/today/']);
  });
});

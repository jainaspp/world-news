import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';
import { articleRoom, applyBundles, applyDelta, matchEvent, monthPaceUsd, newLinks, overPace, parseDelta, titlesAreSameEvent, type StoredEvent } from '../shared/research';
import type { StoryCluster } from '../shared/angles';
import type { NewsItem } from '../shared/types';

const NOW = new Date('2026-10-07T04:00:00.000Z');

function item(id: string, title: string, link = `https://example.com/${id}`): NewsItem {
  return {
    id,
    title,
    link,
    source: '香港電台',
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: '2026-10-07T01:00:00.000Z',
    category: 'hk',
  };
}

function cluster(items: NewsItem[]): StoryCluster {
  const lead = items[0]!;
  return { id: lead.id, lead, items, sources: ['香港電台'], count: 2, latest: NOW.getTime() };
}

function doc(): ContentDoc {
  return {
    kind: 'compare',
    key: '2026-10-07-cheese',
    title: '食安中心呼籲停食一批法國進口芝士',
    description: '說明',
    publishedAt: '2026-10-07T01:00:00.000Z',
    hkt: '',
    mode: 'ai',
    model: 'grok-4.3',
    points: ['一批法國進口芝士疑受污染。', '食安中心呼籲不要食用。', '進口商須停售相關批次。'],
    blocks: [
      {
        title: '事件時間線',
        sentences: ['香港電台：食安中心呼籲不要食用。'],
        sources: [{ title: '食安中心呼籲不要食用', url: 'https://news.rthk.hk/a', source: '香港電台', pubDate: '2026-10-07T01:00:00.000Z' }],
      },
      {
        title: '事件經過',
        sentences: ['食安中心表示一批法國進口包裝芝士疑受產志賀毒素大腸桿菌污染，已呼籲市民不要食用，進口商須停售。'.repeat(8)],
        sources: [],
      },
    ],
  };
}

describe('research bundles and follow-ups', () => {
  it('stops new articles once month-to-date spend passes the linear pace', () => {
    const pace = monthPaceUsd(NOW);
    expect(pace).toBeCloseTo((7 / 31) * 10, 6);
    expect(articleRoom(0, NOW)).toBeGreaterThan(9);
    expect(overPace(pace, NOW)).toBe(true);
    expect(overPace(0, NOW)).toBe(false);
    expect(articleRoom(pace - 0.01, NOW)).toBe(0);
  });

  it('reuses a same-day bundle and matches a stored event only when a link is new', () => {
    const headline = item('rthk', '一批法國進口芝士或受產志賀毒素大腸桿菌污染 當局籲勿食用');
    const bundled = applyBundles([headline], [{
      signature: 'abc',
      title: '法國進口包裝芝士疑受大腸桿菌污染 食安中心呼籲不要食用',
      date: '2026-10-07',
      urls: ['https://example.com/other'],
      excerpts: [{ url: 'https://example.com/other', source: '有線新聞', title: '法國進口包裝芝士疑受大腸桿菌污染', text: '食'.repeat(120) }],
      chars: 120,
    }]);
    expect(bundled[0]?.excerpt?.length).toBeGreaterThan(80);
    expect(titlesAreSameEvent(
      '法國進口包裝芝士疑受大腸桿菌污染 食安中心呼籲不要食用',
      '一批法國進口芝士或受產志賀毒素大腸桿菌污染 當局籲勿食用',
    )).toBe(true);
    const event: StoredEvent = {
      key: '2026-10-07-cheese',
      title: '食安中心呼籲停食一批法國進口芝士',
      leadTitle: '法國進口包裝芝士疑受大腸桿菌污染 食安中心呼籲不要食用',
      links: ['https://example.com/rthk'],
      at: NOW.getTime(),
      signature: 'abc',
    };
    const same = cluster([headline, item('cable', '法國進口包裝芝士疑受大腸桿菌污染', 'https://example.com/new')]);
    expect(matchEvent(same, [event], NOW.getTime())?.key).toBe(event.key);
    expect(newLinks(same, event)).toEqual(['https://example.com/new']);
    expect(newLinks(cluster([headline]), event)).toEqual([]);
  });

  it('appends a timeline row and shows the update time', () => {
    expect(parseDelta('```json\n{"timeline":[{"source":"明報","title":"進口商停售"}],"follow":"進口商須交回未售出的批次。"}\n```')).toMatchObject({
      timeline: [{ source: '明報', title: '進口商停售' }],
      follow: '進口商須交回未售出的批次。',
    });
    expect(parseDelta('不是 JSON')).toBeNull();
    const applied = applyDelta(doc(), {
      timeline: [{ source: '明報', title: '進口商已停售相關批次' }],
      follow: '進口商須交回未售出的批次。',
    }, [{
      source: '明報',
      title: '進口商已停售相關批次',
      url: 'https://news.mingpao.com/b',
      pubDate: '2026-10-07T08:00:00.000Z',
    }], NOW);
    expect(applied.changed).toBe(true);
    expect(applied.doc.updatedAt).toBe(NOW.toISOString());
    expect(applied.doc.blocks[0]?.sources.map((source) => source.url)).toEqual([
      'https://news.rthk.hk/a',
      'https://news.mingpao.com/b',
    ]);
    const again = applyDelta(applied.doc, {
      timeline: [{ source: '路透', title: '阿爾弗雷德忌辰' }],
    }, [{ source: '明報', title: '進口商已停售相關批次', url: 'https://news.mingpao.com/b' }], NOW);
    expect(again.changed).toBe(false);
    const html = renderContentPage(applied.doc, 'https://world-news.xyz/explainer/k');
    expect(html).toContain('最後更新');
  });
});

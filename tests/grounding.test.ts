import { describe, expect, it } from 'vitest';
import { analysisFromCluster, applyModelText, guardDoc, renderContentPage } from '../shared/content';
import { bracketNames, englishNames, fixOutlets, PLACES, scrubPlaces, ungroundedPlaces } from '../shared/grounding';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

const NOBEL = [
  ['a', 'Nobel prize in physics goes to Francis Halzen for south pole work on neutrinos', 'Guardian 科學', 'The IceCube observatory in Antarctica tracks particles from deep space.'],
  ['b', "Francis Halzen wins Nobel Prize in Physics for work on 'ghost particles'", 'Al Jazeera', 'The physicist built a detector at the South Pole.'],
  ['c', "'Ghost particles' from space telescope wins physics Nobel", 'BBC News', 'A detector buried in Antarctic ice.'],
];

function nobelCluster(): StoryCluster {
  const items: NewsItem[] = NOBEL.map(([id, title, source, excerpt]) => ({
    id: id!, title: title!, link: `https://example.com/${id}`, source: source!, sourceUrl: 'https://example.com',
    regions: ['INT'], pubDate: '2026-10-06T10:00:00Z', category: 'science', excerpt: excerpt!,
  }));
  return { id: 'a', lead: items[0]!, items, sources: items.map((i) => i.source), count: 3, latest: 0 };
}

describe('grounding guard', () => {
  it('has about sixty countries and masks shorter forms inside longer ones', () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(60);
    expect(ungroundedPlaces('印度尼西亞發生地震', 'Indonesia earthquake')).toEqual([]);
    expect(ungroundedPlaces('印度尼西亞發生地震', 'Earthquake hits')).toEqual(['印度尼西亞']);
    expect(ungroundedPlaces('俄羅斯官員', 'Russia says')).toEqual([]);
    // "us" (the word) does not support 美國; "US" does.
    expect(ungroundedPlaces('美國總統', 'tell us more')).toEqual(['美國']);
    expect(ungroundedPlaces('美國總統', 'US president')).toEqual([]);
  });

  it('drops an unsupported nationality modifier and keeps the rest of the sentence', () => {
    const haystack = NOBEL.map((row) => `${row[1]} ${row[3]}`).join(' ');
    expect(scrubPlaces('法國籍物理學家哈岑獲獎。', haystack)).toMatchObject({ text: '物理學家哈岑獲獎。', dropped: false });
    expect(scrubPlaces('法國物理學家哈岑獲獎。', haystack).text).toBe('物理學家哈岑獲獎。');
    expect(scrubPlaces('卡塔爾新聞指出哈岑專注研究。', haystack).text).toBe('有媒體指出哈岑專注研究。');
    // Not a clean modifier: the sentence goes.
    expect(scrubPlaces('哈岑在法國完成研究。', haystack).dropped).toBe(true);
    // Supported in the sources: kept.
    expect(scrubPlaces('俄羅斯官員回應。', 'Russia responds').text).toBe('俄羅斯官員回應。');
  });

  it('maps model-written outlet names to the configured feed name', () => {
    const fixed = fixOutlets('英國《觀察者》報導指哈岑獲獎，半島電視台亦有報道。', ['Guardian 科學', 'Al Jazeera', 'BBC News']);
    expect(fixed.text).toBe('英國Guardian 科學報導指哈岑獲獎，Al Jazeera亦有報道。');
    expect(fixOutlets('路透社報道', ['BBC News']).text).toBe('有媒體報道');
    expect(fixOutlets('衛報體育報道', ['Guardian 體育']).text).toBe('Guardian 體育報道');
  });

  it('brackets the English name after the first transliteration', () => {
    const names = englishNames(NOBEL.map((row) => row[1]).join(' '), ['Guardian 科學', 'Al Jazeera', 'BBC News']);
    expect(names).toContain('Francis Halzen');
    expect(bracketNames(['法蘭西斯·哈岑獲獎。', '法蘭西斯·哈岑表示。'], names).texts).toEqual(['法蘭西斯·哈岑（Francis Halzen）獲獎。', '法蘭西斯·哈岑表示。']);
  });

  it('rejects the fabricated Nobel title and nationality end to end', () => {
    const draft = analysisFromCluster(nobelCluster());
    const doc = applyModelText(draft, JSON.stringify({
      title: '物理學諾貝爾獎頒予研究「幽靈粒子」的法國西斯·哈岑',
      sections: [
        { heading: '背景', text: '法國籍物理學家法蘭西斯·哈岑因在南極建設觀測站而獲頒物理學諾貝爾獎。卡塔爾新聞指出哈岑專注於追蹤中微子。' },
        { heading: '各方說法', text: '英國《觀察者》報導指哈岑因南極冰立方研究獲獎。哈岑在法國長大。' },
      ],
      outlets: [{ n: 1, angle: '法國科學家獲獎' }, { n: 2, angle: '報道哈岑在南極的觀測站' }],
    }))!;
    const text = [doc.title, ...doc.blocks.flatMap((b) => b.sentences), ...doc.blocks[0]!.sources.map((s) => s.angle || '')].join(' ');
    expect(text).not.toMatch(/法國|卡塔爾|觀察者/);
    expect(doc.title).toBe(NOBEL[0]![1]);
    expect(doc.blocks[0]!.sentences[0]).toBe('物理學家法蘭西斯·哈岑（Francis Halzen）因在南極建設觀測站而獲頒物理學諾貝爾獎。');
    expect(doc.blocks[0]!.sentences[1]).toBe('有媒體指出哈岑專注於追蹤中微子。');
    expect(doc.guard?.length).toBeGreaterThan(0);
    expect(renderContentPage(doc, 'https://world-news.xyz/analysis/x')).not.toContain('法國');
  });

  it('leaves grounded text alone', () => {
    const draft = analysisFromCluster(nobelCluster());
    const doc = guardDoc({ ...draft, mode: 'ai', blocks: [{ ...draft.blocks[0]!, sentences: ['南極觀測站追蹤中微子。'] }] });
    expect(doc.guard).toBeUndefined();
    expect(doc.blocks[0]!.sentences).toEqual(['南極觀測站追蹤中微子。']);
  });
});

import { toHK } from '../shared/zh';

describe('place names in conversion and digest titles', () => {
  it('keeps 里 in transliterations and converts it in 這裏/裏面', () => {
    expect(toHK('法国里尔学生抗议，马德里')).toBe('法國里爾學生抗議，馬德里');
    expect(toHK('这里面')).toBe('這裏面');
  });

  it('does not let a translated digest title support its own invented country', async () => {
    const { digestFromClusters } = await import('../shared/content');
    const item = (id: string, source: string): NewsItem => ({
      id, title: 'Watch: At the scene of student protests in Lille', link: `https://e.com/${id}`, source, sourceUrl: 'https://e.com',
      regions: ['EUR'], pubDate: '2026-10-06T10:00:00Z', category: 'world', excerpt: 'Students gathered outside the university.',
    });
    const cluster = { id: 'x', lead: item('x', 'BBC News'), items: [item('x', 'BBC News'), item('y', 'BBC 歐洲')], sources: ['BBC News', 'BBC 歐洲'], count: 2, latest: 0 };
    const doc = digestFromClusters([cluster], '2026-10-06-pm');
    const out = applyModelText(doc, JSON.stringify({ items: [{ n: 1, title: '法國里爾學生抗議活動現場', sentences: ['學生在大學外聚集。', '現場有大批學生。', 'BBC 有報道。'] }] }))!;
    expect(out.blocks[0]!.title).toBe('Watch: At the scene of student protests in Lille');
    expect(out.guard?.some((line) => line.includes('法國'))).toBe(true);
  });
});

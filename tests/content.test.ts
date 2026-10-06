import { describe, expect, it } from 'vitest';
import {
  AI_MODEL,
  analysisFromCluster,
  analysisSlug,
  applyModelText,
  digestFromClusters,
  draftSentences,
  estimateNeurons,
  isGenerateAuthorized,
  promptFor,
  renderContentPage,
  slotId,
  weeklyEdition,
  weeklyFromHeadlines,
} from '../shared/content';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

function story(id: string, title: string, source: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: '2026-10-06T01:00:00Z',
    category: 'world',
    excerpt: `${title}的短描述`,
  };
}

function cluster(items: NewsItem[]): StoryCluster {
  const lead = items[0];
  if (!lead) throw new Error('empty');
  return {
    id: lead.id,
    lead,
    items,
    sources: [...new Set(items.map((item) => item.source))],
    count: new Set(items.map((item) => item.source)).size,
    latest: Date.parse(lead.pubDate),
  };
}

describe('AI content', () => {
  it('picks the Hong Kong morning and evening slots', () => {
    expect(slotId(new Date('2026-10-05T23:30:00Z'))).toBe('2026-10-06-am');
    expect(slotId(new Date('2026-10-06T10:30:00Z'))).toBe('2026-10-06-pm');
    expect(weeklyEdition(new Date('2026-10-06T04:00:00Z'))).toBe('2026-10-04');
  });

  it('builds a stable analysis slug and a three-sentence draft from the titles only', () => {
    const sources = [
      { title: '立法會通過開支預算', url: 'https://news.rthk.hk/a', source: '香港電台' },
      { title: '立法會通過開支預算案', url: 'https://www.scmp.com/a', source: 'SCMP' },
    ];
    expect(analysisSlug('立法會通過開支預算')).toBe(analysisSlug('立法會通過開支預算'));
    expect(analysisSlug('立法會通過開支預算')).toMatch(/-[0-9a-f]{12}$/);
    const lines = draftSentences(sources);
    expect(lines).toHaveLength(3);
    expect(lines.join('')).toContain('立法會通過開支預算');
    expect(lines.join('')).toContain('香港電台');
    expect(lines.join('')).not.toMatch(/\d{4}億/);
    const analysis = analysisFromCluster(cluster([
      story('a', '立法會通過開支預算', '香港電台'),
      story('b', '立法會通過開支預算案', 'SCMP'),
      story('c', '立法會開支預算', 'HKFP'),
    ]));
    expect(analysis.blocks.map((block) => block.title)).toEqual(['背景', '各方說法', '與香港的關係']);
    const page = renderContentPage(analysis, 'https://world-news.xyz/analysis/demo');
    expect(page).toContain('背景');
    expect(page).toContain('各方說法');
    expect(page).toContain('與香港的關係');
    expect(page).toContain('https://example.com/a');
  });

  it('requires the generate header and renders indexable HTML', () => {
    expect(isGenerateAuthorized(null, undefined)).toBe(false);
    expect(isGenerateAuthorized('secret', 'secret')).toBe(true);
    const doc = digestFromClusters([
      cluster([story('a', '港鐵加價建議', '香港電台'), story('b', '港鐵加價建議交諮詢', 'SCMP')]),
    ], '2026-10-06-am', new Date('2026-10-06T00:00:00Z'));
    expect(doc.blocks[0]?.sentences).toHaveLength(3);
    expect(doc.blocks[0]?.sources).toHaveLength(2);
    const html = renderContentPage(doc, 'https://world-news.xyz/digest/2026-10-06-am');
    expect(html).toContain('AI 整合');
    expect(html).toContain('rel="canonical" href="https://world-news.xyz/digest/2026-10-06-am"');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('香港時間');
    expect(html).toContain('https://example.com/a');
    const prompt = promptFor(doc);
    expect(prompt.system).toContain('禁止');
    expect(prompt.user).toContain('港鐵加價建議');
    expect(AI_MODEL).toContain('qwen');
  });

  it('keeps model JSON only when every digest item has three sentences', () => {
    const doc = weeklyFromHeadlines(
      [{ title: '晶片出口新規', url: 'https://example.com/t', source: 'BBC 科技' }],
      [{ title: '港股半日升', url: 'https://example.com/b', source: '港台財經' }],
      '2026-10-04',
    );
    const updated = applyModelText(doc, '{"sections":[{"heading":"一週科技","text":"來源提到晶片出口新規。來源未有提及金額。"},{"heading":"一週財經","text":"來源提到港股半日升。"}]}');
    expect(updated?.mode).toBe('ai');
    expect(updated?.blocks[0]?.sentences[0]).toContain('晶片');
    expect(updated?.blocks[1]?.sources[0]?.url).toBe('https://example.com/b');
    expect(applyModelText(doc, 'not json')).toBeNull();
  });

  it('stays under the free daily neuron allowance', () => {
    const digest = estimateNeurons(1200, 1200) * 2;
    const analysis = estimateNeurons(800, 700) * 8;
    const weekly = estimateNeurons(1500, 900) / 7;
    expect(digest + analysis + weekly).toBeLessThan(400);
    expect(digest + analysis + weekly).toBeLessThan(10_000);
  });
});

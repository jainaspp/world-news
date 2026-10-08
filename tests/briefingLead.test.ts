import { describe, expect, it } from 'vitest';
import { guardDoc, type ContentDoc } from '../shared/content';

const sources = [
  { source: '星島', title: '觀塘火警男童獲救 母親被捕', url: 'https://example.com/1', excerpt: '觀塘翠屏北邨翠桃樓昨晚發生火警，消防人員救出一名13歲男童，母親被捕。' },
  { source: '新聞公報', title: '選委會提名首日接305份候選人提名表格', url: 'https://example.com/2', excerpt: '選舉主任首日共接獲305份候選人提名表格。' },
];
const doc = {
  kind: 'briefing', key: '2026-10-08-am', mode: 'ai', provider: 'grok', model: 'grok-4.3',
  title: '觀塘火警男童獲救母親被捕',
  description: '觀塘翠屏北邨翠桃樓昨晚發生火警，消防人員救出一名13歲男童。',
  points: ['觀塘火警男童獲救母親被捕', '選委會提名首日接305份候選人提名表格'],
  blocks: [{ title: '香港', category: 'hk', sources, sentences: ['觀塘翠屏北邨翠桃樓昨晚發生火警，消防人員救出一名13歲男童。', '選舉主任首日共接獲305份候選人提名表格。'] }],
  publishedAt: '2026-10-08T00:06:31.515Z', hkt: '',
} as unknown as ContentDoc;

describe('briefing lead', () => {
  it('replaces a copy of the first sentence with a 今日要聞 overview', () => {
    expect(guardDoc(doc).description).toBe('今日要聞：觀塘火警男童獲救母親被捕；選委會提名首日接305份候選人提名表格。');
  });

  it('keeps a grounded 今日要聞 line from the model', () => {
    const written = '今日要聞：觀塘火警男童獲救，選委會提名首日接獲305份表格。';
    expect(guardDoc({ ...doc, description: written }).description).toBe(written);
  });
});

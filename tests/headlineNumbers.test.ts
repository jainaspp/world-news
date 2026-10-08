import { describe, expect, it } from 'vitest';
import type { ContentDoc } from '../shared/content';
import { alignHeadlineNumbers, briefingOverview, headlineLength, headlineShapeOk, headlineStories, settleBriefingHeadline } from '../shared/headlineNumbers';
import { formatTelegramPost } from '../shared/telegramPost';

const doc = {
  kind: 'briefing', key: '2026-10-08-am', mode: 'ai', provider: 'grok', model: 'grok-4.3',
  title: '觀塘火警男童窗外獲救選委提名首日收305份',
  description: '觀塘翠屏北邨翠桃樓昨晚發生火警。',
  points: ['觀塘火警男童獲救母親被捕', '選委會提名首日接307份', '東湧地盤工人高處墮下不治'],
  blocks: [{ title: '香港', sentences: ['各界別分組選舉主任首日共接獲305份候選人提名表格及2份指定團體提名表格。'], sources: [], category: 'hk' }],
  publishedAt: '2026-10-08T00:06:31.515Z', hkt: '',
} as unknown as ContentDoc;

describe('headline numbers', () => {
  it('drops a point whose number the body does not state', () => {
    const fixed = alignHeadlineNumbers(doc);
    expect(fixed.points).toEqual(['觀塘火警男童獲救母親被捕', '東湧地盤工人高處墮下不治']);
    expect(fixed.title).toBe(doc.title);
    expect(alignHeadlineNumbers({ ...doc, title: '選委提名首日收999份' }).title).toBe('觀塘火警男童獲救母親被捕');
  });

  it('ends each Telegram summary line with a full stop and keeps the link', () => {
    const text = formatTelegramPost({ ...doc, points: ['觀塘火警男童獲救母親被捕', '選委會提名首日接305份候選人提名表格。', '東湧地盤工人高處墮下不治 '] });
    expect(text).toBe('《觀塘火警男童窗外獲救選委提名首日收305份》\n\n觀塘火警男童獲救母親被捕。\n選委會提名首日接305份候選人提名表格。\n東湧地盤工人高處墮下不治。\n\nhttps://world-news.xyz/briefing/2026-10-08-am/');
  });
});

describe('briefing headline shape', () => {
  const points = ['觀塘火警男童獲救母親被捕', '選委會提名首日接305份候選人提名表格', '東湧地盤工人高處墮下不治', '內地前記者洪廣玉涉尋釁滋事被拘'];
  const body = [{ title: '香港', sentences: ['觀塘火警男童獲救，母親被捕。', '各界別分組選舉主任首日共接獲305份候選人提名表格及2份指定團體提名表格。', '東湧地盤工人高處墮下不治。'], sources: [], category: 'hk' }];
  const shaped = (title: string, extra: Partial<ContentDoc> = {}) => settleBriefingHeadline({ ...doc, title, points, blocks: body, ...extra } as ContentDoc);

  it('rejects three stories glued together and leads with one', () => {
    const glued = '香港觀塘單位火警救出男童選委會提名首日收307份東湧地盤工人墮下不治';
    expect(headlineShapeOk(glued, points)).toBe(false);
    expect(headlineStories(glued, points)).toBe(3);
    const fixed = shaped(glued);
    expect(fixed.title).toBe('觀塘火警男童獲救母親被捕');
    expect(fixed.points).toEqual(points.slice(1));
  });

  it('needs full-width punctuation before a second story and a length cap', () => {
    expect(headlineShapeOk('觀塘火警男童窗外獲救選委提名首日收305份', points)).toBe(false);
    expect(headlineShapeOk('觀塘火警男童窗外獲救；選委會提名首日收305份', points)).toBe(true);
    expect(headlineShapeOk('觀塘火警男童窗外獲救，母親涉嫌疏忽照顧被捕', points)).toBe(true);
    expect(headlineShapeOk('俄軍大規模空襲烏克蘭至少24死，厄立特里亞士兵現身埃塞北部', [])).toBe(true);
    expect(headlineLength('ICANN開放新頂級域名申請，微軟Surface Laptop Ultra十月上市')).toBe(19);
    expect(headlineShapeOk('觀塘翠屏北邨翠桃樓單位昨晚發生火警消防人員在冷氣機頂部救出十三歲男童', points)).toBe(false);
    expect(shaped('觀塘火警男童窗外獲救選委提名首日收305份').title).toBe('觀塘火警男童獲救母親被捕');
    expect(shaped('觀塘火警男童窗外獲救；選委會提名首日收305份').title).toBe('觀塘火警男童窗外獲救；選委會提名首日收305份');
  });

  it('keeps the lead an overview that follows the kept points', () => {
    const stale = briefingOverview(['觀塘火警男童獲救母親被捕', '選委會提名首日接307份', '東湧地盤工人高處墮下不治']);
    const fixed = shaped('觀塘火警男童窗外獲救；選委會提名首日收305份', { description: stale!, points: ['觀塘火警男童獲救母親被捕', '選委會提名首日接307份', '東湧地盤工人高處墮下不治'] });
    expect(fixed.description).toBe('今日要聞：觀塘火警男童獲救母親被捕；東湧地盤工人高處墮下不治。');
  });
});

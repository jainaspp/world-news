import { describe, expect, it } from 'vitest';
import type { ContentDoc } from '../shared/content';
import { alignHeadlineNumbers } from '../shared/headlineNumbers';
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

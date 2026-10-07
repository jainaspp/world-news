import { describe, expect, it } from 'vitest';
import { keepStoredExplainer } from '../functions/content/columns';
import type { ContentDoc } from '../shared/content';

const sentence = '這是一句關於事件經過的完整句子，交代時間、地點和人物，並引述官員的說法。';
const doc = (chars: number, extra: Partial<ContentDoc> = {}) => ({
  kind: 'compare', key: 'k', title: '中文標題', description: '摘要', mode: 'ai', provider: 'grok',
  points: ['重點一很長的句子', '重點二很長的句子'],
  blocks: [{ title: '事件時間線', sentences: ['a'], sources: [] }, { title: '事件經過', sentences: Array.from({ length: Math.ceil(chars / sentence.length) }, () => sentence), sources: [] }],
  ...extra,
}) as unknown as ContentDoc;

describe('keep the better explainer', () => {
  it('keeps a listed piece over an unlistable rewrite', () => {
    expect(keepStoredExplainer(doc(600), doc(300))).toBe(true);
    expect(keepStoredExplainer(doc(600), doc(700, { provider: 'minimax', stage: 'checked' }))).toBe(true);
  });
  it('keeps a listed piece over a listable rewrite more than 15% shorter', () => {
    expect(keepStoredExplainer(doc(800), doc(600))).toBe(true);
    expect(keepStoredExplainer(doc(800), doc(760))).toBe(false);
  });
  it('replaces an unlisted piece', () => {
    expect(keepStoredExplainer(doc(300), doc(200))).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { applyVerify, cleanExtract, parseVerify, verifyPrompt, verifySources } from '../functions/content/grokVerify';
import { briefingPublic, heldMiniMax, type ContentDoc } from '../shared/content';

const doc = {
  kind: 'briefing',
  key: '2026-10-08-am-world',
  title: '標題',
  description: '摘要',
  points: ['重點一', '重點二'],
  mode: 'ai',
  provider: 'minimax',
  blocks: [{ title: '國際', sentences: ['第一句。', '第二句有數萬次。', '第三句。'], sources: [{ source: 'BBC', title: 'T', url: 'https://bbc.co.uk/a', excerpt: 'Robots press buttons thousands of times. .x{color:red}' }] }],
} as unknown as ContentDoc;

describe('grok verification pass', () => {
  it('parses verdicts, treating ok as unchanged', () => {
    const parsed = parseVerify('```json\n{"title":"ok","points":{"p0":"ok","p1":""},"fix":{"b0s0":"ok","b0s1":"第二句有數千次。","b0s2":""}}\n```');
    expect(parsed).toEqual({ points: { p1: '' }, fix: { b0s1: '第二句有數千次。', b0s2: '' } });
    const applied = applyVerify(doc, parsed!);
    expect(applied.changed).toBe(3);
    expect(applied.doc.blocks[0]!.sentences).toEqual(['第一句。', '第二句有數千次。']);
    expect(applied.doc.points).toEqual(['重點一']);
  });
  it('rejects unparsable output', () => {
    expect(parseVerify('no json')).toBeNull();
  });
  it('drops leaked page CSS from extracts and numbers the sentences', () => {
    expect(cleanExtract('Real sentence. .x{color:red}')).toBe('Real sentence.');
    expect(verifySources(doc)).toHaveLength(1);
    expect(verifyPrompt(doc)!.user).toContain('"b0s1"');
  });
  it('keeps unverified MiniMax pieces held', () => {
    expect(heldMiniMax(doc)).toBe(true);
    expect(heldMiniMax({ ...doc, verified: 'grok' })).toBe(false);
    expect(heldMiniMax({ ...doc, verified: 'grok', stage: 'verify' })).toBe(true);
    expect(heldMiniMax({ ...doc, provider: 'grok' })).toBe(false);
    expect(briefingPublic(doc)).toBe(false);
  });
});

describe('verify pace', () => {
  it('allows spend within the straight-line share of the cap', async () => {
    const { verifyPaceOk } = await import('../functions/content/columns');
    const oct8 = new Date('2026-10-08T00:00:00+08:00');
    expect(verifyPaceOk(1.69, oct8)).toBe(true);
    expect(verifyPaceOk(2.7, oct8)).toBe(false);
  });
});

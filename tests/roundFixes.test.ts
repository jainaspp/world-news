import { describe, expect, it } from 'vitest';
import { extractArticle, jsonLdBody, looksLikeCode, stripCode } from '../shared/articleText';
import { rejoinQuotes, splitSentences } from '../shared/prose';
import { explainerCurrent, explainerFloor, type ContentDoc } from '../shared/content';
import { fillPoints, nearDuplicate, pointFrom } from '../functions/content/minimax';
import { monthUsage, saveUsage } from '../functions/content/usage';
import { withTokens } from '../shared/grok';

const para = (text: string) => `<p>${text}</p>`;
const long = 'The minister said the policy would be reviewed next year after a consultation with unions and employers. ';

describe('article extraction', () => {
  it('drops an inline style left unclosed by the byte cap', () => {
    const html = `<html><head><meta property="og:description" content="Summary of the story here."></head><body><article>${para(long)}${para(long + 'Second.')}</article><style>.a{color:red}.b{x:1}`;
    const text = extractArticle(html, 2500);
    expect(text).toContain('The minister said');
    expect(text).not.toContain('color:red');
    expect(stripCode('<p>ok</p><script>var a = 1;')).toBe('<p>ok</p> ');
  });
  it('prefers JSON-LD articleBody', () => {
    const body = long.repeat(4);
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","articleBody":${JSON.stringify(body)}}]}</script><p>${'menu '.repeat(20)}</p>`;
    expect(jsonLdBody(html).length).toBeGreaterThan(300);
    expect(extractArticle(html, 2500)).toContain('The minister said');
  });
  it('reads a body opened by itemprop past nested divs', () => {
    const html = `<div itemprop="articleBody"><div class="ad"></div>${para(long)}<div>${para(long + 'More detail follows.')}</div></div>`;
    expect(extractArticle(html, 2500)).toContain('More detail follows.');
  });
  it('keeps a drop-cap word whole and flags code', () => {
    expect(extractArticle(`<article>${para(`<span class="dcr">M</span>ore fire, more ash. ${long}`)}</article>`, 2500)).toContain('More fire');
    expect(looksLikeCode('.dcr-95ins{position:absolute;right:8px;}}.x svg{height:24px;}')).toBe(true);
    expect(looksLikeCode(long)).toBe(false);
  });
});

describe('quote-aware sentences', () => {
  it('never splits inside 「」', () => {
    expect(splitSentences('他表示：「這是第一句。這是第二句。」記者追問。')).toEqual(['他表示：「這是第一句。這是第二句。」', '記者追問。']);
  });
  it('rejoins stored splits and closes a dangling quote', () => {
    expect(rejoinQuotes(['他說：「第一句。', '第二句。', '」', '下一句。'])).toEqual(['他說：「第一句。第二句。」', '下一句。']);
    expect(rejoinQuotes(['他說：「只有一句。'])).toEqual(['他說：「只有一句。」']);
  });
});

describe('points refill', () => {
  it('omits fragments and near-duplicates', () => {
    expect(pointFrom('馬德里租戶聯盟表示，87歲的瑪麗卡門因無力承擔租金上漲，於9月從她居住了70多年的公寓被用擔架強行抬出，她其後在醫院去世。')).toBe('');
    expect(pointFrom('Royal Mail 宣布計劃裁減2500個總部及支援職位。')).toBe('Royal Mail 宣布計劃裁減2500個總部及支援職位');
    expect(pointFrom('她批評東主頻繁易手。')).toBe('');
    expect(nearDuplicate('俄軍對烏發動130架無人機攻擊，至少24死', '俄羅斯對烏克蘭發動攻擊，俄軍發射了130架無人機，至少24死')).toBe(true);
    const blocks = [{ title: '國際', sentences: ['俄軍發射130架無人機，至少24人死亡。', '俄軍發射130架無人機，至少24人死亡包括兒童。', '厄立特里亞士兵被目擊進入阿迪格拉特。'], sources: [] }];
    expect(fillPoints(['俄軍發射130架無人機，至少24人死亡'], blocks as never)).toEqual(['俄軍發射130架無人機，至少24人死亡', '厄立特里亞士兵被目擊進入阿迪格拉特']);
  });
});

describe('verified MiniMax explainer floor', () => {
  const sentence = '這是一句關於事件經過的完整句子，交代時間、地點和人物，並引述官員的說法。';
  const doc = (chars: number, extra: Partial<ContentDoc>) => ({
    kind: 'compare', key: 'k', title: '中文標題', description: '摘要', mode: 'ai', provider: 'minimax', verified: 'grok',
    points: ['重點一很長的句子', '重點二很長的句子'],
    blocks: [{ title: '事件時間線', sentences: ['a'], sources: [] }, { title: '事件經過', sentences: Array.from({ length: Math.ceil(chars / sentence.length) }, () => sentence), sources: [] }],
    ...extra,
  }) as unknown as ContentDoc;
  it('lists a verified MiniMax explainer from 400 chars with 2 points', () => {
    expect(explainerFloor(doc(420, {}))).toBe(400);
    expect(explainerCurrent(doc(420, {}))).toBe(true);
    expect(explainerCurrent(doc(420, { points: ['只有一點重點'] }))).toBe(false);
    expect(explainerCurrent(doc(420, { provider: 'grok', verified: undefined }))).toBe(false);
  });
});

describe('usage ledger', () => {
  it('parallel saves add up instead of overwriting', async () => {
    const env = {};
    const now = new Date('2031-01-05T00:00:00+08:00');
    const [a, b] = await Promise.all([monthUsage(env, now), monthUsage(env, now)]);
    await Promise.all([saveUsage(env, withTokens(a, 1000, 100)), saveUsage(env, withTokens(b, 2000, 200))]);
    const total = await monthUsage(env, now);
    expect(total.inputTokens).toBe(3000);
    expect(total.outputTokens).toBe(300);
    expect(total.requests).toBe(2);
  });
  it('a second save from the same caller writes only the increment', async () => {
    const env = {};
    const now = new Date('2031-02-05T00:00:00+08:00');
    let usage = await monthUsage(env, now);
    usage = withTokens(usage, 500, 50);
    await saveUsage(env, usage);
    usage = withTokens(usage, 500, 50);
    await saveUsage(env, usage);
    expect((await monthUsage(env, now)).inputTokens).toBe(1000);
  });
});

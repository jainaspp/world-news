import { beforeEach, describe, expect, it } from 'vitest';
import { BOARD_KV_KEY, computeBoard } from '../shared/board';
import { resetKvWriteState, type ContentEnv } from '../functions/content/store';
import { resetUsageState } from '../functions/content/usage';
import { generateTopics, type TopicCompletion } from '../functions/content/topics';
import { anchorText } from '../shared/articleText';
import { parseTopicDraft, parseTopicPack, restorePunctuation, topicBySlug, topicStorageKey } from '../shared/topicPack';
import { renderTopicPage } from '../shared/topicPage';
import type { NewsItem } from '../shared/types';

beforeEach(() => {
  resetKvWriteState();
  resetUsageState();
});

const MORNING = new Date('2026-10-07T23:30:00.000Z');

function memory() {
  const rows = new Map<string, string>();
  const puts: string[] = [];
  const env = {
    CONTENT: {
      async get(key: string) { return rows.get(key) ?? null; },
      async put(key: string, value: string) { puts.push(key); rows.set(key, value); },
      async list() { return { keys: [], list_complete: true }; },
    },
    XAI_API_KEY: 'test-key',
  } as ContentEnv;
  return { rows, puts, env };
}

const HEADLINE: NewsItem = {
  id: 'h', title: '立法會辯論施政報告', link: 'https://example.com/debate', source: '香港電台',
  sourceUrl: 'https://news.rthk.hk', regions: ['HKG'], pubDate: '2026-10-07T01:00:00.000Z', category: 'hk',
};

const OFFICIAL = '行政長官李家超今日（九月十六日）在立法會發表任內第五份《施政報告》。由2027-28年度起，每年平均公營房屋供應量超過35,000個單位，較現時增加約73%。高齡津貼由每月1,675元調整。'.repeat(3);
const DEBATE = '立法會今日起一連三日合併辯論五年規劃及施政報告，多名議員和官員發言，就房屋、經濟、民生等範疇提出意見，討論持續三日，各黨派議員輪流發言。'.repeat(2) + '財政司司長陳茂波說，經濟勢頭良好，來之不易，要為下一階段，持續高質量發展錨定方向。';

const DRAFT = {
  title: '施政報告2026懶人包：房屋供應增加',
  description: '行政長官李家超在立法會發表任內第五份《施政報告》。',
  points: ['李家超在九月十六日發表任內第五份《施政報告》。', '每年平均公營房屋供應量超過35,000個單位，較現時增加約73%。'],
  timeline: [
    { date: '2026-09-16', text: '李家超在立法會發表任內第五份《施政報告》。' },
    { date: '2026-10-07', text: '立法會一連三日合併辯論。' },
    { date: '2026-10-09', text: '立法會辯論結束。' },
  ],
  figures: [{ area: '房屋', label: '每年平均公營房屋供應量', value: '超過35,000個單位' }],
  impact: ['由2027-28年度起，每年平均公營房屋供應量超過35,000個單位。'],
  reactions: ['陳茂波說經濟勢頭良好來之不易要為下一階段持續高質量發展錨定方向。'],
  background: ['每年平均公營房屋供應量較現時增加約73%。'],
};

describe('anchored topics', () => {
  it('rebuilds from pinned sources even with no new headline, caches nothing in KV, and stamps anchors as seen', async () => {
    const store = memory();
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    const topic = topicBySlug('policy-address')!;
    const asked: string[] = [];
    let prompt = '';
    const complete = async (_t: unknown, _s: string, user: string): Promise<TopicCompletion> => {
      prompt = user;
      return { text: JSON.stringify(DRAFT), input: 900, output: 600, searchCalls: 0, provider: 'grok', model: 'grok-4.3' };
    };
    const first = await generateTopics(store.env, {
      now: MORNING,
      anchorText: async (url) => { asked.push(url); return url.includes('1873049') ? DEBATE : OFFICIAL; },
      articleText: async () => DEBATE,
      complete,
    });
    expect(asked).toHaveLength(topic.anchors!.length);
    expect(first.attempted).toEqual(['policy-address']);
    // The anchored rebuild uses the whole model budget of the call.
    expect((first.topics as { slug: string; action: string }[]).find((row) => row.slug === 'budget')?.action).not.toBe('updated');
    expect(prompt).toContain('施政報告網站');
    expect(store.puts.filter((key) => key.startsWith('topic-anchor'))).toHaveLength(0);
    const saved = parseTopicPack(store.rows.get(topicStorageKey('policy-address')) ?? null)!;
    expect(saved.timeline.map((row) => row.date)).toEqual(['2026-09-16', '2026-10-07']);
    expect(saved.reactions[0]).toContain('經濟勢頭良好，來之不易，要為下一階段，持續高質量發展錨定方向');
    expect(saved.background?.length).toBe(1);
    expect(saved.sources.length).toBeGreaterThanOrEqual(10);
    for (const anchor of topic.anchors!) expect(saved.seenLinks).toContain(anchor.url);

    asked.length = 0;
    const second = await generateTopics(store.env, {
      now: MORNING, anchorText: async (url) => { asked.push(url); return OFFICIAL; }, articleText: async () => DEBATE, complete,
    });
    const policyUrls = topic.anchors!.map((anchor) => anchor.url);
    expect(asked.filter((url) => policyUrls.includes(url))).toHaveLength(0);
    expect(second.attempted).not.toContain('policy-address');
    // The budget pack has no headline today and is built from its pinned pages alone.
    expect(second.attempted).toEqual(['budget']);

    const page = renderTopicPage({ topic, pack: saved, headlines: [HEADLINE], others: [] }, 'https://world-news.xyz/topic/policy-address/');
    expect(page).toContain('《香港第一個五年規劃》重點');
    expect(page).toContain('對市民有什麼影響');
    expect(page).toContain('主要措施');
  });

  it('lets a richer rebuild replace a thin pack on refresh', async () => {
    const store = memory();
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    const thin = {
      slug: 'policy-address', title: '立法會辯論施政報告', description: '立法會辯論。', points: ['立法會一連三日合併辯論。', '陳茂波發言。'],
      timeline: [{ date: '2026-10-07', text: '立法會一連三日合併辯論。' }], figures: [], impact: [], reactions: [],
      sources: [], seenLinks: [HEADLINE.link], publishedAt: '2026-10-07T01:00:00.000Z', updatedAt: '2026-10-07T01:00:00.000Z',
      mode: 'ai', provider: 'grok', model: 'grok-4.3',
    };
    store.rows.set(topicStorageKey('policy-address'), JSON.stringify(thin));
    const result = await generateTopics(store.env, {
      now: MORNING,
      force: true,
      refresh: ['policy-address'],
      anchorText: async (url) => (url.includes('1873049') ? DEBATE : OFFICIAL),
      articleText: async () => DEBATE,
      complete: async () => ({ text: JSON.stringify(DRAFT), input: 1, output: 1, searchCalls: 0, provider: 'grok', model: 'grok-4.3' }),
    });
    expect((result.topics as { slug: string; action: string }[])[0]).toMatchObject({ slug: 'policy-address', action: 'updated' });
    const saved = parseTopicPack(store.rows.get(topicStorageKey('policy-address')) ?? null)!;
    expect(saved.figures.length).toBe(1);
    expect(saved.publishedAt).toBe(thin.publishedAt);
  });

  it('falls back to new headlines only when pinned pages are unreachable', async () => {
    const store = memory();
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    store.rows.set(topicStorageKey('policy-address'), JSON.stringify({
      slug: 'policy-address', title: '施政報告', description: '', points: ['甲。', '乙。'], timeline: [], figures: [],
      impact: [], reactions: [], sources: [], seenLinks: [HEADLINE.link], publishedAt: '', updatedAt: '', mode: 'ai', provider: 'grok',
    }));
    let calls = 0;
    const result = await generateTopics(store.env, {
      now: MORNING, anchorText: async () => '', articleText: async () => DEBATE, complete: async () => { calls += 1; return null; },
    });
    expect(calls).toBe(0);
    expect(result.attempted).toEqual([]);
  });
});

describe('grounding helpers', () => {
  it('restores the source commas in reported speech', () => {
    expect(restorePunctuation('陳茂波說經濟勢頭良好來之不易要為下一階段持續高質量發展錨定方向。', DEBATE))
      .toBe('陳茂波說，經濟勢頭良好，來之不易，要為下一階段，持續高質量發展錨定方向。');
    expect(restorePunctuation('完全沒有出現在來源裡的十個以上中文字句子', DEBATE)).toBe('完全沒有出現在來源裡的十個以上中文字句子');
  });

  it('grounds dates written in Chinese numerals and rejects loose numbers', () => {
    const corpus = '二○二六年《施政報告》公眾諮詢將於下星期一（六月二十九日）展開。2026年 共有9個方面和16項建議。';
    const draft = parseTopicDraft(JSON.stringify({
      title: '施政報告諮詢', description: '', points: ['公眾諮詢展開。', '公眾諮詢展開。'],
      timeline: [{ date: '2026-06-29', text: '《施政報告》公眾諮詢展開。' }, { date: '2026-09-16', text: '《施政報告》公眾諮詢展開。' }],
      figures: [], impact: [], reactions: [],
    }), corpus, ['房屋'])!;
    expect(draft.timeline.map((row) => row.date)).toEqual(['2026-06-29']);
  });

  it('reads list-style official pages as whole-page text', () => {
    const html = `<html><head><title>x</title></head><body><nav>選單</nav><div class="c"><ul>${'<li>長者生活津貼每月增加至4,500元以上的措施內容</li>'.repeat(20)}</ul></div><footer>版權</footer></body></html>`;
    const text = anchorText(html, 9000);
    expect(text).toContain('長者生活津貼');
    expect(text).not.toContain('選單');
  });
});

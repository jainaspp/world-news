import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOARD_KV_KEY, computeBoard } from '../shared/board';
import { resetKvWriteState, type ContentEnv } from '../functions/content/store';
import { resetUsageState } from '../functions/content/usage';
import { generateTopics, type TopicCompletion } from '../functions/content/topics';
import { anchorText } from '../shared/articleText';
import { anchoredPrompt, GROUNDED_MIN, groundedShare, parseTopicDraft, parseTopicPack, restorePunctuation, topicBySlug, topicCorpus, topicStorageKey, TOPIC_PACKS } from '../shared/topicPack';
import { XAI_URL } from '../shared/grok';
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

const HOLD = '聯邦公開市場委員會在聲明中決定維持聯邦基金利率目標區間在3.75厘至4厘。經濟活動以穩健步伐擴張，通脹仍然偏高。委員會將繼續維持銀行體系準備金充裕。';
const HOLD_TEXT = HOLD.repeat(3);
const HOLD_DRAFT = {
  title: '',
  description: '聯邦公開市場委員會在聲明中決定維持聯邦基金利率目標區間在3.75厘至4厘。',
  points: [
    '聯邦公開市場委員會在聲明中決定維持聯邦基金利率目標區間在3.75厘至4厘。',
    '經濟活動以穩健步伐擴張，通脹仍然偏高。',
    '委員會將繼續維持銀行體系準備金充裕。',
  ],
  timeline: [{ date: '2026-09-16', text: '聯邦公開市場委員會在聲明中決定維持聯邦基金利率目標區間。' }],
  figures: [{ area: '利率決定', label: '聯邦基金利率目標區間', value: '3.75厘至4厘' }],
  impact: [],
  reactions: [],
  background: [],
};
const OTHER_TOPICS = TOPIC_PACKS.map((topic) => topic.slug).filter((slug) => slug !== 'us-rates');

describe('us-rates anchor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes the pack from pinned pages when no headline matches, and keeps the standing picture', async () => {
    const store = memory();
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    let prompt = '';
    const result = await generateTopics(store.env, {
      now: MORNING,
      force: true,
      refresh: ['us-rates'],
      skip: OTHER_TOPICS,
      anchorText: async () => HOLD_TEXT,
      complete: async (_topic, _system, user) => {
        prompt = user;
        return { text: JSON.stringify(HOLD_DRAFT), input: 10, output: 10, searchCalls: 0, provider: 'grok', model: 'grok-4.3' };
      },
    });
    expect(result.attempted).toEqual(['us-rates']);
    expect((result.topics as { slug: string; action: string }[])).toContainEqual({ slug: 'us-rates', action: 'updated', provider: 'grok' });
    expect(prompt).toContain('不要把欄目名稱當成現況');
    expect(prompt).toContain('資料寫減息、維持利率或加息，就照資料寫');
    expect(prompt).not.toContain('16 至 24');
    expect(prompt).not.toContain('必須寫成加息');
    expect(prompt).toContain('Federal Reserve issues FOMC statement');
    const saved = parseTopicPack(store.rows.get(topicStorageKey('us-rates')) ?? null)!;
    expect(saved.title).toBe('美國加息以及全球經濟影響');
    expect(saved.points.join('')).toContain('維持聯邦基金利率');
    expect(saved.points.join('')).not.toContain('加息');
    expect(saved.picture).toMatchObject({
      url: '/topics/us-rates.jpg',
      alt: '美國聯邦儲備局總部大樓',
      credit: '美國聯邦儲備局，公有領域',
    });
    expect(saved.seenLinks).toContain('https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm');
    const page = renderTopicPage({ topic: topicBySlug('us-rates')!, pack: saved, headlines: [], others: [] }, 'https://world-news.xyz/topic/us-rates/');
    expect(page).toContain('src="/topics/us-rates.jpg"');
    expect(page).toContain('維持聯邦基金利率');
    expect(page).toContain('AI 整合');
  });

  it('does not invent an article when the pinned pages are unreachable', async () => {
    const store = memory();
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    let calls = 0;
    const result = await generateTopics(store.env, {
      now: MORNING,
      force: true,
      refresh: ['us-rates'],
      skip: OTHER_TOPICS,
      anchorText: async () => '',
      complete: async () => { calls += 1; return null; },
    });
    expect(calls).toBe(0);
    expect(result.attempted).toEqual([]);
    expect((result.topics as { slug: string; action: string }[])).toContainEqual({ slug: 'us-rates', action: 'none' });
    expect(store.rows.has(topicStorageKey('us-rates'))).toBe(false);
  });

  it('asks Grok for the long draft instead of the short MiniMax topic path', async () => {
    const store = memory();
    store.env.MINIMAX_API_KEY = 'mini-key';
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    const calls: { url: string; maxTokens?: number }[] = [];
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}')) as { max_tokens?: number };
      calls.push({ url: String(url), maxTokens: body.max_tokens });
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(HOLD_DRAFT) } }],
        usage: { prompt_tokens: 20, completion_tokens: 40 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const result = await generateTopics(store.env, {
      now: MORNING,
      force: true,
      refresh: ['us-rates'],
      skip: OTHER_TOPICS,
      anchorText: async () => HOLD_TEXT,
    });
    expect(result.attempted).toEqual(['us-rates']);
    expect(calls.map((call) => call.url)).toEqual([XAI_URL]);
    expect(calls[0]?.maxTokens).toBe(4000);
    const saved = parseTopicPack(store.rows.get(topicStorageKey('us-rates')) ?? null)!;
    expect(saved.provider).toBe('grok');
    expect(saved.points[0]).toContain('維持');
  });

  it('keeps a supported paraphrase and still drops a sentence the sources do not support', async () => {
    const source = [
      '美國聯儲局逾3年以來首次加息0.25厘，聯邦基金利率目標區間上調至3.75厘至4厘，符合市場預期，加息決定獲得委員一致通過。',
      '聯儲局主席沃什表示，通脹仍然過高，而且持續時間過長，加息將有助推動通脹更及時地回到2%的目標。',
      '香港金管局總裁余偉文表示，美國加息後，港美息差會進一步擴闊，或會見到套息交易令港元走向較弱方向。',
      'The Committee decided to raise the target range for the federal funds rate by 1/4 percentage point to 3-3/4 to 4 percent.',
    ].join('');
    const paraphrase = '聯邦公開市場委員會宣布加息0.25厘，目標區間升至3.75%至4%。';
    const cut = '聯儲局宣布減息1厘，聯邦基金利率降至1厘，以刺激樓市。';
    const crash = '今次加息將令歐元區股市暴跌，並觸發全球經濟衰退。';
    const translated = '經濟活動以穩健步伐擴張，國內支出保持韌性，生產率增長強勁。';
    const topic = topicBySlug('us-rates')!;
    const corpus = topicCorpus(topic.anchors!.map((anchor) => ({
      id: anchor.url, title: anchor.title, link: anchor.url, source: anchor.source, sourceUrl: '', regions: ['hk'],
      pubDate: `${anchor.date}T12:00:00+08:00`, excerpt: source,
    })));
    expect(groundedShare(paraphrase, corpus)).toBeLessThan(GROUNDED_MIN);
    expect(groundedShare(cut, corpus)).toBeLessThan(GROUNDED_MIN);
    expect(groundedShare(cut, corpus)).toBeGreaterThan(0.35);
    const draft = parseTopicDraft(JSON.stringify({
      title: '',
      description: paraphrase,
      points: [paraphrase, '余偉文表示，美國加息後，港美息差會進一步擴闊。', cut, translated],
      timeline: [{ date: '2026-09-16', text: paraphrase }],
      figures: [{ area: '利率決定', label: '聯邦基金利率目標區間', value: '3.75厘至4厘' }],
      impact: [crash],
      reactions: [],
    }), corpus, topic.areas, true, 28);
    expect(draft?.points).toEqual([
      '聯邦公開市場委員會宣布加息0.25釐，目標區間升至3.75%至4%。',
      '餘偉文表示，美國加息後，港美息差會進一步擴闊。',
    ]);
    expect(draft?.impact).toEqual([]);
    expect(draft?.timeline.map((row) => row.text)).toEqual(['聯邦公開市場委員會宣布加息0.25釐，目標區間升至3.75%至4%。']);

    const store = memory();
    store.rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard([HEADLINE])));
    const result = await generateTopics(store.env, {
      now: MORNING,
      force: true,
      refresh: ['us-rates'],
      skip: OTHER_TOPICS,
      anchorText: async () => source.repeat(2),
      complete: async () => ({ text: JSON.stringify({
        title: '',
        description: paraphrase,
        points: [paraphrase, '余偉文表示，美國加息後，港美息差會進一步擴闊。', cut],
        timeline: [{ date: '2026-09-16', text: paraphrase }],
        figures: [{ area: '利率決定', label: '聯邦基金利率目標區間', value: '3.75厘至4厘' }],
        impact: [crash],
        reactions: [],
      }), input: 10, output: 10, searchCalls: 0, provider: 'grok', model: 'grok-4.3' }),
    });
    expect((result.topics as { slug: string; action: string }[])).toContainEqual({ slug: 'us-rates', action: 'updated', provider: 'grok' });
    const saved = parseTopicPack(store.rows.get(topicStorageKey('us-rates')) ?? null)!;
    expect(saved.points[0]).toContain('加息0.25');
    expect(saved.points.join('')).not.toContain('減息');
    expect(saved.impact).toEqual([]);
    expect(saved.picture?.url).toBe('/topics/us-rates.jpg');
  });

  it('leaves the policy and budget anchored instructions unchanged', () => {
    const policy = anchoredPrompt(topicBySlug('policy-address')!, []);
    const budget = anchoredPrompt(topicBySlug('budget')!, []);
    const rates = anchoredPrompt(topicBySlug('us-rates')!, []);
    expect(policy.user).toContain('figures 列出 16 至 24 項具體措施');
    expect(policy.user).toContain('行政長官在2026年9月16日發表《施政報告》');
    expect(policy.user).toContain('每句 30 至 50 字');
    expect(policy.user).not.toContain('不要另寫一套新句子');
    expect(budget.user).toContain('figures 列出 16 至 24 項具體措施');
    expect(budget.user).toContain('每句 30 至 50 字');
    expect(rates.user).toContain('不要另寫一套新句子');
    expect(rates.user).toContain('不要把英文譯成資料中文裡沒有的說法');
    expect(rates.user).not.toContain('每句 30 至 50 字');
    expect(rates.user).not.toContain('figures 列出 16 至 24 項具體措施');
    expect(topicBySlug('us-rates')!.anchors?.map((anchor) => anchor.url)).toEqual([
      'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm',
      'https://news.rthk.hk/rthk/ch/component/k2/1870362-20260917.htm',
      'https://news.rthk.hk/rthk/ch/component/k2/1870390-20260917.htm',
    ]);
  });
});

describe('anchored prompt and number format', () => {
  it('formats spaced thousands, strips a 專題 label, and orders material oldest first', async () => {
    const { thousands, anchoredPrompt } = await import('../shared/topicPack');
    expect(thousands('每年1 900個，超過35 000個單位，2026 年')).toBe('每年1,900個，超過35,000個單位，2026 年');
    const topic = topicBySlug('policy-address')!;
    const prompt = anchoredPrompt(topic, [
      { id: 'b', title: '發表', link: 'https://e.com/b', source: 'B', sourceUrl: '', regions: [], pubDate: '2026-09-16T12:00:00+08:00', excerpt: '乙' },
      { id: 'a', title: '諮詢', link: 'https://e.com/a', source: 'A', sourceUrl: '', regions: [], pubDate: '2026-06-25T12:00:00+08:00', excerpt: '甲' },
    ]);
    expect(prompt.user.indexOf('"諮詢"')).toBeLessThan(prompt.user.indexOf('"發表"'));
    const draft = parseTopicDraft(JSON.stringify({ title: '專題：施政報告懶人包', points: [], timeline: [], figures: [{ area: '醫療', label: '體外受精服務名額', value: '每年1 900個' }] }), '施政報告懶人包 體外受精服務名額每年1 900個', topic.areas)!;
    expect(draft.title).toBe('施政報告懶人包');
    expect(draft.figures[0]?.value).toBe('每年1,900個');
  });
});

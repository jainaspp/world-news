import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetKvWriteState } from '../functions/content/store';
import { resetUsageState } from '../functions/content/usage';
import { BOARD_KV_KEY, computeBoard } from '../shared/board';
import { renderContentPage } from '../shared/contentPage';
import type { ContentDoc } from '../shared/content';
import { renderHomeFeed } from '../shared/homePage';
import {
  keepStoredTopic,
  keywordHits,
  matchTopicItems,
  newTopicLinks,
  parseTopicDraft,
  parseTopicPack,
  topicBySlug,
  topicPrompt,
  topicPublic,
  topicRichness,
  TOPIC_PACKS,
  topicStorageKey,
  topicWarmWindow,
  type TopicPack,
  groundedShare,
} from '../shared/topicPack';
import { renderTopicIndex, renderTopicPage, topicIndexCards } from '../shared/topicPage';
import type { NewsItem } from '../shared/types';
import { generateTopics, type TopicCompletion } from '../functions/content/topics';
import type { ContentEnv } from '../functions/content/store';

beforeEach(() => {
  resetKvWriteState();
  resetUsageState();
});

const MORNING = new Date('2026-10-07T23:30:00.000Z');
const EVENING_OFF = new Date('2026-10-07T12:00:00.000Z');

const EXCERPT = '2026年10月7日，行政長官發表施政報告，提出未來五年公屋供應目標為30000個單位，並寬免差餉10000元。民主黨表示會審視房屋措施是否足夠。';

const MODEL = {
  title: '施政報告提出公屋供應目標',
  description: '行政長官發表施政報告，提出公屋供應目標，並寬免差餉。',
  points: [
    '行政長官發表施政報告，提出房屋與稅務措施。',
    '未來五年公屋供應目標為30000個單位。',
    '差餉寬免額為10000元，民主黨表示會審視房屋措施。',
  ],
  timeline: [{ date: '2026-10-07', text: '行政長官發表施政報告，提出公屋供應目標30000個單位。' }],
  figures: [
    { area: '房屋', label: '未來五年公屋供應目標', value: '30000個單位' },
    { area: '稅務與津貼', label: '差餉寬免額', value: '10000元' },
    { area: '房屋', label: '沒有出現的供應', value: '90000個單位' },
    { area: '房屋', label: '川普提及的目標', value: '30000個單位' },
  ],
  impact: ['合資格住宅的差餉寬免額為10000元。'],
  reactions: ['民主黨表示會審視房屋措施是否足夠。'],
};

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title' | 'link'>): NewsItem {
  return {
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-07T01:00:00.000Z',
    category: 'hk',
    ...partial,
  };
}

function memory(fail = false) {
  const rows = new Map<string, string>();
  const puts: string[] = [];
  const env = {
    CONTENT: {
      async get(key: string) {
        return rows.get(key) ?? null;
      },
      async put(key: string, value: string) {
        if (fail) throw new Error('KV 429 daily limit exceeded');
        puts.push(key);
        rows.set(key, value);
      },
      async list() {
        return { keys: [], list_complete: true };
      },
    },
    XAI_API_KEY: 'test-key',
  } as ContentEnv;
  return { rows, puts, env };
}

function seed(rows: Map<string, string>, items: NewsItem[]) {
  rows.set(BOARD_KV_KEY, JSON.stringify(computeBoard(items)));
}

function completion(search: boolean): TopicCompletion {
  return { text: JSON.stringify(MODEL), input: 120, output: 80, searchCalls: search ? 1 : 0, provider: 'grok', model: 'grok-4.3' };
}

describe('topic pack config and matching', () => {
  it('seeds the Policy Address keywords and does not hardcode this year\'s measures', () => {
    const policy = topicBySlug('policy-address');
    expect(policy?.keywords).toEqual(['施政報告', '行政長官', '李家超 施政', 'policy address']);
    expect(policy?.desk).toBe('hk');
    expect(TOPIC_PACKS.length).toBeGreaterThanOrEqual(5);
    expect(TOPIC_PACKS.length).toBeLessThanOrEqual(8);
    expect(JSON.stringify(TOPIC_PACKS)).not.toContain('30000');
    expect(topicBySlug('us-china')?.desk).toBe('china');
    expect(topicBySlug('ai')?.desk).toBe('other');
  });

  it('matches every keyword part and ignores a partial name', () => {
    expect(keywordHits('李家超發表施政報告', '李家超 施政')).toBe(true);
    expect(keywordHits('李家超出席典禮', '李家超 施政')).toBe(false);
    expect(keywordHits('The Policy Address is out', 'policy address')).toBe(true);
    const items = [
      item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' }),
      item({ id: 'b', title: '歐中貿易談判', link: 'https://example.com/b', category: 'business' }),
    ];
    const matched = matchTopicItems(items, topicBySlug('policy-address')!);
    expect(matched.map((row) => row.id)).toEqual(['a']);
    expect(newTopicLinks(matched, ['https://example.com/a'])).toEqual([]);
  });

  it('drops numbers the sources do not contain and rewrites Taiwan wording', () => {
    const draft = parseTopicDraft(JSON.stringify(MODEL), `${EXCERPT}\n特朗普提及的目標\n2026-10-07`, topicBySlug('policy-address')!.areas, true);
    expect(draft?.figures.map((row) => row.value)).toEqual(['30000個單位', '10000元', '30000個單位']);
    expect(draft?.figures.some((row) => row.value.includes('90000'))).toBe(false);
    expect(draft?.figures.some((row) => row.label.includes('川普'))).toBe(false);
    expect(draft?.figures.some((row) => row.label.includes('特朗普'))).toBe(true);
    expect(draft?.points).toHaveLength(3);
  });

  it('drops invented reactions, guessed impacts, and quotes the sources never had', () => {
    const corpus = `${EXCERPT}\n2026-10-07`;
    const draft = parseTopicDraft(JSON.stringify({
      ...MODEL,
      impact: ['施政報告措施可能導致全港租金大幅波動，影響市民日常開支。'],
      reactions: ['民主黨表示會審視房屋措施是否足夠。', '工聯會批評「完全脫離現實」，要求政府即時回應訴求。'],
    }), corpus, topicBySlug('policy-address')!.areas, true);
    expect(draft?.impact).toEqual([]);
    expect(draft?.reactions).toEqual(['民主黨表示會審視房屋措施是否足夠。']);
    expect(groundedShare('行政長官發表施政報告', corpus)).toBe(1);
  });

  it('drops broken characters, joins spaced title clauses, and ends lines with a full stop', () => {
    const corpus = `${EXCERPT}\n2026-10-07`;
    const draft = parseTopicDraft(JSON.stringify({
      ...MODEL,
      title: '施政報告提出公屋供應目標 民主黨表示會審視',
      description: '行政長官發表施政報告，提出公屋供應目\uFFFD\uFFFD',
      timeline: [{ date: '2026-10-07', text: '行政長官發表施政報告' }],
    }), corpus, topicBySlug('policy-address')!.areas, true);
    expect(draft?.title).toBe('施政報告提出公屋供應目標，民主黨表示會審視');
    expect(draft?.description).toBe('');
    expect(draft?.timeline[0].text).toBe('行政長官發表施政報告。');
  });

  it('accepts a public pack whose short lines have no commas', () => {
    const pack = samplePack();
    pack.points = ['立法會一連三日合併辯論五年規劃及施政報告。', '陳曼琪表明支持兩份報告。', '運輸及物流局局長陳美寶在立法會會議上致辭。'];
    pack.timeline = [{ date: '2026-10-07', text: '立法會展開五年規劃及施政報告合併辯論。' }, { date: '2026-10-08', text: '立法會繼續第二日合併辯論五年規劃及施政報告。' }];
    pack.reactions = ['陳國基希望各界同心協力落實五年規劃。', '陳茂波說經濟勢頭良好來之不易。'];
    expect(topicPublic(pack)).toBe(true);
  });

  it('keeps a richer public pack over a thinner rewrite', () => {
    const rich = samplePack();
    const thin: TopicPack = { ...rich, points: ['短。', '更短。'], timeline: [], figures: [], impact: [], reactions: [] };
    expect(topicPublic(rich)).toBe(true);
    expect(keepStoredTopic(rich, thin)).toBe(true);
    expect(topicRichness(rich)).toBeGreaterThan(topicRichness(thin));
  });

  it('asks for an update instead of a rewrite when a previous pack exists', () => {
    const topic = topicBySlug('policy-address')!;
    const prompt = topicPrompt(topic, [item({ id: 'a', title: '施政報告', link: 'https://example.com/a', excerpt: EXCERPT })], samplePack());
    expect(prompt.system).toContain('正式新聞書面語');
    expect(prompt.system).toContain('不要用粵語口語');
    expect(prompt.system).toContain('禁止添加');
    expect(prompt.system).toContain('這是更新，不是重寫');
    expect(prompt.user).toContain('上一版');
  });

  it('only opens the generation window for the two HKT warm runs', () => {
    expect(topicWarmWindow(MORNING)).toBe(true);
    expect(topicWarmWindow(new Date('2026-10-07T10:30:00.000Z'))).toBe(true);
    expect(topicWarmWindow(EVENING_OFF)).toBe(false);
  });
});

describe('topic generation writes', () => {
  it('puts one topic key when new headlines arrive and none when they do not', async () => {
    const store = memory();
    seed(store.rows, [item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' })]);
    const searches: boolean[] = [];
    const run = () => generateTopics(store.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async () => EXCERPT,
      complete: async (_topic, _system, _user, search) => {
        searches.push(search);
        return completion(search);
      },
    });
    const first = await run();
    expect(first.puts).toBe(1);
    expect(first.usagePut).toBe(1);
    expect(searches).toEqual([false]);
    expect(store.puts.filter((key) => key.startsWith('topic:'))).toEqual([topicStorageKey('policy-address')]);
    const saved = parseTopicPack(store.rows.get(topicStorageKey('policy-address')) ?? null);
    expect(saved?.figures.some((row) => row.value.includes('90000'))).toBe(false);
    expect(saved?.timeline.map((row) => row.date)).toEqual(['2026-10-07']);
    expect(saved?.seenLinks).toContain('https://example.com/a');
    expect(saved?.picture?.url).toBe('/topics/policy-address.jpg');
    expect(saved?.picture?.credit).toContain('Tksteven');
    const second = await run();
    expect(second.puts).toBe(0);
    expect(searches).toEqual([false]);
    expect(store.puts.filter((key) => key.startsWith('topic:'))).toHaveLength(1);
  });

  it('uses a free source image and does not publish a pack that still has no picture', async () => {
    const store = memory();
    const sourceImage = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Example.jpg';
    seed(store.rows, [
      item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a', image: sourceImage }),
      item({ id: 'p', title: '樓市成交回升', link: 'https://example.com/p' }),
    ]);
    const called: string[] = [];
    let lookups = 0;
    await generateTopics(store.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async () => EXCERPT,
      pictureLookup: async () => {
        lookups += 1;
        return null;
      },
      complete: async (topic) => {
        called.push(topic.slug);
        return completion(false);
      },
    });
    expect(called).toEqual(['policy-address']);
    expect(lookups).toBe(1);
    expect(parseTopicPack(store.rows.get(topicStorageKey('policy-address')) ?? null)?.picture?.url).toBe(sourceImage);
    expect(store.rows.has(topicStorageKey('property'))).toBe(false);
  });

  it('appends a later date instead of replacing the timeline', async () => {
    const store = memory();
    const items = [item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' })];
    seed(store.rows, items);
    await generateTopics(store.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async () => EXCERPT,
      complete: async () => completion(false),
    });
    items.push(item({
      id: 'b',
      title: '施政報告補充居屋數字',
      link: 'https://example.com/b',
      pubDate: '2026-10-08T01:00:00.000Z',
    }));
    seed(store.rows, items);
    const follow = {
      ...MODEL,
      timeline: [{ date: '2026-10-08', text: '施政報告補充，居屋供應為5000個單位。' }],
      figures: [{ area: '房屋', label: '居屋供應', value: '5000個單位' }],
      points: MODEL.points,
    };
    await generateTopics(store.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async (url) => (url.endsWith('/b') ? '2026年10月8日，施政報告補充，居屋供應為5000個單位。' : EXCERPT),
      complete: async () => ({ text: JSON.stringify(follow), input: 40, output: 30, searchCalls: 0, provider: 'grok', model: 'grok-4.3' }),
    });
    const saved = parseTopicPack(store.rows.get(topicStorageKey('policy-address')) ?? null);
    expect(saved?.timeline.map((row) => row.date)).toEqual(['2026-10-07', '2026-10-08']);
    expect(saved?.figures.some((row) => row.value.includes('30000'))).toBe(true);
    expect(saved?.figures.some((row) => row.value.includes('5000'))).toBe(true);
    expect(store.puts.filter((key) => key.startsWith('topic:'))).toHaveLength(2);
  });

  it('does not call the model outside the warm window, and stops after a KV limit', async () => {
    const quiet = memory();
    seed(quiet.rows, [item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' })]);
    let calls = 0;
    const skipped = await generateTopics(quiet.env, {
      now: EVENING_OFF,
      anchorText: async () => '',
      complete: async () => {
        calls += 1;
        return completion(false);
      },
    });
    expect(skipped.skipped).toBe('schedule');
    expect(calls).toBe(0);
    expect(quiet.puts).toHaveLength(0);

    const blocked = memory(true);
    seed(blocked.rows, [
      item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' }),
      item({ id: 'c', title: '財政司司長發表財政預算案', link: 'https://example.com/c' }),
    ]);
    let modelCalls = 0;
    const limited = await generateTopics(blocked.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async () => EXCERPT,
      complete: async () => {
        modelCalls += 1;
        return completion(false);
      },
    });
    expect(limited.kv).toBe('limited');
    expect(limited.puts).toBe(0);
    expect(modelCalls).toBe(1);
    expect(blocked.rows.has(topicStorageKey('policy-address'))).toBe(false);
    const topics = limited.topics as { slug: string; action: string }[];
    expect(topics.find((row) => row.slug === 'budget')?.action).toBe('deferred');
  });

  it('searches only when the fetched text is thin, and never falls back to Workers AI', async () => {
    const thin = memory();
    seed(thin.rows, [item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' })]);
    let searched = false;
    await generateTopics(thin.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async () => '',
      complete: async (_topic, _system, _user, search) => {
        searched = search;
        return completion(false);
      },
    });
    expect(searched).toBe(true);

    const workers = memory();
    delete (workers.env as { XAI_API_KEY?: string }).XAI_API_KEY;
    workers.env.AI = { async run() { return { response: JSON.stringify(MODEL) }; } };
    seed(workers.rows, [item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' })]);
    const result = await generateTopics(workers.env, {
      now: MORNING,
      anchorText: async () => '',
      articleText: async () => EXCERPT,
    });
    expect(result.puts).toBe(0);
    expect(workers.rows.get(topicStorageKey('policy-address'))).toBeUndefined();
    expect(workers.puts.some((key) => key.startsWith('article'))).toBe(false);
  });

  it('defers topics past the model budget and reports them for a second call', async () => {
    const store = memory();
    seed(store.rows, [
      item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' }),
      item({ id: 'c', title: '財政司司長發表財政預算案', link: 'https://example.com/c' }),
    ]);
    const first = await generateTopics(store.env, {
      now: MORNING,
      anchorText: async () => '',
      maxModels: 1,
      articleText: async () => EXCERPT,
      complete: async () => completion(false),
    });
    expect(first.more).toBe(true);
    expect(first.attempted).toEqual(['policy-address']);
    const second = await generateTopics(store.env, {
      now: MORNING,
      anchorText: async () => '',
      skip: first.attempted as string[],
      articleText: async () => '財政司司長發表財政預算案，薪俸稅寬免為3000元。',
      complete: async () => ({
        text: JSON.stringify({
          title: '財政預算案提出薪俸稅寬免',
          description: '財政司司長發表財政預算案，提出薪俸稅寬免。',
          points: ['財政司司長發表財政預算案。', '財政預算案提出薪俸稅寬免為3000元。'],
          timeline: [{ date: '2026-10-07', text: '財政司司長發表財政預算案，提出薪俸稅寬免3000元。' }],
          figures: [{ area: '稅務', label: '薪俸稅寬免', value: '3000元' }],
          impact: [],
          reactions: [],
        }),
        input: 10,
        output: 10,
        searchCalls: 0,
        provider: 'grok',
        model: 'grok-4.3',
      }),
    });
    expect(second.puts).toBe(1);
    expect(parseTopicPack(store.rows.get(topicStorageKey('budget')) ?? null)?.title).toContain('財政預算案');
  });
});

describe('topic pages', () => {
  it('renders the index and a pack with timeline, figures, folds, and one source list', () => {
    const pack = samplePack();
    const cards = topicIndexCards(new Map([['policy-address', pack]]));
    const index = renderTopicIndex(cards, 'https://world-news.xyz/topic/');
    expect(index).toContain('<h1 class="column-title">專題懶人包</h1>');
    expect(index).toContain('href="/topic/policy-address/"');
    expect(index).toContain('href="/topic/budget/"');
    expect(index).toContain('rel="canonical" href="https://world-news.xyz/topic/"');
    expect(index).toContain('name="description"');
    expect(index).toContain('AI 整合');

    const page = renderTopicPage({
      topic: topicBySlug('policy-address')!,
      pack,
      headlines: [
        item({ id: 'a', title: '行政長官發表施政報告', link: 'https://example.com/a' }),
        item({ id: 'b', title: '施政報告提出公屋供應目標', link: 'https://example.com/b', source: '明報', pubDate: '2026-10-07T03:00:00.000Z' }),
        item({ id: 'c', title: '民主黨回應施政報告房屋措施', link: 'https://example.com/c', source: '星島日報', pubDate: '2026-10-07T05:00:00.000Z' }),
      ],
      others: cards.map((card) => ({ slug: card.topic.slug, title: card.topic.title, description: card.description })),
    }, 'https://world-news.xyz/topic/policy-address/');
    expect(page).toContain('AI 整合');
    expect(page).toContain('src="/topics/policy-address.jpg"');
    expect(page).toContain('alt="香港立法會綜合大樓會議廳"');
    expect(page).toContain('圖片：Tksteven，維基共享資源（CC BY-SA 3.0）');
    expect(page).not.toContain('編者按');
    expect(index).toContain('src="/topics/policy-address.jpg"');
    expect(index).toContain('src="/topics/us-rates.jpg"');
    expect(index).not.toContain('/topics/property.jpg');
    expect(page).toContain('class="timeline"');
    expect(page).toContain('class="topic-figure"');
    expect(page).toContain('房屋');
    expect(page).toContain('<details class="topic-fold pack-fold"');
    expect(page).toContain('對市民有什麼影響');
    expect(page).toContain('各方反應');
    expect(page).toContain('相關頭條');
    expect(page).toContain('來源（1）');
    expect(page.match(/class="source-list"/g)).toHaveLength(1);
    expect(page).not.toContain('只供參考');
    expect(page).not.toContain('免責');
    expect(page).not.toContain('編者');
    expect(page).toContain('rel="canonical" href="https://world-news.xyz/topic/policy-address/"');
    expect(page).toContain('href="/topic/"');
    expect(page).toContain('data-listen');
    expect(page).toContain('bookmark-article');
    expect(page).toContain('https://example.com/a');
    mkdirSync('/tmp/topic-preview', { recursive: true });
    writeFileSync('/tmp/topic-preview/index.html', index);
    writeFileSync('/tmp/topic-preview/policy-address.html', page);
  });

  it('links the homepage, the column nav, the sitemap, and a related explainer', () => {
    const home = renderHomeFeed([item({ id: 'a', title: '標題', link: 'https://example.com/a' })]);
    expect(home).toContain('href="/topic/"');
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('href="/topic/"');
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('https://world-news.xyz/topic/');
    expect(readFileSync('.github/workflows/warm-content.yml', 'utf8')).toContain('kind=topic');
    expect(readFileSync('.github/workflows/warm-content.yml', 'utf8')).toContain('topic_skip');
    expect(readFileSync('functions/api/generate.ts', 'utf8')).toContain("kind === 'topic'");
    const doc = {
      kind: 'compare',
      key: '2026-10-07-policy-abcdefabcdef',
      title: '施政報告焦點',
      description: '行政長官發表施政報告。',
      points: ['行政長官發表施政報告，提出房屋措施。'],
      blocks: [{ title: '事件經過', sentences: ['行政長官發表施政報告。'], sources: [] }],
      publishedAt: '2026-10-07T00:00:00.000Z',
      hkt: '2026-10-07 08:00',
      mode: 'ai',
    } as ContentDoc;
    const html = renderContentPage(doc, 'https://world-news.xyz/explainer/demo');
    expect(html).toContain('href="/topic/policy-address/"');
  });
});

function samplePack(): TopicPack {
  return {
    slug: 'policy-address',
    title: '施政報告',
    description: '行政長官發表施政報告，提出公屋供應目標，並寬免差餉。',
    points: [
      '行政長官發表施政報告，提出房屋與稅務措施。',
      '未來五年公屋供應目標為30000個單位。',
      '差餉寬免額為10000元，民主黨表示會審視房屋措施。',
    ],
    timeline: [
      { date: '2026-09-01', text: '政府預告施政報告將於10月發表，並交代諮詢安排。' },
      { date: '2026-10-07', text: '行政長官發表施政報告，提出公屋供應目標30000個單位。' },
    ],
    figures: [
      { area: '房屋', label: '未來五年公屋供應目標', value: '30000個單位' },
      { area: '經濟', label: '企業研發開支', value: '12億' },
      { area: '民生', label: '公共交通補貼上限', value: '500元' },
      { area: '稅務與津貼', label: '差餉寬免額', value: '10000元' },
    ],
    impact: ['合資格住宅的差餉寬免額為10000元，差額會在徵收差餉時扣減。'],
    reactions: ['民主黨表示會審視房屋措施是否足夠，並要求交代落成時間表。'],
    sources: [{ title: '行政長官發表施政報告', url: 'https://example.com/a', source: '香港電台', pubDate: '2026-10-07T01:00:00.000Z' }],
    seenLinks: ['https://example.com/a'],
    publishedAt: '2026-10-07T01:00:00.000Z',
    updatedAt: '2026-10-07T12:00:00.000Z',
    mode: 'ai',
    provider: 'grok',
    model: 'grok-4.3',
  };
}

describe('topic display rules', () => {
  it('falls back to the topic name for a long unpunctuated model title', async () => {
    const { displayTitle } = await import('../shared/topicPage');
    expect(displayTitle('陳曼琪倡修例規管AI風險江蘇AI課程', topicBySlug('ai')!)).toBe('人工智能');
    expect(displayTitle('立法會續合併辯論五年規劃及施政報告', topicBySlug('policy-address')!)).toBe('立法會續合併辯論五年規劃及施政報告');
    expect(displayTitle('國慶期間內地樓市表現良好', topicBySlug('property')!)).toBe('國慶期間內地樓市表現良好');
    expect(displayTitle('', topicBySlug('property')!)).toBe('樓市');
  });
});

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateQuiz } from '../functions/content/quizRun';
import { putLimited, resetKvWriteState } from '../functions/content/store';
import { maybePushBriefing } from '../functions/content/telegramPush';
import type { ContentEnv } from '../functions/content/store';
import { BOARD_KV_KEY } from '../shared/board';
import type { ContentDoc } from '../shared/content';
import { renderFeed } from '../shared/feedXml';
import { pickVoice } from '../shared/listen';
import { acceptQuiz, answerSupported, parseQuiz, pickQuizSources, quizKey, quizReadKeys } from '../shared/quiz';
import { renderQuizPage, renderSearchPage } from '../shared/readerPages';
import { articleBookmark, followMatches, parseFollows } from '../shared/readerStore';
import { buildCorpus } from '../shared/searchCorpus';
import { highlight, searchReader } from '../shared/siteSearch';
import { briefingPushable, briefingReadyToPush, channelUrl, formatTelegramPost, pushRecordKey, telegramTarget } from '../shared/telegramPost';
import type { NewsItem } from '../shared/types';

const now = new Date('2026-10-08T00:30:00Z');

beforeEach(() => {
  resetKvWriteState();
});

function item(id: string, title: string, region = 'HKG', category = 'hk'): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: [region],
    pubDate: now.toISOString(),
    category,
    excerpt: title,
  };
}

const sources = [
  { title: '港鐵宣布下月公布票價檢討結果', summary: '港鐵宣布下月公布票價檢討結果。', url: 'https://example.com/mtr' },
  { title: '運輸署審視港鐵票價對乘客的影響', summary: '運輸署表示會審視對乘客的影響。', url: 'https://example.com/td' },
  { title: '天文台指南海低壓區會進入本港八百公里範圍', summary: '天文台稱低壓區會進入本港八百公里範圍。', url: 'https://example.com/hko' },
];

function questions() {
  return {
    questions: [
      { prompt: '港鐵預計何時公布票價檢討結果？', choices: ['下月', '明年', '本週', '今日'], answer: '下月', sourceTitle: sources[0]!.title },
      { prompt: '哪個部門表示會審視對乘客的影響？', choices: ['運輸署', '天文台', '醫管局', '金管局'], answer: '運輸署', sourceTitle: sources[1]!.title },
      { prompt: '天文台如何描述低壓區的位置？', choices: ['會進入本港八百公里範圍', '已經登陸', '不會影響華南', '改掛十號風球'], answer: '會進入本港八百公里範圍', sourceTitle: sources[2]!.title },
      { prompt: '票價會上調多少？', choices: ['三成', '一成', '兩成', '五成'], answer: '三成', sourceTitle: sources[0]!.title },
      { prompt: '港鐵嘅檢討幾時公布？', choices: ['下月', '明年', '本週', '今日'], answer: '下月', sourceTitle: sources[0]!.title },
    ],
  };
}

function briefing(scope = ''): ContentDoc {
  const key = `2026-10-08-am${scope}`;
  return {
    kind: 'briefing',
    key,
    title: '港鐵公布票價檢討時間表',
    description: '港鐵宣布下月公布結果。',
    points: ['港鐵宣布下月公布票價檢討結果。', '運輸署表示會審視對乘客的影響。', '天文台提及低壓區。'],
    blocks: [],
    publishedAt: now.toISOString(),
    hkt: '2026年10月8日',
    mode: 'ai',
  };
}

/** Long enough, and structured the way a listed Hong Kong briefing is. */
function readyBriefing(key = '2026-10-08-am'): ContentDoc {
  const sentence = '港鐵宣布下月公布票價檢討結果，運輸署會審視對乘客的影響。';
  let body = '';
  while ((body.match(/[\u3400-\u9fff]/g) || []).length < 520) body += sentence;
  return {
    kind: 'briefing',
    key,
    title: '港鐵公布票價檢討時間表',
    description: '港鐵宣布下月公布結果。',
    points: ['港鐵宣布下月公布票價檢討結果。', '運輸署表示會審視對乘客的影響。', '天文台提及低壓區會進入本港範圍。'],
    blocks: [
      { title: '香港', sentences: [body], sources: [] },
      { title: '內地', sentences: ['內地部門公布新安排，詳情仍待官方說明。'], sources: [] },
      { title: '今日值得留意', sentences: ['乘客可留意下月公布的檢討結果。'], sources: [] },
    ],
    publishedAt: now.toISOString(),
    hkt: '2026年10月8日',
    mode: 'ai',
    provider: 'grok',
  };
}

function telegramEnv(store: Map<string, string>, puts?: string[]) {
  return {
    TELEGRAM_BOT_TOKEN: '123456:abcdefghijklmnopqrstuvwxyz',
    TELEGRAM_CHAT_ID: '-100123456',
    CONTENT: {
      async get(key: string) { return store.get(key) ?? null; },
      async put(key: string, value: string) {
        puts?.push(key);
        store.set(key, value);
      },
    },
  };
}

describe('listen', () => {
  it('prefers a zh-HK voice, then zh-TW, then zh-CN', () => {
    expect(pickVoice([{ lang: 'en-US' }, { lang: 'zh-CN' }, { lang: 'zh-TW' }, { lang: 'zh-HK' }])?.lang).toBe('zh-HK');
    expect(pickVoice([{ lang: 'zh-CN' }, { lang: 'zh-TW' }])?.lang).toBe('zh-TW');
    expect(pickVoice([{ lang: 'en-GB' }])).toBeNull();
    const script = readFileSync('public/columns.js', 'utf8');
    expect(script).toContain("var order = ['zh-HK', 'zh-TW', 'zh-CN']");
    expect(script).toContain('收聽');
    expect(script).toContain('speechSynthesis');
  });
});

describe('follows and bookmarks', () => {
  it('matches followed regions and categories from local storage', () => {
    const prefs = parseFollows(JSON.stringify({ regions: ['HKG'], categories: ['tech'], sources: [] }));
    expect(followMatches(prefs, { source: 'BBC', regions: ['HKG'], category: 'world' })).toBe(true);
    expect(followMatches(prefs, { source: 'BBC', regions: ['USA'], category: 'tech' })).toBe(true);
    expect(followMatches(prefs, { source: 'BBC', regions: ['USA'], category: 'world' })).toBe(false);
    const saved = articleBookmark({
      page: 'briefing',
      key: '2026-10-08-am',
      title: '導讀',
      link: '/briefing/2026-10-08-am/',
      publishedAt: now.toISOString(),
    });
    expect(saved.id).toBe('article:briefing:2026-10-08-am');
    expect(saved.link.startsWith('/briefing/')).toBe(true);
  });
});

describe('search', () => {
  it('filters the last few days and highlights the query', () => {
    const corpus = buildCorpus({
      news: [item('mtr', '港鐵宣布下月公布票價檢討結果'), item('fed', 'Federal Reserve holds rates', 'USA', 'business')],
      explainers: [{
        key: '2026-10-08-mtr-0123456789ab',
        title: '港鐵票價檢討懶人包',
        description: '港鐵宣布下月公布票價檢討結果。',
        publishedAt: now.toISOString(),
        sources: 2,
        category: 'hk',
      }],
    });
    const hits = searchReader(corpus, { q: '港鐵', region: 'HKG', category: 'hk', now: now.getTime() });
    expect(hits.map((hit) => hit.title)).toContain('港鐵宣布下月公布票價檢討結果');
    expect(hits.map((hit) => hit.title)).not.toContain('Federal Reserve holds rates');
    expect(highlight('港鐵宣布下月', '港鐵')).toBe('<mark>港鐵</mark>宣布下月');
    expect(highlight('<script>', 'script')).not.toContain('<script>');
    const html = renderSearchPage({ q: '港鐵', region: 'HKG', category: 'hk', hits });
    expect(html).toContain('<mark>港鐵</mark>');
    expect(html).toContain('站內搜尋');
    expect(html).not.toContain('沒有符合的結果。');
  });
});

describe('quiz validation', () => {
  it('drops answers that are not in the headline or summary', () => {
    expect(answerSupported('下月', sources[0]!.title)).toBe(true);
    expect(answerSupported('三成', sources[0]!.title)).toBe(false);
    const kept = acceptQuiz(questions(), sources);
    expect(kept).toHaveLength(3);
    expect(kept.map((row) => row.answer)).toEqual(['下月', '運輸署', '會進入本港八百公里範圍']);
    expect(parseQuiz('not json', sources)).toEqual([]);
    const picked = pickQuizSources([
      item('a', '港鐵宣布下月公布票價檢討結果'),
      item('b', 'English only headline'),
      item('c', '天文台指南海低壓區會進入本港八百公里範圍'),
    ], now.getTime());
    expect(picked.map((row) => row.title)).not.toContain('English only headline');
  });

  it('stores one quiz per edition and does not retry a KV limit error', async () => {
    const board = {
      savedAt: now.getTime(),
      clusters: [],
      counts: {},
      banner: null,
      timeline: [],
      headlines: sources.map((source, index) => ({
        id: String(index),
        title: source.title,
        link: source.url,
        source: '香港電台',
        pubDate: new Date().toISOString(),
        category: 'hk',
      })),
    };
    const store = new Map<string, string>([[BOARD_KV_KEY, JSON.stringify(board)]]);
    let puts = 0;
    const env = {
      GENERATE_SECRET: 'secret',
      CONTENT: {
        async get(key: string) { return store.get(key) ?? null; },
        async put(key: string) {
          puts += 1;
          throw new Error(`KV put failed: 429 limit exceeded (${key})`);
        },
      },
      AI: {
        async run() { return { response: JSON.stringify(questions()) }; },
      },
    } as ContentEnv;
    const response = await generateQuiz({
      request: new Request('https://world-news.xyz/api/generate?kind=quiz', { method: 'POST', headers: { 'x-generate-secret': 'secret' } }),
      env,
      waitUntil() {},
      next: async () => new Response(null),
    });
    const body = await response.json() as { stored?: string; count?: number };
    expect(puts).toBe(1);
    expect(body.stored).toBe('failed');
    expect(body.count).toBe(3);
    expect(quizReadKeys(now)[0]).toBe(quizKey('2026-10-08-am'));
  });
});

describe('feed and telegram', () => {
  it('renders an RSS item and skips telegram when secrets are missing', async () => {
    const xml = renderFeed([{ title: '早報', href: 'https://world-news.xyz/briefing/2026-10-08-am/', summary: '三行重點', publishedAt: now.toISOString() }]);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('https://world-news.xyz/briefing/2026-10-08-am/');
    expect(telegramTarget({})).toBeNull();
    expect(telegramTarget({
      TELEGRAM_BOT_TOKEN: '123456:abcdefghijklmnopqrstuvwxyz',
      TELEGRAM_CHAT_ID: '@world_news_channel_forever',
    })?.chatId).toBe('@world_news_channel_forever');
    expect(channelUrl('https://t.me/world_news_channel_forever')).toBe('https://t.me/world_news_channel_forever');
    expect(channelUrl('http://t.me/world_news_channel_forever')).toBe('');
    expect(briefingPushable(briefing('-world'))).toBe(false);
    expect(briefingReadyToPush(briefing())).toBe(false);
    expect(briefingReadyToPush({ ...briefing(), mode: 'sources' })).toBe(false);
    expect(briefingReadyToPush(readyBriefing())).toBe(true);
    expect(briefingReadyToPush(readyBriefing('2026-10-08-pm-world'))).toBe(false);
    const text = formatTelegramPost(briefing());
    expect(text).toContain('《港鐵公布票價檢討時間表》');
    expect(text).toContain('https://world-news.xyz/briefing/2026-10-08-am/');
    expect(text.split('\n').filter((line) => line && !line.startsWith('《') && !line.startsWith('http')).length).toBe(3);

    let puts = 0;
    const skipped = await maybePushBriefing({ CONTENT: { async get() { return null; }, async put() { puts += 1; } } }, readyBriefing());
    expect(skipped).toBe('skipped');
    expect(puts).toBe(0);

    const order: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      order.push(`fetch:${String(url)}`);
      return new Response('ok', { status: 200 });
    }) as typeof fetch;
    const store = new Map<string, string>();
    const sent = await maybePushBriefing(telegramEnv(store, order), readyBriefing());
    const again = await maybePushBriefing(telegramEnv(store, order), readyBriefing());
    globalThis.fetch = original;
    expect(sent).toBe('sent');
    expect(again).toBe('duplicate');
    expect(order.filter((step) => step.startsWith('fetch:'))).toHaveLength(1);
    expect(store.size).toBe(1);
    const fetchAt = order.findIndex((step) => step.startsWith('fetch:'));
    const putAt = order.findIndex((step) => step === pushRecordKey('2026-10-08-am'));
    expect(fetchAt).toBeGreaterThanOrEqual(0);
    expect(putAt).toBeGreaterThan(fetchAt);
  });

  it('does not record a thin or sources briefing, then posts the ready edition once', async () => {
    const fetched: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetched.push('called');
      return new Response('ok', { status: 200 });
    }) as typeof fetch;
    const store = new Map<string, string>();
    const env = telegramEnv(store);
    const thin = await maybePushBriefing(env, { ...readyBriefing('2026-10-08-pm'), blocks: [], points: ['只有一行。'] });
    const sources = await maybePushBriefing(env, { ...readyBriefing('2026-10-08-pm'), mode: 'sources' });
    const sent = await maybePushBriefing(env, readyBriefing('2026-10-08-pm'));
    const again = await maybePushBriefing(env, readyBriefing('2026-10-08-pm'));
    globalThis.fetch = original;
    expect(thin).toBe('skipped');
    expect(sources).toBe('skipped');
    expect(sent).toBe('sent');
    expect(again).toBe('duplicate');
    expect(fetched).toHaveLength(1);
    expect([...store.keys()]).toEqual([pushRecordKey('2026-10-08-pm')]);
  });

  it('does not keep a record when Telegram fails, so the next attempt can post', async () => {
    let status = 429;
    const fetched: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetched.push('called');
      if (status === 0) throw new Error('timeout');
      return new Response('no', { status });
    }) as typeof fetch;
    const store = new Map<string, string>();
    const env = telegramEnv(store);
    const limited = await maybePushBriefing(env, readyBriefing('2026-10-08-pm'));
    status = 0;
    const timedOut = await maybePushBriefing(env, readyBriefing('2026-10-08-pm'));
    status = 200;
    const sent = await maybePushBriefing(env, readyBriefing('2026-10-08-pm'));
    globalThis.fetch = original;
    expect(limited).toBe('failed');
    expect(timedOut).toBe('failed');
    expect(sent).toBe('sent');
    expect(fetched).toHaveLength(3);
    expect(store.size).toBe(1);
    expect(store.get(pushRecordKey('2026-10-08-pm'))).toContain('"sentAt"');
  });

  it('still posts when the success record cannot be stored', async () => {
    const fetched: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetched.push('called');
      return new Response('ok', { status: 200 });
    }) as typeof fetch;
    const result = await maybePushBriefing({
      TELEGRAM_BOT_TOKEN: '123456:abcdefghijklmnopqrstuvwxyz',
      TELEGRAM_CHAT_ID: '-100123456',
      CONTENT: {
        async get() { return null; },
        async put() { throw new Error('429'); },
      },
    }, readyBriefing('2026-10-08-pm'));
    const again = await maybePushBriefing({
      TELEGRAM_BOT_TOKEN: '123456:abcdefghijklmnopqrstuvwxyz',
      TELEGRAM_CHAT_ID: '-100123456',
      CONTENT: {
        async get() { return null; },
        async put() { throw new Error('429'); },
      },
    }, readyBriefing('2026-10-08-pm'));
    globalThis.fetch = original;
    expect(result).toBe('sent');
    expect(again).toBe('duplicate');
    expect(fetched).toHaveLength(1);
  });
});

describe('pages', () => {
  it('renders the quiz with a story link and keeps the warm-run hook', () => {
    const html = renderQuizPage({
      edition: '2026-10-08-am',
      generatedAt: now.toISOString(),
      questions: acceptQuiz(questions(), sources),
    });
    expect(html).toContain('每日新聞小測');
    expect(html).toContain('核對答案');
    expect(html).toContain('閱讀相關報道');
    expect(html).toContain('https://example.com/mtr');
    expect(readFileSync('functions/api/generate.ts', 'utf8')).toContain("kind === 'quiz'");
    expect(readFileSync('.github/workflows/warm-content.yml', 'utf8')).toContain('kind=quiz');
    expect(readFileSync('public/quiz.js', 'utf8')).toContain('分享成績');
    expect(readFileSync('public/saved.js', 'utf8')).toContain('wn_bookmarks_v2');
  });
});

describe('putLimited', () => {
  it('returns failed on a KV error and does not throw', async () => {
    const result = await putLimited({
      CONTENT: {
        async get() { return null; },
        async put() { throw new Error('limit 1000'); },
      },
    }, 'quiz:test', '{}');
    expect(result).toBe('failed');
  });
});

describe('quiz choices', () => {
  it('rejects choices cut from the same headline or nested in each other', async () => {
    const { choicesSound } = await import('../shared/quiz');
    const title = '沙特與胡塞武裝繼續互相攻擊 沙特兩機場遇襲3人死亡';
    expect(choicesSound(['沙特與胡塞武裝繼續互相攻擊', '沙特兩機場遇襲3人死亡', '繼續互相攻擊', '兩機場遇襲3人死亡'], '沙特與胡塞武裝繼續互相攻擊', title)).toBe(false);
    expect(choicesSound(['吳奇隆', '吳奇隆天安門賀國慶', '天安門', '台灣棒球會'], '吳奇隆', '吳奇隆天安門賀國慶 遭台灣棒球會取消活動')).toBe(false);
    expect(choicesSound(['胡塞武裝', '烏克蘭', '選舉委員會', '世衛'], '胡塞武裝', title)).toBe(true);
  });
});

describe('quiz vague choices', () => {
  it('rejects vague number choices that are also true', async () => {
    const { choicesSound } = await import('../shared/quiz');
    expect(choicesSound(['3人死亡', '多人死亡', '兩人死亡', '數人死亡'], '3人死亡', '沙特兩機場遇襲3人死亡')).toBe(false);
    expect(choicesSound(['3人死亡', '5人死亡', '兩人死亡', '7人死亡'], '3人死亡', '沙特兩機場遇襲3人死亡')).toBe(true);
  });
});

describe('quiz name choices', () => {
  it('accepts brand names without Chinese as choices', () => {
    const sources = [
      { title: 'Google 公布推出 Nano Banana 2.1 多次生成人物圖像可保原貌', summary: '', url: 'https://e.com/1' },
      { title: '工信部專家駐邊境 與電騙打網絡戰', summary: '', url: 'https://e.com/2' },
      { title: '師生齊齊拯救生命 貓貓獲救後被老師領養', summary: '', url: 'https://e.com/3' },
    ];
    const kept = acceptQuiz({ questions: [
      { prompt: '哪間公司推出Nano Banana 2.1？', choices: ['Google', '工信部', '老師', '天安門'], answer: 'Google', sourceTitle: sources[0]!.title },
      { prompt: '工信部專家駐守哪裡？', choices: ['邊境', '天安門', '機場', '學校'], answer: '邊境', sourceTitle: sources[1]!.title },
      { prompt: '貓貓獲救後被誰領養？', choices: ['老師', 'Google', '工信部專家', '女童'], answer: '老師', sourceTitle: sources[2]!.title },
    ] }, sources);
    expect(kept).toHaveLength(3);
  });
});

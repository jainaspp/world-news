import { afterEach, describe, expect, it, vi } from 'vitest';
import { promptFor, type ContentDoc } from '../shared/content';
import { columnDelivery, emptyUsage, withArticle, withTokens } from '../shared/grok';
import { toHK } from '../shared/zh';
import {
  clusterWriter,
  focusWriter,
  minimaxRoom,
  pickMiniMaxBatch,
  briefingDraft,
  MINIMAX_EXPLAINERS_PER_RUN,
  MINIMAX_PER_CALL,
} from '../shared/writers';
import {
  completeMiniMax,
  MINIMAX_FALLBACK_MODEL,
  MINIMAX_MAX_TOKENS,
  MINIMAX_MODEL,
  MINIMAX_RETRY_TOKENS,
  MINIMAX_URL,
  writeMiniMax,
} from '../functions/content/minimax';
import type { StoryCluster } from '../shared/angles';
import type { NewsItem } from '../shared/types';
import type { WrittenStory } from '../shared/grok';

const NOW = new Date('2026-10-07T00:30:00.000Z');

function item(id: string, title: string, category: string, regions: string[] = []): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '路透社',
    sourceUrl: 'https://www.reuters.com',
    regions,
    pubDate: '2026-10-07T00:00:00.000Z',
    category,
  };
}

function cluster(category: string, title = '標題', regions: string[] = []): StoryCluster {
  const lead = item('a', title, category, regions);
  const other = item('b', title, category, regions);
  return { id: category, lead, items: [lead, other], sources: ['路透社', '法新社'], count: 2, latest: NOW.getTime() };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MiniMax client', () => {
  it('reads content, ignores reasoning, converts simplified text, and reports token counts', async () => {
    const bodies: { model: string; max_tokens: number; authorization: string }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      expect(url).toBe(MINIMAX_URL);
      const headers = new Headers(init.headers);
      const payload = JSON.parse(String(init.body)) as { model: string; max_tokens: number };
      bodies.push({ model: payload.model, max_tokens: payload.max_tokens, authorization: headers.get('authorization') || '' });
      return jsonResponse({
        choices: [{ finish_reason: 'stop', message: { content: '国际新闻已经发生。', reasoning_content: '不要採用這段。' } }],
        usage: { prompt_tokens: 12, completion_tokens: 34 },
        base_resp: { status_code: 0, status_msg: '' },
      });
    });
    const result = await completeMiniMax('secret-key', '系統', '用戶');
    expect(bodies).toEqual([{ model: MINIMAX_MODEL, max_tokens: MINIMAX_MAX_TOKENS, authorization: 'Bearer secret-key' }]);
    expect(result.text).toBe(toHK('国际新闻已经发生。'));
    expect(result.text).toContain('國際');
    expect(result.text).not.toContain('不要採用');
    expect(result.input).toBe(12);
    expect(result.output).toBe(34);
    expect(result.quota).toBe(false);
    expect(result.model).toBe(MINIMAX_MODEL);
  });

  it('retries once at 8000 tokens when finish_reason is length and content is empty', async () => {
    const limits: number[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body)) as { max_tokens: number };
      limits.push(payload.max_tokens);
      if (payload.max_tokens === MINIMAX_MAX_TOKENS) {
        return jsonResponse({
          choices: [{ finish_reason: 'length', message: { content: '', reasoning_content: '想了很久' } }],
          usage: { prompt_tokens: 3, completion_tokens: 5000 },
        });
      }
      return jsonResponse({
        choices: [{ finish_reason: 'stop', message: { content: '第二段正文。' } }],
        usage: { prompt_tokens: 4, completion_tokens: 8 },
      });
    });
    const result = await completeMiniMax('k', '系統', '用戶');
    expect(limits).toEqual([MINIMAX_MAX_TOKENS, MINIMAX_RETRY_TOKENS]);
    expect(result.text).toContain('第二段正文');
    expect(result.input).toBe(7);
    expect(result.output).toBe(5008);
    expect(result.model).toBe(MINIMAX_MODEL);
  });

  it('falls back to MiniMax-M2 when M2.5 fails, and stops on quota without a second model', async () => {
    const models: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body)) as { model: string };
      models.push(payload.model);
      if (payload.model === MINIMAX_MODEL) return jsonResponse({ choices: [], base_resp: { status_code: 1000, status_msg: 'error' } }, 500);
      return jsonResponse({
        choices: [{ finish_reason: 'stop', message: { content: '備用模型。' } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      });
    });
    const fallback = await completeMiniMax('k', '系統', '用戶');
    expect(models).toEqual([MINIMAX_MODEL, MINIMAX_FALLBACK_MODEL]);
    expect(fallback.model).toBe(MINIMAX_FALLBACK_MODEL);
    expect(fallback.text).toContain('備用');

    models.length = 0;
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body)) as { model: string };
      models.push(payload.model);
      return jsonResponse({
        choices: [],
        base_resp: { status_code: 1008, status_msg: 'insufficient balance' },
      });
    });
    const quota = await completeMiniMax('k', '系統', '用戶');
    expect(quota.quota).toBe(true);
    expect(quota.text).toBe('');
    expect(models).toEqual([MINIMAX_MODEL]);

    vi.stubGlobal('fetch', async () => jsonResponse({ choices: [] }, 429));
    const limited = await completeMiniMax('k', '系統', '用戶');
    expect(limited.quota).toBe(true);
    expect(limited.status).toBe(429);
  });

  it('stores provider minimax and keeps the piece inside the existing converter', async () => {
    vi.stubGlobal('fetch', async () => jsonResponse({
      choices: [{
        finish_reason: 'stop',
        message: {
          content: JSON.stringify({
            title: '港铁建议调整票价',
            description: '票价咨询',
            points: ['港铁交咨询', '程序仍在进行', '标题没有新措施'],
            sections: [{ heading: '事件经过', text: '港铁建议票价加幅，并交咨询。' }],
          }),
        },
      }],
      usage: { prompt_tokens: 20, completion_tokens: 30 },
    }));
    const draft: ContentDoc = {
      kind: 'compare',
      key: '2026-10-07-fare',
      title: '港鐵建議票價加幅',
      description: '說明',
      publishedAt: NOW.toISOString(),
      hkt: '',
      mode: 'sources',
      blocks: [
        {
          title: '事件經過',
          sentences: ['草稿。'],
          sources: [{ title: '港鐵建議票價加幅', url: 'https://example.com/a', source: '香港電台', excerpt: '港鐵建議票價加幅，並交諮詢。' }],
        },
        {
          title: '事件時間線',
          sentences: ['草稿。'],
          sources: [{ title: '港鐵建議票價加幅', url: 'https://example.com/a', source: '香港電台', excerpt: '港鐵建議票價加幅，並交諮詢。' }],
        },
      ],
    };
    const written = await writeMiniMax('k', draft, false);
    expect(written.quota).toBe(false);
    expect(written.doc?.provider).toBe('minimax');
    expect(written.doc?.model).toBe(MINIMAX_MODEL);
    expect(written.doc?.title).toContain('港鐵');
    expect(written.doc?.blocks.some((block) => block.title === '事件經過')).toBe(true);
    expect(JSON.stringify(written.doc)).not.toContain('经过');
    const spent = withTokens(emptyUsage('2026-10'), 0, 0, 0, 0);
    expect(spent.costUsd).toBe(0);
    expect(withArticle(spent, 'minimax', 'compare').minimaxCompare).toBe(1);
    expect(withArticle(spent, 'minimax', 'compare').costUsd).toBe(0);
  });
});

describe('writer routing', () => {
  it('sends Hong Kong and mainland China to Grok and the other desks to MiniMax', () => {
    expect(clusterWriter(cluster('hk', '立法會通過預算'))).toBe('grok');
    expect(clusterWriter(cluster('china', '華南暴雨'))).toBe('grok');
    expect(clusterWriter(cluster('business', '歐中貿易談判'))).toBe('grok');
    expect(clusterWriter(cluster('world', '油價上升', ['HKG']))).toBe('grok');
    for (const category of ['tech', 'business', 'world', 'asia', 'science', 'health', 'sport', 'entertainment']) {
      expect(clusterWriter(cluster(category, '一般標題'))).toBe('minimax');
    }
    expect(focusWriter({ scope: 'region', id: 'hkg' })).toBe('grok');
    expect(focusWriter({ scope: 'category', id: 'hk' })).toBe('grok');
    expect(focusWriter({ scope: 'category', id: 'china' })).toBe('grok');
    expect(focusWriter({ scope: 'region', id: 'eur' })).toBe('minimax');
    expect(focusWriter({ scope: 'category', id: 'tech' })).toBe('minimax');
  });

  it('caps MiniMax explainers at 15 per half-day and 5 per call', () => {
    const clusters = Array.from({ length: 8 }, (_, index) => {
      const row = cluster('tech', `晶片出口 ${index}`);
      row.id = `t${index}`;
      row.lead = { ...row.lead, id: `t${index}`, link: `https://example.com/t${index}` };
      row.items = [row.lead, { ...row.items[1]!, id: `t${index}b`, link: `https://example.com/t${index}b` }];
      row.count = 6 - (index % 3);
      return row;
    });
    const held: WrittenStory[] = Array.from({ length: 12 }, (_, index) => ({
      key: `held-${index}`,
      signature: `sig-${index}`,
      links: [`https://example.com/held-${index}`],
      mode: 'ai',
      at: NOW.getTime(),
      ready: true,
      provider: 'minimax' as const,
    }));
    expect(minimaxRoom(held, NOW)).toBe(MINIMAX_EXPLAINERS_PER_RUN - 12);
    expect(pickMiniMaxBatch(clusters, held, MINIMAX_PER_CALL, NOW)).toHaveLength(3);
    expect(pickMiniMaxBatch(clusters, [], MINIMAX_PER_CALL, NOW)).toHaveLength(MINIMAX_PER_CALL);
    expect(pickMiniMaxBatch([cluster('hk', '本地')], [], MINIMAX_PER_CALL, NOW)).toEqual([]);
    expect(columnDelivery({
      docs: [{ mode: 'ai', model: MINIMAX_MODEL, provider: 'minimax', chars: 500, key: 'ok', ready: true }],
    })).toMatchObject({ status: 200, fallback: false, thin: [] });
  });

  it('builds world and tech/finance briefings and keeps the facts-only prompt', () => {
    const items = [
      item('w1', '油價上升', 'world'),
      item('w2', '歐洲選舉', 'asia'),
      item('t1', '晶片出口新規', 'tech'),
      item('f1', '美股收市', 'business'),
      item('hk', '立法會通過預算', 'hk'),
      item('cn', '華南暴雨', 'china'),
    ];
    const world = briefingDraft(items, 'world', NOW);
    const techfin = briefingDraft(items, 'techfin', NOW);
    expect(world?.key).toBe('2026-10-07-am-world');
    expect(world?.blocks.map((block) => block.title)).toEqual(['國際', '今日值得留意']);
    expect(world?.title).toContain('國際導讀');
    expect(techfin?.key).toBe('2026-10-07-am-techfin');
    expect(techfin?.blocks.map((block) => block.title)).toEqual(['科技', '財經', '今日值得留意']);
    expect(JSON.stringify(world)).not.toContain('立法會');
    expect(JSON.stringify(techfin)).not.toContain('華南');
    const prompt = promptFor(world!, false, 'material');
    expect(prompt.system).toContain('只可使用提供的標題和摘錄');
    expect(prompt.system).toContain('禁止添加');
    expect(prompt.system).toContain('不要寫免責聲明');
    expect(prompt.system).toContain('不要用粵語口語');
    expect(prompt.user).toContain('國際');
    expect(prompt.user).not.toContain('搜尋最多');
  });
});

describe('parseDrop', () => {
  it('keeps in-range unique integers and rejects malformed replies', async () => {
    const { parseDrop } = await import('../functions/content/minimax.js');
    expect(parseDrop('```json\n{"drop":[1,1,3,9,"2"]}\n```', 5)).toEqual([1, 3, 2]);
    expect(parseDrop('{"drop":[]}', 5)).toEqual([]);
    expect(parseDrop('no json', 5)).toBeNull();
    expect(parseDrop('{"keep":[1]}', 5)).toBeNull();
  });
});

describe('MiniMax output repair and tidy', () => {
  it('repairs a dropped section brace and a stray bracket', async () => {
    const { repairJson } = await import('../functions/content/minimax.js');
    const broken = '{"title":"t","sections":[{"heading":"a","text":"x"},"heading":"b","text":"y"}]}]}';
    expect(JSON.parse(repairJson(broken)).sections[1].heading).toBe('b');
  });
  it('drops lowercase glosses and repeats of a proper-noun gloss', async () => {
    const { stripGlosses } = await import('../functions/content/minimax.js');
    const seen = new Set<string>();
    expect(stripGlosses('總部（head office）裁員', seen)).toBe('總部裁員');
    expect(stripGlosses('博姿（Boots）出售，博姿（Boots）', seen)).toBe('博姿（Boots）出售，博姿');
  });
});

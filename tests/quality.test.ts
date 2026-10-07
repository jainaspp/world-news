import { describe, expect, it } from 'vitest';
import { coherentCluster, sameEvent, type StoryCluster } from '../shared/angles';
import { parseCoherence, keepItems } from '../shared/coherence';
import { applyModelText, attachCitations, briefingPublic, promptFor, renderContentPage, type ContentDoc } from '../shared/content';
import { callCostUsd, emptyUsage, parseUsage, relatedEarlier, usageTokens, withTokens } from '../shared/grok';
import { extractLead } from '../shared/lead';
import { citationUrls, researchBody, researchSources, stripInlineCitations, webSearchCalls } from '../shared/search';
import { toHK } from '../shared/zh';
import type { NewsItem } from '../shared/types';

const NOW = Date.parse('2026-10-07T08:00:00.000Z');

function item(id: string, title: string, source: string, minutesAgo: number, category = 'hk'): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: new Date(NOW - minutesAgo * 60_000).toISOString(),
    category,
  };
}

function cluster(items: NewsItem[]): StoryCluster {
  const lead = items[0]!;
  return {
    id: lead.id,
    lead,
    items,
    sources: [...new Set(items.map((row) => row.source))],
    count: new Set(items.map((row) => row.source)).size,
    latest: NOW,
  };
}

describe('same-event explainers', () => {
  it('keeps a bilingual pair and drops a different story in the same cluster', () => {
    const chinese = item('cn', '特朗普擬向中國加徵25%關稅', '明報', 20, 'world');
    const english = item('en', 'Trump plans 25% tariffs on China', 'Reuters', 40, 'world');
    expect(sameEvent(chinese, english)).toBe(true);
    const death = item('death', '東涌地盤工人墮斃', '香港電台', 30);
    const pay = item('pay', '內地推動人民幣支付', '新華社', 40, 'business');
    expect(sameEvent(death, pay)).toBe(false);
    const wine = item('wine', '美酒佳餚巡禮開幕', '香港電台', 10);
    const oecd = item('oecd', 'OECD財長會議討論金融穩定', '路透', 20, 'business');
    const rail = item('rail', '內地鐵路客運量創新高', '新華社', 25, 'china');
    expect(sameEvent(wine, oecd)).toBe(false);
    expect(sameEvent(wine, rail)).toBe(false);
    const cable = item('cable', '法國進口包裝芝士疑受大腸桿菌污染 食安中心呼籲不要食用', '有線新聞', 10);
    const rthk = item('rthk', '一批法國進口芝士或受產志賀毒素大腸桿菌污染 當局籲勿食用', '香港電台', 20);
    expect(sameEvent(cable, rthk)).toBe(true);
    const mixed = cluster([wine, oecd, rail, item('wine2', '美酒佳餚巡禮本週開幕', '明報', 15)]);
    const kept = coherentCluster(mixed);
    expect(kept?.items.map((row) => row.id).sort()).toEqual(['wine', 'wine2']);
    expect(coherentCluster(cluster([death, pay]))).toBeNull();
  });

  it('does not put an earlier unrelated headline on the timeline', () => {
    const lead = item('mtr', '港鐵建議票價加幅', '香港電台', 30);
    const earlier = item('mtr2', '港鐵建議票價加幅進入諮詢', '明報', 90);
    const other = item('rmb', '人民幣支付擴大試點', '新華社', 80, 'business');
    const rows = relatedEarlier(cluster([lead]), [earlier, other, lead]);
    expect(rows.map((row) => row.id)).toEqual(['mtr2']);
  });
});

describe('coherence list', () => {
  it('parses keep indexes and drops the rest', () => {
    expect(parseCoherence('{"keep":[1,3,3,9]}', 3)).toEqual([1, 3]);
    expect(parseCoherence('不是 JSON', 3)).toBeNull();
    expect(keepItems(['a', 'b', 'c'], [1, 3])).toEqual(['a', 'c']);
  });
});

describe('lead text', () => {
  it('reads the description and the first paragraphs', () => {
    const html = '<meta property="og:description" content="港鐵建議加幅。"><p>短</p><p>香港電台報道，港鐵把票價建議交予諮詢，加幅寫成百分之三點二，並說明諮詢仍在進行。</p>';
    const lead = extractLead(html);
    expect(lead).toContain('港鐵建議加幅');
    expect(lead).toContain('百分之三點二');
    expect(lead).not.toContain('短');
  });
});

describe('search billing and citations', () => {
  it('adds billed web_search calls to the monthly cap and keeps them on reload', () => {
    const usage = withTokens(emptyUsage('2026-10'), 1_000_000, 0, 1, 1000);
    expect(usage.searchCalls).toBe(1000);
    expect(usage.costUsd).toBe(6.25);
    expect(callCostUsd(2000, 1500, 4)).toBeCloseTo(2000 / 1_000_000 * 1.25 + 1500 / 1_000_000 * 2.5 + 0.02, 6);
    const stored = parseUsage(JSON.stringify(usage), '2026-10');
    expect(stored.searchCalls).toBe(1000);
    expect(stored.costUsd).toBe(6.25);
    const legacy = parseUsage(JSON.stringify({ month: '2026-10', inputTokens: 1_000_000, outputTokens: 0, requests: 1 }), '2026-10');
    expect(legacy.searchCalls).toBe(0);
    expect(legacy.costUsd).toBe(1.25);
  });

  it('reads billed search counts and drops social urls', () => {
    const payload = {
      citations: ['https://www.reuters.com/world/story', 'https://x.com/someone/status/1'],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        output_tokens_details: { reasoning_tokens: 10 },
        server_side_tool_usage_details: { web_search_calls: 2 },
      },
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: '正文[[1]](https://www.reuters.com/world/story)',
          annotations: [{ type: 'url_citation', url: 'https://www.scmp.com/news/hk' }],
        }],
      }],
    };
    expect(webSearchCalls(payload)).toBe(2);
    expect(usageTokens(payload)).toEqual({ input: 100, output: 50 });
    expect(citationUrls(payload)).toEqual([
      'https://www.reuters.com/world/story',
      'https://x.com/someone/status/1',
      'https://www.scmp.com/news/hk',
    ]);
    expect(researchSources(citationUrls(payload)).map((source) => source.url)).toEqual([
      'https://www.reuters.com/world/story',
      'https://www.scmp.com/news/hk',
    ]);
    expect(webSearchCalls({ output: [{ type: 'web_search_call', status: 'completed' }, { type: 'web_search_call', status: 'failed' }] })).toBe(1);
    expect(stripInlineCitations('事實[[1]](https://www.reuters.com/a)。')).toBe('事實。');
    const body = researchBody('grok-4.3', '系統', '問題 /no_think', 800);
    expect(body.store).toBe(false);
    expect(body.max_turns).toBe(3);
    expect(body.include).toEqual(['no_inline_citations']);
    expect(body.tools).toEqual([{ type: 'web_search', filters: { excluded_domains: ['reddit.com', 'facebook.com', 'tiktok.com', 'instagram.com', 'youtube.com'] } }]);
  });

  it('lists Grok citations once, ahead of the cluster links', () => {
    const doc: ContentDoc = {
      kind: 'compare',
      key: 'k',
      title: '港鐵票價',
      description: '說明',
      publishedAt: '2026-10-07T00:00:00.000Z',
      hkt: '',
      mode: 'ai',
      blocks: [{
        title: '事件經過',
        sentences: ['港鐵建議調整票價。'],
        sources: [
          { title: '港鐵建議票價加幅', url: 'https://news.rthk.hk/a', source: '香港電台' },
          { title: '另一則', url: 'https://news.mingpao.com/b', source: '明報' },
        ],
      }],
    };
    const cited = attachCitations(doc, [
      'https://www.reuters.com/world/story',
      'https://news.rthk.hk/a',
      'https://www.reddit.com/r/news/comments/1',
    ]);
    expect(cited.citations?.map((source) => source.url)).toEqual([
      'https://www.reuters.com/world/story',
      'https://news.rthk.hk/a',
      'https://news.mingpao.com/b',
    ]);
    expect(cited.citations?.[1]?.source).toBe('香港電台');
    const html = renderContentPage(cited, 'https://world-news.xyz/explainer/k');
    expect(html).toContain('https://www.reuters.com/world/story');
    expect(html).toContain('來源（3）');
    expect(html.match(/href="https:\/\/news\.rthk\.hk\/a"/g)).toHaveLength(1);
  });
});

describe('publish floor and conversion', () => {
  it('drops an invented denial and noindexes a thin briefing', () => {
    const draft: ContentDoc = {
      kind: 'compare',
      key: 'k',
      title: '港鐵票價',
      description: '說明',
      publishedAt: '2026-10-07T00:00:00.000Z',
      hkt: '',
      mode: 'sources',
      blocks: [{
        title: '事件經過',
        sentences: ['草稿。'],
        sources: [{ title: '港鐵建議票價加幅', url: 'https://example.com/a', source: '香港電台', excerpt: '港鐵建議票價加幅，並交諮詢。' }],
      }],
    };
    const doc = applyModelText(draft, JSON.stringify({
      title: '港鐵建議調整票價',
      points: ['港鐵交諮詢', '加幅未有統一寫法', '程序仍在進行'],
      sections: [{ heading: '事件經過', text: '港鐵建議票價加幅，並交諮詢。政府未有回應此事。' }],
    }), 'grok-4.3');
    const text = doc?.blocks.flatMap((block) => block.sentences).join('') ?? '';
    expect(text).not.toContain('未有回應');
    expect(text).toContain('諮詢');
    const thin: ContentDoc = {
      kind: 'briefing',
      key: '2026-10-07-am',
      title: '早上導讀',
      description: '短',
      publishedAt: '2026-10-07T00:30:00.000Z',
      hkt: '',
      mode: 'ai',
      blocks: [
        { title: '香港', sentences: ['立法會通過預算。'], sources: [] },
        { title: '今日值得留意', sentences: ['預算已經通過。'], sources: [] },
      ],
    };
    expect(briefingPublic(thin)).toBe(false);
    expect(renderContentPage(thin, 'https://world-news.xyz/briefing/2026-10-07-am')).toContain('noindex');
  });

  it('does not turn 長征 into 長徵 or 核光鐘 into 核光鍾', () => {
    expect(toHK('长征火箭升空')).toBe('長征火箭升空');
    expect(toHK('長徵火箭')).toBe('長征火箭');
    expect(toHK('核光钟校時')).toBe('核光鐘校時');
    expect(toHK('核光鍾')).toBe('核光鐘');
    expect(toHK('特征明顯')).toBe('特徵明顯');
  });

  it('asks a researched article to search before it writes', () => {
    const draft: ContentDoc = {
      kind: 'compare',
      key: 'k',
      title: '標題',
      description: '說明',
      publishedAt: '2026-10-07T00:00:00.000Z',
      hkt: '',
      mode: 'sources',
      blocks: [{ title: '事件經過', sentences: ['草稿。'], sources: [{ title: '標題', url: 'https://example.com/a', source: '香港電台' }] }],
    };
    expect(promptFor(draft, false, true).system).toContain('網頁搜尋 2 至 3 次');
    expect(promptFor(draft).system).toContain('只可使用提供的標題');
  });

  it('keeps dates and holiday names readable after numeral conversion', async () => {
    const { arabicDigits } = await import('../shared/prose');
    expect(arabicDigits('提名期至十月二十日結束')).toBe('提名期至10月20日結束');
    expect(arabicDigits('十一黃金周累計')).toBe('十一黃金周累計');
    expect(usageTokens({ usage: { input_tokens: 10, output_tokens: 30, output_tokens_details: { reasoning_tokens: 20 } } })).toEqual({ input: 10, output: 30 });
  });

  it('tidies stored pieces at render and drops model commentary', async () => {
    const { tidyNumerals, preachySentence } = await import('../shared/prose');
    expect(tidyNumerals('昨晚七時54分發生火警')).toBe('昨晚7時54分發生火警');
    expect(tidyNumerals('食用二○26年10月17日')).toBe('食用2026年10月17日');
    expect(tidyNumerals('臨牀大樓1去年11月起啟用')).toBe('臨牀大樓去年11月起啟用');
    expect(preachySentence('此事凸顯兒童安全監管重要性，提醒家長履行看管責任。')).toBe(true);
    expect(preachySentence('此舉為11月22日選舉鋪路。')).toBe(true);
    expect(preachySentence('衞生防護中心提醒市民盡快接種疫苗。')).toBe(false);
    expect(preachySentence('美國國務院表示，此舉為和談鋪路。')).toBe(false);
  });
});

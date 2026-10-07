import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyModelText, promptFor, renderColumnIndex, renderContentPage } from '../shared/content';
import {
  usageTokens,
  COMPARE_BATCH,
  COMPARE_PER_DAY,
  GROK_MODEL,
  XAI_MONTHLY_CAP_USD,
  briefingFromItems,
  compareFromCluster,
  compareKey,
  emptyUsage,
  pickCompareBatch,
  preferWritten,
  richness,
  routeForCluster,
  isChinaItem,
  selectBriefingItems,
  statusFrom,
  storySignature,
  withArticle,
  withTokens,
  writerFor,
  type WrittenStory,
} from '../shared/grok';
import { renderHomeFeed } from '../shared/homePage';
import { chrome } from '../shared/contentPage';
import type { StoryCluster } from '../shared/trending';
import type { NewsItem } from '../shared/types';

const NOW = new Date('2026-10-07T01:00:00Z');

function story(id: string, title: string, source: string, category = 'world', pubDate = '2026-10-06T23:30:00Z'): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source,
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate,
    category,
    excerpt: `${source}報道：${title}`,
  };
}

function cluster(items: NewsItem[], latest = 0): StoryCluster {
  const lead = items[0];
  if (!lead) throw new Error('empty');
  return {
    id: lead.id,
    lead,
    items,
    sources: [...new Set(items.map((item) => item.source))],
    count: new Set(items.map((item) => item.source)).size,
    latest,
  };
}

function outlets(id: string, n: number, category = 'world', title = `${id} 港鐵票價`): StoryCluster {
  const items = Array.from({ length: n }, (_, index) => story(`${id}-${index}`, `${title} ${index}`, `媒體${index}`, category));
  return cluster(items, n);
}

describe('Grok spend cap', () => {
  it('prices tokens from the published rates and stops at 10 USD', () => {
    const under = withTokens(emptyUsage('2026-10'), 1_000_000, 1_000_000);
    expect(under.costUsd).toBe(3.75);
    expect(under.inputTokens).toBe(1_000_000);
    expect(under.outputTokens).toBe(1_000_000);
    expect(writerFor({ route: 'grok', costUsd: under.costUsd, hasKey: true })).toBe('grok');

    const capped = withTokens(emptyUsage('2026-10'), 4_000_000, 2_000_000);
    expect(capped.costUsd).toBe(10);
    expect(capped.costUsd).toBe(XAI_MONTHLY_CAP_USD);
    expect(writerFor({ route: 'grok', costUsd: capped.costUsd, hasKey: true })).toBe('workers');
    expect(writerFor({ route: 'grok', costUsd: 9.99, hasKey: true })).toBe('grok');
    expect(writerFor({ route: 'grok', costUsd: 0, hasKey: false })).toBe('workers');
    expect(writerFor({ route: 'workers', costUsd: 0, hasKey: true })).toBe('grok');
    expect(writerFor({ route: 'workers', costUsd: 10, hasKey: true })).toBe('workers');

    const crossed = withTokens(withTokens(emptyUsage('2026-10'), 3_000_000, 1_000_000), 2_000_000, 1_000_000);
    expect(crossed.inputTokens).toBe(5_000_000);
    expect(crossed.outputTokens).toBe(2_000_000);
    expect(crossed.requests).toBe(2);
    expect(crossed.costUsd).toBe(11.25);
    expect(writerFor({ route: 'grok', costUsd: crossed.costUsd, hasKey: true })).toBe('workers');
  });

  it('reports month-to-date tokens, cost and article counts', () => {
    const usage = withArticle(withArticle(withTokens(emptyUsage('2026-10'), 800_000, 200_000), 'grok', 'briefing'), 'workers', 'compare');
    const status = statusFrom(usage);
    expect(status.month).toBe('2026-10');
    expect(status.inputTokens).toBe(800_000);
    expect(status.outputTokens).toBe(200_000);
    expect(status.costUsd).toBe(1.5);
    expect(status.capUsd).toBe(10);
    expect(status.remainingUsd).toBe(8.5);
    expect(status.capped).toBe(false);
    expect(status.articles).toEqual({
      grokBriefing: 1,
      grokCompare: 0,
      workersBriefing: 0,
      workersCompare: 1,
      grokFocus: 0,
      workersFocus: 0,
      total: 2,
    });
    expect(statusFrom(withTokens(emptyUsage('2026-10'), 8_000_000, 0)).capped).toBe(true);
  });
});

describe('comparison story selection', () => {
  it('ranks by how many different outlets covered the story, skips same-day duplicates, and stops at 20', () => {
    const wide = outlets('wide', 6, 'hk', '港鐵建議加價');
    const mid = outlets('mid', 4, 'tech', '晶片出口新規');
    const local = outlets('local', 3, 'china', '華南暴雨');
    const thin = outlets('thin', 2, 'world', 'oil prices');
    const single = outlets('one', 1, 'world', 'only one outlet');
    const picked = pickCompareBatch([thin, single, mid, wide, local], [], COMPARE_BATCH, NOW);
    expect(picked.map((item) => item.id)).toEqual(['wide-0', 'mid-0', 'local-0']);
    expect(routeForCluster(wide)).toBe('grok');
    expect(routeForCluster(local)).toBe('grok');
    expect(routeForCluster(mid)).toBe('grok');
    expect(routeForCluster(thin)).toBe('grok');

    const written: WrittenStory[] = [{
      key: compareKey(wide, NOW),
      signature: storySignature(wide),
      links: wide.items.map((item) => item.link),
      mode: 'ai',
      at: NOW.getTime(),
    }];
    const next = pickCompareBatch([wide, mid, local, thin], written, COMPARE_BATCH, NOW);
    expect(next.map((item) => item.id)).toEqual(['mid-0', 'local-0', 'thin-0']);
    expect(next.some((item) => storySignature(item) === storySignature(wide))).toBe(false);

    const full = Array.from({ length: COMPARE_PER_DAY }, (_, index) => ({
      key: `2026-10-07-story-${index}`,
      signature: `sig${index}`,
      links: [`https://example.com/filled-${index}`],
      mode: 'ai' as const,
      at: NOW.getTime(),
    }));
    expect(pickCompareBatch([wide, mid], full, COMPARE_BATCH, NOW)).toEqual([]);
  });

  it('treats overlapping links as the same story', () => {
    const first = cluster([
      story('a', '港鐵建議加價', '香港電台', 'hk'),
      story('b', '港鐵建議加價', '明報', 'hk'),
      story('c', '港鐵建議加價', '信報', 'hk'),
    ], 5);
    const overlap = cluster([
      story('a', '港鐵建議加價', '香港電台', 'hk'),
      story('b', '港鐵建議加價', '明報', 'hk'),
      story('d', '港鐵建議加價', 'Now新聞', 'hk'),
    ], 4);
    const other = cluster([
      story('e', '天文台發出警告', '香港電台', 'hk'),
      story('f', '天文台發出警告', '明報', 'hk'),
    ], 3);
    const written: WrittenStory[] = [{
      key: compareKey(first, NOW),
      signature: storySignature(first),
      links: first.items.map((item) => item.link),
      mode: 'ai',
      at: NOW.getTime(),
    }];
    expect(pickCompareBatch([overlap, other], written, 3, NOW).map((item) => item.lead.id)).toEqual(['e']);
  });

  it('sends every comparison cluster to Grok, including finance and international', () => {
    const mixed = cluster([
      story('a', '港股', '路透', 'business'),
      story('b', '港股', '彭博', 'hk'),
    ]);
    expect(routeForCluster(mixed)).toBe('grok');
    const hkLead = cluster([
      story('a', '立法會', '香港電台', 'hk'),
      story('b', '立法會', '路透', 'world'),
      story('c', '立法會', '法新', 'world'),
    ]);
    expect(routeForCluster(hkLead)).toBe('grok');
    expect(routeForCluster(outlets('world', 3, 'world', 'oil prices'))).toBe('grok');
  });
});

describe('daily Hong Kong briefing sources', () => {
  it('keeps today\'s Hong Kong and mainland headlines and drops other categories', () => {
    const items = [
      story('hk1', '立法會通過預算', '香港電台', 'hk', '2026-10-06T23:30:00Z'),
      story('hk2', '港鐵票價諮詢', '明報', 'hk', '2026-10-06T22:00:00Z'),
      story('hk3', '天文台取消警告', '香港電台', 'hk', '2026-10-07T00:10:00Z'),
      story('cn1', '華南暴雨', '新華社', 'china', '2026-10-07T00:20:00Z'),
      story('trade', '歐中貿易談判', '路透', 'business', '2026-10-07T00:50:00Z'),
      story('old', '昨日港聞', '香港電台', 'hk', '2026-10-06T10:00:00Z'),
      story('tech', '晶片出口', 'The Verge', 'tech', '2026-10-07T00:40:00Z'),
    ];
    const selected = selectBriefingItems(items, NOW);
    expect(selected.hk.map((item) => item.id).sort()).toEqual(['hk1', 'hk2', 'hk3']);
    expect(selected.china.map((item) => item.id).sort()).toEqual(['cn1', 'trade']);
    expect(selected.hk.concat(selected.china).some((item) => item.id === 'tech' || item.id === 'old')).toBe(false);
    expect(isChinaItem(story('trade', '歐中貿易談判', '路透', 'business'))).toBe(true);
    expect(isChinaItem(story('hkx', '歐中貿易談判', '香港電台', 'hk'))).toBe(false);
    const doc = briefingFromItems(selected.hk, selected.china, '2026-10-07-am', NOW);
    expect(doc?.kind).toBe('briefing');
    expect(doc?.blocks.map((block) => block.title)).toEqual(['香港', '內地', '今日值得留意']);
    expect(promptFor(doc!).user).toContain('立法會通過預算');
    expect(promptFor(doc!).system).toContain('500');
    expect(promptFor(doc!).system).toContain('禁止添加');
  });
});

describe('mocked Grok generation', () => {
  it('turns a model JSON reply into a long comparison with sources, a table and a model credit', () => {
    const items = [
      { ...story('rthk', '港鐵建議票價加幅 3.2%', '香港電台', 'hk', '2026-10-07T00:05:00Z'), excerpt: '香港電台報道，港鐵建議票價加幅 3.2%，並交諮詢。' },
      { ...story('ming', '港鐵票價擬上調約 3%', '明報', 'hk', '2026-10-07T00:20:00Z'), excerpt: '明報指加幅約 3%，強調對日常通勤的影響。' },
      { ...story('hkej', '港鐵票價調整未列百分比', '信報', 'hk', '2026-10-07T00:40:00Z'), excerpt: '信報只說票價調整，未列具體百分比，側重程序。' },
      { ...story('now', '港鐵加價 3.2% 進入諮詢', 'Now新聞', 'hk', '2026-10-07T01:00:00Z'), excerpt: 'Now新聞報道加幅 3.2%，並提到諮詢時間表。' },
    ];
    const draft = compareFromCluster(cluster(items, 4), NOW);
    const narrative = '香港電台先寫出加幅 3.2%，並寫明會交諮詢。明報沒有沿用同一個百分比，寫成約 3%，同時把日常通勤的影響放在較前。信報沒有列出百分比，只寫票價調整，篇幅側重程序。Now新聞和香港電台一樣寫 3.2%，但多寫了諮詢時間表。四家報道的是同一項港鐵票價建議，讀者要對回各自原文，不能把諮詢寫成票價已經更改。可以並排看的，是百分比與程序：有媒體寫出 3.2%，有媒體寫約 3%，有媒體完全不列百分比。諮詢已被香港電台和 Now新聞寫出，但沒有一家把諮詢寫成票價已經更改，因此事件經過停在建議階段。';
    const response = '四家標題都沒有引述港鐵以外的人。可以寫下的只有媒體自己的說法：香港電台和 Now新聞把 3.2% 與諮詢放在一起，明報寫約 3% 並提到通勤，信報不列百分比而側重程序。這裡不能補上港鐵的官方回應，因為來源沒有寫出。因此各方回應這一節不能列出港鐵、政府或乘客的引言。讀者若要核對說法，只能回到四家各自的原文，看它們如何描述同一項建議。';
    const watch = '諮詢尚未完結，這一點 Now新聞和香港電台都寫了。3.2% 和約 3% 是個別媒體的寫法。信報提醒程序仍在進行，因此現在還看不到一個已經生效的加幅。隨後要看的是諮詢時間表有沒有新的日期，以及有沒有媒體補上港鐵的說法。在新的報道出現之前，可以留意的只有兩項：諮詢時間表會不會寫出日期，以及有沒有媒體補上港鐵自己的說法。在此之前，3.2% 與約 3% 都只是個別媒體的寫法，不能合併成一個已經生效的加幅。';
    const raw = JSON.stringify({
      title: '港鐵建議票價加幅 3.2%',
      description: '四間香港媒體報道同一項港鐵票價建議，百分比並不一致。',
      sections: [
        { heading: '事件經過', text: narrative },
        { heading: '各方回應', text: response },
        { heading: '後續關注', text: watch },
      ],
      highlight: { label: '重點數字', items: ['加幅 3.2%', '約 3%'] },
      points: ['港鐵建議調整票價', '有媒體寫 3.2%', '信報未列百分比'],
    });
    const doc = applyModelText(draft, raw, GROK_MODEL);
    expect(doc?.mode).toBe('ai');
    expect(doc?.model).toBe(GROK_MODEL);
    expect(doc?.title).toContain('港鐵');
    expect(doc?.blocks.map((block) => block.title)).toContain('事件經過');
    expect(doc?.blocks.map((block) => block.title)).toContain('事件時間線');
    expect(doc?.points).toHaveLength(3);
    expect(richness(doc!)).toBeGreaterThanOrEqual(500);
    expect(doc?.highlight?.items).toContain('加幅 3.2%');
    const narrativeText = doc?.blocks.filter((block) => block.title !== '事件時間線').flatMap((block) => block.sentences).join('') ?? '';
    expect(narrativeText).not.toContain(items[0]!.title);
    const html = renderContentPage(doc!, 'https://world-news.xyz/explainer/2026-10-07-demo');
    expect(html).toContain('AI 整合');
    expect(html).toContain('新聞懶人包');
    expect(html).toContain('xAI Grok 4.3');
    expect(html).toContain('事件時間線');
    expect(html).toContain('class="timeline"');
    expect(html).toContain('重點數字');
    expect(html).toContain('key-points');
    expect(html).toContain('https://example.com/rthk');
    expect(html).toContain('https://example.com/ming');
    expect(html.match(/href="https:\/\/example.com\/rthk"/g)).toHaveLength(1);
    expect(html.match(/href="https:\/\/example.com\/ming"/g)).toHaveLength(1);
    expect(html).not.toContain('標題同描述');
    expect(html).not.toContain('compare-table');
    expect(html).toContain('rel="canonical" href="https://world-news.xyz/explainer/2026-10-07-demo"');
    expect(html).toContain('name="robots" content="index,follow"');
    expect(html).toContain('name="description"');
    expect(html).not.toContain('noindex');
    const kept = preferWritten(doc, draft);
    expect(kept.mode).toBe('ai');
    expect(preferWritten(null, draft)).toBe(draft);
    if (process.env.PREVIEW === '1') writePreview('compare', html);
  });

  it('renders a briefing page and the homepage links', () => {
    const hk = [
      { ...story('h1', '立法會三讀通過開支預算', '香港電台', 'hk', '2026-10-06T23:10:00Z'), excerpt: '香港電台報道，立法會三讀通過開支預算，教育同醫療開支都有討論。' },
      { ...story('h2', '教育開支增幅最大', '明報', 'hk', '2026-10-06T23:40:00Z'), excerpt: '明報指開支預算已通過，教育開支增幅最大，醫療開支亦有增加。' },
    ];
    const china = [
      { ...story('c1', '華南有暴雨', '新華社', 'china', '2026-10-07T00:30:00Z'), excerpt: '新華社報道中國華南有暴雨，北京提醒市民留意。' },
    ];
    const draft = briefingFromItems(hk, china, '2026-10-07-am', NOW)!;
    const hkText = '香港電台報道立法會三讀通過開支預算，討論集中在教育與醫療開支。明報同樣指出預算已通過，並把教育開支增幅最大放在標題，醫療開支亦有增加。兩家都沒有寫出預算以外的新措施，所以這節只帶到開支預算、教育與醫療。對香港讀者，今日議會消息就是這份預算的通過。標題沒有提到新稅項或具體撥款年期，這裡也不補。想看表決過程與原文用字，應回到香港電台和明報的連結。兩家標題都圍繞這份已經通過的開支預算，教育與醫療是這節看得到的開支項目。兩家都沒有給出教育或醫療的金額，因此不能比較兩項開支相差多少，只能說教育被明報稱為增幅最大。';
    const cnText = '新華社報道中國華南有暴雨，北京提醒市民留意。這則內地消息本身很短，沒有列出降雨毫米數，因此這裡也不補任何雨量。可以肯定的只有暴雨範圍被寫成華南，以及提醒來自北京。沒有其他內地標題放在這一期，所以不能把暴雨寫成全國性的情況，亦不能假設香港會受同一場雨影響。詳情要看新華社原文。來源沒有寫出受影響的城市，也沒有寫出交通或停課，這些都不能補進這一節。';
    const watch = '今日兩邊各有一件事，而且標題沒有把它們連在一起。香港是立法會通過開支預算，教育開支被明報稱為增幅最大，醫療開支亦有增加。內地是新華社所報的華南暴雨，北京有提醒。跟進時可以先看預算對教育與醫療的寫法，再看暴雨提醒有沒有寫到具體地區。兩件事不應寫成同一個因果。原文連結附在每節下面。在來源補上金額、毫米數或城市之前，導讀只停在已經寫明的事實。';
    const doc = applyModelText(draft, JSON.stringify({
      title: '預算通過與華南暴雨',
      description: '早上導讀：香港開支預算通過，內地則是華南暴雨。',
      sections: [
        { heading: '香港', text: hkText },
        { heading: '內地', text: cnText },
        { heading: '今日值得留意', text: watch },
      ],
      points: ['立法會通過開支預算', '教育開支增幅最大', '華南有暴雨'],
    }), GROK_MODEL);
    expect(doc?.kind).toBe('briefing');
    expect(richness(doc!)).toBeGreaterThanOrEqual(500);
    const html = renderContentPage(doc!, 'https://world-news.xyz/briefing/2026-10-07-am');
    expect(html).toContain('每日香港導讀');
    expect(html).toContain('xAI Grok 4.3');
    expect(html).toContain('https://example.com/h1');
    expect(html).toContain('https://example.com/c1');
    expect(html.match(/href="https:\/\/example.com\/h1"/g)).toHaveLength(1);
    expect(html.match(/href="https:\/\/example.com\/c1"/g)).toHaveLength(1);
    expect(html).not.toContain('標題同描述');
    expect(html).toContain('key-points');
    expect(html).toContain('name="robots" content="index,follow"');
    expect(html).not.toContain('noindex');
    const index = renderColumnIndex('compare', [{
      key: doc?.key || 'x',
      title: '示範對比',
      description: '四間媒體',
      publishedAt: NOW.toISOString(),
      sources: 4,
      outlets: 4,
      category: 'hk',
    }], 'https://world-news.xyz/explainer/');
    expect(index).toContain('/explainer/');
    expect(index).toContain('新聞懶人包');
    const home = renderHomeFeed([story('home', '首頁', '香港電台', 'hk')]);
    expect(home).toContain('href="/briefing/"');
    expect(home).toContain('href="/explainer/"');
    expect(home).toContain('class="home-intro home-intro-top"');
    expect(chrome('briefing')).toContain('href="/briefing/"');
    expect(chrome('compare')).toContain('href="/explainer/"');
    expect(readFileSync('functions/sitemap.xml.ts', 'utf8')).toContain('/briefing/');
    expect(readFileSync('functions/sitemap.xml.ts', 'utf8')).toContain('/explainer/');
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('https://world-news.xyz/briefing/');
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('https://world-news.xyz/explainer/');
    expect(readFileSync('functions/compare/[slug].ts', 'utf8')).toContain('301');
    const linked = renderContentPage(doc!, 'https://world-news.xyz/briefing/2026-10-07-am', {
      explainers: [{ key: '2026-10-07-demo', title: '港鐵建議票價加幅 3.2%', description: '', publishedAt: NOW.toISOString(), sources: 4 }],
    });
    expect(linked).toContain('今日新聞懶人包');
    expect(linked).toContain('href="/explainer/2026-10-07-demo/"');
    expect(readFileSync('functions/content/xai.ts', 'utf8')).not.toMatch(/Bearer [A-Za-z0-9_-]{20,}/);
    if (process.env.PREVIEW === '1') writePreview('briefing', html);
  });
});

function writePreview(name: 'briefing' | 'compare', page: string): void {
  const dir = `/tmp/wn-preview/${name}`;
  mkdirSync(dir, { recursive: true });
  const css = `${readFileSync('src/App.css', 'utf8')}\n${readFileSync('public/columns.css', 'utf8')}`;
  const standalone = page
    .replace('<link rel="stylesheet" href="/site.css" />', `<style>${css}</style>`)
    .replace('<link rel="stylesheet" href="/columns.css" />', '');
  writeFileSync(`${dir}/index.html`, standalone);
}

describe('xAI usage accounting', () => {
  it('counts reasoning tokens as billed output', () => {
    const payload = { usage: { prompt_tokens: 1112, completion_tokens: 702, completion_tokens_details: { reasoning_tokens: 1120 } } };
    expect(usageTokens(payload)).toEqual({ input: 1112, output: 1822 });
    expect(usageTokens({ usage: { prompt_tokens: 10, completion_tokens: 5 } })).toEqual({ input: 10, output: 5 });
  });

  it('gives grok-4.3 enough time to reason and write', () => {
    const source = readFileSync('functions/content/xai.ts', 'utf8');
    expect(source).toContain('XAI_TIMEOUT_MS = 45_000');
    expect(source).not.toContain('AbortSignal.timeout(12_000)');
  });
});

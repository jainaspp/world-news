import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ARTICLE_CRITICAL_CSS } from '../shared/criticalCss';
import { renderContentPage, type ContentDoc } from '../shared/content';
import { head, packAdSlots } from '../shared/contentPage';
import { repairDoubledScheme } from '../shared/media';
import { renderStoryPage } from '../shared/storyPage';
import type { NewsItem } from '../shared/types';

function withoutNoscript(html: string): string {
  return html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
}

function item(partial: Partial<NewsItem> & Pick<NewsItem, 'id' | 'title'>): NewsItem {
  return {
    link: `https://example.com/${partial.id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-24T01:00:00.000Z',
    category: 'hk',
    ...partial,
  };
}

const source = (url: string, sourceName: string, pubDate: string) => ({
  source: sourceName,
  title: '港鐵建議調整票價',
  url,
  pubDate,
});

function explainer(): ContentDoc {
  const line = '港鐵建議調整票價，加幅仍待公布，兩間媒體都寫了同一件事。';
  return {
    kind: 'compare',
    key: '2026-10-24-demo-abcdef123456',
    title: '港鐵票價檢討',
    description: '多間媒體報道港鐵建議調整票價，加幅仍待公布。',
    publishedAt: '2026-10-24T04:00:00.000Z',
    hkt: '2026-10-24 12:00',
    mode: 'ai',
    points: ['港鐵建議調整票價。', '加幅仍待公布。'],
    blocks: [
      {
        title: '事件經過',
        sentences: [line.repeat(8)],
        sources: [
          source('https://example.com/rthk', '香港電台', '2026-10-24T01:00:00.000Z'),
          source('https://example.com/ming', '明報', '2026-10-24T03:00:00.000Z'),
        ],
      },
      {
        title: '事件時間線',
        sentences: ['香港電台報道港鐵建議調整票價。'],
        sources: [
          source('https://example.com/rthk', '香港電台', '2026-10-24T01:00:00.000Z'),
          source('https://example.com/ming', '明報', '2026-10-24T03:00:00.000Z'),
        ],
      },
    ],
  };
}

describe('article and briefing LCP shell', () => {
  it('repairs doubled image schemes without touching a real https host', () => {
    expect(repairDoubledScheme('https://https//img.jiemian.com/a_580x330.png')).toBe('https://img.jiemian.com/a_580x330.png');
    expect(repairDoubledScheme('https://https://img.jiemian.com/a.png')).toBe('https://img.jiemian.com/a.png');
    expect(repairDoubledScheme('https://https.example.com/a.jpg')).toBe('https://https.example.com/a.jpg');
  });

  it('keeps the story thumb as the LCP image and defers CSS, fonts, and /api/news', () => {
    const broken = 'https://https//img.jiemian.com/101/original/a580x330.png';
    const hero = item({
      id: 'ec15c32fe7a2',
      title: '金正恩訪丹東',
      image: 'https://cdn.example.com/hero.jpg',
    });
    const other = item({
      id: 'abc999',
      title: '同一則報道',
      source: '明報',
      pubDate: '2026-10-24T02:00:00.000Z',
    });
    const html = renderStoryPage(hero, {
      id: hero.id,
      lead: hero,
      items: [hero, other],
      sources: ['香港電台', '明報'],
      count: 2,
      latest: Date.parse(other.pubDate),
    }, [item({ id: 'abc123', title: '相關', image: broken })], 'https://world-news.xyz/story/ec15c32fe7a2/');
    const bare = withoutNoscript(html);
    expect(html).toContain('id="wn-lcp"');
    expect(html).toContain('src="https://cdn.example.com/hero.jpg"');
    expect(html).toContain('width="640"');
    expect(html).toContain('height="360"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('rel="preload" as="image" href="https://cdn.example.com/hero.jpg"');
    expect(html).toContain('https://img.jiemian.com/101/original/a580x330.png');
    expect(html).not.toContain('https://https//');
    expect(html).toContain('id="wn-critical"');
    expect(html).toContain('id="wn-lcp-boot"');
    expect(html).toContain('"/site.css"');
    expect(html).toContain('"/columns.css"');
    expect(html).toContain('class="timeline" data-timeline="scroll"');
    expect(bare).not.toContain('<link rel="stylesheet" href="/site.css"');
    expect(bare).not.toContain('<link rel="stylesheet" href="/columns.css"');
    expect(bare).not.toMatch(/<link[^>]+fonts\.googleapis\.com/);
    expect(bare).not.toContain('fonts.gstatic.com');
    expect(bare).not.toContain('/api/news');
    expect(bare).toContain('data-src="https://img.jiemian.com/101/original/a580x330.png"');
    expect(bare).not.toContain(' src="https://img.jiemian.com/101/original/a580x330.png"');
    expect(html.indexOf('id="wn-lcp"')).toBeLessThan(html.indexOf('<ol class="timeline" data-timeline="scroll">'));
  });

  it('paints explainer title, dek, and timeline before sources, with CSS deferred', () => {
    const html = renderContentPage(explainer(), 'https://world-news.xyz/explainer/2026-10-24-demo-abcdef123456/');
    const bare = withoutNoscript(html);
    const h1 = html.indexOf('<h1');
    const dek = html.indexOf('class="dek"');
    const timeline = html.indexOf('事件時間線');
    const sources = html.indexOf('來源（');
    expect(html).toContain('AI 整合');
    expect(html).toContain('新聞懶人包');
    expect(h1).toBeGreaterThan(0);
    expect(h1).toBeLessThan(dek);
    expect(dek).toBeLessThan(timeline);
    expect(timeline).toBeLessThan(sources);
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('class="story-media"'));
    expect(html).toContain('id="wn-critical"');
    expect(html).toContain('id="wn-lcp-boot"');
    expect(html).not.toContain('id="wn-lcp"');
    expect(bare).not.toContain('<link rel="stylesheet" href="/site.css"');
    expect(bare).not.toMatch(/<link[^>]+fonts\.googleapis\.com/);
    expect(bare).not.toContain('/api/news');
    expect(bare).not.toContain('pagead2.googlesyndication.com');
    expect(bare).not.toContain('enable_page_level_ads');
    expect(html).toContain('src="/columns.js"');
  });

  it('defers a briefing the same way and leaves digest, home, and learn on blocking CSS', () => {
    const doc = explainer();
    doc.kind = 'briefing';
    doc.key = '2026-10-24-pm';
    const briefing = renderContentPage(doc, 'https://world-news.xyz/briefing/2026-10-24-pm/');
    expect(withoutNoscript(briefing)).not.toContain('<link rel="stylesheet" href="/site.css"');
    expect(briefing).toContain('class="dek"');
    expect(briefing).toContain('class="story-title column-title"');
    expect(briefing).toContain('id="wn-lcp-boot"');
    expect(ARTICLE_CRITICAL_CSS).toContain('min-height: 56px');
    const digest = renderContentPage({ ...doc, kind: 'digest', key: '2026-10-24-am' }, 'https://world-news.xyz/digest/2026-10-24-am/');
    expect(digest).toContain('<link rel="stylesheet" href="/site.css"');
    expect(digest).not.toContain('id="wn-critical"');
    expect(head('標題', '說明', 'https://world-news.xyz/learn/', '', 'website', '', '', false)).toContain('<link rel="stylesheet" href="/site.css"');
    expect(readFileSync('index.html', 'utf8')).not.toContain('wn-critical');
    expect(readFileSync('shared/homePage.ts', 'utf8')).not.toContain('criticalCss');
    expect(readFileSync('shared/learnPage.ts', 'utf8')).not.toContain('lcp: true');
    expect(readFileSync('public/columns.js', 'utf8')).toContain("pageKind === 'briefing' || pageKind === 'compare'");
    expect(readFileSync('public/columns.js', 'utf8')).toContain('requestIdleCallback(loadRelated');
  });

  it('places pack ads after the body and after sources, never as a vignette', () => {
    expect(packAdSlots({ client: 'ca-pub-x', top: '1111111111', mid: '2222222222', bottom: '3333333333' })).toEqual({
      inArticle: '2222222222',
      afterSources: '3333333333',
    });
    expect(packAdSlots({ client: 'ca-pub-x', top: '1111111111' })).toEqual({
      inArticle: '',
      afterSources: '1111111111',
    });
    expect(readFileSync('shared/adPolicy.ts', 'utf8')).not.toContain('enable_page_level_ads:true');
    const rules = ARTICLE_CRITICAL_CSS.split('{').length - 1;
    expect(rules).toBeGreaterThan(40);
    expect(ARTICLE_CRITICAL_CSS).toContain('.chrome { min-height: 178px; }');
    expect(ARTICLE_CRITICAL_CSS).toContain('size-adjust: 100%');
    expect(ARTICLE_CRITICAL_CSS).toContain('.story-title.title-reserve { min-height: 113px; }');
  });

  it('reserves the explainer H1 when the headline is still English', () => {
    const english = explainer();
    english.title = 'Paramount weighs a longer bid for Warner after the board asks for more time';
    const chinese = explainer();
    const enHtml = renderContentPage(english, 'https://world-news.xyz/explainer/en/');
    const zhHtml = renderContentPage(chinese, 'https://world-news.xyz/explainer/zh/');
    expect(enHtml).toContain('class="story-title column-title title-reserve"');
    expect(zhHtml).not.toContain('class="story-title column-title title-reserve"');
    expect(readFileSync('public/live-translate.js', 'utf8')).toContain('h1.title-reserve');
    expect(readFileSync('public/columns.css', 'utf8')).toContain('.story-title.title-reserve { min-height: 113px; }');
    expect(readFileSync('public/columns.css', 'utf8')).toContain('.timeline[data-timeline="scroll"]');
  });
});

describe('T5b always-on IG snap cards', () => {
  function pointItems(html: string): string[] {
    const start = html.indexOf('class="ig-points"');
    expect(start).toBeGreaterThan(-1);
    const ul = html.slice(start, html.indexOf('</ul>', start));
    return [...ul.matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]);
  }

  it('stacks explainer and briefing cards as title, timeline, body, sources, then the ad close', () => {
    const html = renderContentPage(explainer(), 'https://world-news.xyz/explainer/2026-10-24-demo-abcdef123456/');
    const lead = html.indexOf('class="ig-card ig-card-lead"');
    const timeline = html.indexOf('class="ig-card ig-card-timeline"');
    const body = html.indexOf('class="pack-body"');
    const sources = html.indexOf('class="pack-sources"');
    const close = html.indexOf('class="ig-card ig-card-close"');
    expect(lead).toBeGreaterThan(0);
    expect(lead).toBeLessThan(timeline);
    expect(timeline).toBeLessThan(body);
    expect(body).toBeLessThan(html.indexOf('id="ad-mid"') === -1 ? sources : html.indexOf('id="ad-mid"'));
    expect(html.indexOf('class="pack-body"')).toBeLessThan(sources);
    expect(sources).toBeLessThan(close);
    expect(html.indexOf('id="ad-after-sources"')).toBeGreaterThan(sources);
    expect(html.indexOf('id="ad-after-sources"')).toBeGreaterThan(close);
    expect(html).toContain('id="ig-deck"');
    expect(html).toContain('id="ig-dots"');
    expect(html).toContain('id="ig-dots-boot"');
    expect(pointItems(html)).toEqual(['港鐵建議調整票價。', '加幅仍待公布。']);
    expect(html).not.toContain('class="key-points');
    expect(html.match(/class="pack-body"/g)).toHaveLength(1);
    expect(html).not.toContain('data-ig="3a"');

    const briefing = renderContentPage({ ...explainer(), kind: 'briefing', key: '2026-10-24-pm' }, 'https://world-news.xyz/briefing/2026-10-24-pm/');
    expect(briefing).toContain('id="ig-deck"');
    expect(briefing.indexOf('class="ig-card ig-card-lead"')).toBeLessThan(briefing.indexOf('class="ig-card ig-card-timeline"'));
    expect(briefing.indexOf('class="pack-sources"')).toBeLessThan(briefing.indexOf('class="ig-card ig-card-close"'));
    expect(briefing.indexOf('id="ad-after-sources"')).toBeGreaterThan(briefing.indexOf('class="pack-sources"'));

    const digest = renderContentPage({ ...explainer(), kind: 'digest', key: '2026-10-24-am' }, 'https://world-news.xyz/digest/2026-10-24-am/');
    expect(digest).not.toContain('id="ig-deck"');
    expect(readFileSync('index.html', 'utf8')).not.toContain('ig-deck');
    expect(readFileSync('shared/homePage.ts', 'utf8')).not.toContain('ig-deck');
  });

  it('caps the title card at three points and splits a long body into 3a and 3b', () => {
    const many = explainer();
    many.points = ['第一點', '第二點', '第三點', '第四點不應出現'];
    const capped = renderContentPage(many, 'https://world-news.xyz/explainer/cap/');
    expect(pointItems(capped)).toEqual(['第一點', '第二點', '第三點']);

    const long = explainer();
    long.points = [];
    long.blocks = [
      { title: '甲', sentences: ['甲段一句。'], sources: long.blocks[0].sources },
      { title: '乙', sentences: ['乙段一句。'], sources: long.blocks[0].sources },
      { title: '丙', sentences: ['丙段一句。'], sources: long.blocks[0].sources },
      { title: '丁', sentences: ['丁段一句。'], sources: long.blocks[0].sources },
      { title: '事件時間線', sentences: ['時間線不入正文。'], sources: long.blocks[0].sources },
    ];
    const split = renderContentPage(long, 'https://world-news.xyz/explainer/split/');
    expect(split.match(/class="pack-body"/g)).toHaveLength(1);
    expect(split).toContain('data-ig="3a"');
    expect(split).toContain('data-ig="3b"');
    expect(split.indexOf('data-ig="3a"')).toBeLessThan(split.indexOf('data-ig="3b"'));
    expect(split.indexOf('data-ig="3b"')).toBeLessThan(split.indexOf('class="pack-sources"'));
    expect(split.indexOf('id="ad-after-sources"')).toBeGreaterThan(split.indexOf('class="pack-sources"'));
    expect(split.indexOf('id="ad-mid"')).toBe(-1);
    expect(pointItems(split)).toEqual(['甲段一句。', '乙段一句。', '丙段一句。']);
    expect(pointItems(split)).not.toContain('丁段一句。');
  });

  it('skips a missing timeline, keeps story pages ad-free, and preserves CLS reserves', () => {
    const noTimeline = explainer();
    noTimeline.blocks = [{ ...noTimeline.blocks[0], sources: [noTimeline.blocks[0].sources[0]] }];
    const html = renderContentPage(noTimeline, 'https://world-news.xyz/explainer/no-tl/');
    expect(html).not.toContain('class="ig-card ig-card-timeline"');
    expect(html).toContain('ig-card-lead');
    expect(html).toContain('ig-card-close');
    expect(html.indexOf('class="pack-body"')).toBeLessThan(html.indexOf('class="pack-sources"'));

    const hero = item({ id: 'solo', title: '單一來源' });
    const alone = renderStoryPage(hero, null, [], 'https://world-news.xyz/story/solo/');
    expect(alone).toContain('id="ig-deck"');
    expect(alone).not.toContain('class="ig-card ig-card-timeline"');
    expect(alone).not.toContain('adsbygoogle');
    expect(alone).not.toContain('id="ad-after-sources"');
    expect(alone).not.toContain('id="ad-mid"');
    expect(alone).toContain('ig-card-close');
    expect(alone).toContain('收束');
    expect(alone).not.toContain('class="ig-points"');
    expect(alone).not.toContain('class="ig-card ig-card-body"');

    const other = item({ id: 'abc999', title: '同一則報道', source: '明報', pubDate: '2026-10-24T02:00:00.000Z' });
    const clustered = renderStoryPage(hero, {
      id: hero.id,
      lead: hero,
      items: [hero, other],
      sources: ['香港電台', '明報'],
      count: 2,
      latest: Date.parse(other.pubDate),
    }, [], 'https://world-news.xyz/story/solo/');
    expect(clustered.indexOf('class="ig-card ig-card-lead"')).toBeLessThan(clustered.indexOf('class="ig-card ig-card-timeline"'));
    expect(clustered.indexOf('class="ig-card ig-card-timeline"')).toBeLessThan(clustered.indexOf('class="ig-card ig-card-sources"'));
    expect(clustered.indexOf('class="ig-card ig-card-sources"')).toBeLessThan(clustered.indexOf('class="ig-card ig-card-close"'));
    expect(pointItems(clustered)).toEqual(['明報：同一則報道']);
    expect(clustered).not.toContain('id="ad-after-sources"');

    const css = readFileSync('public/columns.css', 'utf8');
    const ig = css.slice(css.indexOf('T5b always-on'));
    expect(ig.startsWith('T5b always-on')).toBe(true);
    expect(ig).toContain('scroll-snap-type: y mandatory');
    expect(ig).toContain('scroll-snap-align: start');
    expect(ig).toContain('scroll-snap-stop: always');
    expect(ig).toContain('flex: 0 0 100%');
    expect(ig).toContain('height: 100%');
    expect(ig).toContain('overflow: hidden;');
    expect(ig).not.toContain('86%');
    expect(ig).not.toContain('--ig-band');
    expect(ig).not.toContain('min-height: 100dvh');
    expect(ig).not.toContain('max-width: 900px');
    expect(ig).toContain('min-width: 901px');
    expect(ig).toContain('width: min(420px, 100%)');
    expect(ig).toContain('width: 8px');
    expect(ig).toContain('height: 8px');
    expect(ig).toContain('gap: 10px');
    expect(ig).toContain('content: "↑ 上滑"');
    expect(ig).toContain('font-size: 16px');
    expect(ig).toContain('padding: 0 22px 72px');
    expect(ig).toContain('.ig-card-timeline { order: 2; padding-bottom: 96px; }');
    expect(ig).toContain('.tl-phase {\n  display: inline;');
    expect(ig).toContain('.ig-card > * {\n  flex: 1 1 auto;');
    expect(ig).toContain('.ig-card.ig-on:not(.ig-card-close)::after');
    expect(ig).toContain('@keyframes ig-swipe-hint');
    expect(ig).toContain('@keyframes ig-swipe-hint-ink');
    expect(ig).toContain('from { color: var(--muted); }');
    expect(ig).toContain('to { color: var(--accent); }');
    expect(ig).toContain('ig-swipe-hint 1.2s ease-in-out 2');
    expect(ig).not.toContain('1.4s');
    expect(ig).not.toContain('infinite');
    expect(ig).toContain('prefers-reduced-motion: reduce');
    expect(ig).toContain('animation: none');
    expect(ig).toContain('.ig-card.ig-on:not(.ig-card-close)::after { animation: none; }');
    expect(css).not.toContain('max-width: 900px');
    expect(css).not.toContain('max-width: 768px');
    expect(css).not.toContain('min-height: 100dvh');
    expect(ARTICLE_CRITICAL_CSS).not.toContain('max-width: 900px');
    expect(ARTICLE_CRITICAL_CSS).not.toContain('min-height: 100dvh');
    expect(ARTICLE_CRITICAL_CSS).toContain('scroll-snap-type: y mandatory');
    expect(ARTICLE_CRITICAL_CSS).toContain('scroll-snap-stop: always');
    expect(ARTICLE_CRITICAL_CSS).toContain('flex: 0 0 100%');
    expect(ARTICLE_CRITICAL_CSS).toContain('height: 100%');
    expect(ARTICLE_CRITICAL_CSS).not.toContain('86%');
    expect(ARTICLE_CRITICAL_CSS).not.toContain('--ig-band');
    expect(ARTICLE_CRITICAL_CSS).toContain('width: min(420px, 100%)');
    expect(ARTICLE_CRITICAL_CSS).toContain('width: 8px; height: 8px');
    expect(ARTICLE_CRITICAL_CSS).toContain('gap: 10px');
    expect(ARTICLE_CRITICAL_CSS).toContain('@keyframes ig-swipe-hint');
    expect(ARTICLE_CRITICAL_CSS).toContain('@keyframes ig-swipe-hint-ink');
    expect(ARTICLE_CRITICAL_CSS).toContain('font-size: 16px');
    expect(ARTICLE_CRITICAL_CSS).toContain('padding: 0 22px 72px');
    expect(ARTICLE_CRITICAL_CSS).toContain('.ig-card-timeline { order: 2; padding-bottom: 96px; }');
    expect(ARTICLE_CRITICAL_CSS).toContain('overflow: hidden;');
    expect(ARTICLE_CRITICAL_CSS).toContain('.ig-card.ig-on:not(.ig-card-close)::after { animation: none; }');
    expect(ARTICLE_CRITICAL_CSS).toContain('ig-swipe-hint 1.2s ease-in-out 2');
    expect(ARTICLE_CRITICAL_CSS).toContain('from { color: var(--muted); }');
    expect(ARTICLE_CRITICAL_CSS).toContain('to { color: var(--accent); }');
    expect(ARTICLE_CRITICAL_CSS).not.toContain('1.4s');
    expect(ARTICLE_CRITICAL_CSS).not.toContain('infinite');
    expect(ARTICLE_CRITICAL_CSS).toContain('.ig-card.ig-on:not(.ig-card-close)::after');
    expect(ARTICLE_CRITICAL_CSS).toContain('animation: none');
    expect(ARTICLE_CRITICAL_CSS).toContain('[data-kind="story"]:has(.ig-deck) .ig-card-body');
    const dots = readFileSync('shared/contentPage.ts', 'utf8');
    expect(dots).toContain('id="ig-dots-boot"');
    expect(dots).not.toContain('--ig-band');
    expect(dots).toContain('ig-card-timeline");var floor=timeline?96:72');
    expect(dots).not.toContain('max-width: 900px');
    expect(dots).not.toContain('mq.matches');
    expect(readFileSync('functions/story/[id].ts', 'utf8')).toContain('loadSourceBlurbs');
    expect(readFileSync('functions/board/list.ts', 'utf8')).toContain('/api/news?part=');
    expect(readFileSync('functions/board/list.ts', 'utf8')).toContain('body=1');
    expect(readFileSync('functions/api/news.ts', 'utf8')).toContain('toListPayload');
    expect(readFileSync('functions/index.ts', 'utf8')).toContain('loadList(context)');
    expect(readFileSync('functions/index.ts', 'utf8')).not.toContain('loadStoryList');
    expect(ARTICLE_CRITICAL_CSS).toContain('.chrome { min-height: 178px; }');
    expect(ARTICLE_CRITICAL_CSS).toContain('.column-title { min-height: 56px; }');
    expect(ARTICLE_CRITICAL_CSS).toContain('.story-title.title-reserve { min-height: 113px; }');
    expect(css).toContain('.story-title.title-reserve { min-height: 113px; }');
  });

  it('emits a story body card from real blurb text and splits a long body', () => {
    const blurb = '港鐵建議調整票價，並交立法會討論。加幅仍待公布，兩間媒體都寫了同一件事。';
    const hero = item({ id: 'body1', title: '港鐵建議調整票價', excerpt: blurb });
    const html = renderStoryPage(hero, null, [], 'https://world-news.xyz/story/body1/');
    const lead = html.indexOf('class="ig-card ig-card-lead"');
    const body = html.indexOf('class="ig-card ig-card-body"');
    const sources = html.indexOf('class="ig-card ig-card-sources"');
    const close = html.indexOf('class="ig-card ig-card-close"');
    expect(html).not.toContain('class="ig-card ig-card-timeline"');
    expect(lead).toBeGreaterThan(0);
    expect(lead).toBeLessThan(body);
    expect(body).toBeLessThan(sources);
    expect(sources).toBeLessThan(close);
    expect(html).toContain('<p>港鐵建議調整票價，並交立法會討論。</p>');
    expect(html).toContain('<p>加幅仍待公布，兩間媒體都寫了同一件事。</p>');
    expect(html).not.toContain('adsbygoogle');
    expect(html).not.toContain('id="ad-after-sources"');
    expect(html.match(/class="pack-body"/g)).toHaveLength(1);
    expect(html).not.toContain('data-ig="3a"');

    const same = item({ id: 'thin', title: '只有標題', excerpt: '只有標題' });
    expect(renderStoryPage(same, null, [], 'https://world-news.xyz/story/thin/')).not.toContain('class="ig-card ig-card-body"');

    const longSentences = ['第一句報道加幅。', '第二句仍待公布。', '第三句交立法會。', '第四句兩間媒體。', '第五句同一件事。', '第六句續報票價。'];
    const long = item({ id: 'long1', title: '港鐵票價', excerpt: longSentences.join('') });
    const other = item({
      id: 'long2',
      title: '明報寫法',
      source: '明報',
      pubDate: '2026-10-24T02:00:00.000Z',
      excerpt: '明報指加幅仍待公布，側重程序。',
    });
    const splitStory = renderStoryPage(long, {
      id: long.id,
      lead: long,
      items: [long, other],
      sources: ['香港電台', '明報'],
      count: 2,
      latest: Date.parse(other.pubDate),
    }, [], 'https://world-news.xyz/story/long1/');
    expect(splitStory).toContain('data-ig="3a"');
    expect(splitStory).toContain('data-ig="3b"');
    expect(splitStory.indexOf('class="ig-card ig-card-lead"')).toBeLessThan(splitStory.indexOf('class="ig-card ig-card-timeline"'));
    expect(splitStory.indexOf('class="ig-card ig-card-timeline"')).toBeLessThan(splitStory.indexOf('data-ig="3a"'));
    expect(splitStory.indexOf('data-ig="3a"')).toBeLessThan(splitStory.indexOf('data-ig="3b"'));
    expect(splitStory.indexOf('data-ig="3b"')).toBeLessThan(splitStory.indexOf('class="ig-card ig-card-sources"'));
    expect(splitStory.indexOf('class="ig-card ig-card-sources"')).toBeLessThan(splitStory.indexOf('class="ig-card ig-card-close"'));
    expect(splitStory.match(/class="pack-body"/g)).toHaveLength(1);
    expect(splitStory).toContain('第六句續報票價。');
    expect(splitStory).not.toContain('id="ad-mid"');
    expect(splitStory).not.toContain('adsbygoogle');

    const manyParas = explainer();
    manyParas.kind = 'briefing';
    manyParas.key = '2026-10-24-pm';
    manyParas.blocks = [{
      title: '事件經過',
      sentences: ['一句。', '二句。', '三句。', '四句。', '五句。', '六句。'],
      sources: manyParas.blocks[0].sources.slice(0, 1),
    }];
    const briefing = renderContentPage(manyParas, 'https://world-news.xyz/briefing/many/');
    expect(briefing.match(/class="pack-body"/g)).toHaveLength(1);
    expect(briefing).toContain('data-ig="3a"');
    expect(briefing).toContain('data-ig="3b"');
    expect(briefing.indexOf('data-ig="3b"')).toBeLessThan(briefing.indexOf('class="pack-sources"'));
  });
});

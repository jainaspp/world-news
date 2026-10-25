import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADS_REVIEW_HOLD } from '../shared/adPolicy';
import { deferredAdLoader, packAdPlan, renderContentPage } from '../shared/contentPage';
import type { ContentDoc } from '../shared/content';
import { renderStoryPage } from '../shared/storyPage';
import type { NewsItem } from '../shared/types';

function explainer(): ContentDoc {
  return {
    kind: 'compare',
    key: '2026-10-07-fare',
    title: '港鐵建議票價加幅',
    description: '多間媒體報道同一項票價建議。',
    publishedAt: '2026-10-07T02:00:00.000Z',
    hkt: '2026-10-07 10:00',
    mode: 'ai',
    points: ['港鐵建議調整票價。', '議員要求交代加幅。'],
    highlight: { label: '重點數字', items: ['加幅 3.2%'] },
    blocks: [
      {
        title: '事件經過',
        sentences: ['港鐵建議調整票價，並交諮詢。'],
        sources: [{ source: '香港電台', title: '港鐵建議票價加幅', url: 'https://example.com/rthk', pubDate: '2026-10-07T00:05:00.000Z' }],
      },
      {
        title: '各方回應',
        sentences: ['議員要求交代加幅。'],
        sources: [{ source: '明報', title: '議員要求交代', url: 'https://example.com/ming', pubDate: '2026-10-07T00:20:00.000Z' }],
      },
      {
        title: '後續關注',
        sentences: ['下月公布結果。'],
        sources: [{ source: '信報', title: '下月公布', url: 'https://example.com/hkej', pubDate: '2026-10-07T00:40:00.000Z' }],
      },
    ],
  };
}

function order(html: string, markers: string[]) {
  let at = -1;
  for (const marker of markers) {
    const next = html.indexOf(marker, at + 1);
    expect(next, marker).toBeGreaterThan(at);
    at = next;
  }
}

describe('T1 four-layer article', () => {
  it('stacks kicker, title, dek, meta, toolbar, timeline, body, sources, then related', () => {
    const html = renderContentPage(explainer(), 'https://world-news.xyz/explainer/2026-10-07-fare/');
    order(html, [
      'class="story-kicker"',
      'AI 整合',
      '新聞懶人包',
      'class="story-title column-title"',
      'class="dek"',
      'class="story-meta"',
      'class="pack-toolbar"',
      'class="timeline" data-timeline="scroll"',
      'class="pack-body"',
      'class="pack-sources"',
      'id="ad-after-sources"',
      'id="related"',
    ]);
    expect(html.indexOf('class="story-kicker"')).toBeLessThan(html.indexOf('class="story-title column-title"'));
    expect(html).toContain('<h2 class="column-h2">事件經過</h2>');
    expect(html).toContain('<h2 class="column-h2">各方回應</h2>');
    expect(html).toContain('<h2 class="column-h2">後續關注</h2>');
    expect(html.match(/class="pack-body"/g)).toHaveLength(1);
    expect(html).not.toContain('class="key-points');
    expect(html).not.toContain('highlight-box');
    expect(html).not.toContain('重點數字');
    expect(html).not.toContain('ai-footnote');
    expect(html).not.toContain('只供參考');
    expect(html).not.toContain('<details class="topic-fold pack-fold"><summary>各方回應</summary>');
  });

  it('uses the same order on a briefing and a story page', () => {
    const briefing = renderContentPage({ ...explainer(), kind: 'briefing', key: '2026-10-07-am' }, 'https://world-news.xyz/briefing/2026-10-07-am/');
    order(briefing, [
      'class="story-kicker"',
      'AI 整合',
      'class="story-title column-title"',
      'class="dek"',
      'class="story-meta"',
      'class="pack-toolbar"',
      'class="timeline" data-timeline="scroll"',
      'class="pack-body"',
      'class="pack-sources"',
      'id="ad-after-sources"',
      'id="related"',
    ]);
    expect(briefing).not.toContain('ai-footnote');
    expect(briefing).not.toContain('class="key-points');

    const story = renderStoryPage(item('a1', '港鐵加價'), cluster(), [item('b', '其他新聞')], 'https://world-news.xyz/story/a1/');
    order(story, [
      'id="wn-lcp"',
      'class="story-kicker"',
      'class="story-title column-title"',
      'class="dek"',
      'class="story-meta"',
      'class="pack-toolbar"',
      'class="timeline" data-timeline="scroll"',
      'class="pack-sources"',
      'class="related"',
    ]);
    expect(story.indexOf('id="wn-lcp"')).toBeLessThan(story.indexOf('class="timeline" data-timeline="scroll"'));
    expect(story).not.toContain('ai-footnote');
    expect(story).not.toContain('adsbygoogle');
    expect(story).not.toContain('關於此頁');
  });

  it('locks the mobile spacing and type scale', () => {
    const css = readFileSync('public/columns.css', 'utf8');
    const mobile = css.slice(css.indexOf('Mobile 360'));
    expect(mobile.length).toBeGreaterThan(200);
    expect(mobile).toContain('padding-left: 16px');
    expect(mobile).toContain('padding-right: 16px');
    expect(mobile).toContain('gap: 24px');
    expect(mobile).toContain('margin: 0 0 12px');
    expect(mobile).toContain('font-size: 20px');
    expect(mobile).toContain('line-height: 28px');
    expect(mobile).toContain('min-height: 56px');
    expect(mobile).toContain('min-height: 113px');
    expect(mobile).toContain('margin: 0 0 8px');
    expect(mobile).toContain('font-size: 15px');
    expect(mobile).toContain('line-height: 24px');
    expect(mobile).toContain('height: 48px');
    expect(mobile).toContain('width: 14px');
    expect(mobile).toContain('height: 14px');
    expect(mobile).toContain('width: 44px');
    expect(mobile).toContain('gap: 64px');
    expect(mobile).toContain('font-size: 12px');
    expect(mobile).toContain('line-height: 16px');
    expect(mobile).toContain('height: 44px');
    expect(mobile).toContain('min-height: 44px');
    expect(mobile).toContain('gap: 8px');
    expect(mobile).toContain('font-size: 14px');
    expect(mobile).toContain('line-height: 20px');
    expect(css).toContain('max-height: 36px');
  });
});

describe('T2 article AdSense', () => {
  it('keeps vignette and anchor auto ads out of the loader and the page', () => {
    expect(ADS_REVIEW_HOLD).toBe(true);
    const loader = deferredAdLoader('ca-pub-8392975944327076');
    expect(loader).toContain('requestIdleCallback');
    expect(loader).toContain('requestAnimationFrame');
    expect(loader).toContain('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    for (const marker of ['enable_page_level_ads', 'vignette', 'anchor_ad', 'overlays', 'google_ad_client']) {
      expect(loader).not.toContain(marker);
    }
    expect(loader).toContain('.push({})');
    const html = renderContentPage(explainer(), 'https://world-news.xyz/explainer/2026-10-07-fare/', {
      ads: { client: 'ca-pub-8392975944327076', top: '1111111111', mid: '2222222222', bottom: '3333333333' },
    });
    expect(packAdPlan({ mid: '2222222222', bottom: '3333333333', client: 'ca-pub' })).toEqual({
      mid: '2222222222',
      afterSources: '3333333333',
    });
    expect(html.match(/id="ad-mid"/g)).toHaveLength(1);
    expect(html.match(/id="ad-after-sources"/g)).toHaveLength(1);
    expect(html.indexOf('class="pack-body"')).toBeLessThan(html.indexOf('id="ad-mid"'));
    expect(html.indexOf('id="ad-mid"')).toBeLessThan(html.indexOf('class="pack-sources"'));
    expect(html.indexOf('class="pack-sources"')).toBeLessThan(html.indexOf('id="ad-after-sources"'));
    expect(html.indexOf('id="ad-after-sources"')).toBeLessThan(html.indexOf('id="related"'));
    for (const marker of ['adsbygoogle', 'pagead2.googlesyndication.com', 'enable_page_level_ads', 'vignette', 'anchor_ad', 'google_ad_client', 'data-ad-slot']) {
      expect(html).not.toContain(marker);
    }
    expect(html).not.toContain('data-ad-loader');
  });
});

function item(id: string, title: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-07T01:00:00.000Z',
    category: 'hk',
  };
}

function cluster() {
  const lead = { ...item('a1', '港鐵加價'), image: 'https://example.com/cover.jpg' };
  const other = { ...item('a2', '港鐵加價交諮詢'), source: '明報', pubDate: '2026-10-07T02:00:00.000Z' };
  return { id: lead.id, lead, items: [lead, other], sources: ['香港電台', '明報'], count: 2, latest: 0 };
}

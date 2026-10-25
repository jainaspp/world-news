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
    expect(briefing).toContain('id="wn-lcp-boot"');
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

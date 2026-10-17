import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';
import { JD_TOOL_CARDS, jdToolCardMarkup, jdToolHref } from '../shared/jdToolCard';

function doc(partial: Partial<ContentDoc> & Pick<ContentDoc, 'kind' | 'key'>): ContentDoc {
  return {
    title: '測試懶人包',
    description: '多方來源整理的科技新聞。',
    blocks: [
      {
        title: '發生咩事',
        sentences: ['公司公布新功能。', '開發者可以即日試用。'],
        sources: [{ source: 'The Verge', title: '新功能上線', url: 'https://example.com/story', pubDate: '2026-10-17T01:00:00.000Z' }],
      },
    ],
    publishedAt: '2026-10-17T02:00:00.000Z',
    hkt: '2026-10-17 10:00',
    mode: 'ai',
    points: ['公司公布新功能。', '開發者可以即日試用。'],
    ...partial,
  };
}

describe('JD Tech tool card', () => {
  it('builds the locked Concept B UTM on each reel', () => {
    expect(JD_TOOL_CARDS).toHaveLength(7);
    for (const card of JD_TOOL_CARDS) {
      const href = jdToolHref(card.slug);
      const url = new URL(href);
      expect(url.origin + url.pathname).toBe(`https://jainaspp.github.io/jd-tech-landing/reels/${card.slug}/`);
      expect(url.searchParams.get('utm_source')).toBe('worldnews');
      expect(url.searchParams.get('utm_medium')).toBe('referral');
      expect(url.searchParams.get('utm_campaign')).toBe('toolcard');
      expect(url.searchParams.get('utm_content')).toBe('card-footer');
      expect(url.searchParams.get('utm_term')).toBe(card.slug);
      expect(href).not.toContain('utm_campaign=mustread_tool');
      expect(href).not.toContain('utm_source=world-news');
    }
  });

  it('places one card above the source list on each mapped explainer', () => {
    for (const card of JD_TOOL_CARDS) {
      const html = renderContentPage(doc({ kind: 'compare', key: card.key }), `https://world-news.xyz/explainer/${card.key}`);
      const markup = jdToolCardMarkup(card.key);
      expect(html.match(/class="jd-tool-card"/g)).toHaveLength(1);
      expect(html).toContain(markup);
      expect(html).toContain(`>${card.cta}</a>`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html.indexOf('class="jd-tool-card"')).toBeLessThan(html.indexOf('來源（'));
      expect(html).not.toContain('adsbygoogle');
    }
  });

  it('stays off other explainers and off a failed shell of a mapped key', () => {
    const other = renderContentPage(doc({ kind: 'compare', key: '2026-10-17-some-other-story' }), 'https://world-news.xyz/explainer/other');
    expect(other).not.toContain('jd-tool-card');
    expect(other).toContain('來源（');
    const failed = renderContentPage(doc({
      kind: 'compare',
      key: JD_TOOL_CARDS[0]!.key,
      mode: 'sources',
    }), 'https://world-news.xyz/explainer/failed');
    expect(failed).not.toContain('jd-tool-card');
    const briefing = renderContentPage(doc({ kind: 'briefing', key: JD_TOOL_CARDS[0]!.key }), 'https://world-news.xyz/briefing/x');
    expect(briefing).not.toContain('jd-tool-card');
  });

  it('uses the site card tokens', () => {
    const css = readFileSync('public/columns.css', 'utf8');
    expect(css).toContain('.jd-tool-card');
    expect(css).toContain('background: var(--card)');
    expect(css).toContain('html.dark .jd-tool-card');
  });
});

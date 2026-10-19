import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { explainerCurrent, renderContentPage, type ContentDoc } from '../shared/content';
import { renderTechPage } from '../shared/civilizationPage';
import { cantoneseLeft } from '../shared/prose';
import { JD_TOOL_CARDS, SOFT_BRIDGE_PAIRS, jdToolCardMarkup, jdToolHref, softBridgeHref } from '../shared/jdToolCard';

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

/** Long enough, and shaped like a public explainer, so the page is indexable. */
function published(partial: Partial<ContentDoc> & Pick<ContentDoc, 'kind' | 'key'>): ContentDoc {
  const line = '公司公布新功能，開發者可以即日核對文件，並按公開步驟試用。';
  const next = doc({
    blocks: [
      {
        title: '事件經過',
        sentences: [line.repeat(20)],
        sources: [{ source: 'The Verge', title: '新功能上線', url: 'https://example.com/story', pubDate: '2026-10-17T01:00:00.000Z' }],
      },
      {
        title: '事件時間線',
        sentences: ['10月17日，公司公布新功能。'],
        sources: [{ source: 'The Verge', title: '時間線', url: 'https://example.com/time', pubDate: '2026-10-17T01:00:00.000Z' }],
      },
      {
        title: '各方回應',
        sentences: ['開發者可以即日試用，並核對公開文件。'],
        sources: [],
      },
    ],
    ...partial,
  });
  return next;
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
      const page = published({ kind: 'compare', key: card.key });
      expect(explainerCurrent(page)).toBe(true);
      const html = renderContentPage(page, `https://world-news.xyz/explainer/${card.key}`);
      const markup = jdToolCardMarkup(card.key);
      expect(html.match(/class="jd-tool-card"/g)).toHaveLength(1);
      expect(html).toContain(markup);
      expect(html).toContain(`>${card.cta}</a>`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html.indexOf('class="jd-tool-card"')).toBeLessThan(html.indexOf('來源（'));
      expect(html).not.toContain('adsbygoogle');
      expect(html).toContain('name="robots" content="index,follow"');
    }
  });

  it('links the three soft-bridge pairs with Concept B and formal Chinese', () => {
    expect(SOFT_BRIDGE_PAIRS.length).toBeGreaterThanOrEqual(3);
    const slugs = SOFT_BRIDGE_PAIRS.map((pair) => pair.slug);
    expect(slugs).toContain('reread-llamaparse-notebooklm');
    expect(slugs).toContain('verify-redisdocs-perplexity');
    const locked = [
      {
        slug: 'reread-llamaparse-notebooklm',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=notebooklm',
      },
      {
        slug: 'verify-redisdocs-perplexity',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/perplexity/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=perplexity',
      },
    ];
    for (const expected of locked) {
      const pair = SOFT_BRIDGE_PAIRS.find((item) => item.slug === expected.slug);
      expect(pair).toBeTruthy();
      expect(softBridgeHref(pair!)).toBe(expected.href);
    }
    const reelKeys = new Set(JD_TOOL_CARDS.map((card) => card.key));
    for (const pair of SOFT_BRIDGE_PAIRS) {
      expect(reelKeys.has(pair.explainerKey)).toBe(false);
      expect(pair.jdUrl.startsWith('https://jainaspp.github.io/jd-tech-landing/')).toBe(true);
      expect(pair.lazyPackUrl.startsWith('https://world-news.xyz/explainer/')).toBe(true);
      expect(cantoneseLeft(pair.cta)).toBe(false);
      expect(cantoneseLeft(pair.disclosure)).toBe(false);
      const page = published({ kind: 'compare', key: pair.explainerKey });
      expect(explainerCurrent(page)).toBe(true);
      const html = renderContentPage(page, pair.lazyPackUrl);
      expect(html.match(/class="jd-tool-card"/g)).toHaveLength(1);
      expect(html).toContain(softBridgeHref(pair).replace(/&/g, '&amp;'));
      expect(html).toContain(`>${pair.cta}</a>`);
      expect(html).toContain(pair.disclosure);
      expect(html).toContain('utm_campaign=toolcard');
      expect(html).not.toContain('adsbygoogle');
      expect(html).toContain('name="robots" content="index,follow"');
      expect(html.indexOf('class="jd-tool-card"')).toBeLessThan(html.indexOf('來源（'));
    }
  });

  it('stays off other explainers, thin pages, failed shells, briefings, and the civilization axis', () => {
    const other = renderContentPage(published({ kind: 'compare', key: '2026-10-17-some-other-story' }), 'https://world-news.xyz/explainer/other');
    expect(other).not.toContain('jd-tool-card');
    expect(other).toContain('來源（');
    const thin = renderContentPage(doc({ kind: 'compare', key: SOFT_BRIDGE_PAIRS[0]!.explainerKey }), 'https://world-news.xyz/explainer/thin');
    expect(thin).toContain('name="robots" content="noindex,follow"');
    expect(thin).not.toContain('jd-tool-card');
    const failed = renderContentPage(doc({
      kind: 'compare',
      key: JD_TOOL_CARDS[0]!.key,
      mode: 'sources',
    }), 'https://world-news.xyz/explainer/failed');
    expect(failed).not.toContain('jd-tool-card');
    const briefing = renderContentPage(doc({ kind: 'briefing', key: JD_TOOL_CARDS[0]!.key }), 'https://world-news.xyz/briefing/x');
    expect(briefing).not.toContain('jd-tool-card');
    expect(renderTechPage().html).not.toContain('jd-tool-card');
    expect(existsSync('functions/reels')).toBe(false);
    expect(existsSync('functions/tools/index.ts')).toBe(true);
    expect(existsSync('functions/tools/[[path]].ts')).toBe(false);
    const toolsRoute = readFileSync('functions/tools/index.ts', 'utf8');
    expect(toolsRoute).toContain('status: 200');
    expect(toolsRoute).not.toContain('301');
  });

  it('uses the site card tokens', () => {
    const css = readFileSync('public/columns.css', 'utf8');
    expect(css).toContain('.jd-tool-card');
    expect(css).toContain('background: var(--card)');
    expect(css).toContain('html.dark .jd-tool-card');
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { explainerCurrent, renderContentPage, type ContentDoc } from '../shared/content';
import { renderTechPage } from '../shared/civilizationPage';
import { cantoneseLeft } from '../shared/prose';
import { JD_TOOL_CARDS, SOFT_BRIDGE_PAIRS, jdToolCardMarkup, jdToolHref, softBridgeCardMarkup, softBridgeHref, softBridgeIssues, softBridgeSecondaryHref, type SoftBridgePair } from '../shared/jdToolCard';

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

  it('links each soft-bridge pair with Concept B and formal Chinese', () => {
    expect(SOFT_BRIDGE_PAIRS.length).toBeGreaterThanOrEqual(9);
    const slugs = SOFT_BRIDGE_PAIRS.map((pair) => pair.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).not.toContain('record-notta-minutes');
    expect(slugs).not.toContain('pdf-deadlines-gemini');
    expect(slugs).not.toContain('caption-capcut-auto');
    const rendered = new Map<string, SoftBridgePair>();
    for (const pair of SOFT_BRIDGE_PAIRS) rendered.set(pair.explainerKey, pair);
    expect(slugs).toContain('reread-llamaparse-notebooklm');
    expect(slugs).toContain('verify-redisdocs-perplexity');
    expect(slugs).toContain('read-web-firecrawl-copilot');
    expect(slugs).toContain('remember-cognee-notebooklm');
    expect(slugs).toContain('agreements-docusign-gemini');
    const locked = [
      {
        slug: 'reread-llamaparse-notebooklm',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=notebooklm',
      },
      {
        slug: 'verify-redisdocs-perplexity',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/perplexity/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=perplexity',
      },
      {
        slug: 'read-web-firecrawl-copilot',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/copilot/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=copilot',
      },
      {
        slug: 'remember-cognee-notebooklm',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=notebooklm',
      },
      {
        slug: 'agreements-docusign-gemini',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/gemini/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=gemini',
      },
      {
        slug: 'verify-firecrawl-perplexity-myth',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/perplexity/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=perplexity-myth-check',
      },
      {
        slug: 'memory-mem0-copilot-summary',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/copilot/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=copilot-summary',
      },
      {
        slug: 'cms-strapi-claude-rewrite',
        href: 'https://jainaspp.github.io/jd-tech-landing/tools/claude/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=claude-rewrite',
      },
    ];
    for (const expected of locked) {
      const pair = SOFT_BRIDGE_PAIRS.find((item) => item.slug === expected.slug);
      expect(pair).toBeTruthy();
      expect(softBridgeHref(pair!)).toBe(expected.href);
    }
    const reelKeys = new Set(JD_TOOL_CARDS.map((card) => card.key));
    expect(rendered.get('2026-10-19-firecrawl-mcp-hosted-oauth-keyless-e245baec4022')?.slug).toBe('verify-firecrawl-perplexity-myth');
    for (const pair of SOFT_BRIDGE_PAIRS) {
      expect(reelKeys.has(pair.explainerKey)).toBe(false);
      expect(pair.jdUrl.startsWith('https://jainaspp.github.io/jd-tech-landing/')).toBe(true);
      expect(pair.lazyPackUrl.startsWith('https://world-news.xyz/explainer/')).toBe(true);
      expect(cantoneseLeft(pair.cta)).toBe(false);
      expect(cantoneseLeft(pair.disclosure)).toBe(false);
      const shown = rendered.get(pair.explainerKey)!;
      const page = published({ kind: 'compare', key: pair.explainerKey });
      expect(explainerCurrent(page)).toBe(true);
      const html = renderContentPage(page, pair.lazyPackUrl);
      expect(html.match(/class="jd-tool-card"/g)).toHaveLength(1);
      expect(html).toContain(softBridgeHref(shown).replace(/&/g, '&amp;'));
      expect(html).toContain(`>${shown.cta}</a>`);
      expect(html).toContain(shown.disclosure);
      if (shown.slug !== pair.slug) expect(html).not.toContain(`>${pair.cta}</a>`);
      expect(html).toContain('utm_campaign=toolcard');
      expect(html).not.toContain('adsbygoogle');
      expect(html).toContain('name="robots" content="index,follow"');
      expect(html.indexOf('class="jd-tool-card"')).toBeLessThan(html.indexOf('來源（'));
    }
  });

  it('guards a malformed jdUrl without throwing', () => {
    expect(softBridgeIssues()).toEqual([]);
    const bad: SoftBridgePair = {
      slug: 'broken-jd',
      explainerKey: 'not-published',
      lazyPackUrl: 'https://world-news.xyz/explainer/not-published/',
      jdUrl: 'not a url',
      utmTerm: 'broken',
      cta: '工具：測試——壞網址不應中斷頁面。',
      disclosure: '本卡為教學深鏈。',
    };
    expect(softBridgeIssues([bad])).toEqual(['broken-jd:jdUrl']);
    expect(() => softBridgeHref(bad)).not.toThrow();
    expect(softBridgeHref(bad)).toBe('');
    for (const jdUrl of ['', ':::', '/tools/copilot/']) {
      const pair = { ...bad, jdUrl };
      expect(softBridgeIssues([pair])).toEqual(['broken-jd:jdUrl']);
      expect(softBridgeHref(pair)).toBe('');
    }
    const page = published({ kind: 'compare', key: '2026-10-19-mem0-hosted-mcp-00290c292710' });
    expect(() => renderContentPage(page, 'https://world-news.xyz/explainer/2026-10-19-mem0-hosted-mcp-00290c292710/')).not.toThrow();
    const badSecondary: SoftBridgePair = {
      ...bad,
      jdUrl: 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/',
      utmTerm: 'notebooklm',
      follow: {
        receipt: '跟住做：厚文件 → 可重聽摘要（JD Tech · NotebookLM）',
        title: '【跟住做｜90 秒｜NotebookLM】',
        steps: ['第一步仍可顯示。'],
        secondary: { label: '粵語 3 步示範', jdUrl: 'not a url', utmTerm: 'notebooklm-pdf-podcast' },
      },
    };
    expect(softBridgeIssues([badSecondary])).toEqual(['broken-jd:secondaryJdUrl']);
    expect(softBridgeHref(badSecondary)).toBe('https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=notebooklm');
    expect(softBridgeSecondaryHref(badSecondary)).toBe('');
    const kept = softBridgeCardMarkup(badSecondary);
    expect(kept.match(/<a /g)).toHaveLength(1);
    expect(kept).toContain(`>${bad.cta}</a>`);
    expect(kept).not.toContain('粵語 3 步示範');
    expect(kept).toContain('第一步仍可顯示。');
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
    expect(css).toContain('.jd-tool-steps');
    expect(css).toContain('.jd-tool-actions');
  });

  it('upgrades only the LlamaParse pair to the NotebookLM 90-second card', () => {
    const pair = SOFT_BRIDGE_PAIRS.find((item) => item.slug === 'reread-llamaparse-notebooklm');
    expect(pair?.explainerKey).toBe('2026-10-19-llamaparse-per-product-mcp-c15c091b4276');
    expect(SOFT_BRIDGE_PAIRS.filter((item) => item.follow).map((item) => item.slug)).toEqual(['reread-llamaparse-notebooklm']);
    expect(pair?.cta).toBe('打開工具說明');
    expect(pair?.disclosure).toBe('披露：教學：JD Tech｜本卡為教學深鏈；聯盟連結批核前不替換。');
    expect(pair?.follow?.title).toBe('【跟住做｜90 秒｜NotebookLM】');
    expect(pair?.follow?.receipt).toBe('跟住做：厚文件 → 可重聽摘要（JD Tech · NotebookLM）');
    expect(pair?.follow?.steps).toEqual([
      '開啟 NotebookLM，新建筆記本，上傳要重讀的 PDF／長文件。',
      '待索引完成後，選音訊概覽（或同等語音摘要）並生成。',
      '用耳機重聽重點；需逐步操作見粵語 Reel／工具說明頁。',
    ]);
    const written = [
      pair!.cta,
      pair!.disclosure,
      pair!.follow!.title,
      pair!.follow!.receipt,
      pair!.follow!.secondary.label,
      ...pair!.follow!.steps,
    ];
    for (const line of written) expect(cantoneseLeft(line)).toBe(false);
    const primary = 'https://jainaspp.github.io/jd-tech-landing/tools/notebooklm/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=notebooklm';
    const secondary = 'https://jainaspp.github.io/jd-tech-landing/reels/notebooklm-pdf-podcast/?utm_source=worldnews&utm_medium=referral&utm_campaign=toolcard&utm_content=card-footer&utm_term=notebooklm-pdf-podcast';
    expect(softBridgeHref(pair!)).toBe(primary);
    expect(softBridgeSecondaryHref(pair!)).toBe(secondary);
    const markup = jdToolCardMarkup(pair!.explainerKey);
    expect(markup.match(/class="jd-tool-card"/g)).toHaveLength(1);
    expect(markup.match(/<a /g)).toHaveLength(2);
    expect(markup).toContain(primary.replace(/&/g, '&amp;'));
    expect(markup).toContain(secondary.replace(/&/g, '&amp;'));
    expect(markup).toContain('>打開工具說明</a>');
    expect(markup).toContain('>粵語 3 步示範</a>');
    expect(markup).toContain('<ol class="jd-tool-steps">');
    expect(markup).not.toContain('把厚 PDF 與長文件變成可以重聽的語音式摘要');
    const page = renderContentPage(published({ kind: 'compare', key: pair!.explainerKey }), pair!.lazyPackUrl);
    expect(page.match(/class="jd-tool-card"/g)).toHaveLength(1);
    expect(page.indexOf('class="jd-tool-card"')).toBeLessThan(page.indexOf('來源（'));
    expect(page).toContain('【跟住做｜90 秒｜NotebookLM】');
    expect(page).toContain(secondary.replace(/&/g, '&amp;'));
    expect(page).not.toContain('adsbygoogle');
    const cognee = SOFT_BRIDGE_PAIRS.find((item) => item.slug === 'remember-cognee-notebooklm')!;
    expect(cognee.follow).toBeUndefined();
    expect(softBridgeSecondaryHref(cognee)).toBe('');
    const cogneePage = renderContentPage(published({ kind: 'compare', key: cognee.explainerKey }), cognee.lazyPackUrl);
    expect(cogneePage.match(/class="jd-tool-card"/g)).toHaveLength(1);
    expect(cogneePage).toContain(`>${cognee.cta}</a>`);
    expect(cogneePage).not.toContain('【跟住做｜90 秒｜NotebookLM】');
    expect(cogneePage).not.toContain('notebooklm-pdf-podcast');
    const reel = jdToolCardMarkup('2026-10-17-adobe-firefly-audio-studio-396ca03f03bc');
    expect(reel.match(/<a /g)).toHaveLength(1);
    expect(reel).toContain('notebooklm-pdf-podcast');
    expect(reel).not.toContain('jd-tool-steps');
  });
});

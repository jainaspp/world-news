import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { onRequest } from '../functions/tools/index';
import { JD_TOOL_CARDS } from '../shared/jdToolCard';
import { blockedSitemapLoc, staticSitemapUrls } from '../shared/sitemap';
import { FOOTER_LINKS } from '../shared/siteNav';
import { SOFT_BRIDGE_PAIRS } from '../shared/softBridgePairs';
import { renderToolsDraftIndex, toolsDraftHeaders } from '../shared/toolsDraft';

const PARTICLES = /我哋|嘅|喺|咗|點樣|决|嘢|咁|同埋|呢個|呢啲|呢|唔|冇|仲未|撳|睇/g;
const BARE_HAI = /(?<![關係干])係(?![數統列])/g;
const TAIWAN = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園/;

describe('tools draft index', () => {
  it('lists soft-bridge pairs as text links and stays noindex without ads', async () => {
    const response = onRequest();
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect(response.headers.get('location')).toBeNull();
    expect(toolsDraftHeaders()['cache-control']).toBe('public, max-age=300');

    const html = await response.text();
    expect(html).toBe(renderToolsDraftIndex());
    expect(html).toContain('data-page="tools-draft"');
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).toContain('rel="canonical" href="https://world-news.xyz/tools/"');
    expect(html).not.toContain('adsbygoogle');
    expect(html).not.toContain('pagead');
    expect(html).not.toContain('ca-pub-');
    expect(html).not.toContain('utm_');
    expect(html).not.toContain('/reels/');
    expect(html).not.toContain('href="/tools');
    expect(html).not.toContain('301');
    expect(html).not.toMatch(TAIWAN);
    expect(html.match(PARTICLES) ?? []).toEqual([]);
    expect(html.match(BARE_HAI) ?? []).toEqual([]);

    const list = html.match(/<ul class="points">([\s\S]*?)<\/ul>/)?.[1] ?? '';
    expect(list.match(/<li>/g)?.length).toBe(SOFT_BRIDGE_PAIRS.length);
    for (const pair of SOFT_BRIDGE_PAIRS) {
      const explainer = new URL(pair.lazyPackUrl).pathname;
      expect(list).toContain(`href="${explainer}"`);
      expect(list).toContain(`href="${pair.jdUrl}"`);
      expect(list).toContain(pair.slug);
      expect(list).toContain(pair.cta);
      expect(pair.jdUrl).not.toContain('?');
    }
    for (const card of JD_TOOL_CARDS) {
      expect(html).not.toContain(`/reels/${card.slug}/`);
      expect(html).not.toContain(card.slug);
    }
  });

  it('keeps the draft out of navigation, redirects and the sitemap', () => {
    expect(FOOTER_LINKS.some((link) => link.href.includes('/tools'))).toBe(false);
    const redirects = readFileSync('public/_redirects', 'utf8');
    expect(redirects).not.toContain('/tools');
    const middleware = readFileSync('functions/_middleware.ts', 'utf8');
    expect(middleware).not.toContain("'/tools");
    expect(blockedSitemapLoc('https://world-news.xyz/tools/')).toBe(true);
    expect(blockedSitemapLoc('https://world-news.xyz/tools')).toBe(true);
    expect(blockedSitemapLoc('https://world-news.xyz/tools/notebooklm/')).toBe(true);
    expect(blockedSitemapLoc('https://world-news.xyz/explainer/note/')).toBe(false);
    expect(staticSitemapUrls().some((row) => row.loc.includes('/tools'))).toBe(false);
    expect(readFileSync('public/sitemap.xml', 'utf8')).not.toContain('/tools');
    expect(readFileSync('public/robots.txt', 'utf8')).not.toContain('Disallow: /tools');
    expect(readFileSync('shared/adPolicy.ts', 'utf8')).toContain('ADS_REVIEW_HOLD = true');
  });
});

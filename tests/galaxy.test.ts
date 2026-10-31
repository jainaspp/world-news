import { describe, expect, it } from 'vitest';
import { onRequest } from '../functions/civilization/[[path]]';
import { galaxyAliasRedirect, onRequest as edgeOnRequest } from '../functions/_middleware';
import type { PagesContext } from '../functions/env';
import {
  GALAXY_MIN_CHARS,
  GALAXY_QUESTIONS,
  galaxyIndexable,
  galaxyProse,
  galaxyRobots,
} from '../shared/civilization/galaxy';
import { civilizationPublicPaths, renderGalaxyPage } from '../shared/civilizationPage';
import { cjkChars } from '../shared/contentPage';
import { staticSitemapXml } from '../shared/sitemap';

const REDLINE = /台灣|臺灣|台湾|Taiwan|Taipei|台北|臺北|高雄|台南|臺南|台中|臺中|新北|桃園|台獨|臺獨|六四|天安門|Tiananmen|港獨|文革|文化大革命|主權|示威|遊行|抗議|佔領/;

function context(path: string): PagesContext {
  return {
    request: new Request(`https://world-news.xyz${path}`),
    env: {},
    waitUntil: () => {},
    next: async () => new Response('next'),
  };
}

describe('galaxy thick page', () => {
  it('clears the CJK floor and switches robots across the threshold', () => {
    const chars = cjkChars(galaxyProse());
    expect(chars).toBeGreaterThanOrEqual(3000);
    expect(chars).toBeGreaterThanOrEqual(GALAXY_MIN_CHARS);
    expect(galaxyRobots(GALAXY_MIN_CHARS - 1)).toBe('noindex,follow');
    expect(galaxyRobots(GALAXY_MIN_CHARS)).toBe('index,follow');
    expect(galaxyIndexable('短')).toBe(false);
    expect(galaxyIndexable()).toBe(true);
    expect(galaxyRobots(chars)).toBe('index,follow');
    for (const question of GALAXY_QUESTIONS) expect([...question].length).toBeLessThanOrEqual(28);
  });

  it('renders an independent thick page with cosmos and earth handoffs', () => {
    const page = renderGalaxyPage();
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain(`content="${galaxyRobots(cjkChars(galaxyProse()))}"`);
    expect(page.html).toContain('index,follow');
    expect(page.html).not.toContain('noindex');
    expect(page.html).toContain('<h1 class="column-title civ-page-title">銀河系誕生</h1>');
    expect(page.html).toContain('class="civ-article galaxy-page"');
    expect(page.html).toContain('ig-card-flow');
    expect(page.html).toContain('class="ig-card ig-card-close"');
    expect(page.html).not.toContain('稍後獨立成頁');
    expect(page.html).not.toContain('這一級是導航入口');
    expect(page.html).toContain('id="define"');
    expect(page.html).toContain('id="formation"');
    expect(page.html).toContain('id="structure"');
    expect(page.html).toContain('id="cosmos-link"');
    expect(page.html).toContain('id="earth-handoff"');
    expect(page.html).toContain('id="ask"');
    expect(page.html).toContain('id="sources"');
    expect(page.html).toContain('id="note-light-year"');
    expect(page.html).toContain('id="note-dark-matter"');
    expect(page.html).toContain('id="note-metallicity"');
    expect(page.html).toContain('id="note-spiral-arm"');
    expect(page.html).toContain('id="note-cosmic-year"');
    expect(page.html).toContain('id="note-molecular-cloud"');
    expect(page.html).toContain('href="/civilization/cosmos/#cosmo-4"');
    expect(page.html).toContain('宇宙長河');
    expect(page.html).toContain('href="/civilization/earth/"');
    expect(page.html).toContain('地球生命');
    expect(page.html).toContain('href="/civilization/origins/"');
    expect(page.html).toContain('人類起源時間線');
    expect(page.html).toContain('onerror="this.hidden=true"');
    expect(page.html).toContain('href="https://science.nasa.gov/universe/galaxies/"');
    expect(page.html).toContain('CC BY 4.0');
    expect(page.html).not.toContain('id="hk-info"');
    expect(page.html).not.toMatch(REDLINE);
    expect(page.html).toContain('rel="canonical" href="https://world-news.xyz/civilization/galaxy/"');
    expect(civilizationPublicPaths()).toContain('/civilization/galaxy/');
    expect(staticSitemapXml()).toContain('https://world-news.xyz/civilization/galaxy/</loc>');
  });

  it('serves the canonical path at 200 and keeps child routes off the entry', async () => {
    const slash = onRequest(context('/civilization/galaxy/'));
    const bare = onRequest(context('/civilization/galaxy'));
    expect(slash.status).toBe(200);
    expect(bare.status).toBe(200);
    expect(slash.headers.get('x-robots-tag')).toBe('index, follow');
    expect(bare.headers.get('x-robots-tag')).toBe('index, follow');
    const html = await slash.text();
    expect(html).toContain('<h1 class="column-title civ-page-title">銀河系誕生</h1>');
    expect(html).toContain('rel="canonical" href="https://world-news.xyz/civilization/galaxy/"');
    const child = onRequest(context('/civilization/galaxy/01/'));
    expect(child.status).toBe(404);
    expect(child.headers.get('x-robots-tag')).toBe('noindex, follow');
  });

  it('redirects the /galaxy dead aliases to the canonical thick page', async () => {
    expect(galaxyAliasRedirect('world-news.xyz', '/galaxy', '')).toBe('https://world-news.xyz/civilization/galaxy/');
    expect(galaxyAliasRedirect('world-news.xyz', '/galaxy/', '')).toBe('https://world-news.xyz/civilization/galaxy/');
    expect(galaxyAliasRedirect('world-news.xyz', '/galaxy/', '?q=1')).toBe('https://world-news.xyz/civilization/galaxy/?q=1');
    expect(galaxyAliasRedirect('www.world-news.xyz', '/galaxy', '')).toBe('https://world-news.xyz/civilization/galaxy/');
    expect(galaxyAliasRedirect('world-news-b5e.pages.dev', '/galaxy/', '')).toBe('https://world-news.xyz/civilization/galaxy/');
    expect(galaxyAliasRedirect('cursor-galaxy.world-news-b5e.pages.dev', '/galaxy', '')).toBe('https://cursor-galaxy.world-news-b5e.pages.dev/civilization/galaxy/');
    expect(galaxyAliasRedirect('world-news.xyz', '/galaxy/01', '')).toBeNull();
    expect(galaxyAliasRedirect('world-news.xyz', '/civilization/galaxy/', '')).toBeNull();

    for (const path of ['/galaxy', '/galaxy/']) {
      let nextCalled = false;
      const response = await edgeOnRequest({
        request: new Request(`https://world-news.xyz${path}`),
        env: {},
        waitUntil() {},
        next: async () => {
          nextCalled = true;
          return new Response('missing', { status: 404 });
        },
      });
      expect(nextCalled).toBe(false);
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('https://world-news.xyz/civilization/galaxy/');
    }
  });
});

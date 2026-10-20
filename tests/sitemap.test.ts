import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeDoc, resetKvWriteState, type ContentEnv } from '../functions/content/store';
import { renderPublishedSitemap } from '../functions/content/sitemapPublish';
import { writePublishedSitemap } from '../server/sitemapFile';
import { heritagePublicPaths } from '../shared/heritagePage';
import {
  omitSitemapLocs,
  renderSitemap,
  sitemapForPublish,
  sitemapUrls,
  staticSitemapXml,
} from '../shared/sitemap';
import type { ContentDoc } from '../shared/content';

const SHELL = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://world-news.xyz/</loc><priority>1.0</priority></url>
  <url><loc>https://world-news.xyz/region/hkg</loc></url>
  <url><loc>https://world-news.xyz/region/twn</loc></url>
  <url><loc>https://world-news.xyz/digest/</loc></url>
  <url><loc>https://world-news.xyz/digest/2026-10-01-am</loc></url>
  <url><loc>https://world-news.xyz/weekly/</loc></url>
</urlset>
`;

function publicBriefing(): ContentDoc {
  const line = '立法會完成預算案審議，各項開支安排已經公開，市民可以查閱文件。';
  return {
    kind: 'briefing',
    key: '2026-10-07-am',
    title: '早上導讀',
    description: '立法會完成預算案審議。',
    points: ['立法會完成預算案審議，文件已經公開。', '各項開支安排可以查閱。'],
    publishedAt: '2026-10-07T00:30:00.000Z',
    hkt: '2026-10-07 08:30',
    mode: 'ai',
    blocks: [
      { title: '香港', sentences: [line.repeat(15)], sources: [] },
      { title: '內地', sentences: ['內地公布貿易數據，出口保持增長。'], sources: [] },
      { title: '今日值得留意', sentences: ['預算案文件已經上載，市民可以查閱。'], sources: [] },
    ],
  };
}

function thinDigest(): ContentDoc {
  return {
    kind: 'digest',
    key: '2026-10-01-am',
    title: '精選',
    description: '標題',
    publishedAt: '2026-10-01T00:00:00.000Z',
    hkt: '2026-10-01 08:00',
    mode: 'sources',
    blocks: [{ title: '港聞', sentences: ['只有標題。'], sources: [] }],
  };
}

describe('static sitemap', () => {
  it('is a file Pages can serve, valid XML, and omits twn and thin shells', () => {
    expect(existsSync('functions/sitemap.xml.ts')).toBe(false);
    const xml = readFileSync('public/sitemap.xml', 'utf8');
    expect(xml).toBe(staticSitemapXml());
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
    const urls = xml.match(/<url>/g)?.length ?? 0;
    expect(xml.match(/<loc>/g)?.length).toBe(urls);
    expect(xml.match(/<\/url>/g)?.length).toBe(urls);
    expect(urls).toBeGreaterThan(35);
    expect(xml).toContain('https://world-news.xyz/</loc>');
    expect(xml).toContain('https://world-news.xyz/region/hkg');
    expect(xml).toContain('https://world-news.xyz/major/');
    expect(xml).toContain('https://world-news.xyz/briefing/');
    expect(xml).toContain('https://world-news.xyz/explainer/');
    expect(xml).toContain('https://world-news.xyz/today/');
    expect(xml).toContain('https://world-news.xyz/data/');
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('https://world-news.xyz/digest/');
    expect(xml).not.toContain('https://world-news.xyz/weekly/');
    expect(xml).not.toContain('https://world-news.xyz/analysis/');
    expect(xml).not.toContain('https://world-news.xyz/topic/');
    expect(xml).not.toContain('/story/');
    for (const path of heritagePublicPaths()) {
      expect(xml).toContain(`https://world-news.xyz${path}<`);
    }
  });

  it('drops thin locs from a shell', () => {
    const xml = omitSitemapLocs(SHELL, [
      'https://world-news.xyz/region/twn',
      'https://world-news.xyz/digest/',
      'https://world-news.xyz/digest/2026-10-01-am',
      'https://world-news.xyz/weekly/',
    ]);
    expect(xml).toContain('https://world-news.xyz/region/hkg');
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('/digest/');
    expect(xml).not.toContain('/weekly/');
  });

  it('adds indexable briefings and topics, and leaves thin shells and twn lists out', () => {
    const xml = sitemapForPublish(
      [publicBriefing(), thinDigest()],
      [{ slug: 'policy-address', updatedAt: '2026-10-07T01:00:00.000Z' }],
      ['/today/2026-10-08/', '/today/2026-10-08/region/twn/'],
    );
    expect(xml).toContain('https://world-news.xyz/briefing/2026-10-07-am');
    expect(xml).toContain('https://world-news.xyz/topic/policy-address/');
    expect(xml).toContain('https://world-news.xyz/topic/</loc>');
    expect(xml).toContain('https://world-news.xyz/today/2026-10-08/');
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('https://world-news.xyz/digest/');
    expect(xml).not.toContain('https://world-news.xyz/weekly/');
    expect(renderSitemap(sitemapUrls())).not.toContain('https://world-news.xyz/topic/');
    expect(renderSitemap(sitemapUrls())).not.toContain('https://world-news.xyz/analysis/');
    const withAnalysis = renderSitemap(sitemapUrls({
      analyses: [{ key: 'demo-0123456789ab', publishedAt: '2026-10-11T00:00:00.000Z' }],
    }));
    expect(withAnalysis).toContain('https://world-news.xyz/analysis/</loc>');
    expect(withAnalysis).toContain('https://world-news.xyz/analysis/demo-0123456789ab');
  });
});

describe('publish regenerator', () => {
  it('writes indexable urls from the indexes and omits a thin digest', async () => {
    resetKvWriteState();
    const file = join(mkdtempSync(join(tmpdir(), 'sitemap-')), 'sitemap.xml');
    const env = {} as ContentEnv;
    await writeDoc(env, publicBriefing());
    await writeDoc(env, thinDigest());
    expect(existsSync(file)).toBe(false);
    await writePublishedSitemap(env, file);
    const xml = readFileSync(file, 'utf8');
    expect(xml).toContain('https://world-news.xyz/briefing/2026-10-07-am');
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('/region/twn');
    expect(xml).not.toContain('https://world-news.xyz/digest/');
    expect(xml).not.toContain('/story/');
    const again = await renderPublishedSitemap(env);
    expect(again).toContain('https://world-news.xyz/briefing/2026-10-07-am');
    await writePublishedSitemap(env, file);
    expect(readFileSync(file, 'utf8')).toBe(again);
  });
});

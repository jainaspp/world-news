import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bodyChars, pieceReady } from '../shared/grok';
import { explainerCurrent, type ContentDoc } from '../shared/content';
import { renderColumnIndex } from '../shared/contentPage';
import { mustReadBootstrap, mustReadForSurface, renderMustRead } from '../shared/mustRead';
import {
  newsEventOutlets,
  packageToolTitle,
  rejectPackageCluster,
  rejectPackageExplainer,
} from '../shared/packageNews';
import { buildCorpus } from '../shared/searchCorpus';
import { renderContentPage } from '../shared/content';
import { sitemapForPublish } from '../shared/sitemap';
import { renderGalaxyPage } from '../shared/civilizationPage';
import { renderLearnHub } from '../shared/learnPage';

function filler(count: number): string {
  return Array.from({ length: count }, (_, index) => (index > 0 && index % 30 === 0 ? '，測' : '測')).join('');
}

function explainer(title: string, sources: ContentDoc['blocks'][number]['sources'] = []): ContentDoc {
  return {
    kind: 'compare',
    key: '2026-10-31-sample-136b72af21d4',
    title,
    description: '多方來源整理。',
    publishedAt: '2026-10-31T03:00:00.000Z',
    hkt: '2026-10-31 11:00',
    mode: 'ai',
    points: ['第一點說明事件本身。', '第二點寫出來源已有的數字。', '第三點只列後續程序。'],
    blocks: [
      { title: '事件經過', sentences: [filler(520)], sources },
      { title: '事件時間線', sentences: ['10月31日，事件見報。'], sources },
    ],
  };
}

const NPM_SOURCES = [
  { source: 'npm', title: 'minimatch', url: 'https://www.npmjs.com/package/minimatch' },
  { source: 'GitHub', title: 'minimatch', url: 'https://github.com/isaacs/minimatch' },
  { source: 'npm package page', title: 'minimatch', url: 'https://www.npmjs.com/package/minimatch' },
];

const NEWS_SOURCES = [
  { source: '香港電台', title: '私隱署調查聯合醫院資料外洩', url: 'https://news.rthk.hk/a' },
  { source: '明報', title: '醫管局接執行通知', url: 'https://news.mingpao.com/a' },
];

describe('R-P5 package-news gate', () => {
  it('rejects pure package titles and tool-only outlets, and keeps a real news title', () => {
    for (const title of [
      'minimatch：供 node-glob 使用的 JavaScript glob 路徑匹配函式庫',
      'lru-cache：依最少最近使用原則淘汰項目的高效能快取函式庫',
      'is-cidr：檢查字串是否為 CIDR 表記',
      'array.prototype.find：Array.prototype.find 規格對齊 polyfill',
      'object.values：為舊環境提供 Object.values 規範相容 shim',
      '@isaacs/minimatch：路徑匹配',
      'minimatch: glob matcher',
    ]) {
      expect(packageToolTitle(title)).toBe(true);
      expect(rejectPackageExplainer({ title, blocks: [{ sources: NPM_SOURCES }] })).toBe(true);
    }
    expect(packageToolTitle('私隱署調查聯合醫院資料外洩醫管局存三大缺失遭發執行通知')).toBe(false);
    expect(packageToolTitle('施政報告2026懶人包：房屋供應增加')).toBe(false);
    expect(newsEventOutlets(NPM_SOURCES)).toEqual([]);
    expect(newsEventOutlets(NEWS_SOURCES)).toEqual(['香港電台', '明報']);
    expect(rejectPackageExplainer({ title: '私隱署調查聯合醫院資料外洩', blocks: [{ sources: NEWS_SOURCES }] })).toBe(false);
    expect(rejectPackageExplainer({ title: '快取函式庫推出新版本', blocks: [{ sources: NPM_SOURCES }] })).toBe(true);
    expect(rejectPackageExplainer({
      title: 'lru-cache：快取函式庫',
      blocks: [{ sources: NEWS_SOURCES }],
    })).toBe(true);
    expect(rejectPackageCluster({
      lead: { title: 'npmlog：npm 生態的日誌記錄器' },
      items: [
        { source: 'npm', link: 'https://www.npmjs.com/package/npmlog', title: 'npmlog' },
        { source: 'GitHub', link: 'https://github.com/npm/npmlog', title: 'npmlog' },
      ],
    })).toBe(true);
    expect(rejectPackageCluster({
      lead: { title: '私隱署調查聯合醫院資料外洩' },
      items: [
        { source: '香港電台', link: 'https://news.rthk.hk/a', title: '私隱署' },
        { source: '明報', link: 'https://news.mingpao.com/a', title: '醫管局' },
      ],
    })).toBe(false);
  });

  it('hard-fails a long package explainer instead of treating han count as a pass', () => {
    const fake = explainer('minimatch：供 node-glob 使用的 JavaScript glob 路徑匹配函式庫', NPM_SOURCES);
    const real = explainer('私隱署調查聯合醫院資料外洩', NEWS_SOURCES);
    expect(bodyChars(fake)).toBeGreaterThanOrEqual(500);
    expect(pieceReady(real)).toBe(true);
    expect(explainerCurrent(real)).toBe(true);
    expect(pieceReady(fake)).toBe(false);
    expect(explainerCurrent(fake)).toBe(false);
    const page = renderContentPage(fake, 'https://world-news.xyz/explainer/2026-10-31-minimatch-136b72af21d4');
    expect(page).toContain('content="noindex,follow"');
    expect(page).not.toContain('content="index,follow"');
  });

  it('drops package titles from the explainer ItemList, must-read, search, and sitemap', () => {
    const realTitle = '私隱署調查聯合醫院資料外洩';
    const fakeTitle = 'minimatch：供 node-glob 使用的 JavaScript glob 路徑匹配函式庫';
    const index = renderColumnIndex('compare', [
      {
        key: '2026-10-31-minimatch-136b72af21d4',
        title: fakeTitle,
        description: '套件說明',
        publishedAt: '2026-10-31T03:00:00.000Z',
        sources: 3,
      },
      {
        key: '2026-10-31-hospital-268a75d0f9b7',
        title: realTitle,
        description: '執行通知',
        publishedAt: '2026-10-31T02:00:00.000Z',
        sources: 4,
      },
    ], 'https://world-news.xyz/explainer/');
    expect(index).toContain('ItemList');
    expect(index).toContain(realTitle);
    expect(index).not.toContain('minimatch');
    expect(index).not.toContain('136b72af21d4');

    const links = [
      { href: '/explainer/2026-10-31-minimatch-136b72af21d4/', title: fakeTitle, description: '套件' },
      { href: '/explainer/2026-10-30-is-cidr-d2528cb4a840/', title: 'is-cidr：檢查字串是否為 CIDR 表記', description: '套件' },
      { href: '/explainer/2026-10-31-hospital-268a75d0f9b7/', title: realTitle, description: '執行通知' },
    ];
    const boot = mustReadBootstrap(links);
    expect(boot).toContain('id="wn-must-read"');
    expect(boot).toContain(realTitle);
    expect(boot).not.toContain('minimatch');
    expect(boot).not.toContain('is-cidr');
    expect(mustReadForSurface(links).map((link) => link.title)).toEqual([realTitle]);
    expect(renderMustRead(links)).not.toContain('minimatch');
    expect(renderMustRead(links)).toContain(realTitle);

    const corpus = buildCorpus({
      explainers: [
        { key: '2026-10-31-minimatch-136b72af21d4', title: fakeTitle, description: '', publishedAt: '2026-10-31T03:00:00.000Z', sources: 3 },
        { key: '2026-10-31-hospital-268a75d0f9b7', title: realTitle, description: '', publishedAt: '2026-10-31T02:00:00.000Z', sources: 4 },
      ],
    });
    expect(corpus.articles.map((article) => article.title)).toEqual([realTitle]);

    const xml = sitemapForPublish([
      explainer(fakeTitle, NPM_SOURCES),
      { ...explainer(realTitle, NEWS_SOURCES), key: '2026-10-31-hospital-268a75d0f9b7' },
    ]);
    expect(xml).toContain('https://world-news.xyz/explainer/2026-10-31-hospital-268a75d0f9b7');
    expect(xml).not.toContain('minimatch');
    expect(xml).not.toContain('136b72af21d4');
  });

  it('renders a missing package landing as 未有這則懶人包 and noindex', () => {
    const missing = renderContentPage({
      kind: 'compare',
      key: '2026-10-30-is-cidr-d2528cb4a840',
      title: '未有這則懶人包',
      description: '這一期還沒有內容。',
      blocks: [],
      publishedAt: '2026-10-30T00:00:00.000Z',
      hkt: '',
      mode: 'sources',
    }, 'https://world-news.xyz/explainer/2026-10-30-is-cidr-d2528cb4a840');
    expect(missing).toContain('未有這則懶人包');
    expect(missing).toContain('content="noindex,follow"');
    const source = readFileSync('functions/content/columns.ts', 'utf8');
    expect(source).toContain('rejectPackageExplainer(saved.doc)');
    expect(source).toContain("emptyDoc('compare', key, '未有這則懶人包')");
    expect(source).toContain("'x-robots-tag', 'noindex, follow'");
    expect(source).toContain('rejectPackageCluster');
    expect(source).toContain("skipped: 'package-news'");
  });

  it('leaves the galaxy stub and the learn hub reachable', () => {
    const galaxy = renderGalaxyPage();
    expect(galaxy.status).toBe(200);
    expect(galaxy.html).toContain('銀河系誕生');
    expect(galaxy.html).toContain('/civilization/galaxy/');
    const learn = renderLearnHub();
    expect(learn.status).toBe(200);
    expect(learn.html).toContain('開蒙 · 森羅');
    expect(learn.html).toContain('/learn/');
  });
});

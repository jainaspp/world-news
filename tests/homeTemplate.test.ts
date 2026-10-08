import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { t } from '../shared/i18n';
import { renderHomeFeed } from '../shared/homePage';
import { LAYOUT_CARDS_HK, LAYOUT_LIST_HK, rankHeatCount } from '../shared/homeTemplate';
import type { NewsItem } from '../shared/types';
import { readView, viewHref } from '../src/routing';

function item(id: string, extra: Partial<NewsItem> = {}): NewsItem {
  return {
    id,
    title: `標題 ${id}`,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2020-01-01T00:00:00.000Z',
    category: 'hk',
    ...extra,
  };
}

const home = {
  region: 'ALL',
  category: 'all',
  source: '',
  q: '',
  time: 'all' as const,
  bookmarks: false,
  following: false,
  list: false,
};

describe('homepage list choice', () => {
  it('defaults to cards and remembers the list in the query', () => {
    const cards = { pathname: '/', search: '', hash: '' } as Location;
    expect(readView(cards).list).toBe(false);
    expect(viewHref(home)).toBe('/');
    expect(viewHref({ ...home, list: true })).toBe('/?view=list');
    const listed = { pathname: '/', search: '?view=list', hash: '' } as Location;
    expect(readView(listed).list).toBe(true);
    expect(readView(listed).bookmarks).toBe(false);
    expect(viewHref({ ...home, list: true, category: 'hk' })).toBe('/category/hk?view=list');
    const following = { pathname: '/', search: '?view=following', hash: '' } as Location;
    expect(readView(following).list).toBe(false);
    expect(readView(following).following).toBe(true);
  });

  it('keeps the switch labels short', () => {
    expect(t('layoutCards', 'zh-HK')).toBe(LAYOUT_CARDS_HK);
    expect(t('layoutList', 'zh-HK')).toBe(LAYOUT_LIST_HK);
    expect(t('layoutCards', 'zh-HK')).toBe('卡片');
    expect(t('layoutList', 'zh-HK')).toBe('列表');
    expect(t('layoutCards', 'en')).toBe('Cards');
    expect(t('layoutList', 'en')).toBe('List');
    expect(LAYOUT_CARDS_HK).not.toContain('改用');
    expect(LAYOUT_LIST_HK).not.toContain('返回');
  });

  it('uses an outlet count only when at least two sources already agree', () => {
    expect(rankHeatCount(0)).toBeNull();
    expect(rankHeatCount(1)).toBeNull();
    expect(rankHeatCount(Number.NaN)).toBeNull();
    expect(rankHeatCount(2)).toBe(2);
    expect(rankHeatCount(4.8)).toBe(4);
  });
});

describe('shared homepage shell', () => {
  const old = '2020-01-01T00:00:00.000Z';
  const rows = [
    item('a1', { title: '港鐵宣布加價', breaking: true, pubDate: old }),
    item('b2', { title: '立法會恢復二讀', pubDate: old }),
    item('c3', { title: '天文台發出黃色暴雨警告', pubDate: old }),
    item('d4', { title: '聯儲局維持利率', pubDate: old }),
  ];

  it('keeps one shell and swaps only the main column', () => {
    const html = renderHomeFeed(rows, new Map([['a1', 4], ['b2', 1]]));
    expect(html).toContain('data-wn-template-switch');
    expect(html).toContain('data-layout="cards"');
    expect(html).toContain('data-layout="list"');
    expect(html).toContain(LAYOUT_CARDS_HK);
    expect(html).toContain(LAYOUT_LIST_HK);
    expect(html).toContain('class="digest-strip"');
    expect(html).toContain('class="digest-primary"');
    expect(html).toContain('class="digest-keep"');
    expect(html).toContain('href="/explainer/"');
    expect(html).toContain('新聞懶人包');
    expect(html).toContain('href="/topic/"');
    expect(html).toContain('專題懶人包');
    expect(html).toContain('href="/digest/"');
    expect(html).toContain('href="/briefing/"');
    expect(html).toContain('每日香港導讀');
    expect(html).toContain('href="/weekly/"');
    expect(html).toContain('週報');
    expect(html).toContain('href="/analysis/"');
    expect(html).toContain('熱門分析');
    expect(html).toContain('href="/data/"');
    expect(html).toContain('href="/quiz/"');
    expect(html).toContain('每日小測');
    expect(html).toContain('class="home-cards"');
    expect(html).toContain('class="home-list"');
    expect(html).toContain('story-hero');
    expect(html).not.toContain('class="rank-band"');
    expect(html).not.toContain('rank-tagline');
    expect(html).not.toContain('rank-dot');
    expect(html).not.toContain('class="rank-tabs"');
    expect(html).not.toContain('改用');
    expect(html).not.toContain('返回標準');
    expect(html).not.toContain('微博');
    expect(html).not.toContain('熱搜');
    expect(html).not.toContain('文娛');
    expect(html).not.toContain('同城');
    const rank = html.slice(html.indexOf('class="home-list"'));
    expect(rank.indexOf('港鐵宣布加價')).toBeLessThan(rank.indexOf('立法會恢復二讀'));
    expect(rank.indexOf('立法會恢復二讀')).toBeLessThan(rank.indexOf('天文台發出黃色暴雨警告'));
    expect(html.match(/rank-row-top/g)).toHaveLength(3);
    expect(rank).toContain('rank-badge">快訊');
    expect(rank).toContain('class="rank-heat"');
    expect(rank).toContain('aria-label="4 間媒體報道"');
    expect(rank).toContain('class="source-tag"');
    expect(rank).toContain('香港電台');
    expect(rank).toContain('<time');
    expect(rank).toContain('class="rank-pack"');
    expect(rank).not.toContain('story-media');
    expect(rank).not.toContain('1 間媒體報道');
    expect(rank).not.toContain('rank-badge">爆');
    expect(rank).not.toContain('rank-badge">熱');
    expect(rank).not.toContain('rank-badge">新');
    const entry = html.slice(html.indexOf('class="digest-strip"'), html.indexOf('class="home-cards"'));
    expect(entry).toContain('href="/explainer/"');
    expect(entry).toContain('href="/topic/"');
    expect(entry).toContain('href="/weekly/"');
    expect(entry).toContain('熱門分析');
    expect(html.indexOf('class="digest-strip"')).toBeLessThan(html.indexOf('class="home-list"'));
  });

  it('keeps the choice in the document shell', () => {
    const shell = readFileSync('index.html', 'utf8');
    expect(shell).toContain("get('view') === 'list'");
    expect(shell).toContain("classList.add('wn-list')");
    expect(shell).not.toContain('wn-home-template');
    expect(shell).not.toContain('wn-rank');
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('.rank-row-top');
    expect(css).toContain('.digest-strip');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('.template-switch');
    expect(css).toContain('#1d4f91');
    expect(css).toContain('--color-primary');
    expect(css).not.toContain('.rank-band');
    expect(css).not.toContain('.rank-row-top .rank-num { color: var(--color-breaking)');
    expect(css).not.toContain('840px');
    expect(css).not.toContain('#ff8200');
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('href="/explainer/"');
    expect(app).toContain('href="/topic/"');
    expect(app).toContain('className="masthead"');
    expect(app).not.toContain('rank-band');
    expect(app).not.toContain('改用');
    expect(app).not.toContain('返回標準');
  });
});

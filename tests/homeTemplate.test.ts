import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { t } from '../shared/i18n';
import { renderHomeFeed } from '../shared/homePage';
import {
  HOME_TEMPLATE_KEY,
  RANK_TAGLINE_HK,
  TEMPLATE_TO_CLASSIC_HK,
  TEMPLATE_TO_RANK_HK,
  rankHeatCount,
  readHomeTemplate,
  writeHomeTemplate,
} from '../shared/homeTemplate';
import type { NewsItem } from '../shared/types';

function memory(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    snapshot: () => value,
  };
}

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

describe('homepage template choice', () => {
  it('defaults to the standard layout and only stores the ranked choice', () => {
    expect(readHomeTemplate(memory())).toBe('classic');
    expect(readHomeTemplate(memory('classic'))).toBe('classic');
    expect(readHomeTemplate(memory('nope'))).toBe('classic');
    expect(readHomeTemplate(null)).toBe('classic');
    const store = memory();
    writeHomeTemplate('rank', store);
    expect(store.snapshot()).toBe('rank');
    expect(readHomeTemplate(store)).toBe('rank');
    writeHomeTemplate('classic', store);
    expect(readHomeTemplate(store)).toBe('classic');
  });

  it('ignores a storage write that throws', () => {
    const store = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(readHomeTemplate(store)).toBe('classic');
    expect(() => writeHomeTemplate('rank', store)).not.toThrow();
  });

  it('keeps the Traditional labels aligned with the server shell', () => {
    expect(HOME_TEMPLATE_KEY).toBe('wn-home-template');
    expect(t('templateUseRank', 'zh-HK')).toBe(TEMPLATE_TO_RANK_HK);
    expect(t('templateUseClassic', 'zh-HK')).toBe(TEMPLATE_TO_CLASSIC_HK);
    expect(t('rankTagline', 'zh-HK')).toBe(RANK_TAGLINE_HK);
    expect(t('templateUseRank', 'en')).toBe('Use ranked layout');
    expect(t('templateUseClassic', 'en')).toBe('Back to standard layout');
  });

  it('uses an outlet count only when at least two sources already agree', () => {
    expect(rankHeatCount(0)).toBeNull();
    expect(rankHeatCount(1)).toBeNull();
    expect(rankHeatCount(Number.NaN)).toBeNull();
    expect(rankHeatCount(2)).toBe(2);
    expect(rankHeatCount(4.8)).toBe(4);
  });
});

describe('ranked homepage shell', () => {
  const old = '2020-01-01T00:00:00.000Z';
  const rows = [
    item('a1', { title: '港鐵宣布加價', breaking: true, pubDate: old }),
    item('b2', { title: '立法會恢復二讀', pubDate: old }),
    item('c3', { title: '天文台發出黃色暴雨警告', pubDate: old }),
    item('d4', { title: '聯儲局維持利率', pubDate: old }),
  ];

  it('renders the switch, the site sections, and the same headlines in rank order', () => {
    const html = renderHomeFeed(rows, new Map([['a1', 4], ['b2', 1]]));
    expect(html).toContain('data-wn-template-switch');
    expect(html).toContain(TEMPLATE_TO_RANK_HK);
    expect(html).toContain(TEMPLATE_TO_CLASSIC_HK);
    expect(html).toContain('class="home-classic"');
    expect(html).toContain('class="home-rank"');
    expect(html).toContain('story-hero');
    expect(html).toContain('home-intro');
    expect(html).toContain('世界頭條');
    expect(html).toContain(RANK_TAGLINE_HK);
    expect(html).toContain('href="/category/hk"');
    expect(html).toContain('href="/category/sport"');
    expect(html).toContain('>體育<');
    expect(html).toContain('>娛樂<');
    expect(html).not.toContain('微博');
    expect(html).not.toContain('熱搜');
    expect(html).not.toContain('文娛');
    expect(html).not.toContain('同城');
    expect(html.indexOf('class="rank-row rank-row-top"')).toBeLessThan(html.indexOf('>4<'));
    expect(html.match(/rank-row-top/g)).toHaveLength(3);
    const rank = html.slice(html.indexOf('class="home-rank"'));
    expect(rank.indexOf('港鐵宣布加價')).toBeLessThan(rank.indexOf('立法會恢復二讀'));
    expect(rank.indexOf('立法會恢復二讀')).toBeLessThan(rank.indexOf('天文台發出黃色暴雨警告'));
    expect(rank).toContain('rank-badge">快訊');
    expect(rank).toContain('4 間媒體報道');
    expect(rank).not.toContain('1 間媒體報道');
    expect(rank).not.toContain('rank-badge">爆');
    expect(rank).not.toContain('rank-badge">熱');
    expect(rank).not.toContain('rank-badge">新');
  });

  it('keeps the choice in the document shell', () => {
    const shell = readFileSync('index.html', 'utf8');
    expect(shell).toContain("localStorage.getItem('wn-home-template')");
    expect(shell).toContain("classList.add('wn-rank')");
    const css = readFileSync('src/App.css', 'utf8');
    expect(css).toContain('.rank-row-top');
    expect(css).toContain('.template-switch');
    expect(css).toContain('#1d4f91');
    expect(css).not.toContain('#ff8200');
  });
});

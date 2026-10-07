import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hkoIconEmoji } from '../shared/hk';
import { chrome } from '../shared/contentPage';
import { wmoEmoji } from '../shared/wx';
import { arrivedIds, newItems } from '../src/hooks/useNews';
import { wxIconClass } from '../src/utils/wxMotion';
import type { NewsItem } from '../shared/types';

function item(id: string): NewsItem {
  return {
    id,
    title: '標題',
    link: 'https://example.com',
    source: 'RTHK',
    sourceUrl: 'https://example.com',
    regions: ['HKG'],
    pubDate: '2026-10-07T00:00:00.000Z',
  };
}

describe('reduced motion', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const enableAt = css.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reduceAt = css.indexOf('@media (prefers-reduced-motion: reduce)');
  const reduce = css.slice(reduceAt);

  it('disables every micro-animation when the user prefers reduced motion', () => {
    expect(enableAt).toBeGreaterThan(-1);
    expect(reduceAt).toBeGreaterThan(enableAt);
    expect(reduce).toContain('animation: none');
    expect(reduce).toContain('transition: none');
    for (const selector of [
      '.logo-live',
      '.logo-frame',
      '.refresh-btn.is-refreshing svg',
      '.story-arrive',
      '.major-banner',
      '.wx-icon',
      '.skeleton-line',
      '.skeleton .thumb-fallback',
      '.masthead .icon-btn',
      '.chip',
    ]) {
      expect(reduce).toContain(selector);
    }
    const enabled = css.slice(enableAt, reduceAt);
    expect(enabled).toContain('live-pulse');
    expect(enabled).toContain('refresh-spin');
    expect(enabled).toContain('story-arrive');
    expect(enabled).toContain('banner-in');
    expect(enabled).toContain('banner-out');
    expect(enabled).toContain('skeleton-shimmer');
    expect(enabled).toContain('wx-sun-spin');
    expect(enabled).not.toContain('animation: none');
  });
});

describe('shared header live dot', () => {
  it('marks the logo dot on server-rendered pages', () => {
    const html = chrome('digest');
    expect(html).toContain('logo-frame');
    expect(html).toContain('logo-live');
    expect(html).toContain('aria-hidden="true"');
  });
});

describe('arrived headlines', () => {
  it('does not animate the first paint, only headlines that were not already shown', () => {
    expect(arrivedIds([], [item('a')])).toEqual([]);
    expect(arrivedIds([item('a')], [item('a'), item('b')])).toEqual(['b']);
    expect(newItems([item('a')], [item('b'), item('a')]).map((row) => row.id)).toEqual(['b']);
  });
});

describe('weather icon motion', () => {
  it('maps sun, cloud, rain, and storm without dropping an icon', () => {
    expect(wxIconClass('')).toBe('');
    expect(wxIconClass(hkoIconEmoji(50))).toContain('wx-icon-sun');
    expect(wxIconClass(hkoIconEmoji(60))).toContain('wx-icon-cloud');
    expect(wxIconClass(hkoIconEmoji(62))).toContain('wx-icon-rain');
    expect(wxIconClass(hkoIconEmoji(65))).toContain('wx-icon-storm');
    expect(wxIconClass(wmoEmoji(95))).toContain('wx-icon-storm');
    expect(wxIconClass(wmoEmoji(61))).toContain('wx-icon-rain');
    expect(wxIconClass(wmoEmoji(3))).toContain('wx-icon-cloud');
    for (const icon of [50, 51, 53, 60, 62, 65, 80, 90]) {
      const emoji = hkoIconEmoji(icon);
      expect(wxIconClass(emoji).startsWith('wx-icon')).toBe(true);
    }
  });
});

describe('column banner dismiss', () => {
  it('animates out unless reduced motion is set', () => {
    const js = readFileSync('public/columns.js', 'utf8');
    expect(js).toContain('prefers-reduced-motion: reduce');
    expect(js).toContain('is-leaving');
  });
});

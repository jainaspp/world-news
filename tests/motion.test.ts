import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hkoIconEmoji } from '../shared/hk';
import { chrome } from '../shared/contentPage';
import { wmoEmoji } from '../shared/wx';
import { arrivedIds, newItems } from '../src/hooks/useNews';
import { scrollBehavior } from '../src/utils/scroll';
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
      '.must-read',
      '.digest-strip',
    ]) {
      expect(reduce).toContain(selector);
    }
    expect(reduce).toContain('backdrop-filter: none');
    const enabled = css.slice(enableAt, reduceAt);
    expect(enabled).toContain('live-pulse');
    expect(enabled).toContain('refresh-spin');
    expect(enabled).toContain('story-arrive');
    expect(enabled).toContain('banner-in');
    expect(enabled).toContain('banner-out');
    expect(enabled).toContain('var(--motion-dismiss)');
    expect(enabled).toContain('.digest-strip');
    expect(enabled).toContain('.must-read .story');
    expect(enabled).toContain('skeleton-shimmer');
    expect(enabled).toContain('wx-sun-spin');
    expect(enabled).not.toContain('animation: none');
  });

  it('dismisses the major banner with opacity and transform only', () => {
    expect(css).toContain('--motion-dismiss: 420ms');
    const start = css.indexOf('@keyframes banner-out');
    const end = css.indexOf('@keyframes', start + 1);
    const bannerOut = css.slice(start, end);
    expect(bannerOut).toContain('opacity');
    expect(bannerOut).toContain('transform');
    expect(bannerOut).not.toMatch(/max-height|margin|padding/);
    expect(readFileSync('src/components/MajorBanner.tsx', 'utf8')).toContain('420');
    expect(readFileSync('public/columns.js', 'utf8')).toContain('420');
  });
});

describe('smooth scroll', () => {
  it('uses auto when reduced motion is requested', () => {
    expect(scrollBehavior(true)).toBe('auto');
    expect(scrollBehavior(false)).toBe('smooth');
    for (const file of ['src/App.tsx', 'src/components/BackToTop.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('scrollBehavior()');
      expect(source).not.toMatch(/behavior:\s*['"]smooth['"]/);
    }
  });
});

describe('heritage motion', () => {
  const css = readFileSync('src/App.css', 'utf8');

  it('ships fade-rise, seal, ken, pulse, and brass sweep behind reduced-motion and screenshot gates', () => {
    for (const name of ['fade-rise', 'seal-in', 'img-ken', 'timeline-pulse', 'brass-sweep']) {
      expect(css).toContain(`@keyframes ${name}`);
    }
    const blockStart = css.indexOf('@keyframes fade-rise');
    const gated = css.slice(blockStart);
    const preference = gated.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(preference).toBeGreaterThan(-1);
    const wired = gated.slice(preference);
    for (const selector of [
      'body:not(.static) .heritage',
      'body:not(.static) .otd-card',
      'body:not(.static) .otd-row',
      'body:not(.static) .lm-card',
      'body:not(.static) .detail-hero',
      'body:not(.static) .year-seal',
      'body:not(.static) .otd-visual img',
      'body:not(.static) .heritage-timeline li::before',
      'body:not(.static) .ink-rule',
      '.motion-fade-rise',
      '.motion-seal-in',
      '.motion-img-ken',
      '.motion-timeline-pulse',
      '.motion-brass-sweep',
    ]) {
      expect(wired).toContain(selector);
    }
    expect(wired).toContain('var(--motion-stagger)');
    const freeze = css.indexOf('body.static .heritage');
    expect(freeze).toBeGreaterThan(blockStart);
    const frozen = css.slice(freeze, css.indexOf('.subscribe-menu', freeze));
    expect(frozen).toContain('animation: none');
    expect(frozen).toContain('body.static .year-seal');
    expect(frozen).toContain('body.static .heritage-timeline li::before');
    expect(frozen).toContain('body.static .ink-rule');
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

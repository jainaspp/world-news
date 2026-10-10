import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import factsSeed from '../shared/heritage/facts';
import landmarksSeed from '../shared/heritage/landmarks';
import { AD_BODY_CHARS } from '../shared/contentPage';
import {
  factsOn,
  hktMmdd,
  homeFacts,
  isMmdd,
  seedIssues,
  shiftMmdd,
} from '../shared/heritage';
import { renderHomeFeed } from '../shared/homePage';
import {
  dayIndexable,
  heritagePublicPaths,
  landmarkIndexable,
  renderLandmarkHub,
  renderLandmarkPage,
  renderOnThisDayPage,
  renderOnThisDaySection,
} from '../shared/heritagePage';
import { allLandmarks, landmarkBySlug } from '../shared/heritage';
import type { NewsItem } from '../shared/types';

const FORBIDDEN = /六四|六月四日|港獨|香港獨立|文革|文化大革命|主權|示威|遊行|抗議|佔領|暴動/;

function item(): NewsItem {
  return {
    id: 'a1',
    title: '港鐵公布票價檢討',
    link: 'https://example.com/a',
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-09T02:00:00.000Z',
    category: 'hk',
  };
}

describe('當年今日 seed', () => {
  it('keeps the seed inside the content policy', () => {
    expect(seedIssues()).toEqual([]);
    const raw = JSON.stringify(factsSeed) + JSON.stringify(landmarksSeed);
    expect(raw).not.toMatch(FORBIDDEN);
    expect(raw).not.toContain('"mmdd": "06-04"');
    expect(raw).not.toContain('"mmdd": "07-01"');
  });

  it('fills 9 October and the surrounding mid-October dates that have a public record', () => {
    expect(factsOn('10-09').map((row) => row.landmark)).toContain('kwong-wah');
    expect(factsOn('10-07').length).toBeGreaterThanOrEqual(2);
    expect(factsOn('10-08').length).toBeGreaterThanOrEqual(1);
    expect(factsOn('10-15').length).toBeGreaterThanOrEqual(1);
    expect(factsOn('10-24').length).toBeGreaterThanOrEqual(1);
    expect(factsOn('10-01').map((row) => row.year)).toEqual(['1910', '1979']);
    const dates = new Set(factsSeed.map((row) => row.mmdd));
    expect(dates.size).toBeGreaterThanOrEqual(70);
    expect(factsOn('10-10').length).toBeGreaterThanOrEqual(2);
  });

  it('steps the calendar without inventing a 31 February', () => {
    expect(isMmdd('10-09')).toBe(true);
    expect(isMmdd('02-31')).toBe(false);
    expect(shiftMmdd('10-09', -1)).toBe('10-08');
    expect(shiftMmdd('10-09', 1)).toBe('10-10');
    expect(shiftMmdd('01-01', -1)).toBe('12-31');
    expect(hktMmdd(new Date('2026-10-09T00:30:00+08:00'))).toBe('10-09');
  });
});

describe('當年今日 pages', () => {
  it('places a collapsed 當年今日 pack below 今日必讀 and near the ranking', () => {
    const now = new Date('2026-10-09T04:00:00Z');
    const section = renderOnThisDaySection(now);
    expect(section).toContain('當年今日');
    expect(section).toContain('<details class="otd-pack heritage pack-shell pack-heritage">');
    expect(section).not.toContain('<details class="otd-pack heritage pack-shell pack-heritage" open');
    expect(section).toContain('點開睇');
    expect(section).toContain('香港地標');
    expect(section).toContain('href="/hk/landmarks/"');
    expect(section).toContain('/static/heritage/ink-divider.png');
    expect(section).toContain('廣華醫院');
    expect(section).toContain('href="/on-this-day/10-09/"');
    expect(section).not.toContain('文娛');
    expect(homeFacts(now, 3).length).toBeLessThanOrEqual(3);
    const home = renderHomeFeed([item()], new Map(), null, '', null, '', [], [
      { href: '/explainer/a/', title: '睡蓮新種', description: '雨林發現新品種。' },
    ], now);
    const digest = home.indexOf('class="digest-strip"');
    const heritage = home.indexOf('otd-pack heritage');
    const must = home.indexOf('今日必讀');
    expect(digest).toBeGreaterThan(-1);
    expect(must).toBeGreaterThan(digest);
    expect(heritage).toBeGreaterThan(must);
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app.indexOf('<MustRead')).toBeGreaterThan(0);
    expect(app.indexOf('<MustRead')).toBeLessThan(app.indexOf('<OnThisDay />'));
  });

  it('still shows a collapsed pack with 香港地標 when the day has no fact', () => {
    const empty = renderOnThisDaySection(new Date('2026-02-03T04:00:00Z'));
    expect(empty).toContain('otd-pack heritage');
    expect(empty).toContain('香港地標');
    expect(empty).toContain('href="/hk/landmarks/"');
    expect(empty).not.toContain('<details class="otd-pack heritage pack-shell pack-heritage" open');
  });

  it('keeps day and landmark pages expanded without the homepage pack shell', () => {
    const day = renderOnThisDayPage('10-09');
    expect(day.html).toContain('heritage-page');
    expect(day.html).not.toContain('otd-pack');
    expect(day.html).toContain('廣華醫院');
    const hub = renderLandmarkHub('');
    expect(hub.html).toContain('heritage-page');
    expect(hub.html).not.toContain('otd-pack');
  });

  it('renders the day list with prev and next, and keeps a thin day out of ads', () => {
    const page = renderOnThisDayPage('10-09', { client: 'ca-pub-8392975944327076', slot: '1234567890' }, '10-09');
    expect(page.status).toBe(200);
    expect(page.indexable).toBe(true);
    expect(page.html).toContain('← 10月8日');
    expect(page.html).toContain('10月10日 →');
    expect(page.html).toContain('href="/hk/landmarks/kwong-wah/"');
    expect(page.html).toContain('data-ad-slot="1234567890"');
    expect(dayIndexable('10-09')).toBe(true);
    const filled = renderOnThisDayPage('10-10');
    expect(filled.indexable).toBe(true);
    expect(filled.html).toContain('index,follow');
    expect(filled.html).toContain('郊野公園');
    expect(filled.html).not.toContain('尚未收錄');
    const missing = renderOnThisDayPage('02-31');
    expect(missing.status).toBe(404);
    expect(missing.html).not.toContain('pagead2.googlesyndication.com');
  });

  it('renders the landmark hub and a substantial detail page', () => {
    const hub = renderLandmarkHub('');
    expect(hub.status).toBe(200);
    expect(hub.html).toContain('香港地標');
    expect(hub.html).toContain('href="/hk/landmarks/city-hall/"');
    expect(hub.html).toContain('/static/heritage/otd-city-hall.jpg');
    expect(hub.html).toContain('/static/heritage/lm-star-ferry.jpg');
    expect(hub.html).toContain('自然／觀景');
    const place = landmarkBySlug('city-hall');
    expect(place).toBeTruthy();
    expect(landmarkIndexable(place!)).toBe(true);
    expect(allLandmarks().every((row) => landmarkIndexable(row))).toBe(true);
    expect(proseEnough(place!)).toBe(true);
    const detail = renderLandmarkPage('city-hall', { client: 'ca-pub-8392975944327076', slot: '' });
    expect(detail.indexable).toBe(true);
    expect(detail.html).toContain('openstreetmap.org');
    expect(detail.html).toContain('溫和時間線');
    expect(detail.html).toContain('1962');
    expect(detail.html).toContain('pagead2.googlesyndication.com');
    expect(detail.html).toContain('支持世界頭條');
    expect(detail.html).toContain('data-ad-position="bottom"');
    expect(detail.html).not.toContain('data-ad-slot');
    expect(detail.html).not.toContain('<ins class="adsbygoogle"');
    expect(renderLandmarkPage('no-such').status).toBe(404);
    const paths = heritagePublicPaths();
    expect(paths).toContain('/on-this-day/');
    expect(paths).toContain('/on-this-day/10-09/');
    expect(paths).toContain('/hk/landmarks/kwong-wah/');
    expect(paths).toContain('/on-this-day/10-10/');
  });
});

function proseEnough(place: NonNullable<ReturnType<typeof landmarkBySlug>>): boolean {
  const text = [place.lede, place.visit, ...place.timeline.map((item) => item.text)].join('');
  return text.length > AD_BODY_CHARS / 2;
}

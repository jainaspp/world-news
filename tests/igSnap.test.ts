import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { swCacheName } from '../shared/brand';
import { renderCivilizationHub, renderCivilizationMiss, renderCityPage, renderCosmosPage, renderChroniclePage, renderEarthPage, renderOriginsPage, renderTechPage } from '../shared/civilizationPage';
import { renderColumnIndex, renderContentPage, type ContentDoc } from '../shared/content';
import { renderHomeFeed } from '../shared/homePage';
import type { NewsItem } from '../shared/types';

function item(id: string, title: string): NewsItem {
  return {
    id,
    title,
    link: `https://example.com/${id}`,
    source: '香港電台',
    sourceUrl: 'https://news.rthk.hk',
    regions: ['HKG'],
    pubDate: '2026-10-17T01:00:00.000Z',
    category: 'hk',
  };
}

describe('T4 home, list, and civ hub snap deck', () => {
  it('stacks the homepage as hero, axis, then one card per headline', () => {
    const html = renderHomeFeed([
      item('a1', '港鐵宣布加價'),
      item('b2', '立法會恢復二讀'),
    ], new Map([['a1', 3]]), null, '', null, '', undefined, [], new Date('2026-10-17T04:00:00.000Z'));
    expect(html).toContain('class="page ssr-home ig-snap"');
    expect(html).toContain('id="ig-deck"');
    expect(html).toContain('id="ig-dots"');
    expect(html).toContain('id="ig-dots-boot"');
    const hero = html.indexOf('hero-opening');
    const axis = html.indexOf('id="civ"');
    const slice = html.indexOf('id="slice"');
    const first = html.indexOf('港鐵宣布加價');
    const second = html.indexOf('立法會恢復二讀');
    const pin = html.indexOf('今日落點');
    expect(hero).toBeGreaterThan(-1);
    expect(hero).toBeLessThan(axis);
    expect(axis).toBeLessThan(slice);
    expect(slice).toBeLessThan(first);
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(pin);
    expect(html.match(/class="ig-card ig-card-story"/g)).toHaveLength(2);
    expect(html).toContain('href="/story/a1/"');
    expect(html).toContain('href="/story/b2/"');
    expect(html).toContain('class="rank-title"');
    expect(html).not.toContain('class="ig-card ig-card-timeline"');
    expect(html).not.toContain('story-hero');
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('id="ig-deck"');
    expect(app).toContain('className="ig-card ig-card-lead"');
    expect(app.indexOf('<HeroOpening />')).toBeLessThan(app.indexOf('className="axis-mount"'));
    expect(app.indexOf('id="slice"')).toBeLessThan(app.indexOf('className="home-list"'));
  });

  it('snaps a briefing index to one card per item and leaves article pages on T5b', () => {
    const entry = {
      key: '2026-10-25-pm',
      title: '每日香港導讀',
      description: '傍晚導讀。',
      publishedAt: '2026-10-25T10:00:00.000Z',
      sources: 4,
      outlets: 3,
      category: 'hk',
    };
    const index = renderColumnIndex('briefing', [entry, { ...entry, key: '2026-10-25-am', title: '早上導讀' }], 'https://world-news.xyz/briefing/');
    expect(index).toContain('class="page column-page ig-snap"');
    expect(index).toContain('data-kind="briefing-index"');
    expect(index).toContain('id="ig-deck"');
    expect(index).toContain('href="/site.css"');
    const lead = index.slice(index.indexOf('class="ig-card ig-card-lead"'), index.indexOf('class="ig-card ig-card-story"'));
    expect(lead).toContain('每日導讀');
    expect(lead).toContain('每日香港導讀');
    expect(lead).toContain('href="/briefing/2026-10-25-pm/"');
    expect(index.match(/class="ig-card ig-card-story"/g)).toHaveLength(1);
    expect(index.indexOf('每日香港導讀')).toBeLessThan(index.indexOf('早上導讀'));
    expect(index).toContain('class="chip active" href="/#slice"');
    expect(index).not.toContain('civ-chip');
    const story = index.slice(index.indexOf('class="ig-card ig-card-story"'));
    const card = story.slice(story.indexOf('<article'), story.indexOf('</article>'));
    expect(card).toContain('briefing-card');
    expect(card).toContain('thumb-neutral');
    expect(card).not.toContain('ai-badge');
    expect(card).not.toContain('pack-kicker');
    expect(card.indexOf('class="story-title"')).toBeLessThan(card.indexOf('class="story-kicker"'));
    expect(index).toContain('href="/briefing/2026-10-25-pm/"');
    expect(index).toContain('class="ig-card ig-card-close"');
    const empty = renderColumnIndex('briefing', [], 'https://world-news.xyz/briefing/');
    const emptyLead = empty.slice(empty.indexOf('class="ig-card ig-card-lead"'), empty.indexOf('class="ig-card ig-card-close"'));
    expect(emptyLead).toContain('暫時未有導讀');
    expect(empty.match(/class="ig-card ig-card-story"/g)).toBeNull();

    const article = renderContentPage({
      key: '2026-10-25-pm',
      title: '每日香港導讀',
      description: '傍晚導讀。',
      blocks: [{ title: '香港', sentences: ['港鐵建議調整票價。'], sources: [] }],
      publishedAt: '2026-10-25T10:00:00.000Z',
      hkt: '2026-10-25 18:00',
      mode: 'ai',
      kind: 'briefing',
    } as ContentDoc, 'https://world-news.xyz/briefing/2026-10-25-pm/');
    expect(article).toContain('id="ig-deck"');
    expect(article).not.toContain('ig-snap');
  });

  it('snaps the civilization hub and every detail page on the same deck', () => {
    const hub = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z')).html;
    expect(hub).toContain('class="page column-page heritage-page civ-page ig-snap"');
    expect(hub).toContain('id="ig-deck"');
    expect(hub).toContain('class="ig-card ig-card-lead"');
    expect(hub).toContain('class="ig-card ig-card-close"');
    expect(hub.indexOf('class="axis-hero"')).toBeLessThan(hub.indexOf('class="civ-hub-hero"'));
    expect(hub.indexOf('class="civ-hub-hero"')).toBeLessThan(hub.indexOf('class="civ-article"'));
    expect(hub.indexOf('id="future"')).toBeLessThan(hub.indexOf('class="civ-article"'));
    const details = [
      renderOriginsPage(),
      renderChroniclePage(),
      renderCosmosPage(),
      renderEarthPage(),
      renderTechPage(),
      renderCityPage(),
    ];
    for (const page of details) {
      expect(page.html).toContain('class="page column-page heritage-page civ-page ig-snap"');
      expect(page.html).toContain('id="ig-deck"');
      expect(page.html).toContain('ig-card-flow');
      expect(page.html).toContain('class="ig-card ig-card-close"');
      expect(page.html).toContain('id="ig-dots-boot"');
      expect(page.html.match(/id="ig-deck"/g)).toHaveLength(1);
    }
    expect(renderOriginsPage().html).toContain('人類起源時間線');
    expect(renderCivilizationMiss().html).not.toContain('id="ig-deck"');
  });

  it('keeps the shared snap rules full-height, with no peek band and a 420px frame', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const ig = css.slice(css.indexOf('T4 always-snap'));
    expect(ig.startsWith('T4 always-snap')).toBe(true);
    expect(ig).toContain('scroll-snap-type: y mandatory');
    expect(ig).toContain('scroll-snap-stop: always');
    expect(ig).toContain('flex: 0 0 100%');
    expect(ig).toContain('height: 100%');
    expect(ig).toContain('overflow: hidden;');
    expect(ig).toContain('width: min(420px, 100%)');
    expect(ig).toContain('min-width: 901px');
    expect(ig).toContain('content: "↑ 上滑"');
    expect(ig).toContain('.ig-deck:not([data-ig-hint="done"]) > .ig-card:first-child::after');
    expect(ig).toContain('ig-swipe-hint 0.6s ease-out 1');
    expect(ig).not.toContain('ig-swipe-hint-ink');
    expect(ig).toContain('scroll-snap-type: y mandatory');
    expect(ig).toContain('width: 8px');
    expect(ig).toContain('height: 8px');
    expect(ig).toContain('gap: 10px');
    expect(ig).toContain('.axis-hero.axis-slim');
    expect(ig).toContain('max-height: none');
    expect(ig).toContain('background: transparent');
    expect(ig).toContain('object-fit: cover');
    expect(ig).not.toContain('max-height: 300px');
    expect(ig).not.toContain('--ig-band');
    expect(ig).not.toContain('86%');
    expect(ig).not.toContain('max-width: 900px');
    expect(readFileSync('public/sw.js', 'utf8')).toContain(`const CACHE = '${swCacheName}'`);
  });
});

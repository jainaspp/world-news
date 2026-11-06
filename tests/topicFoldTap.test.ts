import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

const source = {
  source: '香港電台',
  title: '港鐵建議票價加幅',
  url: 'https://example.com/rthk',
  pubDate: '2026-10-07T00:05:00.000Z',
};

function doc(): ContentDoc {
  return {
    kind: 'analysis',
    key: '2026-10-07-fare',
    title: '港鐵建議票價加幅',
    description: '多間媒體報道同一項票價建議。',
    publishedAt: '2026-10-07T02:00:00.000Z',
    hkt: '2026-10-07 10:00',
    mode: 'ai',
    blocks: [
      { title: '背景', sentences: ['港鐵建議調整票價，並交諮詢。'], sources: [source] },
      { title: '各方說法', sentences: ['議員要求交代加幅。'], sources: [source] },
    ],
  };
}

describe('explainer topic-fold tap target', () => {
  it('gives every topic-fold summary a 44px box on a phone and leaves the AA ring alone', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const gate = columns.indexOf('.chip, .pack-fold > summary, .topic-fold > summary, .otd-pack > summary, .sources summary {');
    const phone = columns.slice(columns.lastIndexOf('@media (max-width: 700px)', gate), columns.indexOf('/* Art 2026-10-11'));
    const tap = rule(phone, '.topic-fold > summary {');
    const sourceFold = rule(phone, '.topic-fold:has(.source-list) > summary {');
    const otherFolds = rule(phone, '.chip, .pack-fold > summary, .topic-fold > summary, .otd-pack > summary, .sources summary {');
    const base = rule(columns, '.pack-fold > summary,\n.topic-fold > summary {');
    const focus = rule(columns, '.pack-sources .source-list a:focus-visible,');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(phone.indexOf('.chip, .pack-fold > summary')).toBeLessThan(phone.indexOf('.topic-fold:has(.source-list) > summary {'));
    expect(phone.indexOf('.topic-fold:has(.source-list) > summary {')).toBeLessThan(phone.indexOf('.topic-fold > summary {'));
    expect(tap).toContain('min-width: 44px');
    expect(tap).toContain('min-height: 44px');
    expect(tap).not.toContain('outline');
    expect(sourceFold).toContain('min-width: 44px');
    expect(sourceFold).toContain('min-height: 44px');
    expect(sourceFold).not.toContain('outline');
    expect(otherFolds).toContain('min-height: 36px');
    expect(otherFolds).not.toContain('min-height: 44px');
    expect(base).toContain('min-height: 36px');
    expect(base).not.toContain('44px');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(app).toContain(':focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }');

    const page = renderContentPage(doc(), 'https://world-news.xyz/analysis/2026-10-07-fare/');
    const backgroundAt = page.indexOf('<details class="topic-fold pack-fold"><summary>背景</summary>');
    const anglesAt = page.indexOf('<details class="topic-fold pack-fold"><summary>各方說法</summary>');
    const sourcesAt = page.indexOf('<details class="topic-fold pack-fold"><summary>來源（');
    expect(backgroundAt).toBeGreaterThanOrEqual(0);
    expect(anglesAt).toBeGreaterThan(backgroundAt);
    expect(sourcesAt).toBeGreaterThan(anglesAt);
    const background = page.slice(backgroundAt, page.indexOf('</details>', backgroundAt));
    expect(background).not.toContain('source-list');
    const sources = page.slice(sourcesAt, page.indexOf('</details>', sourcesAt));
    expect(sources).toContain('class="source-list"');
    expect(sources).toContain('<a href="https://example.com/rthk"');
  });
});

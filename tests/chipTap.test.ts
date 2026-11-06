import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

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
      { title: '背景', sentences: ['港鐵建議調整票價，並交諮詢。'], sources: [] },
    ],
  };
}

describe('phone chip tap target', () => {
  it('gives short phone chips a 44px box and leaves the AA ring, toolbar, and on-this-day summary alone', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const gate = columns.indexOf('.chip, .pack-fold > summary, .topic-fold > summary, .otd-pack > summary, .sources summary {');
    const phone = columns.slice(columns.lastIndexOf('@media (max-width: 700px)', gate), columns.indexOf('/* Art 2026-10-11'));
    const tap = rule(phone, '.chip,\n  .share-buttons .chip {');
    const group = rule(phone, '.chip, .pack-fold > summary, .topic-fold > summary, .otd-pack > summary, .sources summary {');
    const folds = rule(phone, '.topic-fold > summary {');
    const toolbar = rule(columns, '.pack-toolbar .share-buttons .chip,');
    const focus = rule(app, '.chip:focus-visible, .icon-btn:focus-visible, .bookmark:focus-visible, .primary:focus-visible, .follow-mini:focus-visible {');
    const digest = rule(app.slice(app.indexOf('@media (max-width: 700px)')), '.digest-strip .chip {');

    expect(phone.startsWith('@media (max-width: 700px)')).toBe(true);
    expect(phone.indexOf('.topic-fold > summary {')).toBeLessThan(phone.indexOf('.chip,\n  .share-buttons .chip {'));
    expect(tap).toContain('min-width: 44px');
    expect(tap).toContain('min-height: 44px');
    expect(tap).not.toContain('outline');
    expect(tap).not.toContain('pack-toolbar');
    expect(tap).not.toContain('otd-pack');
    expect(group).toContain('min-height: 36px');
    expect(group).not.toContain('44px');
    expect(folds).toContain('min-height: 44px');
    expect(columns).toContain('\n.chip { min-height: 36px; }\n');
    expect(toolbar).toContain('min-height: 32px');
    expect(toolbar).toContain('max-height: 32px');
    expect(digest).toContain('min-width: 44px');
    expect(digest).toContain('min-height: 44px');
    expect(digest).not.toContain('36px');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(app).toContain(':focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }');

    const page = renderContentPage(doc(), 'https://world-news.xyz/analysis/2026-10-07-fare/');
    const shareAt = page.indexOf('class="share-buttons"');
    expect(shareAt).toBeGreaterThanOrEqual(0);
    expect(page).toContain('class="chip share-copy"');
    expect(page.slice(0, shareAt)).not.toContain('pack-toolbar');
    expect(readFileSync('shared/homePage.ts', 'utf8')).toContain('class="digest-strip"');
  });
});

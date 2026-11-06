import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderContentPage, type ContentDoc } from '../shared/content';

function lin(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const lum = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    return 0.2126 * lin((value >> 16) & 255) + 0.7152 * lin((value >> 8) & 255) + 0.0722 * lin(value & 255);
  };
  const [hi, lo] = [lum(foreground), lum(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

function declared(block: string, prop: string): string {
  const match = block.match(new RegExp(`${prop}:\\s*(#[0-9a-fA-F]{6})`));
  expect(match, prop).toBeTruthy();
  return match![1].toLowerCase();
}

const source = {
  source: '香港電台',
  title: '港鐵建議票價加幅',
  url: 'https://example.com/rthk',
  pubDate: '2026-10-07T00:05:00.000Z',
};

function doc(kind: ContentDoc['kind']): ContentDoc {
  return {
    kind,
    key: '2026-10-07-fare',
    title: '港鐵建議票價加幅',
    description: '多間媒體報道同一項票價建議。',
    publishedAt: '2026-10-07T02:00:00.000Z',
    hkt: '2026-10-07 10:00',
    mode: 'ai',
    blocks: [{ title: '事件經過', sentences: ['港鐵建議調整票價，並交諮詢。'], sources: [source] }],
  };
}

describe('explainer source-fold focus', () => {
  it('pins an AA focus ring on the source-fold toggle and source links', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const app = readFileSync('src/App.css', 'utf8');
    const focus = rule(columns, '.pack-sources .source-list a:focus-visible,');
    const root = rule(app, ':root {');
    const dark = rule(app, 'html.dark {');
    const lightAccent = declared(root, '--color-primary');
    const darkAccent = declared(dark, '--color-primary');
    const lightPage = declared(root, '--color-bg');
    const darkPage = declared(dark, '--color-bg');
    const lightChip = declared(root, '--color-chip');
    const darkChip = declared(dark, '--color-chip');

    expect(focus).toContain('.topic-fold:has(.source-list) > summary:focus-visible');
    expect(focus).toContain('.topic-fold:has(.source-list) .source-list a:focus-visible');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
    expect(root).toContain('--accent: var(--color-primary)');
    expect(rule(columns, '.ig-card-sources:has(.source-list a:focus-visible) > .pack-sources {')).toContain('overflow: visible');
    expect(contrast(lightAccent, lightPage)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(darkAccent, darkPage)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(lightAccent, lightChip)).toBeGreaterThanOrEqual(3);
    expect(contrast(darkAccent, darkChip)).toBeGreaterThanOrEqual(3);

    const explainer = renderContentPage(doc('compare'), 'https://world-news.xyz/explainer/2026-10-07-fare/');
    const cardAt = explainer.indexOf('class="ig-card ig-card-sources"');
    const card = explainer.slice(cardAt, explainer.indexOf('class="ig-card ig-card-close"', cardAt));
    expect(card).toContain('aria-label="來源"');
    expect(card).toContain('<a href="https://example.com/rthk"');
    expect(card).not.toContain('tabindex="-1"');

    const folded = renderContentPage(doc('analysis'), 'https://world-news.xyz/analysis/2026-10-07-fare/');
    const foldAt = folded.indexOf('<details class="topic-fold pack-fold"><summary>來源（');
    const fold = folded.slice(foldAt, folded.indexOf('</details>', foldAt));
    expect(fold).toContain('<summary>來源（1）</summary>');
    expect(fold).toContain('class="source-list"');
    expect(fold).toContain('<a href="https://example.com/rthk"');
    expect(fold).not.toContain('tabindex="-1"');
  });
});

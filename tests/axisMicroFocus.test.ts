import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderCivilizationHub } from '../shared/civilizationPage';
import { renderHomeFeed } from '../shared/homePage';

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

describe('axis 開蒙 microlink focus', () => {
  it('keeps the stored axis-link rules, and does not mount the axis on the home or hub', () => {
    const css = readFileSync('src/App.css', 'utf8');
    const link = rule(css, '.axis-micro a {');
    const focus = rule(css, '.axis-micro a:focus-visible {');
    const plate = '#161c24';
    const lightPage = '#f4f6f8';
    const darkPage = '#0e141c';
    expect(link).toContain('min-width: 44px');
    expect(link).toContain('min-height: 44px');
    expect(link).toContain('color: #c4a572');
    expect(link).toContain(`background: ${plate}`);
    expect(contrast('#c4a572', plate)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#c4a572', lightPage)).toBeLessThan(4.5);
    expect(contrast('#c4a572', darkPage)).toBeGreaterThanOrEqual(4.5);
    expect(focus).toContain('outline: 3px solid var(--civ-link-on-ink)');
    expect(focus).toContain('outline-offset: -3px');
    expect(contrast('#9ec0ef', plate)).toBeGreaterThanOrEqual(3);
    expect(contrast('#9ec0ef', darkPage)).toBeGreaterThanOrEqual(3);
    expect(contrast('#1d4f91', plate)).toBeLessThan(3);
    expect(contrast('#1d4f91', darkPage)).toBeLessThan(3);
    expect(contrast('#9ec0ef', lightPage)).toBeLessThan(3);
    expect(rule(css, '.axis-micro {')).toContain('padding: 18px 16px 0');
    expect(css).toContain('.page.ig-snap .ig-sheet > .axis-micro { margin-top: -12px; }');
    expect(css).toContain('.page.ig-snap .ig-card .axis-micro {\n  flex: 0 0 auto;\n  min-height: 44px;');
    const homeHtml = renderHomeFeed([]);
    const hubHtml = renderCivilizationHub(new Date('2026-10-17T04:00:00.000Z')).html;
    expect(homeHtml).not.toContain('axis-hero');
    expect(homeHtml).not.toContain('axis-micro');
    expect(hubHtml).not.toContain('axis-hero');
    expect(homeHtml).toContain('href="/learn/"');
  });
});

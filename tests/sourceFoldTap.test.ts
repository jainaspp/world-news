import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return css.slice(at, css.indexOf('}', at));
}

describe('explainer source-fold tap target', () => {
  it('gives the source-fold summary a 44px box on a phone and leaves the AA ring alone', () => {
    const columns = readFileSync('public/columns.css', 'utf8');
    const phone = columns.slice(columns.indexOf('@media (max-width: 700px)'));
    const tap = rule(phone, '.topic-fold:has(.source-list) > summary {');
    const focus = rule(columns, '.pack-sources .source-list a:focus-visible,');
    const otherFolds = rule(phone, '.chip, .pack-fold > summary, .topic-fold > summary, .otd-pack > summary, .sources summary {');

    expect(tap).toContain('min-width: 44px');
    expect(tap).toContain('min-height: 44px');
    expect(tap).not.toContain('outline');
    expect(otherFolds).toContain('min-height: 36px');
    expect(otherFolds).not.toContain('min-height: 44px');
    expect(focus).toContain('.topic-fold:has(.source-list) > summary:focus-visible');
    expect(focus).toContain('outline: 3px solid var(--accent)');
    expect(focus).toContain('outline-offset: 2px');
  });
});

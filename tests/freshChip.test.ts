import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('fresh headline chip stays off the volume cards', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');

  it('is an in-flow row at the top of main, not a fixed overlay', () => {
    const rule = css.slice(css.indexOf('.new-items {'), css.indexOf('}', css.indexOf('.new-items {')));
    expect(rule).toContain('position: static');
    expect(rule).not.toContain('position: fixed');
    expect(rule).not.toContain('position: sticky');
    expect(rule).not.toContain('position: absolute');
    expect(rule).not.toMatch(/\bbottom:\s*/);
    const main = app.slice(app.indexOf('<main id="today">'), app.indexOf('</main>'));
    expect(main.indexOf('className="new-items"')).toBeGreaterThan(0);
    expect(main.indexOf('className="new-items"')).toBeLessThan(main.indexOf('className="civ-home"'));
    expect(app.indexOf('className="new-items"')).toBeLessThan(app.indexOf('<BackToTop'));
    expect(app).not.toMatch(/className="new-items"[\s\S]*className="new-items"/);
  });
});

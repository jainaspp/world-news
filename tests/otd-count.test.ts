import { describe, it, expect } from 'vitest';
import { datedPaths, factsOn, seedIssues } from '../shared/heritage.js';
import { dayIndexable, heritagePublicPaths } from '../shared/heritagePage.js';

describe('otd densify', () => {
  it('indexes most seeded days without seed issues', () => {
    expect(seedIssues()).toEqual([]);
    let withF = 0;
    let idx = 0;
    for (const d of datedPaths()) {
      if (!factsOn(d).length) continue;
      withF += 1;
      if (dayIndexable(d)) idx += 1;
    }
    const otd = heritagePublicPaths().filter((p) => p.includes('/on-this-day/'));
    expect(withF).toBe(86);
    expect(idx).toBeGreaterThanOrEqual(80);
    expect(otd.length).toBe(idx + 1); // index + days
  });
});

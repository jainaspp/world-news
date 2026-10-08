import { describe, expect, it } from 'vitest';
import { arabicDigits, polishProse } from '../shared/prose';

describe('five-year plan names', () => {
  it('keeps 十五五 and 十四五 in Chinese numerals', () => {
    expect(arabicDigits('主動對接國家「十五五」規劃，延續十四五規劃，共十五項')).toBe('主動對接國家「十五五」規劃，延續十四五規劃，共15項');
    expect(polishProse('今年是國家「十五五」規劃的開局之年。')).toContain('「十五五」');
  });
});

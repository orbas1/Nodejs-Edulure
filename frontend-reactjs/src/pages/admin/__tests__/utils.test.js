import { describe, expect, it } from 'vitest';

import { coerceNumber, ensureArray, ensureString, takeItems } from '../utils.js';

describe('admin utils data guards', () => {
  it('ensures array values while filtering nullish entries', () => {
    expect(ensureArray([1, null, 2, undefined])).toEqual([1, 2]);
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray('value')).toEqual(['value']);
  });

  it('ensures strings fall back to defaults', () => {
    expect(ensureString(' Hello ')).toBe('Hello');
    expect(ensureString('   ')).toBe('');
    expect(ensureString(null, 'fallback')).toBe('fallback');
  });

  it('coerces numbers with bounds and precision', () => {
    expect(coerceNumber('42.78', { precision: 1 })).toBe(42.8);
    expect(coerceNumber('not a number', { fallback: 10 })).toBe(10);
    expect(coerceNumber(-5, { min: 0 })).toBe(0);
    expect(coerceNumber(150, { max: 100 })).toBe(100);
  });

  it('limits items returned from an array', () => {
    expect(takeItems([1, 2, 3], 2)).toEqual([1, 2]);
    expect(takeItems([1, 2], Infinity)).toEqual([1, 2]);
    expect(takeItems(null, 2)).toEqual([]);
  });
});

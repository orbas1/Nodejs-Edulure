import { describe, expect, it } from 'vitest';

import { __testables } from '../../../src/services/search/providers/databaseSearchProvider.js';

const {
  normaliseEntities,
  normalisePage,
  normalisePerPage,
  normaliseFilters,
  buildBooleanQuery,
  computeBounds
} = __testables;

describe('database search provider helpers', () => {
  it('normalises entity selections', () => {
    expect(normaliseEntities(['Courses', 'unknown'])).toEqual(['courses']);
    expect(normaliseEntities(null)).toContain('courses');
  });

  it('normalises pagination arguments', () => {
    expect(normalisePage('0')).toBe(1);
    expect(normalisePage(3.8)).toBe(3);
    expect(normalisePerPage(5)).toBeGreaterThan(5 - 1);
    expect(normalisePerPage(5000)).toBeLessThanOrEqual(50);
  });

  it('normalises filter structures', () => {
    const filters = normaliseFilters({
      category: [' design ', ''],
      status: { equals: 'published', not: '' },
      empty: '',
      nested: { min: '1', max: '10', ignored: '' }
    });

    expect(filters).toEqual({
      category: ['design'],
      status: { equals: 'published' },
      nested: { min: '1', max: '10' }
    });
  });

  it('builds boolean queries with wildcard suffixes', () => {
    expect(buildBooleanQuery(' design systems ')).toBe('design* systems*');
  });

  it('computes bounds for markers', () => {
    const markers = [
      { lat: 10, lng: -20 },
      { lat: 12, lng: -18 },
      { lat: 8, lng: -25 }
    ];

    expect(computeBounds(markers)).toEqual({ north: 12, south: 8, east: -18, west: -25 });
    expect(computeBounds([{ foo: 'bar' }])).toBeNull();
  });
});

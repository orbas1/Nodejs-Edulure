import { afterEach, describe, expect, it, vi } from 'vitest';

import CourseModel, { buildCatalogueFilterSnapshot } from '../../src/models/CourseModel.js';

describe('buildCatalogueFilterSnapshot', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aggregates course facets and honours defaults', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-30T12:00:00.000Z'));

    const rows = [
      {
        category: 'analytics',
        level: 'intermediate',
        deliveryFormat: 'self_paced',
        languages: JSON.stringify(['en', 'fr']),
        tags: JSON.stringify(['narrative', 'insights', 'data']),
        skills: JSON.stringify(['storytelling', 'visualisation']),
        metadata: JSON.stringify({ defaultCategory: 'analytics' })
      },
      {
        category: null,
        level: null,
        deliveryFormat: 'cohort',
        languages: JSON.stringify(['en']),
        tags: JSON.stringify(['automation', 'data']),
        skills: JSON.stringify(['ops', 'automation']),
        metadata: JSON.stringify({
          defaultCategory: 'operations',
          defaultLevel: 'advanced',
          defaultDeliveryFormat: 'cohort'
        })
      }
    ];

    const snapshot = buildCatalogueFilterSnapshot(rows, { tagLimit: 5 });

    expect(snapshot.generatedAt).toBe('2025-03-30T12:00:00.000Z');
    expect(snapshot.totals.coursesEvaluated).toBe(2);
    expect(snapshot.categories).toEqual([
      { value: 'analytics', count: 1 },
      { value: 'operations', count: 1 }
    ]);
    expect(snapshot.levels).toEqual([
      { value: 'advanced', count: 1 },
      { value: 'intermediate', count: 1 }
    ]);
    expect(snapshot.deliveryFormats).toEqual([
      { value: 'cohort', count: 1 },
      { value: 'self_paced', count: 1 }
    ]);
    expect(snapshot.languages).toEqual([
      { value: 'en', count: 2 },
      { value: 'fr', count: 1 }
    ]);
    expect(snapshot.tags).toEqual([
      { value: 'data', count: 2 },
      { value: 'automation', count: 1 },
      { value: 'insights', count: 1 },
      { value: 'narrative', count: 1 }
    ]);
    expect(snapshot.skills).toEqual([
      { value: 'automation', count: 1 },
      { value: 'ops', count: 1 },
      { value: 'storytelling', count: 1 },
      { value: 'visualisation', count: 1 }
    ]);
  });

  it('limits tags and skills when requested', () => {
    const rows = [
      {
        category: 'analytics',
        level: 'advanced',
        deliveryFormat: 'cohort',
        languages: JSON.stringify(['en']),
        tags: JSON.stringify(['ops', 'ops', 'ops', 'insights']),
        skills: JSON.stringify(['ops', 'automation', 'storytelling']),
        metadata: JSON.stringify({})
      }
    ];

    const snapshot = buildCatalogueFilterSnapshot(rows, { tagLimit: 2 });

    expect(snapshot.tags).toEqual([
      { value: 'ops', count: 3 },
      { value: 'insights', count: 1 }
    ]);
    expect(snapshot.skills).toEqual([
      { value: 'automation', count: 1 },
      { value: 'ops', count: 1 }
    ]);
  });
});

describe('CourseModel.getCatalogueFilters', () => {
  it('selects skills when aggregating catalogue facets', async () => {
    const rows = [
      {
        category: 'operations',
        level: 'advanced',
        languages: JSON.stringify(['en']),
        tags: JSON.stringify(['automation']),
        skills: JSON.stringify(['ops']),
        deliveryFormat: 'cohort',
        metadata: JSON.stringify({})
      }
    ];

    const query = {
      _selectedColumns: [],
      select: vi.fn(function select(...columns) {
        this._selectedColumns = columns;
        return this;
      }),
      where: vi.fn().mockReturnThis(),
      then(onFulfilled) {
        return Promise.resolve(rows).then(onFulfilled);
      }
    };

    const connection = vi.fn(() => query);

    const result = await CourseModel.getCatalogueFilters({}, connection);

    expect(connection).toHaveBeenCalledWith('courses');
    expect(query.select).toHaveBeenCalled();
    expect(query._selectedColumns).toContain('skills');
    expect(query.where).toHaveBeenCalledWith('status', 'published');
    expect(result.skills).toEqual([{ value: 'ops', count: 1 }]);
  });
});

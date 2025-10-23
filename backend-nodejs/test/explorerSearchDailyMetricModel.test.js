import knex from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import ExplorerSearchDailyMetricModel from '../src/models/ExplorerSearchDailyMetricModel.js';

let connection;

const createTables = async () => {
  await connection.schema.createTable('explorer_search_daily_metrics', (table) => {
    table.increments('id').primary();
    table.date('metric_date').notNullable();
    table.string('entity_type').notNullable();
    table.bigInteger('searches').notNullable().defaultTo(0);
    table.bigInteger('zero_results').notNullable().defaultTo(0);
    table.bigInteger('displayed_results').notNullable().defaultTo(0);
    table.bigInteger('total_results').notNullable().defaultTo(0);
    table.bigInteger('clicks').notNullable().defaultTo(0);
    table.bigInteger('conversions').notNullable().defaultTo(0);
    table.integer('average_latency_ms').notNullable().defaultTo(0);
    table.text('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  });
};

describe('ExplorerSearchDailyMetricModel', () => {
  beforeAll(async () => {
    connection = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });
    await createTables();
  });

  beforeEach(async () => {
    await connection('explorer_search_daily_metrics').delete();
  });

  afterAll(async () => {
    await connection.destroy();
  });

  it('creates metrics for a new event and normalises values', async () => {
    const metric = await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-01-15T14:00:00Z',
        entityType: 'courses',
        isZeroResult: false,
        displayedHits: 3,
        totalHits: 7,
        latencyMs: 180
      },
      connection
    );

    expect(metric.entityType).toBe('courses');
    expect(metric.searches).toBe(1);
    expect(metric.displayedResults).toBe(3);
    expect(metric.totalResults).toBe(7);
    expect(metric.averageLatencyMs).toBe(180);
    expect(metric.metricDate.toISOString()).toContain('2025-01-15');
  });

  it('aggregates metrics for existing rows with weighted latency averages', async () => {
    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-01-16T10:00:00Z',
        entityType: 'courses',
        isZeroResult: false,
        displayedHits: 4,
        totalHits: 9,
        latencyMs: 200
      },
      connection
    );

    const updated = await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-01-16T23:00:00Z',
        entityType: 'courses',
        isZeroResult: true,
        displayedHits: 1,
        totalHits: 0,
        latencyMs: 100
      },
      connection
    );

    expect(updated.searches).toBe(2);
    expect(updated.zeroResults).toBe(1);
    expect(updated.displayedResults).toBe(5);
    expect(updated.totalResults).toBe(9);
    expect(updated.averageLatencyMs).toBe(150);
  });

  it('records click and conversion metrics even when the row does not yet exist', async () => {
    const metrics = await ExplorerSearchDailyMetricModel.incrementClicks(
      {
        metricDate: '2025-01-20',
        entityType: 'all',
        clicks: 3,
        conversions: 1
      },
      connection
    );

    expect(metrics.clicks).toBe(3);
    expect(metrics.conversions).toBe(1);
    expect(metrics.searches).toBe(0);
  });

  it('returns ordered metrics within a date range', async () => {
    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-01-01',
        entityType: 'all',
        displayedHits: 2,
        totalHits: 5,
        latencyMs: 120
      },
      connection
    );
    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-01-03',
        entityType: 'all',
        displayedHits: 1,
        totalHits: 2,
        latencyMs: 90
      },
      connection
    );

    const results = await ExplorerSearchDailyMetricModel.listBetween(
      { since: '2025-01-01', until: '2025-01-03' },
      connection
    );

    expect(results).toHaveLength(2);
    expect(results[0].metricDate <= results[1].metricDate).toBe(true);
  });

  it('aggregates a range of metrics keyed by entity type', async () => {
    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-02-10',
        entityType: 'all',
        displayedHits: 3,
        totalHits: 3,
        latencyMs: 80
      },
      connection
    );
    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-02-10',
        entityType: 'all',
        displayedHits: 5,
        totalHits: 5,
        latencyMs: 120
      },
      connection
    );
    await ExplorerSearchDailyMetricModel.incrementClicks(
      { metricDate: '2025-02-10', entityType: 'all', clicks: 4, conversions: 2 },
      connection
    );

    const aggregates = await ExplorerSearchDailyMetricModel.aggregateRange(
      { since: '2025-02-09', until: '2025-02-11' },
      connection
    );

    const overall = aggregates.get('all');
    expect(overall).toBeDefined();
    expect(overall.searches).toBe(2);
    expect(overall.clicks).toBe(4);
    expect(overall.conversions).toBe(2);
    expect(overall.averageLatencyMs).toBe(100);
  });

  it('validates entity type input', async () => {
    await expect(
      ExplorerSearchDailyMetricModel.incrementForEvent(
        {
          metricDate: '2025-01-10',
          entityType: '  ',
          displayedHits: 1,
          totalHits: 1,
          latencyMs: 50
        },
        connection
      )
    ).rejects.toThrow('Explorer search metrics require a non-empty entity type');
  });

  it('stores preview digests and exposes cached entries', async () => {
    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-03-01T12:00:00Z',
        entityType: 'tutors',
        displayedHits: 3,
        totalHits: 6,
        latencyMs: 140,
        previewDigest: [
          {
            entityId: 'tutor-1',
            thumbnailUrl: 'https://cdn.edulure.com/tutors/tutor-1.jpg',
            title: 'Tutor One'
          }
        ]
      },
      connection
    );

    await ExplorerSearchDailyMetricModel.incrementForEvent(
      {
        metricDate: '2025-03-02T08:00:00Z',
        entityType: 'tutors',
        displayedHits: 2,
        totalHits: 4,
        latencyMs: 90,
        previewDigest: [
          {
            entityId: 'tutor-1',
            thumbnailUrl: 'https://cdn.edulure.com/tutors/tutor-1-updated.jpg',
            title: 'Tutor One'
          },
          {
            entityId: 'tutor-2',
            previewUrl: 'https://cdn.edulure.com/tutors/tutor-2-preview.mp4',
            previewType: 'video',
            title: 'Tutor Two'
          }
        ]
      },
      connection
    );

    const digest = await ExplorerSearchDailyMetricModel.getRecentPreviewDigest(
      'tutors',
      { limit: 5 },
      connection
    );

    expect(digest.get('tutor-1')).toMatchObject({
      entityId: 'tutor-1',
      thumbnailUrl: 'https://cdn.edulure.com/tutors/tutor-1-updated.jpg'
    });
    expect(digest.get('tutor-2')).toMatchObject({
      entityId: 'tutor-2',
      previewUrl: 'https://cdn.edulure.com/tutors/tutor-2-preview.mp4',
      previewType: 'video'
    });
  });
});

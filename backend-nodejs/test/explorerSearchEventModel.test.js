import crypto from 'node:crypto';

import knex from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import ExplorerSearchEventModel from '../src/models/ExplorerSearchEventModel.js';

let connection;

const createTables = async () => {
  await connection.schema.createTable('explorer_search_events', (table) => {
    table.increments('id').primary();
    table.string('event_uuid').notNullable().unique();
    table.integer('user_id');
    table.string('session_id').notNullable();
    table.string('trace_id');
    table.string('query').notNullable();
    table.integer('result_total').notNullable().defaultTo(0);
    table.boolean('is_zero_result').notNullable().defaultTo(false);
    table.integer('latency_ms').notNullable().defaultTo(0);
    table.text('filters').notNullable().defaultTo('{}');
    table.text('global_filters').notNullable().defaultTo('{}');
    table.text('sort_preferences').notNullable().defaultTo('{}');
    table.text('metadata').notNullable().defaultTo('{}');
    table.string('environment_key').notNullable().defaultTo('local');
    table.string('environment_name').notNullable().defaultTo('Local Development');
    table.string('environment_tier').defaultTo('development');
    table.string('environment_region').defaultTo('local');
    table.string('environment_workspace');
    table.timestamp('created_at').defaultTo(connection.fn.now());
  });
};

describe('ExplorerSearchEventModel', () => {
  beforeAll(async () => {
    connection = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true
    });
    await createTables();
  });

  beforeEach(async () => {
    await connection('explorer_search_events').delete();
  });

  afterAll(async () => {
    await connection.destroy();
  });

  const createEvent = (overrides = {}) =>
    ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: 'Initial Query',
        resultTotal: 2,
        latencyMs: 90,
        ...overrides
      },
      connection
    );

  it('creates a normalised explorer search event payload', async () => {
    const event = await ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: '   GraphQL  ',
        resultTotal: '7',
        latencyMs: '101',
        filters: { topic: ['graphql'] },
        metadata: { ip: '127.0.0.1' }
      },
      connection
    );

    expect(event.query).toBe('GraphQL');
    expect(event.resultTotal).toBe(7);
    expect(event.latencyMs).toBe(101);
    expect(event.filters).toEqual({ topic: ['graphql'] });
    expect(event.metadata).toEqual({ ip: '127.0.0.1' });
  });

  it('enforces required identifiers and integer guards', async () => {
    await expect(
      ExplorerSearchEventModel.create(
        {
          eventUuid: '   ',
          sessionId: crypto.randomUUID(),
          query: 'test'
        },
        connection
      )
    ).rejects.toThrow('eventUuid must not be empty');

    await expect(
      ExplorerSearchEventModel.create(
        {
          eventUuid: crypto.randomUUID(),
          sessionId: crypto.randomUUID(),
          userId: -1
        },
        connection
      )
    ).rejects.toThrow('userId must be a non-negative integer');
  });

  it('lists events within a provided window and rejects invalid ranges', async () => {
    const first = await createEvent();
    const second = await createEvent();

    await connection('explorer_search_events')
      .where({ id: first.id })
      .update({ created_at: new Date('2025-01-01T00:00:00Z') });
    await connection('explorer_search_events')
      .where({ id: second.id })
      .update({ created_at: new Date('2025-01-02T00:00:00Z') });

    const rows = await ExplorerSearchEventModel.listBetween(
      { since: '2025-01-01', until: '2025-01-03' },
      connection
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].createdAt >= rows[1].createdAt).toBe(true);

    await expect(
      ExplorerSearchEventModel.listBetween(
        { since: '2025-01-03', until: '2025-01-01' },
        connection
      )
    ).rejects.toThrow(RangeError);
  });

  it('computes top queries with optional zero-result filtering', async () => {
    const baseDate = new Date('2025-03-01T00:00:00Z');

    const first = await ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: 'React',
        isZeroResult: false
      },
      connection
    );
    const second = await ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: 'react ',
        isZeroResult: true
      },
      connection
    );
    const third = await ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: 'Vue',
        isZeroResult: true
      },
      connection
    );

    await connection('explorer_search_events')
      .whereIn('id', [first.id, second.id, third.id])
      .update({ created_at: baseDate });

    const topAll = await ExplorerSearchEventModel.topQueries(
      { since: '2025-02-28', limit: 50 },
      connection
    );
    expect(topAll).toEqual([
      { query: 'react', searches: 2 },
      { query: 'vue', searches: 1 }
    ]);

    const zeroOnly = await ExplorerSearchEventModel.topQueries(
      { since: '2025-02-28', zeroResultOnly: true },
      connection
    );
    expect(zeroOnly).toHaveLength(2);
    expect(zeroOnly).toEqual(
      expect.arrayContaining([
        { query: 'react', searches: 1 },
        { query: 'vue', searches: 1 }
      ])
    );
  });

  it('caps the number of top queries returned', async () => {
    const since = '2025-04-01';
    const events = Array.from({ length: 60 }).map((_, index) =>
      ExplorerSearchEventModel.create(
        {
          eventUuid: crypto.randomUUID(),
          sessionId: crypto.randomUUID(),
          query: `Topic ${index}`,
          isZeroResult: Boolean(index % 2)
        },
        connection
      )
    );

    const created = await Promise.all(events);
    await connection('explorer_search_events')
      .whereIn('id', created.map((event) => event.id))
      .update({ created_at: new Date('2025-04-02T00:00:00Z') });

    const queries = await ExplorerSearchEventModel.topQueries(
      { since, limit: 500 },
      connection
    );

    expect(queries.length).toBeLessThanOrEqual(50);
  });

  it('aggregates event summaries with unique user counts', async () => {
    const eventA = await ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: 'Search A',
        userId: 10,
        resultTotal: 3,
        latencyMs: 50,
        isZeroResult: false
      },
      connection
    );
    const eventB = await ExplorerSearchEventModel.create(
      {
        eventUuid: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        query: 'Search B',
        userId: 11,
        resultTotal: 0,
        latencyMs: 70,
        isZeroResult: true
      },
      connection
    );

    await connection('explorer_search_events')
      .whereIn('id', [eventA.id, eventB.id])
      .update({ created_at: new Date('2025-05-01T00:00:00Z') });

    const summary = await ExplorerSearchEventModel.aggregateRange({ since: '2025-04-30' }, connection);

    expect(summary.searches).toBe(2);
    expect(summary.zeroResults).toBe(1);
    expect(summary.totalResults).toBe(3);
    expect(summary.averageLatencyMs).toBe(60);
    expect(summary.uniqueUsers).toBe(2);
  });
});

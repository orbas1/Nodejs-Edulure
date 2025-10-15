import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

export default class ModerationAnalyticsEventModel {
  static async record(event, connection = db) {
    const payload = {
      community_id: event.communityId ?? null,
      entity_type: event.entityType,
      entity_id: event.entityId,
      event_type: event.eventType,
      risk_score: event.riskScore ?? null,
      metrics: JSON.stringify(event.metrics ?? {}),
      source: event.source ?? 'manual',
      occurred_at: event.occurredAt ?? connection.fn.now(),
      ingested_at: connection.fn.now()
    };

    const [id] = await connection('moderation_analytics_events').insert(payload);
    return connection('moderation_analytics_events')
      .select({
        id: 'id',
        communityId: 'community_id',
        entityType: 'entity_type',
        entityId: 'entity_id',
        eventType: 'event_type',
        riskScore: 'risk_score',
        metrics: 'metrics',
        source: 'source',
        occurredAt: 'occurred_at',
        ingestedAt: 'ingested_at'
      })
      .where({ id })
      .first();
  }

  static async summarise(filters = {}, connection = db) {
    const query = connection('moderation_analytics_events')
      .select('event_type')
      .count({ total: '*' })
      .avg({ averageRisk: 'risk_score' });

    if (filters.communityId) {
      query.where('community_id', filters.communityId);
    }
    if (filters.from) {
      query.andWhere('occurred_at', '>=', filters.from);
    }
    if (filters.to) {
      query.andWhere('occurred_at', '<=', filters.to);
    }

    const events = await query.groupBy('event_type');

    const timelineQuery = connection('moderation_analytics_events')
      .select(
        connection.raw('DATE(occurred_at) as date'),
        connection.raw('COUNT(*) as total'),
        connection.raw('AVG(risk_score) as averageRisk')
      );

    if (filters.communityId) {
      timelineQuery.where('community_id', filters.communityId);
    }
    if (filters.from) {
      timelineQuery.andWhere('occurred_at', '>=', filters.from);
    }
    if (filters.to) {
      timelineQuery.andWhere('occurred_at', '<=', filters.to);
    }

    const timeline = await timelineQuery.groupByRaw('DATE(occurred_at)').orderBy('date', 'asc');

    return {
      events: events.map((row) => ({
        eventType: row.event_type,
        total: Number(row.total ?? 0),
        averageRisk: row.averageRisk !== null ? Number(row.averageRisk) : null
      })),
      timeline: timeline.map((row) => ({
        date: row.date,
        total: Number(row.total ?? 0),
        averageRisk: row.averageRisk !== null ? Number(row.averageRisk) : null
      }))
    };
  }

  static parseMetrics(eventRecord) {
    if (!eventRecord) return null;
    return {
      ...eventRecord,
      metrics: parseJson(eventRecord.metrics, {})
    };
  }
}

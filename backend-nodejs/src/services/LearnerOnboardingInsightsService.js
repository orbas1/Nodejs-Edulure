import db from '../config/database.js';
import logger from '../config/logger.js';
import { TABLES } from '../database/domains/telemetry.js';

const log = logger.child({ service: 'LearnerOnboardingInsightsService' });

function safeParseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toIsoString(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalisePersona(value) {
  if (!value || typeof value !== 'string') {
    return 'unspecified';
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : 'unspecified';
}

function countInvites(invites, predicate) {
  if (!Array.isArray(invites)) {
    return 0;
  }
  return invites.filter((invite) => predicate((invite?.status ?? invite?.state ?? '').toLowerCase())).length;
}

function buildPersonaBreakdown(map, total) {
  return Array.from(map.entries())
    .map(([persona, count]) => ({
      persona,
      count,
      share: total > 0 ? count / total : 0
    }))
    .sort((a, b) => b.count - a.count);
}

async function summariseOnboardingResponses({ sinceDays }) {
  const sinceDate = Number.isFinite(sinceDays) ? new Date(Date.now() - sinceDays * 86_400_000) : null;
  const rows = await db('learner_onboarding_responses').select('persona', 'invites', 'submitted_at');

  const personaCounts = new Map();
  let acceptedInvites = 0;
  let pendingInvites = 0;
  let recentAcceptedInvites = 0;
  let totalRecentResponses = 0;
  let latestSubmission = null;

  rows.forEach((row) => {
    const persona = normalisePersona(row.persona);
    personaCounts.set(persona, (personaCounts.get(persona) ?? 0) + 1);

    const invites = safeParseJson(row.invites, []);
    const accepted = countInvites(invites, (status) => status === 'accepted');
    const pending = countInvites(invites, (status) => status !== 'accepted');
    acceptedInvites += accepted;
    pendingInvites += pending;

    const submittedAtIso = toIsoString(row.submitted_at);
    if (submittedAtIso) {
      if (!latestSubmission || submittedAtIso > latestSubmission) {
        latestSubmission = submittedAtIso;
      }
      if (sinceDate) {
        const submittedAtDate = new Date(submittedAtIso);
        if (!Number.isNaN(submittedAtDate.getTime()) && submittedAtDate >= sinceDate) {
          totalRecentResponses += 1;
          recentAcceptedInvites += accepted;
        }
      }
    }
  });

  const personaBreakdown = buildPersonaBreakdown(personaCounts, rows.length);

  return {
    totalResponses: rows.length,
    recentResponses: sinceDate ? totalRecentResponses : rows.length,
    acceptedInvites,
    recentAcceptedInvites,
    pendingInvites,
    lastSubmittedAt: latestSubmission,
    personaBreakdown,
    topPersona: personaBreakdown[0] ?? null
  };
}

async function summariseSurveyFeedback({ sinceDays }) {
  const baseQuery = db(TABLES.EVENTS).where({ event_name: 'learner.survey.submitted' });
  const [allTimeRow] = await baseQuery.clone().count({ total: '*' });
  const totalResponses = Number(allTimeRow?.total ?? 0);

  const sinceDate = Number.isFinite(sinceDays) ? new Date(Date.now() - sinceDays * 86_400_000) : null;
  const recentQuery = baseQuery.clone();
  if (sinceDate) {
    recentQuery.andWhere('occurred_at', '>=', sinceDate);
  }
  const [recentRow] = await recentQuery.clone().count({ total: '*' });
  const recentResponses = Number(recentRow?.total ?? 0);

  const latestEvent = await baseQuery.clone().orderBy('occurred_at', 'desc').select('occurred_at').first();
  const lastSubmittedAt = toIsoString(latestEvent?.occurred_at ?? null);

  const breakdownSource = await recentQuery
    .clone()
    .select('occurred_at')
    .orderBy('occurred_at', 'desc')
    .limit(200);

  const dailyMap = new Map();
  breakdownSource.forEach((row) => {
    const iso = toIsoString(row.occurred_at);
    if (!iso) {
      return;
    }
    const day = iso.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  });

  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .slice(0, 7);

  return {
    totalResponses,
    recentResponses,
    lastSubmittedAt,
    dailyBreakdown
  };
}

function buildFallback(windowDays) {
  return {
    windowDays,
    windowLabel: Number.isFinite(windowDays) ? `Last ${windowDays} days` : 'All time',
    onboarding: {
      totalResponses: 0,
      recentResponses: 0,
      acceptedInvites: 0,
      recentAcceptedInvites: 0,
      pendingInvites: 0,
      lastSubmittedAt: null,
      personaBreakdown: [],
      topPersona: null
    },
    feedback: {
      totalResponses: 0,
      recentResponses: 0,
      lastSubmittedAt: null,
      dailyBreakdown: []
    }
  };
}

export default class LearnerOnboardingInsightsService {
  static async summarise({ sinceDays = 30 } = {}) {
    try {
      const [onboarding, feedback] = await Promise.all([
        summariseOnboardingResponses({ sinceDays }),
        summariseSurveyFeedback({ sinceDays })
      ]);

      return {
        windowDays: sinceDays,
        windowLabel: Number.isFinite(sinceDays) ? `Last ${sinceDays} days` : 'All time',
        onboarding,
        feedback
      };
    } catch (error) {
      log.error({ err: error }, 'Failed to summarise learner onboarding insights');
      return buildFallback(sinceDays);
    }
  }
}

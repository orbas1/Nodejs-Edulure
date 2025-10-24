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

function normaliseInviteStatus(invite) {
  if (!invite) {
    return 'pending';
  }
  const rawStatus = invite?.status ?? invite?.state ?? 'pending';
  const status = String(rawStatus).trim().toLowerCase();
  if (status === 'accepted' || status === 'expired' || status === 'revoked') {
    return status;
  }
  return 'pending';
}

function accumulateInviteCounts(invites) {
  const counts = {
    accepted: 0,
    pending: 0,
    expired: 0,
    revoked: 0,
    total: 0
  };

  if (!Array.isArray(invites)) {
    return counts;
  }

  invites.forEach((invite) => {
    const status = normaliseInviteStatus(invite);
    if (status === 'accepted') {
      counts.accepted += 1;
    } else if (status === 'expired') {
      counts.expired += 1;
    } else if (status === 'revoked') {
      counts.revoked += 1;
    } else {
      counts.pending += 1;
    }
    counts.total += 1;
  });

  return counts;
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

async function summariseOnboardingResponses({ sinceDays, connection }) {
  const client = connection ?? db;
  const sinceDate = Number.isFinite(sinceDays) ? new Date(Date.now() - sinceDays * 86_400_000) : null;
  const rows = await client('learner_onboarding_responses').select('persona', 'invites', 'submitted_at');

  const personaCounts = new Map();
  let acceptedInvites = 0;
  let pendingInvites = 0;
  let expiredInvites = 0;
  let revokedInvites = 0;
  let totalInvites = 0;
  let recentAcceptedInvites = 0;
  let recentPendingInvites = 0;
  let recentExpiredInvites = 0;
  let recentRevokedInvites = 0;
  let recentTotalInvites = 0;
  let totalRecentResponses = 0;
  let latestSubmission = null;

  rows.forEach((row) => {
    const persona = normalisePersona(row.persona);
    personaCounts.set(persona, (personaCounts.get(persona) ?? 0) + 1);

    const invites = safeParseJson(row.invites, []);
    const inviteCounts = accumulateInviteCounts(invites);
    acceptedInvites += inviteCounts.accepted;
    pendingInvites += inviteCounts.pending;
    expiredInvites += inviteCounts.expired;
    revokedInvites += inviteCounts.revoked;
    totalInvites += inviteCounts.total;

    const submittedAtIso = toIsoString(row.submitted_at);
    if (submittedAtIso) {
      if (!latestSubmission || submittedAtIso > latestSubmission) {
        latestSubmission = submittedAtIso;
      }
      if (sinceDate) {
        const submittedAtDate = new Date(submittedAtIso);
        if (!Number.isNaN(submittedAtDate.getTime()) && submittedAtDate >= sinceDate) {
          totalRecentResponses += 1;
          recentAcceptedInvites += inviteCounts.accepted;
          recentPendingInvites += inviteCounts.pending;
          recentExpiredInvites += inviteCounts.expired;
          recentRevokedInvites += inviteCounts.revoked;
          recentTotalInvites += inviteCounts.total;
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
    recentPendingInvites,
    expiredInvites,
    recentExpiredInvites,
    revokedInvites,
    recentRevokedInvites,
    totalInvites,
    recentTotalInvites,
    acceptanceRate: totalInvites > 0 ? acceptedInvites / totalInvites : 0,
    recentAcceptanceRate: recentTotalInvites > 0 ? recentAcceptedInvites / recentTotalInvites : 0,
    lastSubmittedAt: latestSubmission,
    personaBreakdown,
    topPersona: personaBreakdown[0] ?? null
  };
}

async function summariseSurveyFeedback({ sinceDays, connection }) {
  const client = connection ?? db;
  const baseQuery = client(TABLES.EVENTS).where({ event_name: 'learner.survey.submitted' });
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
      recentPendingInvites: 0,
      expiredInvites: 0,
      recentExpiredInvites: 0,
      revokedInvites: 0,
      recentRevokedInvites: 0,
      totalInvites: 0,
      recentTotalInvites: 0,
      acceptanceRate: 0,
      recentAcceptanceRate: 0,
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
  static async summarise({ sinceDays = 30, connection } = {}) {
    try {
      const [onboarding, feedback] = await Promise.all([
        summariseOnboardingResponses({ sinceDays, connection }),
        summariseSurveyFeedback({ sinceDays, connection })
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

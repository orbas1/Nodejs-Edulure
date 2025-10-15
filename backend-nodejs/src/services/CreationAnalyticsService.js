import db from '../config/database.js';
import logger from '../utils/logger.js';

const log = logger.child({ service: 'CreationAnalyticsService' });

const RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365
};

const REVIEW_STATUSES = new Set(['ready_for_review', 'in_review', 'changes_requested']);

function ensureActor(actor) {
  if (!actor || !actor.role) {
    const error = new Error('Unauthorised analytics request');
    error.status = 401;
    throw error;
  }
  const allowed = ['admin', 'staff', 'instructor'];
  if (!allowed.includes(actor.role)) {
    const error = new Error('You do not have permission to view creation analytics');
    error.status = 403;
    throw error;
  }
}

function resolveRange(rangeKey) {
  const days = RANGE_DAYS[rangeKey] ?? RANGE_DAYS['30d'];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function normaliseNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    log.warn({ err: error }, 'Failed to parse JSON payload in creation analytics');
    return fallback;
  }
}

function toIso(date) {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function hoursBetween(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

function computeRankingDriver({ completionRate, conversionRate, revenueCents, watchMinutes }) {
  if (revenueCents >= 150_000) {
    return 'Monetisation velocity is outpacing forecast – reinvest to capture demand.';
  }
  if (completionRate >= 0.65 && watchMinutes >= 600) {
    return 'Learners are completing the catalogue at a very high rate – expand the syllabus.';
  }
  if (conversionRate >= 0.25) {
    return 'Lead-to-enrolment conversion is exceeding the benchmark – increase campaign budgets.';
  }
  if (watchMinutes >= 480) {
    return 'Sustained watch time indicates healthy engagement – introduce retention offers.';
  }
  return 'Steady growth recorded – optimise outlines and publish cadence to accelerate.';
}

function computeRankingScore({
  views,
  completions,
  conversions,
  watchMinutes,
  revenueCents,
  reviewLatencyHours
}) {
  const viewFactor = views > 0 ? Math.min(1, views / 5000) : 0;
  const completionRate = views > 0 ? completions / views : 0;
  const conversionRate = views > 0 ? conversions / views : 0;
  const completionFactor = Math.min(1, completionRate);
  const conversionFactor = Math.min(1, conversionRate * 1.5);
  const watchFactor = Math.min(1, watchMinutes / 1200); // 20 hours of watch time
  const revenueFactor = revenueCents > 0 ? Math.min(1, revenueCents / 250_000) : 0;
  const penalty = reviewLatencyHours && reviewLatencyHours > 96 ? Math.min(0.25, (reviewLatencyHours - 96) / 960) : 0;
  const score = viewFactor * 0.2 + completionFactor * 0.25 + conversionFactor * 0.2 + watchFactor * 0.15 + revenueFactor * 0.2 - penalty;
  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export default class CreationAnalyticsService {
  static resolveScope(actor, ownerId) {
    if (actor.role === 'admin' || actor.role === 'staff') {
      return ownerId ? { ownerId } : {};
    }
    return { ownerId: actor.id };
  }

  static async getSummary(actor, options = {}) {
    ensureActor(actor);

    const { range = '30d', ownerId } = options;
    const { start, end } = resolveRange(range);
    const scope = this.resolveScope(actor, ownerId);

    const [projects, collaboratorRows, sessionSummary, adsAggregates, topCampaigns, scamRows] = await Promise.all([
      this.fetchProjects(scope, start, end),
      this.fetchCollaborators(scope),
      this.fetchSessionSummary(scope, start, end),
      this.fetchAdsAggregates(scope, start, end),
      this.fetchTopCampaigns(scope),
      this.fetchScamReports(start, end)
    ]);

    const analytics = this.buildProjectAnalytics(projects, collaboratorRows, sessionSummary);
    const engagement = this.buildEngagementAnalytics(projects);
    const rankingInsights = this.buildRankingInsights(analytics.projectsForRanking);
    const scamAlert = this.buildScamAlert(scamRows, start, end);

    const adsPerformance = {
      totals: {
        campaigns: adsAggregates.totalCampaigns,
        activeCampaigns: adsAggregates.activeCampaigns,
        pausedCampaigns: adsAggregates.pausedCampaigns,
        spendCents: adsAggregates.totalSpendCents,
        budgetDailyCents: adsAggregates.totalDailyBudgetCents,
        averageCtr: round(adsAggregates.averageCtr ?? 0, 3),
        averageCpcCents: round(adsAggregates.averageCpcCents ?? 0, 2),
        averageCpaCents: round(adsAggregates.averageCpaCents ?? 0, 2)
      },
      topCampaigns: topCampaigns.map((campaign) => ({
        id: campaign.publicId,
        name: campaign.name,
        status: campaign.status,
        performanceScore: round(normaliseNumber(campaign.performanceScore, 0), 3),
        ctr: round(normaliseNumber(campaign.ctr, 0), 3),
        cpcCents: round(normaliseNumber(campaign.cpcCents, 0), 2),
        cpaCents: round(normaliseNumber(campaign.cpaCents, 0), 2),
        spendCents: normaliseNumber(campaign.spendTotalCents, 0),
        updatedAt: campaign.updatedAt ? new Date(campaign.updatedAt).toISOString() : null
      }))
    };

    return {
      timeframe: { range, start: start.toISOString(), end: end.toISOString() },
      projectMetrics: analytics.projectMetrics,
      engagement,
      adsPerformance,
      rankingInsights,
      scamAlert,
      exportMeta: {
        generatedAt: new Date().toISOString(),
        ownerScope: scope.ownerId ?? null,
        projectCount: analytics.projectMetrics.totals.total
      }
    };
  }

  static async fetchProjects(scope, start, end) {
    const query = db('creation_projects as p')
      .select([
        'p.id as id',
        'p.public_id as publicId',
        'p.owner_id as ownerId',
        'p.type',
        'p.status',
        'p.title',
        'p.metadata',
        'p.analytics_targets as analyticsTargets',
        'p.review_requested_at as reviewRequestedAt',
        'p.approved_at as approvedAt',
        'p.published_at as publishedAt',
        'p.created_at as createdAt',
        'p.updated_at as updatedAt'
      ])
      .where('p.updated_at', '>=', toIso(start))
      .andWhere('p.updated_at', '<=', toIso(end));

    if (scope.ownerId) {
      query.andWhere('p.owner_id', scope.ownerId);
    }

    return query;
  }

  static async fetchCollaborators(scope) {
    const query = db('creation_project_collaborators as c')
      .innerJoin('creation_projects as p', 'c.project_id', 'p.id')
      .select(['c.project_id as projectId', 'c.user_id as userId'])
      .whereNull('c.removed_at');

    if (scope.ownerId) {
      query.andWhere('p.owner_id', scope.ownerId);
    }

    return query;
  }

  static async fetchSessionSummary(scope, start, end) {
    const query = db('creation_collaboration_sessions as s')
      .innerJoin('creation_projects as p', 's.project_id', 'p.id')
      .where('s.joined_at', '>=', toIso(start))
      .andWhere('s.joined_at', '<=', toIso(end));

    if (scope.ownerId) {
      query.andWhere('p.owner_id', scope.ownerId);
    }

    const [summary] = await query
      .clone()
      .select({
        totalSessions: db.raw('COUNT(*)'),
        activeSessions: db.raw("SUM(CASE WHEN s.left_at IS NULL THEN 1 ELSE 0 END)"),
        completedSessions: db.raw("SUM(CASE WHEN s.left_at IS NOT NULL THEN 1 ELSE 0 END)"),
        averageDurationMinutes: db.raw(
          'AVG(CASE WHEN s.left_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, s.joined_at, s.left_at) ELSE TIMESTAMPDIFF(MINUTE, s.joined_at, ?) END)',
          [toIso(end)]
        )
      });

    return {
      totalSessions: Number(summary?.totalSessions ?? 0),
      activeSessions: Number(summary?.activeSessions ?? 0),
      completedSessions: Number(summary?.completedSessions ?? 0),
      averageDurationMinutes: normaliseNumber(summary?.averageDurationMinutes ?? 0, 0)
    };
  }

  static async fetchAdsAggregates(scope, start, end) {
    const query = db('ads_campaigns as a')
      .where('a.created_at', '>=', toIso(start))
      .andWhere('a.created_at', '<=', toIso(end));

    if (scope.ownerId) {
      query.andWhere('a.created_by', scope.ownerId);
    }

    const [row] = await query
      .clone()
      .select({
        totalCampaigns: db.raw('COUNT(*)'),
        activeCampaigns: db.raw("SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END)"),
        pausedCampaigns: db.raw("SUM(CASE WHEN a.status = 'paused' THEN 1 ELSE 0 END)"),
        totalSpendCents: db.raw('COALESCE(SUM(a.spend_total_cents), 0)'),
        totalDailyBudgetCents: db.raw('COALESCE(SUM(a.budget_daily_cents), 0)'),
        averageCtr: db.raw('AVG(COALESCE(a.ctr, 0))'),
        averageCpcCents: db.raw('AVG(COALESCE(a.cpc_cents, 0))'),
        averageCpaCents: db.raw('AVG(COALESCE(a.cpa_cents, 0))')
      });

    return {
      totalCampaigns: Number(row?.totalCampaigns ?? 0),
      activeCampaigns: Number(row?.activeCampaigns ?? 0),
      pausedCampaigns: Number(row?.pausedCampaigns ?? 0),
      totalSpendCents: Number(row?.totalSpendCents ?? 0),
      totalDailyBudgetCents: Number(row?.totalDailyBudgetCents ?? 0),
      averageCtr: Number(row?.averageCtr ?? 0),
      averageCpcCents: Number(row?.averageCpcCents ?? 0),
      averageCpaCents: Number(row?.averageCpaCents ?? 0)
    };
  }

  static async fetchTopCampaigns(scope) {
    const query = db('ads_campaigns as a')
      .select([
        'a.public_id as publicId',
        'a.name',
        'a.status',
        'a.performance_score as performanceScore',
        'a.ctr',
        'a.cpc_cents as cpcCents',
        'a.cpa_cents as cpaCents',
        'a.spend_total_cents as spendTotalCents',
        'a.updated_at as updatedAt'
      ])
      .orderBy([{ column: 'a.performance_score', order: 'desc' }, { column: 'a.ctr', order: 'desc' }, { column: 'a.updated_at', order: 'desc' }])
      .limit(5);

    if (scope.ownerId) {
      query.andWhere('a.created_by', scope.ownerId);
    }

    return query;
  }

  static async fetchScamReports(start, end) {
    return db('scam_reports as r')
      .select([
        'r.reason',
        'r.risk_score as riskScore',
        'r.status',
        'r.created_at as createdAt'
      ])
      .whereIn('r.status', ['pending', 'investigating'])
      .andWhere('r.created_at', '>=', toIso(start))
      .andWhere('r.created_at', '<=', toIso(end))
      .orderBy('r.risk_score', 'desc')
      .limit(50);
  }

  static buildProjectAnalytics(projects, collaboratorRows, sessionSummary) {
    const statusTotals = {
      total: 0,
      draft: 0,
      ready_for_review: 0,
      in_review: 0,
      changes_requested: 0,
      approved: 0,
      published: 0,
      archived: 0
    };

    const reviewDurations = [];
    const publishDurations = [];
    let lastPublishedAt = null;

    const collaboratorMap = new Map();
    for (const row of collaboratorRows ?? []) {
      const count = collaboratorMap.get(row.projectId) ?? 0;
      collaboratorMap.set(row.projectId, count + 1);
    }

    const projectsForRanking = [];

    for (const project of projects ?? []) {
      statusTotals.total += 1;
      if (statusTotals[project.status] !== undefined) {
        statusTotals[project.status] += 1;
      }

      const reviewHours = hoursBetween(project.reviewRequestedAt, project.approvedAt);
      if (reviewHours !== null) {
        reviewDurations.push(reviewHours);
      }

      const publishHours = hoursBetween(project.createdAt, project.publishedAt);
      if (publishHours !== null) {
        publishDurations.push(publishHours);
      }

      if (project.publishedAt) {
        const publishedDate = new Date(project.publishedAt);
        if (!lastPublishedAt || publishedDate > lastPublishedAt) {
          lastPublishedAt = publishedDate;
        }
      }

      const metadata = parseJson(project.metadata, {});
      const analytics = metadata.analytics ?? metadata.metrics ?? {};
      const funnel = metadata.funnel ?? metadata.sales ?? {};
      const performance = metadata.performance ?? {};
      const revenue = metadata.revenue ?? {};

      const views = normaliseNumber(analytics.views ?? analytics.impressions ?? analytics.reach ?? funnel.views ?? 0, 0);
      const completions = normaliseNumber(
        analytics.completions ?? analytics.completed ?? performance.completions ?? funnel.completions ?? 0,
        0
      );
      const conversions = normaliseNumber(
        analytics.conversions ?? funnel.enrolments ?? funnel.enrollments ?? funnel.signups ?? performance.conversions ?? 0,
        0
      );
      const watchMinutes = normaliseNumber(analytics.watchTimeMinutes ?? performance.watchMinutes ?? 0, 0);
      const revenueCents = normaliseNumber(
        revenue.totalCents ?? revenue.grossCents ?? revenue.netCents ?? revenue.monthlyCents ?? 0,
        0
      );

      projectsForRanking.push({
        id: project.publicId ?? String(project.id),
        title: project.title,
        type: project.type,
        status: project.status,
        views,
        completions,
        conversions,
        watchMinutes,
        revenueCents,
        reviewLatencyHours: reviewHours,
        collaboratorCount: collaboratorMap.get(project.id) ?? 0,
        updatedAt: project.updatedAt
      });
    }

    const avgReview = reviewDurations.length
      ? reviewDurations.reduce((total, value) => total + value, 0) / reviewDurations.length
      : 0;
    const avgLaunch = publishDurations.length
      ? publishDurations.reduce((total, value) => total + value, 0) / publishDurations.length
      : 0;
    const fastestLaunch = publishDurations.length ? Math.min(...publishDurations) : 0;
    const collaboratorCount = collaboratorRows?.length ?? 0;
    const totalProjects = statusTotals.total || 1;

    const projectMetrics = {
      totals: {
        total: statusTotals.total,
        drafts: statusTotals.draft,
        awaitingReview: statusTotals.ready_for_review,
        inReview: statusTotals.in_review,
        changesRequested: statusTotals.changes_requested,
        approved: statusTotals.approved,
        published: statusTotals.published,
        archived: statusTotals.archived
      },
      velocity: {
        averageReviewHours: round(avgReview || 0, 1),
        averageLaunchHours: round(avgLaunch || 0, 1),
        fastestLaunchHours: round(fastestLaunch || 0, 1),
        lastPublishedAt: lastPublishedAt ? lastPublishedAt.toISOString() : null
      },
      collaboration: {
        collaborators: collaboratorCount,
        averageCollaboratorsPerProject: round(collaboratorCount / totalProjects, 2),
        activeSessions: sessionSummary.activeSessions,
        totalSessions: sessionSummary.totalSessions,
        averageSessionMinutes: round(sessionSummary.averageDurationMinutes || 0, 1)
      },
      reviewBacklog: {
        total: REVIEW_STATUSES.has('ready_for_review')
          ? statusTotals.ready_for_review + statusTotals.in_review + statusTotals.changes_requested
          : 0,
        awaitingReview: statusTotals.ready_for_review,
        inReview: statusTotals.in_review,
        changesRequested: statusTotals.changes_requested
      }
    };

    return { projectMetrics, projectsForRanking };
  }

  static buildEngagementAnalytics(projects) {
    let totalViews = 0;
    let totalCompletions = 0;
    let totalConversions = 0;
    let totalWatchMinutes = 0;
    let totalRevenueCents = 0;
    let totalSubscribers = 0;

    const audiences = new Set();
    const markets = new Set();
    const goals = new Set();

    for (const project of projects ?? []) {
      const metadata = parseJson(project.metadata, {});
      const analytics = metadata.analytics ?? metadata.metrics ?? {};
      const funnel = metadata.funnel ?? metadata.sales ?? {};
      const revenue = metadata.revenue ?? {};
      const community = metadata.community ?? {};

      totalViews += normaliseNumber(analytics.views ?? analytics.impressions ?? funnel.views ?? 0, 0);
      totalCompletions += normaliseNumber(analytics.completions ?? analytics.completed ?? funnel.completions ?? 0, 0);
      totalConversions += normaliseNumber(
        analytics.conversions ?? funnel.enrolments ?? funnel.enrollments ?? funnel.signups ?? 0,
        0
      );
      totalWatchMinutes += normaliseNumber(analytics.watchTimeMinutes ?? analytics.watch_minutes ?? 0, 0);
      totalRevenueCents += normaliseNumber(
        revenue.totalCents ?? revenue.grossCents ?? revenue.netCents ?? revenue.monthlyCents ?? 0,
        0
      );
      totalSubscribers += normaliseNumber(community.subscribers ?? analytics.subscribers ?? 0, 0);

      const analyticsTargets = parseJson(project.analyticsTargets, {});
      for (const audience of analyticsTargets.audiences ?? []) {
        if (audience) audiences.add(audience);
      }
      for (const market of analyticsTargets.markets ?? []) {
        if (market) markets.add(market);
      }
      for (const goal of analyticsTargets.goals ?? []) {
        if (goal) goals.add(goal);
      }
    }

    const averageCompletionRate = totalViews > 0 ? totalCompletions / totalViews : 0;
    const averageConversionRate = totalViews > 0 ? totalConversions / totalViews : 0;

    return {
      totals: {
        views: totalViews,
        completions: totalCompletions,
        conversions: totalConversions,
        watchTimeMinutes: totalWatchMinutes,
        revenueCents: totalRevenueCents,
        subscribers: totalSubscribers
      },
      rates: {
        completionRate: round(averageCompletionRate * 100, 2),
        conversionRate: round(averageConversionRate * 100, 2)
      },
      perProjectAverages: {
        watchTimeMinutes: round(totalWatchMinutes / (projects?.length || 1), 1),
        revenueCents: round(totalRevenueCents / (projects?.length || 1), 2)
      },
      audienceTargets: {
        audiences: Array.from(audiences),
        markets: Array.from(markets),
        goals: Array.from(goals)
      }
    };
  }

  static buildRankingInsights(projectsForRanking = []) {
    const scored = projectsForRanking
      .map((project) => {
        const completionRate = project.views > 0 ? project.completions / project.views : 0;
        const conversionRate = project.views > 0 ? project.conversions / project.views : 0;
        const score = computeRankingScore({
          views: project.views,
          completions: project.completions,
          conversions: project.conversions,
          watchMinutes: project.watchMinutes,
          revenueCents: project.revenueCents,
          reviewLatencyHours: project.reviewLatencyHours
        });
        return {
          ...project,
          completionRate,
          conversionRate,
          score,
          driver: computeRankingDriver({
            completionRate,
            conversionRate,
            revenueCents: project.revenueCents,
            watchMinutes: project.watchMinutes
          })
        };
      })
      .filter((project) => project.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored.map((project, index) => ({
      rank: index + 1,
      context: project.type,
      entityId: project.id,
      entityName: project.title,
      score: project.score,
      completionRate: round(project.completionRate * 100, 2),
      conversionRate: round(project.conversionRate * 100, 2),
      revenueCents: project.revenueCents,
      driver: project.driver,
      collaboratorCount: project.collaboratorCount,
      updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null
    }));
  }

  static buildScamAlert(rows = [], start, end) {
    if (!rows.length) {
      return {
        state: 'clear',
        openReports: 0,
        highRiskCount: 0,
        lastReportAt: null,
        topReasons: [],
        guidance:
          'No active scam investigations for the selected window. Continue to monitor submissions and refresh the playbook as campaigns go live.',
        windowStart: start.toISOString(),
        windowEnd: end.toISOString()
      };
    }

    const highRisk = rows.filter((row) => normaliseNumber(row.riskScore) >= 70);
    const state = highRisk.length
      ? 'critical'
      : rows.some((row) => normaliseNumber(row.riskScore) >= 40)
      ? 'elevated'
      : 'watch';

    const reasonCounts = new Map();
    for (const row of rows) {
      const key = row.reason ?? 'Uncategorised';
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }

    const topReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const lastReportAt = rows
      .map((row) => new Date(row.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const guidance = state === 'critical'
      ? 'High-risk scam reports detected. Pause affected campaigns and trigger the trust & safety runbook.'
      : state === 'elevated'
      ? 'Investigations are in progress. Review flagged assets and confirm mitigation owners.'
      : 'Low risk detected. Keep the moderation queue triaged to maintain response SLAs.';

    return {
      state,
      openReports: rows.length,
      highRiskCount: highRisk.length,
      lastReportAt: lastReportAt ? lastReportAt.toISOString() : null,
      topReasons,
      guidance,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString()
    };
  }
}

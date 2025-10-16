import db from '../config/database.js';
import logger from '../config/logger.js';

import CreationRecommendationLogModel from '../models/CreationRecommendationLogModel.js';
import { featureFlagService } from './FeatureFlagService.js';

const log = logger.child({ service: 'CreationRecommendationService' });

const ALGORITHM_VERSION = '2025.02-recommendations.1';
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

const STATUS_BASE_WEIGHTS = {
  ready_for_review: 60,
  in_review: 55,
  changes_requested: 50,
  approved: 45,
  draft: 30,
  published: 20
};

const ACTION_PRIORITIES = {
  expedite_review: 'high',
  resolve_feedback: 'high',
  schedule_launch: 'high',
  revive_draft: 'medium',
  optimise_campaign: 'medium',
  launch_campaign: 'high',
  enrich_metadata: 'low'
};

function normaliseTenantId(tenantId) {
  if (!tenantId) {
    return 'global';
  }
  return String(tenantId).trim() || 'global';
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch (error) {
      log.warn({ err: error }, 'Failed to parse JSON payload for recommendations');
      return fallback;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return fallback;
}

function daysBetween(now, value) {
  if (!value) {
    return null;
  }
  const target = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const diffMs = now.getTime() - target.getTime();
  return diffMs <= 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureActor(actor) {
  if (!actor || !actor.role) {
    const error = new Error('Unauthorised recommendation request');
    error.status = 401;
    throw error;
  }
  if (!['admin', 'staff', 'instructor'].includes(actor.role)) {
    const error = new Error('You do not have permission to access recommendations');
    error.status = 403;
    throw error;
  }
}

function resolveScope(actor, ownerId) {
  if ((actor.role === 'admin' || actor.role === 'staff') && ownerId) {
    return { ownerId };
  }
  return { ownerId: actor.id };
}

function computeAction(project, context) {
  const { now, campaigns } = context;
  const components = [];
  let action = null;
  let score = STATUS_BASE_WEIGHTS[project.status] ?? 0;

  const daysSinceUpdate = daysBetween(now, project.updatedAt);
  if (daysSinceUpdate && daysSinceUpdate > 30) {
    const penalty = clamp((daysSinceUpdate - 30) * 1.2, 5, 25);
    score -= penalty;
    components.push({
      code: 'stale_project',
      weight: -penalty,
      detail: { daysSinceUpdate }
    });
  }

  if (project.status === 'ready_for_review') {
    const waitingDays = daysBetween(now, project.reviewRequestedAt ?? project.updatedAt) ?? 0;
    const weight = clamp(20 + waitingDays * 4, 20, 40);
    score += weight;
    components.push({
      code: 'awaiting_review',
      weight,
      detail: { waitingDays }
    });
    action = {
      code: 'expedite_review',
      label: 'Complete review and approval',
      instructions: `Review feedback and approve "${project.title}" to keep the publishing pipeline unblocked.`,
      priority: ACTION_PRIORITIES.expedite_review
    };
  } else if (project.status === 'changes_requested') {
    const waitingDays = daysBetween(now, project.reviewRequestedAt ?? project.updatedAt) ?? 0;
    const weight = clamp(25 + waitingDays * 3, 25, 45);
    score += weight;
    components.push({
      code: 'changes_requested',
      weight,
      detail: { waitingDays }
    });
    action = {
      code: 'resolve_feedback',
      label: 'Address review feedback',
      instructions: `Update "${project.title}" with the requested changes and resubmit for approval.`,
      priority: ACTION_PRIORITIES.resolve_feedback
    };
  } else if (project.status === 'approved' && !project.publishedAt) {
    const waitingDays = daysBetween(now, project.approvedAt ?? project.updatedAt) ?? 0;
    const weight = clamp(22 + waitingDays * 3, 22, 40);
    score += weight;
    components.push({
      code: 'ready_to_launch',
      weight,
      detail: { waitingDays }
    });
    action = {
      code: 'schedule_launch',
      label: 'Schedule publishing',
      instructions: `Set a publish date and distribution channels for "${project.title}" to capture demand.`,
      priority: ACTION_PRIORITIES.schedule_launch
    };
  } else if (project.status === 'draft') {
    if (daysSinceUpdate && daysSinceUpdate >= 14) {
      const weight = clamp(18 + (daysSinceUpdate - 10) * 2, 10, 32);
      score += weight;
      components.push({
        code: 'stalled_draft',
        weight,
        detail: { daysSinceUpdate }
      });
      action = {
        code: 'revive_draft',
        label: 'Resume draft progress',
        instructions: `Revisit "${project.title}" to keep the outline moving toward review.`,
        priority: ACTION_PRIORITIES.revive_draft
      };
    } else {
      components.push({
        code: 'draft_progressing',
        weight: 10,
        detail: { daysSinceUpdate }
      });
      score += 10;
    }
  } else if (project.status === 'published') {
    const relatedCampaigns = campaigns.get(project.publicId) ?? [];
    if (relatedCampaigns.length === 0) {
      const weight = 35;
      score += weight;
      components.push({
        code: 'no_campaign',
        weight,
        detail: {}
      });
      action = {
        code: 'launch_campaign',
        label: 'Launch a marketing campaign',
        instructions: `Promote "${project.title}" with a campaign targeted at ${
          project.analyticsTargets?.audiences?.[0] ?? 'your primary audience'
        }.`,
        priority: ACTION_PRIORITIES.launch_campaign
      };
    } else {
      const underperforming = relatedCampaigns.find((campaign) => Number(campaign.performanceScore ?? 0) < 0.4);
      if (underperforming) {
        const weight = clamp(18 + (0.4 - Number(underperforming.performanceScore ?? 0)) * 40, 18, 40);
        score += weight;
        components.push({
          code: 'campaign_underperforming',
          weight,
          detail: {
            campaignId: underperforming.publicId,
            performanceScore: Number(underperforming.performanceScore ?? 0)
          }
        });
        action = {
          code: 'optimise_campaign',
          label: 'Optimise active campaign',
          instructions: `Refresh creatives or targeting for campaign "${underperforming.name}" promoting "${project.title}".`,
          priority: ACTION_PRIORITIES.optimise_campaign
        };
      } else {
        components.push({
          code: 'campaign_healthy',
          weight: 12,
          detail: {}
        });
        score += 12;
      }
    }
  }

  if (!action && (project.metadata?.landingPage ?? '').length === 0) {
    const weight = 12;
    score += weight;
    components.push({
      code: 'metadata_gap',
      weight,
      detail: { missing: ['landingPage'] }
    });
    action = {
      code: 'enrich_metadata',
      label: 'Add distribution metadata',
      instructions: `Provide a landing page or distribution link for "${project.title}" to unlock campaign automation.`,
      priority: ACTION_PRIORITIES.enrich_metadata
    };
  }

  return { action, score, components };
}

export default class CreationRecommendationService {
  static async fetchProjectSummaries(scope, connection = db) {
    const query = connection('creation_projects as p')
      .select([
        'p.id as id',
        'p.public_id as publicId',
        'p.owner_id as ownerId',
        'p.type as type',
        'p.status as status',
        'p.title as title',
        'p.metadata as metadata',
        'p.analytics_targets as analyticsTargets',
        'p.review_requested_at as reviewRequestedAt',
        'p.approved_at as approvedAt',
        'p.published_at as publishedAt',
        'p.updated_at as updatedAt'
      ])
      .select(connection.raw("SUM(CASE WHEN c.removed_at IS NULL THEN 1 ELSE 0 END) as collaboratorCount"))
      .leftJoin('creation_project_collaborators as c', 'c.project_id', 'p.id')
      .groupBy('p.id');

    if (scope.ownerId) {
      query.where('p.owner_id', scope.ownerId);
    }

    const rows = await query;
    return rows.map((row) => ({
      id: row.id,
      publicId: row.publicId,
      ownerId: row.ownerId,
      type: row.type,
      status: row.status,
      title: row.title,
      metadata: parseJson(row.metadata, {}),
      analyticsTargets: parseJson(row.analyticsTargets, {}),
      reviewRequestedAt: row.reviewRequestedAt,
      approvedAt: row.approvedAt,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      collaboratorCount: Number(row.collaboratorCount ?? 0)
    }));
  }

  static async fetchCampaignSummaries(connection = db) {
    const rows = await connection('ads_campaigns')
      .select([
        'public_id as publicId',
        'name',
        'status',
        'performance_score as performanceScore',
        'metadata',
        'updated_at as updatedAt'
      ])
      .whereNotNull(connection.raw("JSON_EXTRACT(metadata, '$.sourceProjectId')"));

    const map = new Map();
    for (const row of rows) {
      const metadata = parseJson(row.metadata, {});
      const projectId = metadata.sourceProjectId ?? metadata.source_project_id;
      if (!projectId) {
        continue;
      }
      const list = map.get(projectId) ?? [];
      list.push({
        publicId: row.publicId,
        name: row.name,
        status: row.status,
        performanceScore: row.performanceScore,
        updatedAt: row.updatedAt
      });
      map.set(projectId, list);
    }
    return map;
  }

  static async generate(actor, options = {}) {
    ensureActor(actor);

    const limit = clamp(Number(options.limit ?? DEFAULT_LIMIT), 1, MAX_LIMIT);
    const includeHistory = options.includeHistory === true || options.includeHistory === 'true';
    const tenantId = normaliseTenantId(options.tenantId ?? actor.tenantId ?? options.headersTenantId);
    const scope = resolveScope(actor, options.ownerId ? Number(options.ownerId) : undefined);

    const evaluation = featureFlagService.evaluate('creation.recommendations', {
      userId: actor.id,
      role: actor.role,
      tenantId,
      environment: options.environment
    });

    if (!evaluation.enabled) {
      log.info({ actorId: actor.id, tenantId, reason: evaluation.reason }, 'Recommendation flag disabled');
      const logEntry = await CreationRecommendationLogModel.record({
        tenantId,
        userId: actor.id,
        recommendationType: 'creation-studio',
        algorithmVersion: ALGORITHM_VERSION,
        featureFlagKey: evaluation.key,
        featureFlagState: evaluation.reason ?? 'disabled',
        featureFlagVariant: evaluation.variant ?? null,
        context: { scope, limit, includeHistory },
        results: [],
        explainability: [
          {
            summary: 'Feature flag disabled',
            detail: evaluation.reason ?? 'creation.recommendations disabled'
          }
        ],
        generatedAt: new Date().toISOString(),
        expiresAt: null
      });

      return {
        recommendations: [],
        evaluation,
        meta: {
          algorithmVersion: ALGORITHM_VERSION,
          generatedAt: logEntry?.generatedAt ?? new Date().toISOString(),
          tenantId,
          history: includeHistory ? [logEntry].filter(Boolean) : []
        }
      };
    }

    const now = new Date();
    const [projects, campaigns] = await Promise.all([
      this.fetchProjectSummaries(scope),
      this.fetchCampaignSummaries()
    ]);

    const explainability = [];
    const recommendations = [];

    for (const project of projects) {
      const { action, score, components } = computeAction(project, { now, campaigns });
      if (!action || score <= 0) {
        explainability.push({
          projectId: project.publicId,
          projectTitle: project.title,
          discarded: true,
          components
        });
        continue;
      }

      recommendations.push({
        projectId: project.id,
        projectPublicId: project.publicId,
        projectTitle: project.title,
        projectType: project.type,
        collaboratorCount: project.collaboratorCount,
        priority: action.priority,
        action: {
          code: action.code,
          label: action.label,
          instructions: action.instructions
        },
        score: Number(score.toFixed(2)),
        recommendedAt: now.toISOString(),
        signals: components
      });

      explainability.push({
        projectId: project.publicId,
        projectTitle: project.title,
        components,
        score: Number(score.toFixed(2)),
        action: action.code
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    const topRecommendations = recommendations.slice(0, limit);

    const logEntry = await CreationRecommendationLogModel.record({
      tenantId,
      userId: actor.id,
      recommendationType: 'creation-studio',
      algorithmVersion: ALGORITHM_VERSION,
      featureFlagKey: evaluation.key,
      featureFlagState: 'enabled',
      featureFlagVariant: evaluation.variant ?? null,
      context: { scope, limit, includeHistory },
      results: topRecommendations,
      explainability,
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7)
    });

    let history = [];
    if (includeHistory) {
      history = await CreationRecommendationLogModel.listRecent({
        tenantId,
        userId: actor.id,
        recommendationType: 'creation-studio',
        limit: 5
      });
      history = history.map((entry) => ({
        id: entry.id,
        generatedAt: entry.generatedAt,
        algorithmVersion: entry.algorithmVersion,
        tenantId: entry.tenantId,
        featureFlagState: entry.featureFlagState,
        featureFlagVariant: entry.featureFlagVariant,
        recommendationCount: Array.isArray(entry.results) ? entry.results.length : 0,
        context: entry.context
      }));
    }

    return {
      recommendations: topRecommendations,
      evaluation,
      meta: {
        algorithmVersion: ALGORITHM_VERSION,
        generatedAt: logEntry?.generatedAt ?? now.toISOString(),
        tenantId,
        totalProjectsEvaluated: projects.length,
        history
      }
    };
  }
}

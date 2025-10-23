import Joi from 'joi';

import AuditEventService from '../services/AuditEventService.js';
import ContentAuditLogModel from '../models/ContentAuditLogModel.js';
import SocialAuditLogModel from '../models/SocialAuditLogModel.js';
import KycAuditLogModel from '../models/KycAuditLogModel.js';
import GovernanceContractModel from '../models/GovernanceContractModel.js';
import ReleaseOrchestrationService from '../services/ReleaseOrchestrationService.js';
import { featureFlagGovernanceService } from '../services/FeatureFlagGovernanceService.js';
import { success } from '../utils/httpResponse.js';

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
  severity: Joi.string().valid('info', 'notice', 'warning', 'error', 'critical').optional(),
  since: Joi.date().iso().optional(),
  tenantId: Joi.string().trim().allow(null, '').optional()
});

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toTimelineEntry(source, payload) {
  if (!payload) {
    return null;
  }

  return {
    id: payload.id ?? payload.eventUuid ?? `${source}-${payload.assetId ?? payload.verificationId ?? payload.id}`,
    source,
    severity: (payload.severity ?? payload.event?.severity ?? 'info').toLowerCase(),
    occurredAt:
      payload.occurredAt ??
      payload.createdAt ??
      payload.created_at ??
      payload.metadata?.occurredAt ??
      null,
    title:
      payload.title ??
      payload.eventType ??
      payload.event ??
      payload.action ??
      `activity.${source}`,
    summary:
      payload.summary ??
      payload.description ??
      payload.notes ??
      payload.metadata?.summary ??
      payload.payload?.summary ??
      null,
    entity: {
      type:
        payload.entityType ??
        (payload.assetId ? 'asset' : null) ??
        (payload.verificationId ? 'verification' : null) ??
        (payload.userId ? 'user' : null),
      id: payload.entityId ?? payload.assetId ?? payload.verificationId ?? payload.userId ?? null
    },
    metadata: payload.metadata ?? payload.payload ?? {},
    actor: payload.actor ?? {
      id: payload.performedBy ?? payload.actorId ?? null,
      email: payload.actorEmail ?? null,
      name:
        payload.actorFirstName || payload.actorLastName
          ? `${payload.actorFirstName ?? ''} ${payload.actorLastName ?? ''}`.trim() || null
          : null
    }
  };
}

function calculateReleaseReadiness(checklistResult) {
  const items = Array.isArray(checklistResult?.items) ? checklistResult.items : [];
  if (!items.length) {
    return {
      score: 0,
      totalItems: 0,
      autoEvaluated: 0,
      nextGate: null,
      requiredGates: checklistResult?.requiredGates ?? []
    };
  }

  let totalWeight = 0;
  let autoWeight = 0;
  let nextGate = null;

  for (const item of items) {
    const weight = Number.parseInt(item.weight ?? 1, 10) || 1;
    totalWeight += weight;
    if (item.autoEvaluated) {
      autoWeight += weight;
    } else if (!nextGate) {
      nextGate = { slug: item.slug, title: item.title };
    }
  }

  const score = totalWeight === 0 ? 0 : Math.round((autoWeight / totalWeight) * 100);

  return {
    score,
    totalItems: items.length,
    autoEvaluated: items.filter((item) => item.autoEvaluated).length,
    requiredGates: checklistResult?.requiredGates ?? [],
    nextGate
  };
}

export default class AuditLogController {
  static async listUnified(req, res, next) {
    try {
      const params = await querySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const tenantId = params.tenantId || req.user?.tenantId || 'global';
      const auditService = new AuditEventService();

      const [summary, contentLogs, socialLogs, kycLogs, governanceContracts, releaseChecklist, featureFlagSnapshot] =
        await Promise.all([
          auditService.summariseRecent({
            tenantId,
            since: normaliseDate(params.since) ?? undefined,
            limit: params.limit,
            severityFloor: params.severity
          }),
          ContentAuditLogModel.listRecent({ limit: params.limit }),
          SocialAuditLogModel.listRecent({ limit: params.limit }),
          KycAuditLogModel.listRecent({ limit: params.limit }),
          GovernanceContractModel.listUpcomingReviews({ limit: 6 }),
          new ReleaseOrchestrationService().listChecklist({}, { limit: 200 }),
          featureFlagGovernanceService.generateTenantSnapshot({
            tenantId,
            environment: req.user?.environment ?? 'production',
            includeInactive: true,
            userContext: {
              userId: req.user?.id ?? null,
              role: req.user?.role ?? null,
              attributes: { source: 'admin-api' }
            }
          })
        ]);

      const timeline = [
        ...summary.latestEvents.map((event) =>
          toTimelineEntry('compliance', {
            ...event,
            title: event.eventType,
            summary: event.metadata?.summary ?? event.payload?.summary ?? null
          })
        ),
        ...contentLogs.map((log) =>
          toTimelineEntry('content', {
            ...log,
            severity: log.payload?.severity ?? 'notice',
            summary: log.payload?.message ?? log.payload?.summary ?? null
          })
        ),
        ...socialLogs.map((log) =>
          toTimelineEntry('social', {
            ...log,
            summary: log.metadata?.reason ?? log.metadata?.summary ?? null,
            severity: log.metadata?.severity ?? 'info'
          })
        ),
        ...kycLogs.map((log) =>
          toTimelineEntry('kyc', {
            ...log,
            summary: log.notes ?? log.metadata?.summary ?? null,
            severity: log.metadata?.severity ?? 'warning'
          })
        )
      ]
        .filter(Boolean)
        .sort((a, b) => {
          const left = normaliseDate(b.occurredAt)?.getTime() ?? 0;
          const right = normaliseDate(a.occurredAt)?.getTime() ?? 0;
          return left - right;
        })
        .slice(0, params.limit);

      const readiness = calculateReleaseReadiness(releaseChecklist);

      const analytics = {
        totals: summary.totals,
        countsBySeverity: summary.countsBySeverity,
        sources: {
          compliance: summary.latestEvents.length,
          content: contentLogs.length,
          social: socialLogs.length,
          identity: kycLogs.length
        },
        lastEventAt: summary.lastEventAt
      };

      const featureFlags = {
        summary: featureFlagSnapshot.summary,
        generatedAt: featureFlagSnapshot.generatedAt,
        flags: featureFlagSnapshot.flags.slice(0, 12)
      };

      return success(res, {
        data: {
          tenantId,
          analytics,
          timeline,
          compliance: {
            contracts: governanceContracts
          },
          release: {
            readiness,
            checklist: releaseChecklist.items
          },
          featureFlags
        },
        message: 'Unified audit log generated'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}


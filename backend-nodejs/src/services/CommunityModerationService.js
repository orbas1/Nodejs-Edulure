import db from '../config/database.js';
import logger from '../config/logger.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityPostModel from '../models/CommunityPostModel.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import CommunityPostModerationActionModel from '../models/CommunityPostModerationActionModel.js';
import ModerationAnalyticsEventModel from '../models/ModerationAnalyticsEventModel.js';
import ScamReportModel from '../models/ScamReportModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import GovernanceContractModel from '../models/GovernanceContractModel.js';
import ModerationFollowUpModel from '../models/ModerationFollowUpModel.js';

const log = logger.child({ service: 'CommunityModerationService' });
const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);

function parseJsonColumn(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function clampRiskScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveSeverity(riskScore) {
  if (riskScore >= 80) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 35) return 'medium';
  return 'low';
}

function appendLimited(existing = [], additions = [], limit = 50) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const nextItems = Array.isArray(additions) ? additions : [additions];
  for (const item of nextItems) {
    if (item) {
      list.push(item);
    }
  }
  if (list.length > limit) {
    return list.slice(list.length - limit);
  }
  return list;
}

function mergeModerationMetadata(currentMetadata = {}, additions = {}) {
  const metadata = { ...currentMetadata };
  if (additions.flags) {
    metadata.flags = appendLimited(metadata.flags, additions.flags, 50);
  }
  if (additions.riskHistory) {
    metadata.riskHistory = appendLimited(metadata.riskHistory, additions.riskHistory, 100);
  }
  if (additions.notes) {
    metadata.notes = appendLimited(metadata.notes, additions.notes, 100);
  }
  if (additions.summary) {
    metadata.summary = additions.summary;
  }
  return metadata;
}

function nowIso() {
  return new Date().toISOString();
}

function cloneJson(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return fallback ?? value;
  }
}

function snapshotCaseState(moderationCase) {
  if (!moderationCase) {
    return null;
  }
  return {
    status: moderationCase.status,
    severity: moderationCase.severity,
    riskScore: moderationCase.riskScore ?? 0,
    assignedTo: moderationCase.assignedTo ?? null,
    escalatedAt: moderationCase.escalatedAt ?? null,
    resolvedAt: moderationCase.resolvedAt ?? null,
    resolvedBy: moderationCase.resolvedBy ?? null,
    metadata: cloneJson(moderationCase.metadata ?? {}, {})
  };
}

function snapshotPostState(post) {
  if (!post) {
    return null;
  }
  return {
    moderationState: post.moderationState,
    status: post.status,
    lastModeratedAt: post.lastModeratedAt ?? null,
    moderationMetadata: cloneJson(post.moderationMetadata ?? {}, {}),
    metadata: cloneJson(post.metadata ?? {}, {})
  };
}

function deriveAiSuggestions(moderationCase, post) {
  if (!moderationCase) {
    return [];
  }

  const suggestions = [];
  const severity = moderationCase.severity ?? 'low';
  const status = moderationCase.status ?? 'pending';
  const flags = Array.isArray(moderationCase.metadata?.flags)
    ? moderationCase.metadata.flags
    : [];
  const latestFlag = flags.length ? flags[flags.length - 1] : null;

  if (severity === 'critical' || moderationCase.flaggedSource === 'automated_detection') {
    suggestions.push({
      type: 'escalate',
      message: 'Escalate to security operations and freeze member access until the incident is resolved.'
    });
  }

  if (status === 'pending') {
    suggestions.push({
      type: 'assign',
      message: 'Assign this case to an available moderator to unblock review velocity.'
    });
  }

  if (post?.metadata?.attachments?.length || post?.moderationMetadata?.attachments?.length) {
    suggestions.push({
      type: 'media_review',
      message:
        'Open the resilient media viewer to review attachments with fallback rendering in case previews fail.'
    });
  }

  if (latestFlag?.tags?.includes('policy:ads')) {
    suggestions.push({
      type: 'policy_reference',
      message: 'Reference the advertising disclosure policy to confirm sponsored content labelling.'
    });
  }

  return suggestions;
}

function normaliseTagList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).toLowerCase()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

async function fetchPolicyLibrary(connection = db) {
  const rows = await GovernanceContractModel.buildBaseQuery(connection)
    .whereIn('contract_type', ['policy', 'code_of_conduct', 'guideline'])
    .whereIn('status', ['active', 'draft'])
    .orderBy('risk_tier', 'desc')
    .limit(25);

  return rows.map((row) => GovernanceContractModel.deserialize(row));
}

function computePolicyRelevance({ metadata = {}, summary, riskTier }, { tags, reason, severity }) {
  let score = 0;
  const snippetTags = normaliseTagList(metadata?.tags ?? []);

  if (snippetTags.length && tags.some((tag) => snippetTags.includes(tag))) {
    score += 3;
  }

  if (reason && (summary ?? '').toLowerCase().includes(reason)) {
    score += 1.5;
  }

  if (severity === 'critical' && riskTier === 'high') {
    score += 1;
  }

  return score;
}

function buildPolicySnippetsForCase(library, moderationCase, limit = 3) {
  if (!Array.isArray(library) || !moderationCase) {
    return [];
  }

  const tags = normaliseTagList(
    moderationCase.metadata?.policyTags ?? moderationCase.metadata?.tags ?? []
  );
  const reason = (moderationCase.reason ?? '').toLowerCase();
  const severity = moderationCase.severity ?? 'low';

  const ranked = library
    .map((contract) => {
      const summary =
        contract.metadata?.summary ??
        (Array.isArray(contract.obligations) && contract.obligations.length
          ? contract.obligations[0]?.summary ?? null
          : null);

      return {
        id: contract.publicId,
        title:
          contract.metadata?.title ??
          contract.vendorName ??
          contract.contractType ??
          'Policy reference',
        summary,
        url: contract.metadata?.policyUrl ?? contract.metadata?.url ?? null,
        riskTier: contract.riskTier ?? 'medium',
        metadata: contract.metadata ?? {},
        relevance: computePolicyRelevance(
          { metadata: contract.metadata ?? {}, summary, riskTier: contract.riskTier ?? 'medium' },
          { tags, reason, severity }
        )
      };
    })
    .filter((entry) => Boolean(entry.title))
    .sort((a, b) => {
      if (b.relevance === a.relevance) {
        return (b.riskTier ?? '').localeCompare(a.riskTier ?? '');
      }
      return b.relevance - a.relevance;
    })
    .slice(0, limit)
    .map(({ metadata, relevance, ...snippet }) => ({ ...snippet }));

  return ranked;
}

function resolveFollowUpRequest({ action, payload = {}, actor, updatedCase, now }) {
  const explicitMinutes = (() => {
    if (payload.followUpInMinutes !== undefined) {
      return Number(payload.followUpInMinutes);
    }
    if (payload.followUpInHours !== undefined) {
      return Number(payload.followUpInHours) * 60;
    }
    if (payload.followUpInDays !== undefined) {
      return Number(payload.followUpInDays) * 1440;
    }
    return null;
  })();

  const defaults = {
    escalate: 360,
    suppress: 1440,
    reject: 720
  };

  const minutes = Number.isFinite(explicitMinutes) ? explicitMinutes : defaults[action] ?? null;

  let dueAt = null;
  if (payload.followUpAt) {
    const parsed = new Date(payload.followUpAt);
    if (!Number.isNaN(parsed.getTime())) {
      dueAt = parsed;
    }
  }

  if (!dueAt && Number.isFinite(minutes) && minutes > 0) {
    dueAt = new Date(now.getTime() + minutes * 60 * 1000);
  }

  if (!dueAt) {
    return null;
  }

  const metadata = {
    reason: payload.followUpReason ?? `Review ${action} outcome`,
    requestedBy: actor.id,
    createdAt: now.toISOString(),
    action
  };

  return {
    dueAt,
    metadata,
    assignedTo: payload.followUpAssignee ?? updatedCase.assignedTo ?? actor.id ?? null
  };
}

function ensureActionAllowed(action) {
  const allowed = new Set([
    'assign',
    'escalate',
    'approve',
    'reject',
    'suppress',
    'restore',
    'comment'
  ]);
  if (!allowed.has(action)) {
    const error = new Error('Unsupported moderation action');
    error.status = 422;
    throw error;
  }
}

async function ensureCommunityMembership(communityId, actor, connection) {
  if (!actor?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  if (actor.role === 'admin') {
    return { role: 'admin', status: 'active' };
  }

  const membership = await CommunityMemberModel.findMembership(communityId, actor.id, connection);
  if (!membership || membership.status !== 'active') {
    const error = new Error('You do not have access to this community');
    error.status = 403;
    throw error;
  }
  return membership;
}

async function ensureModerator(communityId, actor, connection) {
  const membership = await ensureCommunityMembership(communityId, actor, connection);
  if (actor.role === 'admin' || MODERATOR_ROLES.has(membership.role)) {
    return membership;
  }
  const error = new Error('Only moderators can perform this action');
  error.status = 403;
  throw error;
}

function buildFlagMetadata({ actorId, reason, riskScore, flaggedSource, evidence, tags }) {
  return {
    actorId,
    reason,
    riskScore,
    flaggedSource,
    evidence: Array.isArray(evidence) ? evidence : [],
    tags: Array.isArray(tags) ? tags : [],
    flaggedAt: nowIso()
  };
}

export default class CommunityModerationService {
  static async flagPostForReview({ actor, communityId, payload }) {
    return db.transaction(async (trx) => {
      const post = await CommunityPostModel.findById(payload.postId, trx);
      if (!post) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }
      if (Number(post.communityId) !== Number(communityId)) {
        const error = new Error('Post does not belong to this community');
        error.status = 400;
        throw error;
      }

      await ensureCommunityMembership(communityId, actor, trx);

      const riskScore = clampRiskScore(payload.riskScore ?? 0);
      const severity = deriveSeverity(riskScore);
      const flaggedSource = payload.flaggedSource ?? 'user_report';
      const existingMetadata = parseJsonColumn(post.moderationMetadata, {});

      const flagEntry = buildFlagMetadata({
        actorId: actor.id,
        reason: payload.reason,
        riskScore,
        flaggedSource,
        evidence: payload.evidence,
        tags: payload.tags
      });

      const moderationCase = await CommunityPostModerationCaseModel.findOpenByPost(post.id, trx);
      const caseMetadata = moderationCase?.metadata ?? {};
      const mergedCaseMetadata = mergeModerationMetadata(caseMetadata, {
        flags: [flagEntry],
        riskHistory: [{ riskScore, at: nowIso() }]
      });

      let persistedCase;
      if (moderationCase) {
        persistedCase = await CommunityPostModerationCaseModel.updateById(
          moderationCase.id,
          {
            riskScore: Math.max(riskScore, moderationCase.riskScore ?? 0),
            severity: deriveSeverity(Math.max(riskScore, moderationCase.riskScore ?? 0)),
            metadata: mergedCaseMetadata,
            status: moderationCase.status === 'approved' ? 'pending' : moderationCase.status,
            reporterId: moderationCase.reporterId ?? actor.id
          },
          trx
        );
      } else {
        persistedCase = await CommunityPostModerationCaseModel.create(
          {
            communityId: Number(communityId),
            postId: post.id,
            reporterId: actor.id,
            reason: payload.reason,
            riskScore,
            severity,
            flaggedSource,
            metadata: mergedCaseMetadata
          },
          trx
        );
      }

      const updatedMetadata = mergeModerationMetadata(existingMetadata, {
        flags: [flagEntry],
        riskHistory: [{ riskScore, at: flagEntry.flaggedAt }],
        notes: payload.notes ? [{ message: payload.notes, authorId: actor.id, createdAt: flagEntry.flaggedAt }] : []
      });

      const nextState = moderationCase ? 'under_review' : 'pending';

      const updatedPost = await CommunityPostModel.updateModerationState(
        post.id,
        {
          state: nextState,
          metadata: updatedMetadata,
          lastModeratedAt: flagEntry.flaggedAt
        },
        trx
      );

      await CommunityPostModerationActionModel.record(
        {
          caseId: persistedCase.id,
          actorId: actor.id,
          action: moderationCase ? 'updated' : 'flagged',
          notes: payload.reason,
          metadata: { riskScore, flaggedSource, evidence: flagEntry.evidence, tags: flagEntry.tags }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: post.id,
          eventType: 'community.post.flagged',
          payload: {
            communityId: Number(communityId),
            caseId: persistedCase.publicId,
            severity,
            riskScore,
            flaggedSource
          },
          performedBy: actor.id
        },
        trx
      );

      await ModerationAnalyticsEventModel.record(
        {
          communityId: Number(communityId),
          entityType: 'community_post',
          entityId: String(post.id),
          eventType: 'post_flagged',
          riskScore,
          metrics: {
            severity,
            flaggedSource,
            status: updatedPost.moderationState,
            tags: flagEntry.tags
          },
          source: flaggedSource,
          occurredAt: flagEntry.flaggedAt
        },
        trx
      );

      log.info(
        {
          communityId,
          postId: post.id,
          caseId: persistedCase.publicId,
          actorId: actor.id,
          severity,
          riskScore
        },
        'Post flagged for moderation review'
      );

      return {
        case: persistedCase,
        post: updatedPost
      };
    });
  }

  static async listCases(actor, filters = {}, pagination = {}) {
    if (actor.role !== 'admin' && !filters.communityId) {
      const error = new Error('Community filter is required for moderators');
      error.status = 400;
      throw error;
    }

    if (filters.communityId) {
      await ensureModerator(filters.communityId, actor, db);
    }

    const result = await CommunityPostModerationCaseModel.list(filters, pagination, db);
    const caseIds = result.items.map((item) => item.id);

    const [followUps, policyLibrary] = await Promise.all([
      ModerationFollowUpModel.listForCases(caseIds, db),
      fetchPolicyLibrary(db)
    ]);

    const followUpsByCaseId = followUps.reduce((acc, followUp) => {
      if (!acc.has(followUp.caseId)) {
        acc.set(followUp.caseId, []);
      }
      acc.get(followUp.caseId).push(followUp);
      return acc;
    }, new Map());

    const enrichedItems = result.items.map((item) => ({
      ...item,
      followUps: followUpsByCaseId.get(item.id) ?? [],
      policySnippets: buildPolicySnippetsForCase(policyLibrary, item),
      aiSuggestions: deriveAiSuggestions(item, item.post)
    }));

    return { ...result, items: enrichedItems };
  }

  static async getCase(actor, casePublicId) {
    const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, db);
    if (!moderationCase) {
      const error = new Error('Moderation case not found');
      error.status = 404;
      throw error;
    }

    await ensureModerator(moderationCase.communityId, actor, db);
    const [actions, followUps, policyLibrary] = await Promise.all([
      CommunityPostModerationActionModel.listForCase(moderationCase.id, db),
      ModerationFollowUpModel.listForCase(moderationCase.id, db),
      fetchPolicyLibrary(db)
    ]);

    const enrichedCase = {
      ...moderationCase,
      followUps,
      policySnippets: buildPolicySnippetsForCase(policyLibrary, moderationCase),
      aiSuggestions: deriveAiSuggestions(moderationCase, moderationCase.post)
    };

    return {
      case: enrichedCase,
      actions
    };
  }

  static async listCaseActions(actor, casePublicId) {
    const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, db);
    if (!moderationCase) {
      const error = new Error('Moderation case not found');
      error.status = 404;
      throw error;
    }

    await ensureModerator(moderationCase.communityId, actor, db);
    return CommunityPostModerationActionModel.listForCase(moderationCase.id, db);
  }

  static async applyCaseAction(casePublicId, actor, payload) {
    ensureActionAllowed(payload.action);

    return db.transaction(async (trx) => {
      const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, trx);
      if (!moderationCase) {
        const error = new Error('Moderation case not found');
        error.status = 404;
        throw error;
      }

      await ensureModerator(moderationCase.communityId, actor, trx);
      const post = await CommunityPostModel.findById(moderationCase.postId, trx);
      if (!post) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }

      const nowDate = new Date();
      const now = nowDate.toISOString();
      const updates = {};
      const previousCaseSnapshot = snapshotCaseState(moderationCase);
      const previousPostSnapshot = snapshotPostState(post);
      const caseMetadata = mergeModerationMetadata(moderationCase.metadata ?? {}, {
        notes: payload.notes
          ? [{ message: payload.notes, authorId: actor.id, createdAt: now, action: payload.action }]
          : []
      });

      const riskScore =
        payload.riskScore !== undefined
          ? clampRiskScore(payload.riskScore)
          : moderationCase.riskScore ?? 0;
      const severity = deriveSeverity(riskScore);

      let newPostState = post.moderationState;
      let newPostStatus = post.status;

      switch (payload.action) {
        case 'assign': {
          updates.assignedTo = payload.assignedTo ?? null;
          updates.status = moderationCase.status === 'pending' ? 'in_review' : moderationCase.status;
          break;
        }
        case 'escalate': {
          updates.status = 'escalated';
          updates.escalatedAt = now;
          updates.assignedTo = payload.assignedTo ?? moderationCase.assignedTo ?? null;
          updates.riskScore = riskScore;
          updates.severity = severity;
          break;
        }
        case 'approve': {
          updates.status = 'approved';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          updates.riskScore = riskScore;
          updates.severity = severity;
          newPostState = 'clean';
          newPostStatus = post.status === 'draft' ? 'draft' : 'published';
          break;
        }
        case 'reject': {
          updates.status = 'rejected';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          updates.riskScore = riskScore;
          updates.severity = severity;
          newPostState = 'rejected';
          newPostStatus = 'archived';
          break;
        }
        case 'suppress': {
          updates.status = 'suppressed';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          updates.riskScore = riskScore;
          updates.severity = severity;
          newPostState = 'suppressed';
          newPostStatus = payload.archivePost === false ? post.status : 'archived';
          break;
        }
        case 'restore': {
          updates.status = 'approved';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          newPostState = 'clean';
          newPostStatus = payload.restoreStatus ?? 'published';
          break;
        }
        case 'comment': {
          updates.status = moderationCase.status;
          break;
        }
        default:
          break;
      }

      updates.metadata = caseMetadata;

      const updatedCase = await CommunityPostModerationCaseModel.updateById(
        moderationCase.id,
        updates,
        trx
      );

      const existingMetadata = parseJsonColumn(post.moderationMetadata, {});
      const mergedPostMetadata = mergeModerationMetadata(existingMetadata, {
        notes: payload.notes
          ? [{ message: payload.notes, authorId: actor.id, createdAt: now, action: payload.action }]
          : [],
        riskHistory: payload.action !== 'comment' ? [{ riskScore, at: now }] : []
      });

      const updatedPost = await CommunityPostModel.updateModerationState(
        post.id,
        {
          state: newPostState,
          metadata: mergedPostMetadata,
          status: newPostStatus,
          lastModeratedAt: now
        },
        trx
      );

      const nextCaseSnapshot = snapshotCaseState(updatedCase);
      const nextPostSnapshot = snapshotPostState(updatedPost);

      const actionRecord = await CommunityPostModerationActionModel.record(
        {
          caseId: updatedCase.id,
          actorId: actor.id,
          action: payload.action,
          notes: payload.notes ?? null,
          metadata: {
            riskScore,
            severity,
            assignedTo: updates.assignedTo ?? updatedCase.assignedTo ?? null,
            archivePost: payload.archivePost ?? undefined,
            restoreStatus: payload.restoreStatus ?? undefined,
            previous: { case: previousCaseSnapshot, post: previousPostSnapshot },
            next: { case: nextCaseSnapshot, post: nextPostSnapshot }
          }
        },
        trx
      );

      let scheduledFollowUp = null;
      const followUpRequest = resolveFollowUpRequest({
        action: payload.action,
        payload,
        actor,
        updatedCase,
        now: nowDate
      });

      if (followUpRequest) {
        scheduledFollowUp = await ModerationFollowUpModel.schedule(
          {
            caseId: updatedCase.id,
            actionId: actionRecord.id,
            assignedTo: followUpRequest.assignedTo ?? null,
            dueAt: followUpRequest.dueAt,
            metadata: followUpRequest.metadata
          },
          trx
        );
        actionRecord.metadata = {
          ...actionRecord.metadata,
          followUpId: scheduledFollowUp.id,
          followUpDueAt: scheduledFollowUp.dueAt
        };
        await CommunityPostModerationActionModel.updateMetadata(
          actionRecord.id,
          actionRecord.metadata,
          trx
        );
      }

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: updatedCase.postId,
          eventType: 'community.moderation.case.action',
          payload: {
            action: payload.action,
            caseId: updatedCase.publicId,
            status: updatedCase.status,
            severity: updatedCase.severity,
            riskScore,
            postModerationState: updatedPost.moderationState,
            followUpDueAt: scheduledFollowUp?.dueAt ?? null
          },
          performedBy: actor.id
        },
        trx
      );

      await ModerationAnalyticsEventModel.record(
        {
          communityId: updatedCase.communityId,
          entityType: 'community_post',
          entityId: String(updatedCase.postId),
          eventType: `case_${payload.action}`,
          riskScore,
          metrics: {
            severity: updatedCase.severity,
            status: updatedCase.status,
            moderatorId: actor.id,
            followUpDueAt: scheduledFollowUp?.dueAt ?? null
          },
          source: 'moderator',
          occurredAt: now
        },
        trx
      );

      log.info(
        {
          caseId: updatedCase.publicId,
          action: payload.action,
          actorId: actor.id,
          communityId: updatedCase.communityId,
          postId: updatedCase.postId
        },
        'Moderation action applied'
      );

      const [followUps, policyLibrary] = await Promise.all([
        ModerationFollowUpModel.listForCase(updatedCase.id, trx),
        fetchPolicyLibrary(trx)
      ]);

      const enrichedCase = {
        ...updatedCase,
        followUps,
        policySnippets: buildPolicySnippetsForCase(policyLibrary, updatedCase),
        aiSuggestions: deriveAiSuggestions(updatedCase, updatedPost)
      };

      return {
        case: enrichedCase,
        post: updatedPost,
        action: actionRecord,
        followUp: scheduledFollowUp
      };
    });
  }

  static async undoCaseAction(casePublicId, actor, actionId) {
    if (!actionId) {
      const error = new Error('An action identifier is required to undo a moderation step');
      error.status = 400;
      throw error;
    }

    return db.transaction(async (trx) => {
      const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, trx);
      if (!moderationCase) {
        const error = new Error('Moderation case not found');
        error.status = 404;
        throw error;
      }

      await ensureModerator(moderationCase.communityId, actor, trx);

      const action = await CommunityPostModerationActionModel.findById(actionId, trx);
      if (!action || action.caseId !== moderationCase.id) {
        const error = new Error('Moderation action not found for this case');
        error.status = 404;
        throw error;
      }

      const previousSnapshot = action.metadata?.previous;
      if (!previousSnapshot?.case || !previousSnapshot?.post) {
        const error = new Error('This moderation action cannot be undone');
        error.status = 422;
        throw error;
      }

      const post = await CommunityPostModel.findById(moderationCase.postId, trx);
      if (!post) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }

      const now = new Date();
      const caseUpdates = {
        status: previousSnapshot.case.status ?? moderationCase.status,
        severity: previousSnapshot.case.severity ?? moderationCase.severity,
        riskScore: previousSnapshot.case.riskScore ?? moderationCase.riskScore ?? 0,
        assignedTo: previousSnapshot.case.assignedTo ?? null,
        metadata: previousSnapshot.case.metadata ?? moderationCase.metadata ?? {}
      };

      if (Object.prototype.hasOwnProperty.call(previousSnapshot.case, 'escalatedAt')) {
        caseUpdates.escalatedAt = previousSnapshot.case.escalatedAt ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(previousSnapshot.case, 'resolvedAt')) {
        caseUpdates.resolvedAt = previousSnapshot.case.resolvedAt ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(previousSnapshot.case, 'resolvedBy')) {
        caseUpdates.resolvedBy = previousSnapshot.case.resolvedBy ?? null;
      }

      const restoredCase = await CommunityPostModerationCaseModel.updateById(
        moderationCase.id,
        caseUpdates,
        trx
      );

      const postUpdates = {
        state: previousSnapshot.post.moderationState ?? post.moderationState,
        metadata: previousSnapshot.post.moderationMetadata ?? post.moderationMetadata ?? {},
        status: previousSnapshot.post.status ?? post.status,
        lastModeratedAt: now.toISOString()
      };

      const restoredPost = await CommunityPostModel.updateModerationState(post.id, postUpdates, trx);

      await ModerationFollowUpModel.cancelByActionId(actionId, trx);
      await CommunityPostModerationActionModel.markUndone(actionId, { undoneBy: actor.id }, trx);

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: restoredCase.postId,
          eventType: 'community.moderation.case.undo',
          payload: {
            caseId: restoredCase.publicId,
            undoneActionId: actionId,
            status: restoredCase.status,
            severity: restoredCase.severity,
            postModerationState: restoredPost.moderationState
          },
          performedBy: actor.id
        },
        trx
      );

      await ModerationAnalyticsEventModel.record(
        {
          communityId: restoredCase.communityId,
          entityType: 'community_post',
          entityId: String(restoredCase.postId),
          eventType: 'case_undo',
          riskScore: restoredCase.riskScore ?? null,
          metrics: {
            severity: restoredCase.severity,
            status: restoredCase.status,
            moderatorId: actor.id,
            undoneActionId: actionId
          },
          source: 'moderator',
          occurredAt: now.toISOString()
        },
        trx
      );

      const [followUps, policyLibrary] = await Promise.all([
        ModerationFollowUpModel.listForCase(restoredCase.id, trx),
        fetchPolicyLibrary(trx)
      ]);

      const enrichedCase = {
        ...restoredCase,
        followUps,
        policySnippets: buildPolicySnippetsForCase(policyLibrary, restoredCase),
        aiSuggestions: deriveAiSuggestions(restoredCase, restoredPost)
      };

      return {
        case: enrichedCase,
        post: restoredPost
      };
    });
  }

  static async submitScamReport(actor, payload) {
    const riskScore = clampRiskScore(payload.riskScore ?? 0);
    const metadata = {
      evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
      context: payload.context ?? {},
      channel: payload.channel ?? 'in_app'
    };

    const report = await ScamReportModel.create({
      reporterId: actor?.id ?? null,
      entityType: payload.entityType,
      entityId: payload.entityId,
      communityId: payload.communityId ?? null,
      reason: payload.reason,
      description: payload.description,
      riskScore,
      status: 'pending',
      metadata
    });

    await DomainEventModel.record({
      entityType: 'scam_report',
      entityId: report.id,
      eventType: 'scam.report.submitted',
      payload: {
        entityType: report.entityType,
        entityId: report.entityId,
        riskScore,
        communityId: report.communityId
      },
      performedBy: actor?.id ?? null
    });

    await ModerationAnalyticsEventModel.record({
      communityId: report.communityId ?? null,
      entityType: report.entityType,
      entityId: String(report.entityId),
      eventType: 'scam_reported',
      riskScore,
      metrics: {
        status: report.status,
        channel: metadata.channel
      },
      source: payload.channel ?? 'in_app',
      occurredAt: nowIso()
    });

    log.info(
      {
        reportId: report.publicId,
        entityType: report.entityType,
        riskScore,
        reporterId: actor?.id ?? null
      },
      'Scam report submitted'
    );

    return report;
  }

  static async listScamReports(actor, filters = {}, pagination = {}) {
    const criteria = { ...filters };
    if (actor.role === 'admin') {
      // admins can request any combination
    } else if (criteria.communityId) {
      await ensureModerator(criteria.communityId, actor, db);
    } else {
      criteria.reporterId = actor.id;
    }

    return ScamReportModel.list(criteria, pagination, db);
  }

  static async updateScamReport(actor, reportId, payload = {}) {
    if (!reportId) {
      const error = new Error('A scam report identifier is required');
      error.status = 400;
      throw error;
    }

    if (actor.role !== 'admin') {
      const error = new Error('Only administrators can update scam reports');
      error.status = 403;
      throw error;
    }

    const report = await ScamReportModel.findByPublicId(reportId, db);
    if (!report) {
      const notFound = new Error('Scam report not found');
      notFound.status = 404;
      throw notFound;
    }

    const metadata = payload.metadata
      ? mergeModerationMetadata(report.metadata, payload.metadata)
      : undefined;

    const updates = {
      status: payload.status,
      riskScore: payload.riskScore,
      handledBy: payload.handledBy === null ? null : payload.handledBy,
      resolvedAt: payload.resolvedAt ?? undefined,
      reason: payload.reason,
      description: payload.description,
      metadata
    };

    const updated = await ScamReportModel.updateById(report.id, updates, db);

    await DomainEventModel.record({
      entityType: 'scam_report',
      entityId: updated.id,
      eventType: 'scam.report.updated',
      payload: {
        status: updated.status,
        riskScore: updated.riskScore,
        handledBy: updated.handledBy ?? null
      },
      performedBy: actor.id
    });

    return updated;
  }

  static async recordAnalyticsEvent(actor, payload) {
    if (actor.role !== 'admin' && actor.role !== 'moderator') {
      const error = new Error('Only admins or moderators can record analytics events');
      error.status = 403;
      throw error;
    }

    const record = await ModerationAnalyticsEventModel.record({
      communityId: payload.communityId ?? null,
      entityType: payload.entityType,
      entityId: payload.entityId,
      eventType: payload.eventType,
      riskScore: payload.riskScore ?? null,
      metrics: payload.metrics ?? {},
      source: payload.source ?? 'manual',
      occurredAt: payload.occurredAt ?? nowIso()
    });

    await DomainEventModel.record({
      entityType: 'moderation_analytics',
      entityId: record.id,
      eventType: 'moderation.analytics.recorded',
      payload: {
        communityId: payload.communityId ?? null,
        eventType: payload.eventType,
        riskScore: payload.riskScore ?? null
      },
      performedBy: actor.id
    });

    return ModerationAnalyticsEventModel.parseMetrics(record);
  }

  static async getAnalyticsSummary(actor, filters = {}) {
    if (actor.role !== 'admin' && !filters.communityId) {
      const error = new Error('Community filter required for moderators');
      error.status = 400;
      throw error;
    }

    if (filters.communityId) {
      await ensureModerator(filters.communityId, actor, db);
    }

    const [eventSummary, severityBreakdown, resolutionStats, scamStatusRows] = await Promise.all([
      ModerationAnalyticsEventModel.summarise(filters, db),
      CommunityPostModerationCaseModel.countOpenBySeverity(filters, db),
      CommunityPostModerationCaseModel.resolutionStats(filters, db),
      db('scam_reports')
        .select('status')
        .count({ total: '*' })
        .modify((builder) => {
          if (filters.communityId) {
            builder.where('community_id', filters.communityId);
          }
          if (filters.from) {
            builder.andWhere('created_at', '>=', filters.from);
          }
          if (filters.to) {
            builder.andWhere('created_at', '<=', filters.to);
          }
        })
        .groupBy('status')
    ]);

    const scamCounts = {
      pending: 0,
      investigating: 0,
      confirmed: 0,
      dismissed: 0
    };
    for (const row of scamStatusRows) {
      scamCounts[row.status] = Number(row.total ?? 0);
    }

    return {
      events: eventSummary.events,
      timeline: eventSummary.timeline,
      openCases: severityBreakdown,
      resolution: resolutionStats,
      scamReports: scamCounts
    };
  }
}

import CommunityModel from '../models/CommunityModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityResourceModel from '../models/CommunityResourceModel.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import CommunityEngagementService from './CommunityEngagementService.js';
import CommunityMonetizationService from './CommunityMonetizationService.js';

const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toArray(value) {
  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

async function resolveCommunity(identifier) {
  if (!identifier) {
    return null;
  }
  if (Number.isInteger(Number(identifier))) {
    return CommunityModel.findById(Number(identifier));
  }
  return CommunityModel.findBySlug(String(identifier));
}

async function ensureModerator(communityIdentifier, actorId) {
  const community = await resolveCommunity(communityIdentifier);
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }

  const membership = await CommunityMemberModel.findMembership(community.id, actorId);
  if (!membership || !MODERATOR_ROLES.has(membership.role)) {
    const error = new Error('You do not have permission to manage community operations');
    error.status = membership ? 403 : 404;
    throw error;
  }

  return { community, membership };
}

function serializeRunbook(resource) {
  const metadata = parseJson(resource.metadata, {});
  const tags = toArray(resource.tags);

  return {
    id: resource.id,
    communityId: resource.communityId,
    title: resource.title,
    summary: resource.description ?? metadata.summary ?? '',
    owner: metadata.owner ?? resource.createdByName ?? 'Operations team',
    automationReady: Boolean(metadata.automationReady),
    tags,
    linkUrl: resource.linkUrl ?? metadata.linkUrl ?? null,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt
  };
}

function appendAcknowledgementMetadata(existingMetadata, acknowledgement) {
  const metadata = parseJson(existingMetadata, {});
  const operations = metadata.operations ?? {};
  const acknowledgements = Array.isArray(operations.acknowledgements)
    ? [...operations.acknowledgements]
    : [];
  acknowledgements.push(acknowledgement);

  return {
    ...metadata,
    operations: {
      ...operations,
      acknowledgedAt: acknowledgement.acknowledgedAt,
      acknowledgedBy: acknowledgement.acknowledgedBy,
      acknowledgements
    }
  };
}

function mergeResolutionMetadata(existingMetadata, resolution) {
  const metadata = parseJson(existingMetadata, {});
  const operations = metadata.operations ?? {};

  return {
    ...metadata,
    operations: {
      ...operations,
      resolution
    }
  };
}

export default class CommunityOperationsService {
  static async publishRunbook(communityIdentifier, actorId, payload) {
    const { community } = await ensureModerator(communityIdentifier, actorId);

    const metadata = {
      type: 'runbook',
      owner: payload.owner,
      automationReady: Boolean(payload.automationReady),
      summary: payload.summary ?? null,
      linkUrl: payload.linkUrl ?? null
    };

    const resource = await CommunityResourceModel.create({
      communityId: community.id,
      createdBy: actorId,
      title: payload.title,
      description: payload.summary ?? null,
      resourceType: payload.linkUrl ? 'external_link' : 'document',
      linkUrl: payload.linkUrl ?? null,
      tags: payload.tags ?? [],
      visibility: 'members',
      status: 'published',
      metadata,
      publishedAt: new Date()
    });

    const runbook = serializeRunbook(resource);

    await DomainEventModel.record({
      entityType: 'community_runbook',
      entityId: String(runbook.id),
      eventType: 'community.runbook.published',
      payload: {
        communityId: community.id,
        owner: runbook.owner,
        automationReady: runbook.automationReady
      },
      performedBy: actorId
    });

    return runbook;
  }

  static async acknowledgeEscalation(communityIdentifier, actorId, casePublicId, payload = {}) {
    const { community } = await ensureModerator(communityIdentifier, actorId);

    const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId);
    if (!moderationCase || Number(moderationCase.communityId) !== Number(community.id)) {
      const error = new Error('Escalation not found for this community');
      error.status = 404;
      throw error;
    }

    const now = new Date();
    const acknowledgement = {
      acknowledgedAt: now.toISOString(),
      acknowledgedBy: actorId,
      note: payload.note ?? null
    };

    const metadata = appendAcknowledgementMetadata(moderationCase.metadata, acknowledgement);
    const status = moderationCase.status === 'pending' ? 'in_review' : moderationCase.status;

    const updated = await CommunityPostModerationCaseModel.updateById(moderationCase.id, {
      status,
      metadata,
      escalatedAt: moderationCase.escalatedAt ?? now
    });

    await DomainEventModel.record({
      entityType: 'community_moderation_case',
      entityId: String(updated.id ?? moderationCase.id),
      eventType: 'community.escalation.acknowledged',
      payload: {
        communityId: community.id,
        caseId: casePublicId,
        acknowledgedBy: actorId
      },
      performedBy: actorId
    });

    return updated;
  }

  static async scheduleEvent(communityIdentifier, actorId, payload) {
    return CommunityEngagementService.createEvent(communityIdentifier, actorId, payload);
  }

  static async manageTier(communityIdentifier, actorId, tierId, updates) {
    return CommunityMonetizationService.updateTier(communityIdentifier, actorId, Number(tierId), updates);
  }

  static async resolveIncident(communityIdentifier, actorId, casePublicId, payload = {}) {
    const { community } = await ensureModerator(communityIdentifier, actorId);

    const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId);
    if (!moderationCase || Number(moderationCase.communityId) !== Number(community.id)) {
      const error = new Error('Incident not found for this community');
      error.status = 404;
      throw error;
    }

    const now = new Date();
    const resolution = {
      resolvedAt: now.toISOString(),
      resolvedBy: actorId,
      summary: payload.resolutionSummary ?? null,
      followUp: payload.followUp ?? null
    };

    const metadata = mergeResolutionMetadata(moderationCase.metadata, resolution);

    const updated = await CommunityPostModerationCaseModel.updateById(moderationCase.id, {
      status: 'resolved',
      metadata,
      resolvedAt: now,
      resolvedBy: actorId
    });

    await DomainEventModel.record({
      entityType: 'community_moderation_case',
      entityId: String(updated.id ?? moderationCase.id),
      eventType: 'community.safety.resolved',
      payload: {
        communityId: community.id,
        caseId: casePublicId,
        resolvedBy: actorId
      },
      performedBy: actorId
    });

    return updated;
  }
}

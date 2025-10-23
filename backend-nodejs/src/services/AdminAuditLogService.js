import ContentAuditLogModel from '../models/ContentAuditLogModel.js';
import SocialAuditLogModel from '../models/SocialAuditLogModel.js';
import KycAuditLogModel from '../models/KycAuditLogModel.js';
import { FeatureFlagAuditModel } from '../models/FeatureFlagModel.js';

function toIsoDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeParseMetadata(metadata) {
  if (!metadata) {
    return {};
  }
  if (typeof metadata === 'object') {
    return { ...metadata };
  }
  try {
    return JSON.parse(metadata);
  } catch (_error) {
    return {};
  }
}

function humanise(label, fallback = '') {
  if (typeof label !== 'string' || label.trim().length === 0) {
    return fallback;
  }
  return label
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normaliseActor(candidate, fallbackName) {
  if (!candidate && !fallbackName) {
    return null;
  }

  if (candidate && typeof candidate === 'object') {
    const name = candidate.name ?? fallbackName ?? null;
    const email = candidate.email ?? (typeof fallbackName === 'string' && fallbackName.includes('@') ? fallbackName : null);
    const id = candidate.id ?? null;

    if (!name && !email && !id) {
      return null;
    }

    return {
      id,
      name,
      email
    };
  }

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return {
      id: null,
      name: candidate,
      email: candidate.includes('@') ? candidate : null
    };
  }

  if (typeof fallbackName === 'string' && fallbackName.trim().length > 0) {
    return {
      id: null,
      name: fallbackName,
      email: fallbackName.includes('@') ? fallbackName : null
    };
  }

  return null;
}

function mapContentEntry(entry) {
  const payload = safeParseMetadata(entry.payload);
  const assetId = entry.assetId ?? payload.assetId ?? payload.asset_id ?? null;
  return {
    id: `content-${entry.id}`,
    source: 'content',
    category: payload.category ?? 'content',
    title: payload.title ?? humanise(entry.event, 'Content event recorded'),
    description: payload.summary ?? payload.note ?? null,
    actor: normaliseActor(
      {
        id: payload.actorId ?? null,
        name: payload.actorName ?? null,
        email: payload.actorEmail ?? null
      },
      entry.performedBy
    ),
    references: assetId
      ? [
          {
            type: 'asset',
            id: assetId,
            label: payload.assetTitle ?? payload.assetSlug ?? assetId
          }
        ]
      : [],
    severity: String(payload.severity ?? 'info').toLowerCase(),
    metadata: payload,
    occurredAt: toIsoDate(entry.createdAt)
  };
}

function mapFeatureFlagEntry(entry) {
  const payload = safeParseMetadata(entry.payload);
  const flagLabel = entry.flagKey ?? payload.flagKey ?? entry.flagId;
  return {
    id: `feature-flag-${entry.id}`,
    source: 'feature_flags',
    category: 'feature_flags',
    title: `Feature flag ${flagLabel ?? 'update'}`,
    description:
      payload.summary ??
      payload.notes ??
      `Change type: ${humanise(entry.changeType ?? payload.changeType, 'updated')}`,
    actor: normaliseActor({ id: null, name: payload.changedByName ?? null, email: entry.changedBy ?? payload.changedBy }, null),
    references: flagLabel
      ? [
          {
            type: 'feature_flag',
            id: entry.flagId,
            label: flagLabel
          }
        ]
      : [],
    severity: String(payload.severity ?? 'info').toLowerCase(),
    metadata: payload,
    occurredAt: toIsoDate(entry.createdAt)
  };
}

function mapKycEntry(entry) {
  const metadata = safeParseMetadata(entry.metadata);
  return {
    id: `kyc-${entry.id}`,
    source: 'identity',
    category: 'identity',
    title: `Identity verification ${humanise(entry.action, 'update')}`,
    description: entry.notes ?? metadata.summary ?? null,
    actor: normaliseActor(
      {
        id: entry.actorId ?? null,
        name:
          entry.actorFirstName || entry.actorLastName
            ? [entry.actorFirstName, entry.actorLastName].filter(Boolean).join(' ')
            : null,
        email: entry.actorEmail ?? null
      },
      null
    ),
    references: [
      {
        type: 'verification',
        id: entry.verificationId,
        label: metadata.reference ?? entry.verificationId
      }
    ].filter((reference) => reference.id),
    severity: String(metadata.severity ?? 'info').toLowerCase(),
    metadata,
    occurredAt: toIsoDate(entry.createdAt)
  };
}

function mapSocialEntry(entry) {
  const metadata = safeParseMetadata(entry.metadata);
  return {
    id: `social-${entry.id}`,
    source: 'social',
    category: 'social',
    title: `Social ${humanise(entry.action, 'activity')}`,
    description: metadata.summary ?? metadata.reason ?? null,
    actor: normaliseActor(entry.actor, null),
    references: [
      entry.targetUser
        ? {
            type: 'user',
            id: entry.targetUser.id ?? entry.targetUserId,
            label: entry.targetUser.name ?? entry.targetUser.email ?? entry.targetUserId
          }
        : null
    ].filter(Boolean),
    severity: String(metadata.severity ?? metadata.level ?? 'info').toLowerCase(),
    metadata,
    occurredAt: toIsoDate(entry.createdAt)
  };
}

export class AdminAuditLogService {
  constructor({
    contentAuditLogModel = ContentAuditLogModel,
    featureFlagAuditModel = FeatureFlagAuditModel,
    kycAuditLogModel = KycAuditLogModel,
    socialAuditLogModel = SocialAuditLogModel
  } = {}) {
    this.contentAuditLogModel = contentAuditLogModel;
    this.featureFlagAuditModel = featureFlagAuditModel;
    this.kycAuditLogModel = kycAuditLogModel;
    this.socialAuditLogModel = socialAuditLogModel;
  }

  #resolveLimit(limit) {
    return Math.max(1, Math.min(100, Number.parseInt(limit ?? 25, 10) || 25));
  }

  async listRecent(options = {}) {
    const limit = this.#resolveLimit(options.limit);
    const since = options.since ?? null;

    const [content, featureFlags, kyc, social] = await Promise.all([
      this.contentAuditLogModel.listRecent({ limit, since }),
      this.featureFlagAuditModel.listRecent({ limit, since }),
      this.kycAuditLogModel.listRecent({ limit, since }),
      this.socialAuditLogModel.listRecent({ limit, since })
    ]);

    const contentEntries = Array.isArray(content) ? content : content ? [content] : [];
    const featureFlagEntries = Array.isArray(featureFlags) ? featureFlags : featureFlags ? [featureFlags] : [];
    const identityEntries = Array.isArray(kyc) ? kyc : kyc ? [kyc] : [];
    const socialEntries = Array.isArray(social) ? social : social ? [social] : [];

    const entries = [
      ...contentEntries.map(mapContentEntry),
      ...featureFlagEntries.map(mapFeatureFlagEntry),
      ...identityEntries.map(mapKycEntry),
      ...socialEntries.map(mapSocialEntry)
    ]
      .filter((entry) => entry.occurredAt)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);

    return {
      entries,
      totals: {
        content: contentEntries.length,
        featureFlags: featureFlagEntries.length,
        identity: identityEntries.length,
        social: socialEntries.length
      },
      generatedAt: new Date().toISOString()
    };
  }
}

const adminAuditLogService = new AdminAuditLogService();

export default adminAuditLogService;

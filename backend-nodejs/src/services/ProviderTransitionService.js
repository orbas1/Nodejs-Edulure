import db from '../config/database.js';
import logger from '../config/logger.js';
import ProviderTransitionAnnouncementModel from '../models/ProviderTransitionAnnouncementModel.js';
import ProviderTransitionResourceModel from '../models/ProviderTransitionResourceModel.js';
import ProviderTransitionTimelineEntryModel from '../models/ProviderTransitionTimelineEntryModel.js';
import ProviderTransitionAcknowledgementModel from '../models/ProviderTransitionAcknowledgementModel.js';
import ProviderTransitionStatusUpdateModel from '../models/ProviderTransitionStatusUpdateModel.js';

const ACK_METHODS = new Set(['portal', 'webinar', 'email', 'support']);
const STATUS_CODES = new Set([
  'not-started',
  'migration-in-progress',
  'testing',
  'blocked',
  'completed',
  'deferred'
]);

function serializeAnnouncementForApi(announcement) {
  return {
    id: announcement.id,
    slug: announcement.slug,
    title: announcement.title,
    summary: announcement.summary,
    bodyMarkdown: announcement.bodyMarkdown,
    status: announcement.status,
    effectiveFrom: announcement.effectiveFrom?.toISOString() ?? null,
    effectiveTo: announcement.effectiveTo?.toISOString() ?? null,
    ackRequired: announcement.ackRequired,
    ackDeadline: announcement.ackDeadline?.toISOString() ?? null,
    ownerEmail: announcement.ownerEmail,
    tenantScope: announcement.tenantScope,
    metadata: announcement.metadata ?? {},
    createdAt: announcement.createdAt?.toISOString() ?? null,
    updatedAt: announcement.updatedAt?.toISOString() ?? null
  };
}

function serializeTimelineEntry(entry) {
  return {
    id: entry.id,
    occursOn: entry.occursOn?.toISOString() ?? null,
    headline: entry.headline,
    owner: entry.owner,
    ctaLabel: entry.ctaLabel,
    ctaUrl: entry.ctaUrl,
    detailsMarkdown: entry.detailsMarkdown
  };
}

function serializeResource(resource) {
  return {
    id: resource.id,
    label: resource.label,
    url: resource.url,
    type: resource.type,
    locale: resource.locale,
    description: resource.description,
    sortOrder: resource.sortOrder
  };
}

function serializeAcknowledgement(ack) {
  return {
    id: ack.id,
    organisationName: ack.organisationName,
    contactName: ack.contactName,
    contactEmail: ack.contactEmail,
    ackMethod: ack.ackMethod,
    followUpRequired: ack.followUpRequired,
    followUpNotes: ack.followUpNotes,
    metadata: ack.metadata ?? {},
    acknowledgedAt: ack.acknowledgedAt?.toISOString() ?? null
  };
}

function serializeStatusUpdate(update) {
  return {
    id: update.id,
    providerReference: update.providerReference,
    statusCode: update.statusCode,
    notes: update.notes,
    recordedAt: update.recordedAt?.toISOString() ?? null
  };
}

export default class ProviderTransitionService {
  constructor({ nowProvider = () => new Date(), loggerInstance = logger } = {}) {
    this.nowProvider = nowProvider;
    this.logger = loggerInstance.child({ service: 'provider-transition' });
  }

  async listActiveAnnouncements({ tenantScope = 'global', includeDetails = false } = {}) {
    const now = this.nowProvider();
    const announcements = await ProviderTransitionAnnouncementModel.listActive({
      now,
      tenantScope,
      connection: db
    });

    const enriched = await Promise.all(
      announcements.map(async (announcement) => {
        const [ackCount, recentStatuses] = await Promise.all([
          ProviderTransitionAcknowledgementModel.countForAnnouncement(announcement.id, { connection: db }),
          ProviderTransitionStatusUpdateModel.recentForAnnouncement(announcement.id, {
            limit: 1,
            connection: db
          })
        ]);

        const payload = {
          announcement: serializeAnnouncementForApi(announcement),
          acknowledgements: {
            total: ackCount
          },
          latestStatus: recentStatuses.length ? serializeStatusUpdate(recentStatuses[0]) : null
        };

        if (includeDetails) {
          const [timeline, resources] = await Promise.all([
            ProviderTransitionTimelineEntryModel.forAnnouncement(announcement.id, { connection: db }),
            ProviderTransitionResourceModel.forAnnouncement(announcement.id, { connection: db })
          ]);
          payload.timeline = timeline.map(serializeTimelineEntry);
          payload.resources = resources.map(serializeResource);
        }

        return payload;
      })
    );

    return enriched;
  }

  async getAnnouncementDetail(slug, { tenantScope = 'global' } = {}) {
    if (!slug) {
      throw Object.assign(new Error('Announcement slug is required'), { status: 400 });
    }

    const announcement = await ProviderTransitionAnnouncementModel.findBySlug(slug, { connection: db });
    if (!announcement) {
      throw Object.assign(new Error('Provider transition announcement not found'), { status: 404 });
    }

    if (
      tenantScope &&
      announcement.tenantScope !== 'global' &&
      announcement.tenantScope !== tenantScope &&
      !(Array.isArray(tenantScope) && tenantScope.includes(announcement.tenantScope))
    ) {
      throw Object.assign(new Error('Announcement is not available for this tenant'), { status: 404 });
    }

    const [timeline, resources, ackCount, recentStatuses] = await Promise.all([
      ProviderTransitionTimelineEntryModel.forAnnouncement(announcement.id, { connection: db }),
      ProviderTransitionResourceModel.forAnnouncement(announcement.id, { connection: db }),
      ProviderTransitionAcknowledgementModel.countForAnnouncement(announcement.id, { connection: db }),
      ProviderTransitionStatusUpdateModel.recentForAnnouncement(announcement.id, {
        limit: 5,
        connection: db
      })
    ]);

    return {
      announcement: serializeAnnouncementForApi(announcement),
      timeline: timeline.map(serializeTimelineEntry),
      resources: resources.map(serializeResource),
      acknowledgements: {
        total: ackCount
      },
      recentStatusUpdates: recentStatuses.map(serializeStatusUpdate)
    };
  }

  async recordAcknowledgement(slug, payload, { tenantScope = 'global' } = {}) {
    const announcement = await ProviderTransitionAnnouncementModel.findBySlug(slug, { connection: db });
    if (!announcement) {
      throw Object.assign(new Error('Provider transition announcement not found'), { status: 404 });
    }

    if (
      tenantScope &&
      announcement.tenantScope !== 'global' &&
      announcement.tenantScope !== tenantScope &&
      !(Array.isArray(tenantScope) && tenantScope.includes(announcement.tenantScope))
    ) {
      throw Object.assign(new Error('Announcement is not available for this tenant'), { status: 404 });
    }

    const ackMethod = payload.ackMethod?.toLowerCase() ?? 'portal';
    if (!ACK_METHODS.has(ackMethod)) {
      throw Object.assign(new Error(`ackMethod must be one of: ${Array.from(ACK_METHODS).join(', ')}`), {
        status: 422
      });
    }

    const acknowledgement = await ProviderTransitionAcknowledgementModel.upsertForContact(
      announcement.id,
      payload.contactEmail,
      {
        announcementId: announcement.id,
        providerReference: payload.providerReference,
        organisationName: payload.organisationName,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        ackMethod,
        followUpRequired: payload.followUpRequired,
        followUpNotes: payload.followUpNotes,
        metadata: {
          ...((announcement.metadata?.acknowledgementDefaults ?? {}) || {}),
          ...(payload.metadata ?? {})
        },
        acknowledgedAt: payload.acknowledgedAt ?? this.nowProvider()
      },
      { connection: db }
    );

    this.logger.info({
      event: 'provider-transition.acknowledged',
      slug,
      organisation: acknowledgement.organisationName,
      contactEmail: acknowledgement.contactEmail,
      method: acknowledgement.ackMethod
    });

    return serializeAcknowledgement(acknowledgement);
  }

  async recordStatusUpdate(slug, payload, { tenantScope = 'global' } = {}) {
    const announcement = await ProviderTransitionAnnouncementModel.findBySlug(slug, { connection: db });
    if (!announcement) {
      throw Object.assign(new Error('Provider transition announcement not found'), { status: 404 });
    }

    if (
      tenantScope &&
      announcement.tenantScope !== 'global' &&
      announcement.tenantScope !== tenantScope &&
      !(Array.isArray(tenantScope) && tenantScope.includes(announcement.tenantScope))
    ) {
      throw Object.assign(new Error('Announcement is not available for this tenant'), { status: 404 });
    }

    const normalizedStatus = payload.statusCode?.toLowerCase();
    if (!STATUS_CODES.has(normalizedStatus)) {
      throw Object.assign(new Error(`statusCode must be one of: ${Array.from(STATUS_CODES).join(', ')}`), {
        status: 422
      });
    }

    const update = await ProviderTransitionStatusUpdateModel.record(
      announcement.id,
      {
        announcementId: announcement.id,
        providerReference: payload.providerReference,
        statusCode: normalizedStatus,
        notes: payload.notes,
        recordedAt: payload.recordedAt ?? this.nowProvider()
      },
      { connection: db }
    );

    this.logger.info({
      event: 'provider-transition.status-recorded',
      slug,
      providerReference: update.providerReference,
      statusCode: update.statusCode
    });

    return serializeStatusUpdate(update);
  }
}

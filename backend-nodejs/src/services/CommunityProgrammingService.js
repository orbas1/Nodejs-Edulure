import db from '../config/database.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityWebinarModel from '../models/CommunityWebinarModel.js';
import CommunityEventModel from '../models/CommunityEventModel.js';
import CommunityPodcastEpisodeModel from '../models/CommunityPodcastEpisodeModel.js';
import CommunityGrowthExperimentModel from '../models/CommunityGrowthExperimentModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const MANAGER_ROLES = new Set(['owner', 'admin', 'moderator']);
const DEFAULT_CONFLICT_WINDOW_DAYS = 14;
const MIN_OVERLAP_MINUTES_DEFAULT = 30;
const MILLISECONDS_IN_MINUTE = 60 * 1000;
const SEVERITY_SCORE = { none: 0, low: 1, medium: 2, high: 3 };

function isActiveMembership(membership) {
  return membership?.status === 'active';
}

async function resolveCommunity(identifier) {
  if (!identifier) return null;
  if (Number.isInteger(Number(identifier))) {
    const record = await CommunityModel.findById(Number(identifier));
    return record ?? null;
  }
  return CommunityModel.findBySlug(String(identifier));
}

function assertReadAccess(community, membership, actorRole) {
  if (actorRole === 'admin') {
    return;
  }
  if (community.visibility !== 'private') {
    return;
  }
  if (isActiveMembership(membership)) {
    return;
  }
  const error = new Error('Community access denied');
  error.status = 403;
  throw error;
}

function assertManageAccess(membership, actorRole) {
  if (actorRole === 'admin') {
    return;
  }
  if (isActiveMembership(membership) && MANAGER_ROLES.has(membership.role)) {
    return;
  }
  const error = new Error('Community permissions required');
  error.status = 403;
  throw error;
}

function normaliseStatusList(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const list = value.map((entry) => String(entry).toLowerCase()).filter(Boolean);
    return list.length ? list : undefined;
  }
  const list = String(value)
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : undefined;
}

function coerceDate(value, fallback) {
  if (!value) {
    return fallback ? new Date(fallback.getTime()) : null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback ? new Date(fallback.getTime()) : null;
  }
  return date;
}

function computeEndFromDuration(start, durationMinutes, fallbackMinutes) {
  if (!start) return null;
  const duration = Number.isFinite(Number(durationMinutes)) ? Number(durationMinutes) : fallbackMinutes;
  const safeDuration = Math.max(5, Math.min(720, duration));
  return new Date(start.getTime() + safeDuration * MILLISECONDS_IN_MINUTE);
}

function computeOverlapMinutes(a, b) {
  if (!a?.start || !a?.end || !b?.start || !b?.end) {
    return 0;
  }
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  if (end <= start) {
    return 0;
  }
  return Math.round((end - start) / MILLISECONDS_IN_MINUTE);
}

function mapEventToSchedule(event) {
  const metadata = ensurePlainObject(event.metadata);
  const start = event.startAt ? new Date(event.startAt) : null;
  const end = event.endAt ? new Date(event.endAt) : computeEndFromDuration(start, metadata.durationMinutes, 90);
  return {
    kind: 'event',
    id: event.id,
    title: event.title,
    status: event.status,
    visibility: event.visibility,
    start,
    end,
    timezone: event.timezone ?? 'UTC',
    location: metadata.locationName ?? event.locationName ?? null,
    metadata
  };
}

function mapWebinarToSchedule(webinar) {
  const metadata = ensurePlainObject(webinar.metadata);
  const start = webinar.startAt ? new Date(webinar.startAt) : null;
  const end = computeEndFromDuration(start, metadata.durationMinutes ?? metadata.duration_minutes, 60);
  return {
    kind: 'webinar',
    id: webinar.id,
    title: webinar.topic,
    status: webinar.status,
    visibility: metadata.visibility ?? 'members',
    host: webinar.host,
    start,
    end,
    metadata
  };
}

function ensurePlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value;
}

function computeSeverity(a, b, overlapMinutes) {
  const highImpactStatuses = new Set(['live', 'announced']);
  const highVisibility = new Set(['public']);
  const aHigh = highImpactStatuses.has(String(a.status ?? '').toLowerCase()) || highVisibility.has(String(a.visibility ?? '').toLowerCase());
  const bHigh = highImpactStatuses.has(String(b.status ?? '').toLowerCase()) || highVisibility.has(String(b.visibility ?? '').toLowerCase());

  if (overlapMinutes >= 75 || (aHigh && bHigh && overlapMinutes >= 30)) {
    return 'high';
  }
  if (overlapMinutes >= 45 || aHigh || bHigh) {
    return 'medium';
  }
  return 'low';
}

function buildRecommendation(a, b, overlapMinutes) {
  const shiftMinutes = overlapMinutes + 15;
  if (SEVERITY_SCORE[computeSeverity(a, b, overlapMinutes)] >= SEVERITY_SCORE.high) {
    return `Reschedule "${b.title}" or "${a.title}" by at least ${shiftMinutes} minutes to avoid double booking.`;
  }
  if (overlapMinutes >= 45) {
    return `Consider pushing "${b.title}" back by ${shiftMinutes} minutes so attendees can transition from "${a.title}".`;
  }
  return `Add a ${Math.max(15, shiftMinutes)} minute buffer between "${a.title}" and "${b.title}" to protect setup time.`;
}

export default class CommunityProgrammingService {
  static async ensureContext(communityIdentifier, userId) {
    const community = await resolveCommunity(communityIdentifier);
    if (!community) {
      const error = new Error('Community not found');
      error.status = 404;
      throw error;
    }

    const membership = userId ? await CommunityMemberModel.findMembership(community.id, userId) : null;

    return { community, membership };
  }

  static async listWebinars(communityIdentifier, actor, filters = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);

    assertReadAccess(community, membership, actor?.role);

    const webinars = await CommunityWebinarModel.listForCommunity(community.id, {
      status: normaliseStatusList(filters.status),
      search: typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : undefined,
      order: filters.order,
      limit: filters.limit,
      offset: filters.offset
    });

    const canEdit = actor?.role === 'admin' || (isActiveMembership(membership) && MANAGER_ROLES.has(membership.role));

    const data = webinars.items.map((webinar) => ({
      ...webinar,
      permissions: {
        canEdit
      }
    }));

    return {
      data,
      pagination: {
        total: webinars.total,
        count: data.length,
        limit: webinars.limit,
        offset: webinars.offset
      }
    };
  }

  static async detectScheduleConflicts(communityIdentifier, actor, options = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    const now = new Date();
    const windowStart = coerceDate(options.from ?? options.windowStart, now);
    const defaultEnd = new Date(windowStart.getTime() + DEFAULT_CONFLICT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const windowEnd = coerceDate(options.to ?? options.windowEnd, defaultEnd);

    if (!windowStart || !windowEnd || windowEnd <= windowStart) {
      const error = new Error('Conflict analysis window must be positive and non-empty');
      error.status = 400;
      throw error;
    }

    const minimumOverlapMinutes = Number.isFinite(Number(options.minimumOverlapMinutes))
      ? Math.max(5, Math.min(720, Number(options.minimumOverlapMinutes)))
      : MIN_OVERLAP_MINUTES_DEFAULT;

    const [events, webinars] = await Promise.all([
      CommunityEventModel.listForCommunity(community.id, {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString(),
        status: ['scheduled', 'live'],
        order: 'asc',
        limit: 200
      }),
      CommunityWebinarModel.listForCommunity(community.id, {
        status: ['announced', 'live', 'draft'],
        order: 'asc',
        limit: 200
      })
    ]);

    const eventItems = Array.isArray(events) ? events : [];
    const webinarItems = Array.isArray(webinars?.items) ? webinars.items : [];

    const scheduleEntries = [
      ...eventItems.map(mapEventToSchedule),
      ...webinarItems.map(mapWebinarToSchedule)
    ].filter((entry) => entry.start && entry.end && entry.end > entry.start);

    scheduleEntries.sort((a, b) => a.start.getTime() - b.start.getTime());

    const conflicts = [];
    for (let index = 0; index < scheduleEntries.length; index += 1) {
      const current = scheduleEntries[index];
      for (let other = index + 1; other < scheduleEntries.length; other += 1) {
        const candidate = scheduleEntries[other];
        if (!candidate.start || candidate.start >= current.end) {
          break;
        }
        const overlapMinutes = computeOverlapMinutes(current, candidate);
        if (overlapMinutes >= minimumOverlapMinutes) {
          const overlapStart = new Date(Math.max(current.start.getTime(), candidate.start.getTime()));
          const overlapEnd = new Date(Math.min(current.end.getTime(), candidate.end.getTime()));
          const severity = computeSeverity(current, candidate, overlapMinutes);
          conflicts.push({
            id: `${current.kind}-${current.id}__${candidate.kind}-${candidate.id}`,
            severity,
            overlapMinutes,
            overlapWindow: {
              start: overlapStart.toISOString(),
              end: overlapEnd.toISOString()
            },
            items: [
              {
                kind: current.kind,
                id: current.id,
                title: current.title,
                status: current.status,
                visibility: current.visibility,
                startAt: current.start.toISOString(),
                endAt: current.end.toISOString(),
                timezone: current.timezone ?? community.timezone ?? 'UTC',
                location: current.location ?? null
              },
              {
                kind: candidate.kind,
                id: candidate.id,
                title: candidate.title,
                status: candidate.status,
                visibility: candidate.visibility,
                startAt: candidate.start.toISOString(),
                endAt: candidate.end.toISOString(),
                timezone: candidate.timezone ?? community.timezone ?? 'UTC',
                location: candidate.location ?? null
              }
            ],
            recommendation: buildRecommendation(current, candidate, overlapMinutes)
          });
        }
      }
    }

    const highestSeverity = conflicts.reduce((acc, conflict) => {
      return SEVERITY_SCORE[conflict.severity] > SEVERITY_SCORE[acc] ? conflict.severity : acc;
    }, conflicts.length ? 'low' : 'none');

    const conflictRate = scheduleEntries.length
      ? Number(((conflicts.length * 2) / scheduleEntries.length).toFixed(2))
      : 0;

    return {
      window: {
        from: windowStart.toISOString(),
        to: windowEnd.toISOString()
      },
      minimumOverlapMinutes,
      totals: {
        events: eventItems.length,
        webinars: webinarItems.length,
        scheduleEntries: scheduleEntries.length,
        conflicts: conflicts.length
      },
      summary: {
        highestSeverity,
        conflictRate
      },
      conflicts
    };
  }

  static async createWebinar(communityIdentifier, actor, payload) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    return db.transaction(async (trx) => {
      const webinar = await CommunityWebinarModel.create(
        {
          communityId: community.id,
          createdBy: actor?.id ?? null,
          topic: payload.topic,
          host: payload.host,
          startAt: payload.startAt,
          status: payload.status ?? 'draft',
          registrantCount: payload.registrantCount ?? 0,
          watchUrl: payload.watchUrl ?? null,
          description: payload.description ?? null,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_webinar',
          entityId: webinar.id,
          eventType: 'community.webinar.created',
          payload: {
            communityId: community.id,
            topic: webinar.topic,
            startAt: webinar.startAt,
            status: webinar.status
          },
          performedBy: actor?.id ?? null
        },
        trx
      );

      return webinar;
    });
  }

  static async updateWebinar(communityIdentifier, webinarId, actor, updates = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    const webinar = await CommunityWebinarModel.findById(webinarId);
    if (!webinar || webinar.communityId !== community.id) {
      const error = new Error('Webinar not found');
      error.status = 404;
      throw error;
    }

    const next = await CommunityWebinarModel.update(webinarId, updates);

    await DomainEventModel.record({
      entityType: 'community_webinar',
      entityId: webinarId,
      eventType: 'community.webinar.updated',
      payload: {
        communityId: community.id,
        topic: next.topic,
        status: next.status
      },
      performedBy: actor?.id ?? null
    });

    return next;
  }

  static async deleteWebinar(communityIdentifier, webinarId, actor) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
    assertManageAccess(membership, actor?.role);

    const webinar = await CommunityWebinarModel.findById(webinarId);
    if (!webinar || webinar.communityId !== community.id) {
      const error = new Error('Webinar not found');
      error.status = 404;
      throw error;
    }

    await CommunityWebinarModel.delete(webinarId);

    await DomainEventModel.record({
      entityType: 'community_webinar',
      entityId: webinarId,
      eventType: 'community.webinar.deleted',
      payload: {
        communityId: community.id,
        topic: webinar.topic
      },
      performedBy: actor?.id ?? null
    });
  }

  static async listPodcastEpisodes(communityIdentifier, actor, filters = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertReadAccess(community, membership, actor?.role);

    const episodes = await CommunityPodcastEpisodeModel.listForCommunity(community.id, {
      stage: normaliseStatusList(filters.stage),
      search: typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : undefined,
      order: filters.order,
      limit: filters.limit,
      offset: filters.offset
    });

    const canEdit = actor?.role === 'admin' || (isActiveMembership(membership) && MANAGER_ROLES.has(membership.role));

    const data = episodes.items.map((episode) => ({
      ...episode,
      permissions: {
        canEdit
      }
    }));

    return {
      data,
      pagination: {
        total: episodes.total,
        count: data.length,
        limit: episodes.limit,
        offset: episodes.offset
      }
    };
  }

  static async createPodcastEpisode(communityIdentifier, actor, payload) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    return db.transaction(async (trx) => {
      const episode = await CommunityPodcastEpisodeModel.create(
        {
          communityId: community.id,
          createdBy: actor?.id ?? null,
          title: payload.title,
          host: payload.host,
          stage: payload.stage ?? 'planning',
          releaseOn: payload.releaseOn ?? null,
          durationMinutes: payload.durationMinutes ?? 0,
          summary: payload.summary ?? null,
          audioUrl: payload.audioUrl ?? null,
          coverArtUrl: payload.coverArtUrl ?? null,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_podcast_episode',
          entityId: episode.id,
          eventType: 'community.podcast.episode.created',
          payload: {
            communityId: community.id,
            title: episode.title,
            stage: episode.stage
          },
          performedBy: actor?.id ?? null
        },
        trx
      );

      return episode;
    });
  }

  static async updatePodcastEpisode(communityIdentifier, episodeId, actor, updates = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    const episode = await CommunityPodcastEpisodeModel.findById(episodeId);
    if (!episode || episode.communityId !== community.id) {
      const error = new Error('Podcast episode not found');
      error.status = 404;
      throw error;
    }

    const next = await CommunityPodcastEpisodeModel.update(episodeId, updates);

    await DomainEventModel.record({
      entityType: 'community_podcast_episode',
      entityId: episodeId,
      eventType: 'community.podcast.episode.updated',
      payload: {
        communityId: community.id,
        title: next.title,
        stage: next.stage
      },
      performedBy: actor?.id ?? null
    });

    return next;
  }

  static async deletePodcastEpisode(communityIdentifier, episodeId, actor) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    const episode = await CommunityPodcastEpisodeModel.findById(episodeId);
    if (!episode || episode.communityId !== community.id) {
      const error = new Error('Podcast episode not found');
      error.status = 404;
      throw error;
    }

    await CommunityPodcastEpisodeModel.delete(episodeId);

    await DomainEventModel.record({
      entityType: 'community_podcast_episode',
      entityId: episodeId,
      eventType: 'community.podcast.episode.deleted',
      payload: {
        communityId: community.id,
        title: episode.title
      },
      performedBy: actor?.id ?? null
    });
  }

  static async listGrowthExperiments(communityIdentifier, actor, filters = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertReadAccess(community, membership, actor?.role);

    const experiments = await CommunityGrowthExperimentModel.listForCommunity(community.id, {
      status: normaliseStatusList(filters.status),
      search: typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : undefined,
      order: filters.order,
      limit: filters.limit,
      offset: filters.offset
    });

    const canEdit = actor?.role === 'admin' || (isActiveMembership(membership) && MANAGER_ROLES.has(membership.role));

    const data = experiments.items.map((experiment) => ({
      ...experiment,
      permissions: {
        canEdit
      }
    }));

    return {
      data,
      pagination: {
        total: experiments.total,
        count: data.length,
        limit: experiments.limit,
        offset: experiments.offset
      }
    };
  }

  static async createGrowthExperiment(communityIdentifier, actor, payload) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    return db.transaction(async (trx) => {
      const experiment = await CommunityGrowthExperimentModel.create(
        {
          communityId: community.id,
          createdBy: actor?.id ?? null,
          title: payload.title,
          ownerName: payload.ownerName ?? null,
          status: payload.status ?? 'ideation',
          targetMetric: payload.targetMetric ?? null,
          baselineValue: payload.baselineValue ?? null,
          targetValue: payload.targetValue ?? null,
          impactScore: payload.impactScore ?? null,
          startDate: payload.startDate ?? null,
          endDate: payload.endDate ?? null,
          hypothesis: payload.hypothesis ?? null,
          notes: payload.notes ?? null,
          experimentUrl: payload.experimentUrl ?? null,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_growth_experiment',
          entityId: experiment.id,
          eventType: 'community.growth.experiment.created',
          payload: {
            communityId: community.id,
            title: experiment.title,
            status: experiment.status
          },
          performedBy: actor?.id ?? null
        },
        trx
      );

      return experiment;
    });
  }

  static async updateGrowthExperiment(communityIdentifier, experimentId, actor, updates = {}) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id);
    assertManageAccess(membership, actor?.role);

    const experiment = await CommunityGrowthExperimentModel.findById(experimentId);
    if (!experiment || experiment.communityId !== community.id) {
      const error = new Error('Growth experiment not found');
      error.status = 404;
      throw error;
    }

    const next = await CommunityGrowthExperimentModel.update(experimentId, updates);

    await DomainEventModel.record({
      entityType: 'community_growth_experiment',
      entityId: experimentId,
      eventType: 'community.growth.experiment.updated',
      payload: {
        communityId: community.id,
        title: next.title,
        status: next.status
      },
      performedBy: actor?.id ?? null
    });

    return next;
  }

  static async deleteGrowthExperiment(communityIdentifier, experimentId, actor) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
    assertManageAccess(membership, actor?.role);

    const experiment = await CommunityGrowthExperimentModel.findById(experimentId);
    if (!experiment || experiment.communityId !== community.id) {
      const error = new Error('Growth experiment not found');
      error.status = 404;
      throw error;
    }

    await CommunityGrowthExperimentModel.delete(experimentId);

    await DomainEventModel.record({
      entityType: 'community_growth_experiment',
      entityId: experimentId,
      eventType: 'community.growth.experiment.deleted',
      payload: {
        communityId: community.id,
        title: experiment.title
      },
      performedBy: actor?.id ?? null
    });
  }
}

import db from '../config/database.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityWebinarModel from '../models/CommunityWebinarModel.js';
import CommunityPodcastEpisodeModel from '../models/CommunityPodcastEpisodeModel.js';
import CommunityGrowthExperimentModel from '../models/CommunityGrowthExperimentModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const MANAGER_ROLES = new Set(['owner', 'admin', 'moderator']);

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

export default class CommunityProgrammingService {
  static async ensureContext(communityIdentifier, userId, actorRole) {
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
    const { community, membership } = await this.ensureContext(
      communityIdentifier,
      actor?.id,
      actor?.role
    );

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

  static async createWebinar(communityIdentifier, actor, payload) {
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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
    const { community, membership } = await this.ensureContext(
      communityIdentifier,
      actor?.id,
      actor?.role
    );
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
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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
    const { community, membership } = await this.ensureContext(
      communityIdentifier,
      actor?.id,
      actor?.role
    );
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
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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
    const { community, membership } = await this.ensureContext(communityIdentifier, actor?.id, actor?.role);
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

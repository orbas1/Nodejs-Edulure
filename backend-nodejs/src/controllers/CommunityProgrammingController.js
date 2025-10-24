import Joi from 'joi';

import CommunityProgrammingService from '../services/CommunityProgrammingService.js';
import { paginated, success } from '../utils/httpResponse.js';

const webinarStatusEnum = ['draft', 'announced', 'live', 'complete', 'cancelled'];
const podcastStageEnum = ['planning', 'recording', 'editing', 'qa', 'scheduled', 'live', 'archived'];
const growthStatusEnum = ['ideation', 'design', 'building', 'live', 'completed', 'archived'];

const listQuerySchema = Joi.object({
  status: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  stage: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
  search: Joi.string().allow('', null),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional()
});

const webinarMutationSchema = Joi.object({
  topic: Joi.string().trim().min(3).max(240),
  host: Joi.string().trim().min(2).max(160),
  startAt: Joi.date().iso().raw(),
  status: Joi.string()
    .valid(...webinarStatusEnum)
    .optional(),
  registrantCount: Joi.number().integer().min(0).optional(),
  watchUrl: Joi.string().uri().allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  metadata: Joi.object().optional()
}).custom((value) => {
  const next = { ...value };
  if (next.watchUrl === '') next.watchUrl = null;
  if (next.description === '') next.description = null;
  return next;
});

const podcastMutationSchema = Joi.object({
  title: Joi.string().trim().min(3).max(240),
  host: Joi.string().trim().min(2).max(160),
  stage: Joi.string()
    .valid(...podcastStageEnum)
    .optional(),
  releaseOn: Joi.date().iso().optional(),
  durationMinutes: Joi.number().integer().min(0).optional(),
  summary: Joi.string().allow('', null).optional(),
  audioUrl: Joi.string().uri().allow('', null).optional(),
  coverArtUrl: Joi.string().uri().allow('', null).optional(),
  metadata: Joi.object().optional()
}).custom((value) => {
  const next = { ...value };
  if (next.summary === '') next.summary = null;
  if (next.audioUrl === '') next.audioUrl = null;
  if (next.coverArtUrl === '') next.coverArtUrl = null;
  return next;
});

const growthMutationSchema = Joi.object({
  title: Joi.string().trim().min(3).max(240),
  ownerName: Joi.string().trim().max(160).allow('', null),
  status: Joi.string()
    .valid(...growthStatusEnum)
    .optional(),
  targetMetric: Joi.string().trim().max(160).allow('', null),
  baselineValue: Joi.number().precision(2).allow(null).optional(),
  targetValue: Joi.number().precision(2).allow(null).optional(),
  impactScore: Joi.number().precision(2).allow(null).optional(),
  startDate: Joi.date().iso().allow(null).optional(),
  endDate: Joi.date().iso().allow(null).optional(),
  hypothesis: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  experimentUrl: Joi.string().uri().allow('', null).optional(),
  metadata: Joi.object().optional()
}).custom((value) => {
  const next = { ...value };
  if (next.ownerName === '') next.ownerName = null;
  if (next.targetMetric === '') next.targetMetric = null;
  if (next.hypothesis === '') next.hypothesis = null;
  if (next.notes === '') next.notes = null;
  if (next.experimentUrl === '') next.experimentUrl = null;
  return next;
});

const conflictQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  windowStart: Joi.date().iso().optional(),
  windowEnd: Joi.date().iso().optional(),
  minimumOverlapMinutes: Joi.number().integer().min(5).max(720).default(30)
});

function actorFromRequest(req) {
  return { id: req.user?.id ?? null, role: req.user?.role ?? null };
}

export default class CommunityProgrammingController {
  static async listWebinars(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const actor = actorFromRequest(req);
      const result = await CommunityProgrammingService.listWebinars(req.params.communityId, actor, query);
      const pagination = {
        total: result.pagination?.total ?? result.data.length,
        count: result.pagination?.count ?? result.data.length,
        limit: result.pagination?.limit ?? query.limit ?? result.data.length,
        offset: result.pagination?.offset ?? query.offset ?? 0
      };
      return paginated(res, {
        data: result.data,
        pagination,
        meta: {
          filters: {
            status: query.status ?? null,
            search: query.search ?? null
          }
        },
        message: 'Webinars retrieved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async detectScheduleConflicts(req, res, next) {
    try {
      const query = await conflictQuerySchema.validateAsync(req.query ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = actorFromRequest(req);
      const result = await CommunityProgrammingService.detectScheduleConflicts(req.params.communityId, actor, query);
      return success(res, { data: result, message: 'Schedule conflicts analysed' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createWebinar(req, res, next) {
    try {
      const payload = await webinarMutationSchema
        .fork(['topic', 'host', 'startAt'], (schema) => schema.required())
        .validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actor = actorFromRequest(req);
      const webinar = await CommunityProgrammingService.createWebinar(req.params.communityId, actor, payload);
      return success(res, { data: webinar, message: 'Webinar created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateWebinar(req, res, next) {
    try {
      const payload = await webinarMutationSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = actorFromRequest(req);
      const webinar = await CommunityProgrammingService.updateWebinar(
        req.params.communityId,
        req.params.webinarId,
        actor,
        payload
      );
      return success(res, { data: webinar, message: 'Webinar updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteWebinar(req, res, next) {
    try {
      const actor = actorFromRequest(req);
      await CommunityProgrammingService.deleteWebinar(req.params.communityId, req.params.webinarId, actor);
      return success(res, { data: null, message: 'Webinar deleted' });
    } catch (error) {
      return next(error);
    }
  }

  static async listPodcastEpisodes(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const actor = actorFromRequest(req);
      const result = await CommunityProgrammingService.listPodcastEpisodes(req.params.communityId, actor, query);
      const pagination = {
        total: result.pagination?.total ?? result.data.length,
        count: result.pagination?.count ?? result.data.length,
        limit: result.pagination?.limit ?? query.limit ?? result.data.length,
        offset: result.pagination?.offset ?? query.offset ?? 0
      };
      return paginated(res, {
        data: result.data,
        pagination,
        meta: {
          filters: {
            stage: query.stage ?? null,
            search: query.search ?? null
          }
        },
        message: 'Podcast episodes retrieved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createPodcastEpisode(req, res, next) {
    try {
      const payload = await podcastMutationSchema
        .fork(['title', 'host'], (schema) => schema.required())
        .validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actor = actorFromRequest(req);
      const episode = await CommunityProgrammingService.createPodcastEpisode(req.params.communityId, actor, payload);
      return success(res, { data: episode, message: 'Podcast episode created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updatePodcastEpisode(req, res, next) {
    try {
      const payload = await podcastMutationSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = actorFromRequest(req);
      const episode = await CommunityProgrammingService.updatePodcastEpisode(
        req.params.communityId,
        req.params.episodeId,
        actor,
        payload
      );
      return success(res, { data: episode, message: 'Podcast episode updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deletePodcastEpisode(req, res, next) {
    try {
      const actor = actorFromRequest(req);
      await CommunityProgrammingService.deletePodcastEpisode(
        req.params.communityId,
        req.params.episodeId,
        actor
      );
      return success(res, { data: null, message: 'Podcast episode deleted' });
    } catch (error) {
      return next(error);
    }
  }

  static async listGrowthExperiments(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const actor = actorFromRequest(req);
      const result = await CommunityProgrammingService.listGrowthExperiments(
        req.params.communityId,
        actor,
        query
      );
      const pagination = {
        total: result.pagination?.total ?? result.data.length,
        count: result.pagination?.count ?? result.data.length,
        limit: result.pagination?.limit ?? query.limit ?? result.data.length,
        offset: result.pagination?.offset ?? query.offset ?? 0
      };
      return paginated(res, {
        data: result.data,
        pagination,
        meta: {
          filters: {
            status: query.status ?? null,
            search: query.search ?? null
          }
        },
        message: 'Growth experiments retrieved'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createGrowthExperiment(req, res, next) {
    try {
      const payload = await growthMutationSchema
        .fork(['title'], (schema) => schema.required())
        .validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actor = actorFromRequest(req);
      const experiment = await CommunityProgrammingService.createGrowthExperiment(
        req.params.communityId,
        actor,
        payload
      );
      return success(res, { data: experiment, message: 'Growth experiment created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateGrowthExperiment(req, res, next) {
    try {
      const payload = await growthMutationSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const actor = actorFromRequest(req);
      const experiment = await CommunityProgrammingService.updateGrowthExperiment(
        req.params.communityId,
        req.params.experimentId,
        actor,
        payload
      );
      return success(res, { data: experiment, message: 'Growth experiment updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteGrowthExperiment(req, res, next) {
    try {
      const actor = actorFromRequest(req);
      await CommunityProgrammingService.deleteGrowthExperiment(
        req.params.communityId,
        req.params.experimentId,
        actor
      );
      return success(res, { data: null, message: 'Growth experiment deleted' });
    } catch (error) {
      return next(error);
    }
  }
}

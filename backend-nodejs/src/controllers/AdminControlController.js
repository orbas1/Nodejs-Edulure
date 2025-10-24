import { randomUUID } from 'node:crypto';

import Joi from 'joi';

import db from '../config/database.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityModel from '../models/CommunityModel.js';
import CourseModel from '../models/CourseModel.js';
import EbookModel from '../models/EbookModel.js';
import LiveClassroomModel from '../models/LiveClassroomModel.js';
import PodcastEpisodeModel from '../models/PodcastEpisodeModel.js';
import PodcastShowModel from '../models/PodcastShowModel.js';
import TutorProfileModel from '../models/TutorProfileModel.js';
import { paginated, success } from '../utils/httpResponse.js';
import adminOperationsOverviewService from '../services/AdminOperationsOverviewService.js';
import { LEARNING_CLUSTER_KEYS } from '../utils/learningClusters.js';

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().allow('', null),
  status: Joi.string().trim().max(120).optional()
});

const communityCreateSchema = Joi.object({
  name: Joi.string().trim().max(150).required(),
  slug: Joi.string().trim().max(160).optional(),
  description: Joi.string().max(5000).allow('', null).optional(),
  coverImageUrl: Joi.string().uri().allow('', null).optional(),
  visibility: Joi.string().valid('public', 'private').default('public'),
  ownerId: Joi.number().integer().positive().required(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const communityUpdateSchema = communityCreateSchema.fork(['name', 'ownerId'], (schema) => schema.optional());

const courseCreateSchema = Joi.object({
  instructorId: Joi.number().integer().positive().required(),
  title: Joi.string().trim().max(200).required(),
  slug: Joi.string().trim().max(220).optional(),
  summary: Joi.string().trim().max(500).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('beginner'),
  category: Joi.string().trim().max(120).default('general'),
  clusterKey: Joi.string().valid(...LEARNING_CLUSTER_KEYS).default('general'),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  languages: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(5)), Joi.string().allow('', null)).optional(),
  deliveryFormat: Joi.string().valid('self_paced', 'cohort', 'live', 'blended').default('self_paced'),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  heroImageUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  trailerUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  promoVideoUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  syllabusUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  priceCurrency: Joi.string().length(3).uppercase().default('USD'),
  priceAmount: Joi.alternatives().try(Joi.number(), Joi.string()).default(0),
  isPublished: Joi.boolean().default(false),
  releaseAt: Joi.date().iso().allow(null).optional(),
  status: Joi.string().valid('draft', 'review', 'published', 'archived').default('draft'),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const courseUpdateSchema = courseCreateSchema
  .fork(['title', 'instructorId'], (schema) => schema.optional())
  .fork(['clusterKey'], (schema) => schema.optional().default(undefined));

const tutorCreateSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  displayName: Joi.string().trim().max(200).required(),
  headline: Joi.string().trim().max(250).allow('', null).optional(),
  bio: Joi.string().allow('', null).optional(),
  skills: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  languages: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(5)), Joi.string().allow('', null)).optional(),
  country: Joi.string().length(2).uppercase().allow('', null).optional(),
  timezones: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(60)), Joi.string().allow('', null)).optional(),
  availabilityPreferences: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).optional(),
  hourlyRateCurrency: Joi.string().length(3).uppercase().default('USD'),
  hourlyRateAmount: Joi.alternatives().try(Joi.number(), Joi.string()).default(0),
  isVerified: Joi.boolean().default(false),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const tutorUpdateSchema = tutorCreateSchema.fork(['displayName', 'userId'], (schema) => schema.optional());

const ebookCreateSchema = Joi.object({
  assetId: Joi.string().guid({ version: 'uuidv4' }).required(),
  title: Joi.string().trim().max(250).required(),
  subtitle: Joi.string().trim().max(500).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  authors: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  categories: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  languages: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(5)), Joi.string().allow('', null)).optional(),
  isbn: Joi.string().trim().max(32).allow('', null).optional(),
  coverImageUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  sampleDownloadUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  audiobookUrl: Joi.string().trim().uri().allow(null).empty('').optional(),
  readingTimeMinutes: Joi.number().integer().min(0).max(100000).optional(),
  priceCurrency: Joi.string().length(3).uppercase().default('USD'),
  priceAmount: Joi.alternatives().try(Joi.number(), Joi.string()).default(0),
  status: Joi.string().valid('draft', 'review', 'published', 'archived').default('draft'),
  isPublic: Joi.boolean().default(false),
  releaseAt: Joi.date().iso().allow(null).optional(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const ebookUpdateSchema = ebookCreateSchema.fork(['title', 'assetId'], (schema) => schema.optional());

const liveStreamCreateSchema = Joi.object({
  communityId: Joi.number().integer().positive().allow(null).optional(),
  instructorId: Joi.number().integer().positive().allow(null).optional(),
  title: Joi.string().trim().max(250).required(),
  slug: Joi.string().trim().max(220).optional(),
  summary: Joi.string().trim().max(500).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  type: Joi.string().valid('workshop', 'webinar', 'coaching', 'office_hours').default('workshop'),
  status: Joi.string().valid('draft', 'scheduled', 'live', 'completed', 'cancelled').default('draft'),
  isTicketed: Joi.boolean().default(false),
  priceCurrency: Joi.string().length(3).uppercase().default('USD'),
  priceAmount: Joi.alternatives().try(Joi.number(), Joi.string()).default(0),
  capacity: Joi.number().integer().min(0).default(0),
  reservedSeats: Joi.number().integer().min(0).default(0),
  timezone: Joi.string().trim().max(60).default('Etc/UTC'),
  startAt: Joi.date().iso().required(),
  endAt: Joi.date().iso().required(),
  topics: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(120)), Joi.string().allow('', null)).optional(),
  clusterKey: Joi.string().valid(...LEARNING_CLUSTER_KEYS).default('general'),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const liveStreamUpdateSchema = liveStreamCreateSchema
  .fork(['title', 'startAt', 'endAt'], (schema) => schema.optional())
  .fork(['clusterKey'], (schema) => schema.optional().default(undefined));

const podcastShowCreateSchema = Joi.object({
  communityId: Joi.number().integer().positive().allow(null).optional(),
  ownerId: Joi.number().integer().positive().allow(null).optional(),
  title: Joi.string().trim().max(200).required(),
  slug: Joi.string().trim().max(220).optional(),
  subtitle: Joi.string().trim().max(300).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  coverImageUrl: Joi.string().uri().allow('', null).optional(),
  category: Joi.string().trim().max(120).allow('', null).optional(),
  status: Joi.string().valid('draft', 'in_production', 'scheduled', 'published', 'archived').default('draft'),
  isPublic: Joi.boolean().default(false),
  distributionChannels: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(80)), Joi.string().allow('', null)).optional(),
  launchAt: Joi.date().iso().allow(null).optional(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const podcastShowUpdateSchema = podcastShowCreateSchema.fork(['title'], (schema) => schema.optional());

const podcastEpisodeCreateSchema = Joi.object({
  showId: Joi.number().integer().positive().required(),
  title: Joi.string().trim().max(200).required(),
  slug: Joi.string().trim().max(220).optional(),
  summary: Joi.string().trim().max(500).allow('', null).optional(),
  description: Joi.string().allow('', null).optional(),
  audioUrl: Joi.string().uri().allow('', null).optional(),
  videoUrl: Joi.string().uri().allow('', null).optional(),
  durationSeconds: Joi.number().integer().min(0).default(0),
  seasonNumber: Joi.number().integer().min(1).default(1),
  episodeNumber: Joi.number().integer().min(1).default(1),
  status: Joi.string().valid('draft', 'editing', 'scheduled', 'published', 'archived').default('draft'),
  publishAt: Joi.date().iso().allow(null).optional(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const podcastEpisodeUpdateSchema = podcastEpisodeCreateSchema.fork(['title', 'showId'], (schema) => schema.optional());

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim());
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function toObject(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed };
      }
    } catch (_error) {
      return { ...fallback };
    }
  }
  return { ...fallback };
}

function toMinorUnits(amount) {
  if (amount === null || amount === undefined) {
    return 0;
  }
  const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
}

function buildPagination(page, perPage, total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return {
    page,
    perPage,
    total,
    totalPages
  };
}

function normaliseSearchTerm(search) {
  if (!search || typeof search !== 'string') {
    return undefined;
  }
  const trimmed = search.trim();
  return trimmed.length ? trimmed : undefined;
}

export default class AdminControlController {
  static async listCommunities(req, res, next) {
    try {
      const query = await listQuerySchema.keys({ visibility: Joi.string().valid('public', 'private').optional() }).validateAsync(
        req.query,
        { abortEarly: false, stripUnknown: true }
      );
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const visibility = query.visibility;
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        CommunityModel.listAll({ search, visibility, limit: perPage, offset }),
        CommunityModel.countAll({ search, visibility })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'Communities loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createCommunity(req, res, next) {
    try {
      const payload = await communityCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const metadata = toObject(payload.metadata);

      const community = await db.transaction(async (trx) => {
        const created = await CommunityModel.create({
          ...payload,
          metadata
        }, trx);
        await CommunityMemberModel.ensureMembership(created.id, payload.ownerId, { role: 'owner', status: 'active' }, trx);
        return CommunityModel.findById(created.id, trx);
      });

      return success(res, { data: community, message: 'Community created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateCommunity(req, res, next) {
    try {
      const payload = await communityUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const metadata = payload.metadata !== undefined ? toObject(payload.metadata) : undefined;
      const communityId = Number.parseInt(req.params.communityId, 10);
      if (Number.isNaN(communityId)) {
        return next(Object.assign(new Error('Invalid community id'), { status: 400 }));
      }

      const community = await db.transaction(async (trx) => {
        const updated = await CommunityModel.updateById(
          communityId,
          {
            ...payload,
            metadata
          },
          trx
        );
        if (payload.ownerId !== undefined && payload.ownerId !== null) {
          await CommunityMemberModel.ensureMembership(
            communityId,
            payload.ownerId,
            { role: 'owner', status: 'active' },
            trx
          );
        }
        return updated;
      });

      return success(res, { data: community, message: 'Community updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteCommunity(req, res, next) {
    try {
      const communityId = Number.parseInt(req.params.communityId, 10);
      if (Number.isNaN(communityId)) {
        return next(Object.assign(new Error('Invalid community id'), { status: 400 }));
      }
      await CommunityModel.softDeleteById(communityId);
      return success(res, { data: null, message: 'Community archived', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async listCourses(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const status = normaliseSearchTerm(query.status);
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        CourseModel.listAll({ search, status, limit: perPage, offset }),
        CourseModel.countAll({ search, status })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'Courses loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createCourse(req, res, next) {
    try {
      const payload = await courseCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const course = await CourseModel.create({
        ...payload,
        publicId: randomUUID(),
        skills: toArray(payload.skills),
        tags: toArray(payload.tags),
        languages: toArray(payload.languages),
        priceAmount: toMinorUnits(payload.priceAmount),
        metadata: toObject(payload.metadata)
      });

      return success(res, { data: course, message: 'Course created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateCourse(req, res, next) {
    try {
      const payload = await courseUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const courseId = Number.parseInt(req.params.courseId, 10);
      if (Number.isNaN(courseId)) {
        return next(Object.assign(new Error('Invalid course id'), { status: 400 }));
      }

      const course = await CourseModel.updateById(courseId, {
        ...payload,
        skills: payload.skills !== undefined ? toArray(payload.skills) : undefined,
        tags: payload.tags !== undefined ? toArray(payload.tags) : undefined,
        languages: payload.languages !== undefined ? toArray(payload.languages) : undefined,
        priceAmount: payload.priceAmount !== undefined ? toMinorUnits(payload.priceAmount) : undefined,
        metadata: payload.metadata !== undefined ? toObject(payload.metadata) : undefined
      });

      return success(res, { data: course, message: 'Course updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteCourse(req, res, next) {
    try {
      const courseId = Number.parseInt(req.params.courseId, 10);
      if (Number.isNaN(courseId)) {
        return next(Object.assign(new Error('Invalid course id'), { status: 400 }));
      }
      await CourseModel.deleteById(courseId);
      return success(res, { data: null, message: 'Course deleted', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async listTutors(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        TutorProfileModel.listAll({ search, limit: perPage, offset }),
        TutorProfileModel.countAll({ search })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'Tutor profiles loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createTutor(req, res, next) {
    try {
      const payload = await tutorCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const tutor = await TutorProfileModel.create({
        ...payload,
        skills: toArray(payload.skills),
        languages: toArray(payload.languages),
        timezones: toArray(payload.timezones),
        availabilityPreferences: toObject(payload.availabilityPreferences),
        hourlyRateAmount: toMinorUnits(payload.hourlyRateAmount),
        metadata: toObject(payload.metadata)
      });

      return success(res, { data: tutor, message: 'Tutor profile created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateTutor(req, res, next) {
    try {
      const payload = await tutorUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const tutorId = Number.parseInt(req.params.tutorId, 10);
      if (Number.isNaN(tutorId)) {
        return next(Object.assign(new Error('Invalid tutor id'), { status: 400 }));
      }

      const tutor = await TutorProfileModel.updateById(tutorId, {
        ...payload,
        skills: payload.skills !== undefined ? toArray(payload.skills) : undefined,
        languages: payload.languages !== undefined ? toArray(payload.languages) : undefined,
        timezones: payload.timezones !== undefined ? toArray(payload.timezones) : undefined,
        availabilityPreferences:
          payload.availabilityPreferences !== undefined ? toObject(payload.availabilityPreferences) : undefined,
        hourlyRateAmount: payload.hourlyRateAmount !== undefined ? toMinorUnits(payload.hourlyRateAmount) : undefined,
        metadata: payload.metadata !== undefined ? toObject(payload.metadata) : undefined
      });

      return success(res, { data: tutor, message: 'Tutor profile updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteTutor(req, res, next) {
    try {
      const tutorId = Number.parseInt(req.params.tutorId, 10);
      if (Number.isNaN(tutorId)) {
        return next(Object.assign(new Error('Invalid tutor id'), { status: 400 }));
      }
      await TutorProfileModel.deleteById(tutorId);
      return success(res, { data: null, message: 'Tutor profile removed', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async listEbooks(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const status = normaliseSearchTerm(query.status);
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        EbookModel.listAll({ search, status, limit: perPage, offset }),
        EbookModel.countAll({ search, status })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'E-books loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createEbook(req, res, next) {
    try {
      const payload = await ebookCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const ebook = await EbookModel.create({
        ...payload,
        publicId: randomUUID(),
        authors: toArray(payload.authors),
        tags: toArray(payload.tags),
        categories: toArray(payload.categories),
        languages: toArray(payload.languages),
        priceAmount: toMinorUnits(payload.priceAmount),
        metadata: toObject(payload.metadata)
      });

      return success(res, { data: ebook, message: 'E-book created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateEbook(req, res, next) {
    try {
      const payload = await ebookUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const ebookId = Number.parseInt(req.params.ebookId, 10);
      if (Number.isNaN(ebookId)) {
        return next(Object.assign(new Error('Invalid ebook id'), { status: 400 }));
      }

      const ebook = await EbookModel.updateById(ebookId, {
        ...payload,
        authors: payload.authors !== undefined ? toArray(payload.authors) : undefined,
        tags: payload.tags !== undefined ? toArray(payload.tags) : undefined,
        categories: payload.categories !== undefined ? toArray(payload.categories) : undefined,
        languages: payload.languages !== undefined ? toArray(payload.languages) : undefined,
        priceAmount: payload.priceAmount !== undefined ? toMinorUnits(payload.priceAmount) : undefined,
        metadata: payload.metadata !== undefined ? toObject(payload.metadata) : undefined
      });

      return success(res, { data: ebook, message: 'E-book updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteEbook(req, res, next) {
    try {
      const ebookId = Number.parseInt(req.params.ebookId, 10);
      if (Number.isNaN(ebookId)) {
        return next(Object.assign(new Error('Invalid ebook id'), { status: 400 }));
      }
      await EbookModel.deleteById(ebookId);
      return success(res, { data: null, message: 'E-book removed', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async listLiveStreams(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const status = normaliseSearchTerm(query.status);
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        LiveClassroomModel.listAll({ search, status, limit: perPage, offset }),
        LiveClassroomModel.countAll({ search, status })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'Live streams loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createLiveStream(req, res, next) {
    try {
      const payload = await liveStreamCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const liveStream = await LiveClassroomModel.create({
        ...payload,
        publicId: randomUUID(),
        priceAmount: toMinorUnits(payload.priceAmount),
        topics: toArray(payload.topics),
        metadata: toObject(payload.metadata)
      });

      return success(res, { data: liveStream, message: 'Live stream created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updateLiveStream(req, res, next) {
    try {
      const payload = await liveStreamUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const streamId = Number.parseInt(req.params.streamId, 10);
      if (Number.isNaN(streamId)) {
        return next(Object.assign(new Error('Invalid live stream id'), { status: 400 }));
      }

      const liveStream = await LiveClassroomModel.updateById(streamId, {
        ...payload,
        priceAmount: payload.priceAmount !== undefined ? toMinorUnits(payload.priceAmount) : undefined,
        topics: payload.topics !== undefined ? toArray(payload.topics) : undefined,
        metadata: payload.metadata !== undefined ? toObject(payload.metadata) : undefined
      });

      return success(res, { data: liveStream, message: 'Live stream updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deleteLiveStream(req, res, next) {
    try {
      const streamId = Number.parseInt(req.params.streamId, 10);
      if (Number.isNaN(streamId)) {
        return next(Object.assign(new Error('Invalid live stream id'), { status: 400 }));
      }
      await LiveClassroomModel.deleteById(streamId);
      return success(res, { data: null, message: 'Live stream removed', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async listPodcastShows(req, res, next) {
    try {
      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const status = normaliseSearchTerm(query.status);
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        PodcastShowModel.listAll({ search, status, limit: perPage, offset }),
        PodcastShowModel.countAll({ search, status })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'Podcast shows loaded'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async createPodcastShow(req, res, next) {
    try {
      const payload = await podcastShowCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const show = await PodcastShowModel.create({
        ...payload,
        distributionChannels: toArray(payload.distributionChannels),
        metadata: toObject(payload.metadata)
      });

      return success(res, { data: show, message: 'Podcast show created', status: 201 });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async updatePodcastShow(req, res, next) {
    try {
      const payload = await podcastShowUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const showId = Number.parseInt(req.params.showId, 10);
      if (Number.isNaN(showId)) {
        return next(Object.assign(new Error('Invalid podcast show id'), { status: 400 }));
      }

      const show = await PodcastShowModel.updateById(showId, {
        ...payload,
        distributionChannels:
          payload.distributionChannels !== undefined ? toArray(payload.distributionChannels) : undefined,
        metadata: payload.metadata !== undefined ? toObject(payload.metadata) : undefined
      });

      return success(res, { data: show, message: 'Podcast show updated' });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }

  static async deletePodcastShow(req, res, next) {
    try {
      const showId = Number.parseInt(req.params.showId, 10);
      if (Number.isNaN(showId)) {
        return next(Object.assign(new Error('Invalid podcast show id'), { status: 400 }));
      }
      await PodcastShowModel.deleteById(showId);
      return success(res, { data: null, message: 'Podcast show removed', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async listPodcastEpisodes(req, res, next) {
    try {
      const showId = Number.parseInt(req.params.showId, 10);
      if (Number.isNaN(showId)) {
        return next(Object.assign(new Error('Invalid podcast show id'), { status: 400 }));
      }

      const query = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const page = query.page;
      const perPage = query.perPage;
      const search = normaliseSearchTerm(query.search);
      const status = normaliseSearchTerm(query.status);
      const offset = (page - 1) * perPage;

      const [items, total] = await Promise.all([
        PodcastEpisodeModel.listByShow(showId, { search, status, limit: perPage, offset }),
        PodcastEpisodeModel.countByShow(showId, { search, status })
      ]);

      return paginated(res, {
        data: items,
        pagination: buildPagination(page, perPage, total),
        message: 'Podcast episodes loaded'
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
      const payload = await podcastEpisodeCreateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const episode = await PodcastEpisodeModel.create({
        ...payload,
        metadata: toObject(payload.metadata)
      });

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
      const payload = await podcastEpisodeUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const episodeId = Number.parseInt(req.params.episodeId, 10);
      if (Number.isNaN(episodeId)) {
        return next(Object.assign(new Error('Invalid podcast episode id'), { status: 400 }));
      }

      const episode = await PodcastEpisodeModel.updateById(episodeId, {
        ...payload,
        metadata: payload.metadata !== undefined ? toObject(payload.metadata) : undefined
      });

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
      const episodeId = Number.parseInt(req.params.episodeId, 10);
      if (Number.isNaN(episodeId)) {
        return next(Object.assign(new Error('Invalid podcast episode id'), { status: 400 }));
      }
      await PodcastEpisodeModel.deleteById(episodeId);
      return success(res, { data: null, message: 'Podcast episode removed', status: 204 });
    } catch (error) {
      return next(error);
    }
  }

  static async getOverview(req, res, next) {
    try {
      const overview = await adminOperationsOverviewService.getOverview({
        limit: req.query?.limit,
        auditLimit: req.query?.auditLimit,
        since: req.query?.since
      });
      return success(res, {
        data: overview,
        message: 'Admin operations overview generated'
      });
    } catch (error) {
      return next(error);
    }
  }
}

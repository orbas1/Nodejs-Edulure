import Joi from 'joi';

import LiveClassroomModel from '../models/LiveClassroomModel.js';
import CourseModel from '../models/CourseModel.js';
import TutorProfileModel from '../models/TutorProfileModel.js';
import PricingCatalogueService from '../services/PricingCatalogueService.js';
import { success } from '../utils/httpResponse.js';

const liveClassroomQuerySchema = Joi.object({
  search: Joi.string().trim().allow('', null),
  statuses: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid('scheduled', 'live', 'completed')).min(1),
      Joi.string().valid('scheduled', 'live', 'completed')
    )
    .default(['scheduled', 'live']),
  includePast: Joi.boolean().default(false),
  limit: Joi.number().integer().min(1).max(50).default(12),
  offset: Joi.number().integer().min(0).default(0)
});

const courseQuerySchema = Joi.object({
  search: Joi.string().trim().allow('', null),
  limit: Joi.number().integer().min(1).max(50).default(12),
  offset: Joi.number().integer().min(0).default(0)
});

const tutorQuerySchema = Joi.object({
  search: Joi.string().trim().allow('', null),
  verifiedOnly: Joi.boolean().default(true),
  limit: Joi.number().integer().min(1).max(50).default(12),
  offset: Joi.number().integer().min(0).default(0)
});

const planQuerySchema = Joi.object({
  tenantId: Joi.string().trim().max(120).default('global'),
  limit: Joi.number().integer().min(1).max(50).default(12)
});

function normaliseStatuses(statuses) {
  if (Array.isArray(statuses)) {
    return statuses;
  }
  if (typeof statuses === 'string' && statuses.length > 0) {
    return [statuses];
  }
  return undefined;
}

function withValidationStatus(error) {
  if (error && error.isJoi && !error.status) {
    error.status = 422;
  }
  return error;
}

function mapCourseToCatalogue(course) {
  if (!course) return null;
  const priceAmount = Number(course.priceAmount ?? 0);
  let formattedPrice = `${course.priceCurrency ?? 'USD'} ${priceAmount}`;
  if (Number.isFinite(priceAmount)) {
    try {
      formattedPrice = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: course.priceCurrency ?? 'USD'
      }).format(priceAmount);
    } catch (_error) {
      formattedPrice = `${course.priceCurrency ?? 'USD'} ${priceAmount}`;
    }
  }

  return {
    id: course.id,
    publicId: course.publicId ?? null,
    instructorId: course.instructorId ?? null,
    title: course.title,
    slug: course.slug,
    summary: course.summary ?? null,
    description: course.description ?? null,
    level: course.level ?? 'beginner',
    category: course.category ?? 'general',
    skills: course.skills ?? [],
    tags: course.tags ?? [],
    languages: course.languages ?? ['en'],
    deliveryFormat: course.deliveryFormat ?? 'self_paced',
    thumbnailUrl: course.thumbnailUrl ?? course.heroImageUrl ?? null,
    heroImageUrl: course.heroImageUrl ?? null,
    trailerUrl: course.trailerUrl ?? null,
    promoVideoUrl: course.promoVideoUrl ?? null,
    syllabusUrl: course.syllabusUrl ?? null,
    priceCurrency: course.priceCurrency ?? 'USD',
    priceAmount,
    price: formattedPrice,
    ratingAverage: course.ratingAverage ?? 0,
    ratingCount: course.ratingCount ?? 0,
    enrolmentCount: course.enrolmentCount ?? 0,
    isPublished: Boolean(course.isPublished),
    releaseAt: course.releaseAt ?? null,
    status: course.status ?? 'draft',
    metadata: course.metadata ?? {}
  };
}

function mapTutorToCatalogue(tutor) {
  if (!tutor) return null;
  const hourlyRateAmount = Number(tutor.hourlyRateAmount ?? 0);
  let formattedRate = `${tutor.hourlyRateCurrency ?? 'USD'} ${hourlyRateAmount}`;
  if (Number.isFinite(hourlyRateAmount)) {
    try {
      formattedRate = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: tutor.hourlyRateCurrency ?? 'USD'
      }).format(hourlyRateAmount);
    } catch (_error) {
      formattedRate = `${tutor.hourlyRateCurrency ?? 'USD'} ${hourlyRateAmount}`;
    }
  }

  return {
    id: tutor.id,
    userId: tutor.userId,
    displayName: tutor.displayName,
    headline: tutor.headline ?? null,
    bio: tutor.bio ?? null,
    skills: tutor.skills ?? [],
    languages: tutor.languages ?? ['en'],
    country: tutor.country ?? null,
    timezones: tutor.timezones ?? ['Etc/UTC'],
    availabilityPreferences: tutor.availabilityPreferences ?? {},
    hourlyRateAmount,
    hourlyRateCurrency: tutor.hourlyRateCurrency ?? 'USD',
    hourlyRate: formattedRate,
    ratingAverage: tutor.ratingAverage ?? 0,
    ratingCount: tutor.ratingCount ?? 0,
    completedSessions: tutor.completedSessions ?? 0,
    responseTimeMinutes: tutor.responseTimeMinutes ?? 0,
    isVerified: Boolean(tutor.isVerified),
    metadata: tutor.metadata ?? {},
    createdAt: tutor.createdAt ?? null,
    updatedAt: tutor.updatedAt ?? null
  };
}

export default class CatalogueController {
  static async listLiveClassrooms(req, res, next) {
    try {
      const query = await liveClassroomQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const statuses = normaliseStatuses(query.statuses);
      const [items, total] = await Promise.all([
        LiveClassroomModel.listPublic({
          search: query.search || undefined,
          statuses,
          limit: query.limit,
          offset: query.offset,
          upcomingOnly: !query.includePast
        }),
        LiveClassroomModel.countPublic({
          search: query.search || undefined,
          statuses,
          upcomingOnly: !query.includePast
        })
      ]);

      return success(res, {
        data: items,
        meta: {
          pagination: {
            limit: query.limit,
            offset: query.offset,
            total
          }
        }
      });
    } catch (error) {
      return next(withValidationStatus(error));
    }
  }

  static async listCourses(req, res, next) {
    try {
      const query = await courseQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const [courses, total] = await Promise.all([
        CourseModel.listPublished({
          limit: query.limit,
          offset: query.offset,
          search: query.search || undefined
        }),
        CourseModel.countAll({
          search: query.search || undefined,
          status: 'published'
        })
      ]);

      return success(res, {
        data: courses.map(mapCourseToCatalogue),
        meta: {
          pagination: {
            limit: query.limit,
            offset: query.offset,
            total
          }
        }
      });
    } catch (error) {
      return next(withValidationStatus(error));
    }
  }

  static async listTutors(req, res, next) {
    try {
      const query = await tutorQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const shouldFilterVerified = query.verifiedOnly !== false;
      const [tutors, total] = await Promise.all([
        shouldFilterVerified
          ? TutorProfileModel.listVerified({
              search: query.search || undefined,
              limit: query.limit,
              offset: query.offset
            })
          : TutorProfileModel.listAll({
              search: query.search || undefined,
              limit: query.limit,
              offset: query.offset
            }),
        shouldFilterVerified
          ? TutorProfileModel.countVerified({ search: query.search || undefined })
          : TutorProfileModel.countAll({ search: query.search || undefined })
      ]);

      return success(res, {
        data: tutors.map(mapTutorToCatalogue),
        meta: {
          pagination: {
            limit: query.limit,
            offset: query.offset,
            total
          }
        }
      });
    } catch (error) {
      return next(withValidationStatus(error));
    }
  }

  static async listPlans(req, res, next) {
    try {
      const query = await planQuerySchema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true
      });

      const plans = await PricingCatalogueService.listPublicPlans({
        tenantId: query.tenantId,
        limit: query.limit
      });

      const currency = plans.find((plan) => plan?.currency)?.currency ?? 'USD';

      return success(res, {
        data: plans,
        meta: {
          tenantId: query.tenantId,
          currency
        }
      });
    } catch (error) {
      return next(withValidationStatus(error));
    }
  }
}

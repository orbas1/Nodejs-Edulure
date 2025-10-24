import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import errorHandler from '../src/middleware/errorHandler.js';

let mockDistributedCache;

vi.mock('../src/services/DistributedRuntimeCache.js', () => {
  mockDistributedCache = {
    readCatalogueFilters: vi.fn().mockResolvedValue(null),
    writeCatalogueFilters: vi.fn().mockImplementation(async (value) => ({
      value,
      updatedAt: new Date().toISOString(),
      version: Date.now()
    })),
    acquireCatalogueFiltersLock: vi.fn().mockResolvedValue(null),
    releaseCatalogueFiltersLock: vi.fn().mockResolvedValue(true)
  };

  return {
    distributedRuntimeCache: mockDistributedCache,
    DistributedRuntimeCache: class {}
  };
});

let app;
let LiveClassroomModel;
let CourseModel;
let TutorProfileModel;
let MonetizationCatalogItemModel;
let listLiveClassroomsSpy;
let countLiveClassroomsSpy;
let listPublishedCoursesSpy;
let countCoursesSpy;
let listVerifiedTutorsSpy;
let countVerifiedTutorsSpy;
let listAllTutorsSpy;
let countAllTutorsSpy;
let listCatalogItemsSpy;
let getCatalogueFiltersSpy;

beforeAll(async () => {
  ({ default: LiveClassroomModel } = await import('../src/models/LiveClassroomModel.js'));
  ({ default: CourseModel } = await import('../src/models/CourseModel.js'));
  ({ default: TutorProfileModel } = await import('../src/models/TutorProfileModel.js'));
  ({ default: MonetizationCatalogItemModel } = await import('../src/models/MonetizationCatalogItemModel.js'));
  const { default: catalogueRouter } = await import('../src/routes/catalogue.routes.js');

  listLiveClassroomsSpy = vi.spyOn(LiveClassroomModel, 'listPublic');
  countLiveClassroomsSpy = vi.spyOn(LiveClassroomModel, 'countPublic');
  listPublishedCoursesSpy = vi.spyOn(CourseModel, 'listPublished');
  countCoursesSpy = vi.spyOn(CourseModel, 'countAll');
  listVerifiedTutorsSpy = vi.spyOn(TutorProfileModel, 'listVerified');
  countVerifiedTutorsSpy = vi.spyOn(TutorProfileModel, 'countVerified');
  listAllTutorsSpy = vi.spyOn(TutorProfileModel, 'listAll');
  countAllTutorsSpy = vi.spyOn(TutorProfileModel, 'countAll');
  listCatalogItemsSpy = vi.spyOn(MonetizationCatalogItemModel, 'listByProductCodes');
  getCatalogueFiltersSpy = vi.spyOn(CourseModel, 'getCatalogueFilters');

  app = express();
  app.use(express.json());
  app.use('/api/v1/catalogue', catalogueRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
  listCatalogItemsSpy.mockResolvedValue([]);
  if (mockDistributedCache) {
    Object.values(mockDistributedCache).forEach((entry) => {
      if (typeof entry?.mockClear === 'function') {
        entry.mockClear();
      }
    });
    mockDistributedCache.readCatalogueFilters.mockResolvedValue(null);
    mockDistributedCache.writeCatalogueFilters.mockImplementation(async (value) => ({
      value,
      updatedAt: new Date().toISOString(),
      version: Date.now()
    }));
  }
  getCatalogueFiltersSpy.mockReset();
});

describe('Catalogue HTTP routes', () => {
  it('returns upcoming live classrooms with default pagination', async () => {
    listLiveClassroomsSpy.mockResolvedValue([
      {
        id: 'lc-1',
        title: 'Design Systems Deep Dive',
        status: 'scheduled',
        startAt: '2024-09-01T10:00:00.000Z',
        capacity: 40,
        reservedSeats: 12,
        isTicketed: false
      }
    ]);
    countLiveClassroomsSpy.mockResolvedValue(1);

    const response = await request(app).get('/api/v1/catalogue/live-classrooms');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(listLiveClassroomsSpy).toHaveBeenCalledWith({
      search: undefined,
      statuses: ['scheduled', 'live'],
      limit: 12,
      offset: 0,
      upcomingOnly: true
    });
    expect(countLiveClassroomsSpy).toHaveBeenCalledWith({
      search: undefined,
      statuses: ['scheduled', 'live'],
      upcomingOnly: true
    });
  });

  it('applies live classroom filters and supports completed histories', async () => {
    listLiveClassroomsSpy.mockResolvedValue([]);
    countLiveClassroomsSpy.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/v1/catalogue/live-classrooms')
      .query({ search: 'analytics', statuses: 'completed', includePast: 'true', limit: 5, offset: 10 });

    expect(response.status).toBe(200);
    expect(listLiveClassroomsSpy).toHaveBeenCalledWith({
      search: 'analytics',
      statuses: ['completed'],
      limit: 5,
      offset: 10,
      upcomingOnly: false
    });
    expect(countLiveClassroomsSpy).toHaveBeenCalledWith({
      search: 'analytics',
      statuses: ['completed'],
      upcomingOnly: false
    });
  });

  it('validates live classroom pagination constraints', async () => {
    const response = await request(app).get('/api/v1/catalogue/live-classrooms?limit=0');

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(listLiveClassroomsSpy).not.toHaveBeenCalled();
    expect(countLiveClassroomsSpy).not.toHaveBeenCalled();
  });

  it('returns published courses mapped to catalogue shape', async () => {
    listPublishedCoursesSpy.mockResolvedValue([
      {
        id: 'course-1',
        title: 'Revenue Operations Blueprint',
        summary: 'Automate cohort monetisation.',
        level: 'intermediate',
        deliveryFormat: 'cohort',
        priceAmount: 1200,
        priceCurrency: 'USD',
        status: 'published',
        isPublished: true,
        skills: ['automation'],
        metadata: {
          upsellCatalogItems: ['growth-insiders-annual']
        }
      }
    ]);
    countCoursesSpy.mockResolvedValue(1);
    listCatalogItemsSpy.mockResolvedValue([
      {
        productCode: 'growth-insiders-annual',
        name: 'Growth Insiders Annual',
        description: 'Concierge support',
        unitAmountCents: 189900,
        currency: 'USD',
        metadata: { badgeLabel: 'Insiders', badgeTone: 'emerald' },
        status: 'active'
      }
    ]);

    const response = await request(app)
      .get('/api/v1/catalogue/courses')
      .query({ search: 'revenue', limit: 3, offset: 6 });

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      id: 'course-1',
      title: 'Revenue Operations Blueprint',
      priceAmount: 1200,
      status: 'published',
      isPublished: true
    });
    expect(response.body.data[0].upsellBadges).toEqual([
      expect.objectContaining({
        productCode: 'growth-insiders-annual',
        label: 'Insiders',
        formattedPrice: expect.stringContaining('$'),
        tone: 'emerald'
      })
    ]);
    expect(response.body.meta.pagination).toEqual({ limit: 3, offset: 6, total: 1 });
    expect(listPublishedCoursesSpy).toHaveBeenCalledWith({ limit: 3, offset: 6, search: 'revenue' });
    expect(countCoursesSpy).toHaveBeenCalledWith({ search: 'revenue', status: 'published' });
    expect(listCatalogItemsSpy).toHaveBeenCalledWith('global', ['growth-insiders-annual']);
  });

  it('returns verified tutors by default and supports public listings', async () => {
    listVerifiedTutorsSpy.mockResolvedValue([
      {
        id: 'tutor-1',
        displayName: 'Jordan Rivers',
        headline: 'Product analytics mentor',
        bio: 'Guides teams on data-driven habits.',
        skills: ['analytics'],
        languages: ['en'],
        hourlyRateAmount: 150,
        hourlyRateCurrency: 'USD',
        isVerified: true
      }
    ]);
    countVerifiedTutorsSpy.mockResolvedValue(1);

    const response = await request(app).get('/api/v1/catalogue/tutors');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      id: 'tutor-1',
      displayName: 'Jordan Rivers',
      isVerified: true
    });
    expect(listVerifiedTutorsSpy).toHaveBeenCalledWith({ search: undefined, limit: 12, offset: 0 });
    expect(countVerifiedTutorsSpy).toHaveBeenCalledWith({ search: undefined });
  });

  it('lists all tutors when verified filter disabled', async () => {
    listAllTutorsSpy.mockResolvedValue([
      {
        id: 'tutor-2',
        displayName: 'Taylor Quinn',
        headline: 'Design systems coach',
        languages: ['en', 'es'],
        isVerified: false
      }
    ]);
    countAllTutorsSpy.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/v1/catalogue/tutors')
      .query({ verifiedOnly: 'false', search: 'design', limit: 4 });

    expect(response.status).toBe(200);
    expect(listVerifiedTutorsSpy).not.toHaveBeenCalled();
    expect(countVerifiedTutorsSpy).not.toHaveBeenCalled();
    expect(listAllTutorsSpy).toHaveBeenCalledWith({ search: 'design', limit: 4, offset: 0 });
    expect(countAllTutorsSpy).toHaveBeenCalledWith({ search: 'design' });
  });

  it('validates tutor pagination inputs', async () => {
    const response = await request(app).get('/api/v1/catalogue/tutors?limit=200');

    expect(response.status).toBe(422);
    expect(listVerifiedTutorsSpy).not.toHaveBeenCalled();
    expect(listAllTutorsSpy).not.toHaveBeenCalled();
  });

  it('returns catalogue filters with layout and cache metadata', async () => {
    getCatalogueFiltersSpy.mockResolvedValue({
      generatedAt: '2025-03-30T12:00:00.000Z',
      totals: { coursesEvaluated: 3 },
      categories: [{ value: 'analytics', count: 2 }],
      levels: [{ value: 'advanced', count: 2 }],
      languages: [{ value: 'en', count: 3 }],
      deliveryFormats: [{ value: 'cohort', count: 2 }],
      tags: [{ value: 'automation', count: 2 }],
      skills: [{ value: 'storytelling', count: 1 }]
    });

    const response = await request(app).get('/api/v1/catalogue/filters');

    expect(response.status).toBe(200);
    expect(getCatalogueFiltersSpy).toHaveBeenCalledTimes(1);
    expect(response.body.data).toMatchObject({
      generatedAt: '2025-03-30T12:00:00.000Z',
      refreshedAt: '2025-03-30T12:00:00.000Z',
      facets: {
        primary: ['categories', 'levels'],
        secondary: ['languages', 'deliveryFormats'],
        tagCloudKey: 'tags'
      },
      layout: {
        recommendedColumns: { desktop: 3, tablet: 2, mobile: 1 },
        stickyFacets: true
      }
    });
    expect(response.body.meta.cache.hit).toBe(false);
    expect(response.body.meta.cache.ttlSeconds).toBeGreaterThanOrEqual(30);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityProgrammingController from '../src/controllers/CommunityProgrammingController.js';

const successSpy = vi.hoisted(() => vi.fn((res, { data, message, meta, status = 200 }) =>
  res.status(status).json({ success: true, data, message, meta })
));
const paginatedSpy = vi.hoisted(() =>
  vi.fn((res, options) =>
    successSpy(res, {
      ...options,
      status: options?.status ?? 200,
      meta: { ...(options?.meta ?? {}), pagination: options?.pagination }
    })
  )
);

const serviceMock = vi.hoisted(() => ({
  listWebinars: vi.fn(),
  createWebinar: vi.fn(),
  updateWebinar: vi.fn(),
  deleteWebinar: vi.fn(),
  listPodcastEpisodes: vi.fn(),
  createPodcastEpisode: vi.fn(),
  updatePodcastEpisode: vi.fn(),
  deletePodcastEpisode: vi.fn(),
  listGrowthExperiments: vi.fn(),
  createGrowthExperiment: vi.fn(),
  updateGrowthExperiment: vi.fn(),
  deleteGrowthExperiment: vi.fn()
}));

vi.mock('../src/utils/httpResponse.js', () => ({
  success: successSpy,
  paginated: paginatedSpy
}));

vi.mock('../src/services/CommunityProgrammingService.js', () => ({
  __esModule: true,
  default: serviceMock
}));

function createReq({ user, params, query, body } = {}) {
  return {
    user: user ?? { id: 7, role: 'instructor' },
    params: params ?? { communityId: 'ops-guild', webinarId: 'web-1' },
    query: query ?? {},
    body: body ?? {}
  };
}

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

const nextSpy = vi.fn();

describe('CommunityProgrammingController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists webinars with pagination metadata', async () => {
    const data = [{ id: 'web-1' }];
    serviceMock.listWebinars.mockResolvedValue({ data, pagination: { total: 1, count: 1, limit: 50, offset: 0 } });
    const req = createReq({ query: { status: 'live', limit: '50' } });
    const res = createRes();

    await CommunityProgrammingController.listWebinars(req, res, nextSpy);

    expect(serviceMock.listWebinars).toHaveBeenCalledWith(
      'ops-guild',
      { id: 7, role: 'instructor' },
      expect.objectContaining({
        status: 'live',
        order: 'desc',
        limit: 50
      })
    );
    expect(paginatedSpy).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        data,
        message: 'Webinars retrieved'
      })
    );
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('creates webinars when required fields are present', async () => {
    const req = createReq({
      body: {
        topic: 'Ops 101',
        host: 'Ops Lead',
        startAt: '2024-05-01T10:00:00.000Z',
        status: 'announced'
      }
    });
    const res = createRes();
    const webinar = { id: 'web-1', topic: 'Ops 101' };
    serviceMock.createWebinar.mockResolvedValue(webinar);

    await CommunityProgrammingController.createWebinar(req, res, nextSpy);

    expect(serviceMock.createWebinar).toHaveBeenCalledWith('ops-guild', { id: 7, role: 'instructor' }, expect.any(Object));
    const payload = serviceMock.createWebinar.mock.calls[0][2];
    expect(payload).toMatchObject({
      topic: 'Ops 101',
      host: 'Ops Lead',
      startAt: '2024-05-01T10:00:00.000Z',
      status: 'announced'
    });
    expect(successSpy).toHaveBeenCalledWith(res, {
      data: webinar,
      message: 'Webinar created',
      status: 201
    });
  });

  it('rejects webinar updates with invalid payloads', async () => {
    const req = createReq({ body: { status: 'unknown-status' } });
    const res = createRes();

    await CommunityProgrammingController.updateWebinar(req, res, nextSpy);

    expect(serviceMock.updateWebinar).not.toHaveBeenCalled();
    const error = nextSpy.mock.calls[0][0];
    expect(error.status).toBe(422);
    expect(Array.isArray(error.details)).toBe(true);
  });
});

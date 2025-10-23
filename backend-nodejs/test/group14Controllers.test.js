import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/httpResponse.js', () => {
  const respond = (res, { data = null, message = null, status = 200, meta, pagination } = {}) => {
    const body = { success: true, data, message };
    if (meta) {
      body.meta = meta;
    }
    if (pagination) {
      body.meta = { ...(body.meta ?? {}), pagination };
    }
    return res.status(status).json(body);
  };

  return {
    __esModule: true,
    success: vi.fn((res, options) => respond(res, options)),
    paginated: vi.fn((res, options) =>
      respond(res, {
        ...options,
        pagination: options?.pagination,
        status: options?.status ?? 200
      })
    )
  };
});

vi.mock('../src/config/env.js', () => ({
  __esModule: true,
  env: {
    logging: { serviceName: 'test-suite' },
    observability: {
      metrics: {
        enabled: false,
        allowedIps: [],
        pushGateway: { url: null, auth: null }
      }
    },
    directMessages: {
      threads: { maxPageSize: 50, defaultPageSize: 20 },
      messages: { maxPageSize: 100, defaultPageSize: 30 }
    }
  }
}));

const complianceServiceMock = vi.hoisted(() => ({
  listDsrRequests: vi.fn(),
  assignDsrRequest: vi.fn(),
  updateDsrStatus: vi.fn(),
  listConsentRecords: vi.fn(),
  createConsentRecord: vi.fn(),
  revokeConsent: vi.fn(),
  fetchPolicyTimeline: vi.fn()
}));

vi.mock('../src/services/ComplianceService.js', () => ({
  __esModule: true,
  default: vi.fn(() => complianceServiceMock)
}));

const assetServiceMock = {
  createUploadSession: vi.fn(),
  confirmUpload: vi.fn(),
  listAssets: vi.fn(),
  getAsset: vi.fn(),
  issueViewerToken: vi.fn(),
  recordEvent: vi.fn(),
  updateProgress: vi.fn(),
  getProgress: vi.fn(),
  analytics: vi.fn(),
  updateMetadata: vi.fn()
};

vi.mock('../src/services/AssetService.js', () => ({
  __esModule: true,
  default: assetServiceMock
}));

const videoPlaybackServiceMock = {
  getPlaybackSession: vi.fn(() => ({ playback: { url: 'https://example.com/stream' } }))
};

vi.mock('../src/services/VideoPlaybackService.js', () => ({
  __esModule: true,
  default: videoPlaybackServiceMock
}));

const courseLiveServiceMock = {
  getPresence: vi.fn(() => ({ viewers: 10 })),
  listMessages: vi.fn(),
  postMessage: vi.fn()
};

vi.mock('../src/services/CourseLiveService.js', () => ({
  __esModule: true,
  default: courseLiveServiceMock
}));

const realtimeServiceMock = { broadcastCourseMessage: vi.fn() };

vi.mock('../src/services/RealtimeService.js', () => ({
  __esModule: true,
  default: realtimeServiceMock
}));

const courseAccessServiceMock = {
  ensureCourseAccess: vi.fn()
};

vi.mock('../src/services/CourseAccessService.js', () => ({
  __esModule: true,
  default: courseAccessServiceMock
}));

const creationStudioServiceMock = {
  listProjects: vi.fn()
};

vi.mock('../src/services/CreationStudioService.js', () => ({
  __esModule: true,
  default: creationStudioServiceMock
}));

const creationAnalyticsServiceMock = {
  getSummary: vi.fn()
};

vi.mock('../src/services/CreationAnalyticsService.js', () => ({
  __esModule: true,
  default: creationAnalyticsServiceMock
}));

vi.mock('../src/services/CreationRecommendationService.js', () => ({
  __esModule: true,
  default: {}
}));

const dashboardServiceMock = {
  getDashboardForUser: vi.fn()
};

vi.mock('../src/services/DashboardService.js', () => ({
  __esModule: true,
  default: dashboardServiceMock
}));

const directMessageServiceMock = {
  listThreads: vi.fn(),
  createThread: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn()
};

vi.mock('../src/services/DirectMessageService.js', () => ({
  __esModule: true,
  default: directMessageServiceMock
}));

const ebookServiceMock = {
  createListing: vi.fn(),
  updateListing: vi.fn(),
  setPublicationState: vi.fn(),
  listCatalogue: vi.fn(),
  listMarketplace: vi.fn(),
  getDetails: vi.fn(),
  purchase: vi.fn()
};

vi.mock('../src/services/EbookService.js', () => ({
  __esModule: true,
  default: ebookServiceMock
}));

const enablementServiceMock = {
  listArticles: vi.fn(),
  getArticle: vi.fn(),
  getCapabilityMatrix: vi.fn(),
  refreshCache: vi.fn()
};

vi.mock('../src/services/EnablementContentService.js', () => ({
  __esModule: true,
  default: enablementServiceMock
}));

const environmentParityServiceMock = {
  generateReport: vi.fn()
};

vi.mock('../src/services/EnvironmentParityService.js', () => ({
  __esModule: true,
  default: environmentParityServiceMock
}));

const explorerSearchServiceMock = {
  getSupportedEntities: vi.fn(() => ['course', 'community']),
  search: vi.fn(),
  suggest: vi.fn()
};

vi.mock('../src/services/ExplorerSearchService.js', () => ({
  __esModule: true,
  default: explorerSearchServiceMock
}));

const explorerAnalyticsServiceMock = {
  recordSearchExecution: vi.fn()
};

vi.mock('../src/services/ExplorerAnalyticsService.js', () => ({
  __esModule: true,
  default: explorerAnalyticsServiceMock
}));

const savedSearchServiceMock = {
  touchUsage: vi.fn(() => Promise.resolve()),
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

vi.mock('../src/services/SavedSearchService.js', () => ({
  __esModule: true,
  default: savedSearchServiceMock
}));

const liveFeedServiceMock = {
  getFeed: vi.fn(),
  getAnalytics: vi.fn(),
  getPlacements: vi.fn()
};

vi.mock('../src/services/LiveFeedService.js', () => ({
  __esModule: true,
  default: liveFeedServiceMock
}));

const governanceStakeholderServiceMock = {
  getOverview: vi.fn(),
  listContracts: vi.fn(),
  updateContract: vi.fn(),
  listVendorAssessments: vi.fn(),
  recordVendorAssessmentDecision: vi.fn(),
  listReviewCycles: vi.fn(),
  recordReviewAction: vi.fn(),
  listCommunications: vi.fn(),
  scheduleCommunication: vi.fn(),
  recordCommunicationMetrics: vi.fn()
};

vi.mock('../src/services/GovernanceStakeholderService.js', () => ({
  __esModule: true,
  default: governanceStakeholderServiceMock
}));

const identityVerificationServiceMock = {
  getVerificationSummaryForUser: vi.fn(),
  requestUpload: vi.fn(),
  attachDocument: vi.fn(),
  submitForReview: vi.fn(),
  reviewVerification: vi.fn(),
  listAuditTrail: vi.fn(),
  getAdminOverview: vi.fn()
};

vi.mock('../src/services/IdentityVerificationService.js', () => ({
  __esModule: true,
  default: identityVerificationServiceMock
}));

vi.mock('../src/config/logger.js', () => ({
  __esModule: true,
  default: { error: vi.fn(), child: () => ({ error: vi.fn(), warn: vi.fn() }) },
  logger: { error: vi.fn(), child: () => ({ error: vi.fn(), warn: vi.fn() }) }
}));

const instructorBookingServiceMock = {
  listBookings: vi.fn(),
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
  cancelBooking: vi.fn()
};

vi.mock('../src/services/InstructorBookingService.js', () => ({
  __esModule: true,
  default: instructorBookingServiceMock
}));

const instructorOrchestrationServiceMock = {
  generateCourseOutline: vi.fn(),
  importFromNotion: vi.fn(),
  syncFromLms: vi.fn(),
  routeTutorRequest: vi.fn(),
  sendMentorInvite: vi.fn(),
  exportPricing: vi.fn()
};

vi.mock('../src/services/InstructorOrchestrationService.js', () => ({
  __esModule: true,
  default: instructorOrchestrationServiceMock
}));

const instructorSchedulingServiceMock = {
  listRoster: vi.fn(),
  createSlot: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn()
};

vi.mock('../src/services/InstructorSchedulingService.js', () => ({
  __esModule: true,
  default: instructorSchedulingServiceMock
}));

import ComplianceController from '../src/controllers/ComplianceController.js';
import ContentController from '../src/controllers/ContentController.js';
import CourseController from '../src/controllers/CourseController.js';
import CreationStudioController from '../src/controllers/CreationStudioController.js';
import DashboardController from '../src/controllers/DashboardController.js';
import DirectMessageController from '../src/controllers/DirectMessageController.js';
import EbookController from '../src/controllers/EbookController.js';
import EnablementController from '../src/controllers/EnablementController.js';
import EnvironmentParityController from '../src/controllers/EnvironmentParityController.js';
import ExplorerController from '../src/controllers/ExplorerController.js';
import FeedController from '../src/controllers/FeedController.js';
import GovernanceController from '../src/controllers/GovernanceController.js';
import { reviewVerification as reviewVerificationHandler } from '../src/controllers/IdentityVerificationController.js';
import InstructorBookingController from '../src/controllers/InstructorBookingController.js';
import InstructorOrchestrationController from '../src/controllers/InstructorOrchestrationController.js';
import InstructorSchedulingController from '../src/controllers/InstructorSchedulingController.js';
import { success, paginated } from '../src/utils/httpResponse.js';

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  };
}

const next = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

function createRequest({ user, body, query, params, id, ip, headers, method, url, originalUrl, traceId, spanId }) {
  return {
    user: user ?? { id: 1, role: 'admin', sessionId: 'sess-123' },
    body: body ?? {},
    query: query ?? {},
    params: params ?? {},
    id,
    ip,
    headers,
    method,
    url,
    originalUrl,
    traceId,
    spanId,
    get: (name) => headers?.[name.toLowerCase()],
    log: { warn: vi.fn() }
  };
}

describe('ComplianceController', () => {
  it('assigns DSR request with actor metadata', async () => {
    const result = { id: 10 };
    complianceServiceMock.assignDsrRequest.mockResolvedValue(result);
    const req = createRequest({
      params: { requestId: '5' },
      body: { assigneeId: 55 },
      headers: { 'user-agent': 'jest', 'x-request-id': 'req-22' },
      method: 'POST',
      url: '/dsr/5/assign'
    });
    const res = createRes();

    await ComplianceController.assignDsrRequest(req, res, next);

    expect(complianceServiceMock.assignDsrRequest).toHaveBeenCalledWith({
      requestId: 5,
      assigneeId: 55,
      actor: { id: 1, role: 'admin', type: 'user' },
      requestContext: expect.objectContaining({
        requestId: 'req-22',
        method: 'POST',
        path: '/dsr/5/assign'
      })
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: result });
  });

  it('returns 400 when assigneeId missing', async () => {
    const req = createRequest({ params: { requestId: '1' }, body: {} });
    const res = createRes();

    await ComplianceController.assignDsrRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'assigneeId is required' });
    expect(complianceServiceMock.assignDsrRequest).not.toHaveBeenCalled();
  });
});

describe('ContentController', () => {
  it('creates upload session for valid payload', async () => {
    const session = { upload: { url: 'https://upload' } };
    assetServiceMock.createUploadSession.mockResolvedValue(session);
    const req = createRequest({
      body: {
        type: 'ebook',
        filename: 'file.pdf',
        mimeType: 'application/pdf',
        size: 1024
      }
    });
    const res = createRes();

    await ContentController.createUploadSession(req, res, next);

    expect(assetServiceMock.createUploadSession).toHaveBeenCalledWith({
      type: 'ebook',
      filename: 'file.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      visibility: 'workspace',
      userId: 1
    });
    expect(success).toHaveBeenCalledWith(res, {
      data: session,
      message: 'Upload session created',
      status: 201
    });
  });

  it('passes validation errors to next handler', async () => {
    const req = createRequest({ body: { filename: 'file.pdf' } });
    const res = createRes();

    await ContentController.createUploadSession(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls.at(-1)[0];
    expect(error.status).toBe(422);
  });
});

describe('CourseController', () => {
  it('broadcasts messages for live chat post', async () => {
    courseAccessServiceMock.ensureCourseAccess.mockResolvedValue();
    const message = { id: 'msg1' };
    courseLiveServiceMock.postMessage.mockReturnValue(message);
    const req = createRequest({
      params: { courseId: 'course-1' },
      body: { body: 'Hello world' }
    });
    const res = createRes();

    await CourseController.postLiveChat(req, res, next);

    expect(courseAccessServiceMock.ensureCourseAccess).toHaveBeenCalledWith('course-1', req.user, {
      requireActiveEnrollment: true
    });
    expect(courseLiveServiceMock.postMessage).toHaveBeenCalledWith('course-1', req.user, 'Hello world');
    expect(realtimeServiceMock.broadcastCourseMessage).toHaveBeenCalledWith('course-1', message);
    expect(success).toHaveBeenCalledWith(res, {
      data: message,
      message: 'Message delivered',
      status: 201
    });
  });

  it('handles validation errors for live chat', async () => {
    const req = createRequest({ params: { courseId: 'abc' }, body: { body: '' } });
    const res = createRes();

    await CourseController.postLiveChat(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls.at(-1)[0];
    expect(err.status).toBe(422);
    expect(courseLiveServiceMock.postMessage).not.toHaveBeenCalled();
  });
});

describe('CreationStudioController', () => {
  it('lists projects with parsed filters', async () => {
    creationStudioServiceMock.listProjects.mockResolvedValue({
      data: [{ id: 1 }],
      pagination: { page: 1, limit: 20 }
    });
    const req = createRequest({
      query: { status: 'draft,approved', type: 'course', search: 'marketing', page: '2', limit: '5' }
    });
    const res = createRes();

    await CreationStudioController.listProjects(req, res, next);

    expect(creationStudioServiceMock.listProjects).toHaveBeenCalledWith({
      actor: { id: 1, role: 'admin' },
      filters: {
        search: 'marketing',
        status: ['draft', 'approved'],
        type: ['course'],
        includeArchived: false
      },
      pagination: { page: 2, limit: 5 }
    });
    expect(paginated).toHaveBeenCalled();
  });

  it('validates analytics summary input', async () => {
    const req = createRequest({ query: { range: 'invalid' } });
    const res = createRes();

    await CreationStudioController.analyticsSummary(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls.at(-1)[0];
    expect(error.status).toBe(422);
    expect(creationAnalyticsServiceMock.getSummary).not.toHaveBeenCalled();
  });
});

describe('DashboardController', () => {
  it('returns dashboard payload', async () => {
    const dashboard = { id: 'dash1' };
    dashboardServiceMock.getDashboardForUser.mockResolvedValue(dashboard);
    const req = createRequest({});
    const res = createRes();

    await DashboardController.current(req, res, next);

    expect(dashboardServiceMock.getDashboardForUser).toHaveBeenCalledWith(1);
    expect(success).toHaveBeenCalledWith(res, { data: dashboard, message: 'Dashboard resolved' });
  });
});

describe('DirectMessageController', () => {
  it('creates thread and returns 201', async () => {
    directMessageServiceMock.createThread.mockResolvedValue({ id: 99 });
    const req = createRequest({ body: { participantIds: [1, 2], initialMessage: { body: 'Hi' } } });
    const res = createRes();

    await DirectMessageController.createThread(req, res, next);

    expect(directMessageServiceMock.createThread).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith(res, expect.objectContaining({ status: 201 }));
  });

  it('lists threads with pagination metadata', async () => {
    directMessageServiceMock.listThreads.mockResolvedValue({
      threads: [{ id: 'thread-1' }],
      limit: 5,
      offset: 0
    });
    const req = createRequest({ query: { limit: '5', offset: '0' } });
    const res = createRes();

    await DirectMessageController.listThreads(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ id: 'thread-1' }],
      message: 'Threads fetched',
      meta: { pagination: { limit: 5, offset: 0, count: 1 } }
    });
  });
});

describe('EbookController', () => {
  it('normalises payload on create', async () => {
    ebookServiceMock.createListing.mockResolvedValue({ id: 'ebook-1' });
    const req = createRequest({
      body: {
        assetId: '1fbe5f0e-3b6f-4cdd-9d1d-6a557b3e3fe1',
        title: 'Test',
        price: { currency: 'USD', amount: 12.5 },
        authors: 'Alice,Bob',
        tags: ['tag'],
        categories: 'cat1,cat2',
        languages: ['en'],
        releaseAt: '2024-01-01T00:00:00.000Z'
      }
    });
    const res = createRes();

    await EbookController.create(req, res, next);

    expect(ebookServiceMock.createListing).toHaveBeenCalledWith(1, expect.objectContaining({
      priceCurrency: 'USD',
      priceAmount: 1250,
      authors: ['Alice', 'Bob'],
      categories: ['cat1', 'cat2'],
      languages: ['en']
    }));
    expect(success).toHaveBeenCalledWith(res, expect.objectContaining({ status: 201 }));
  });

  it('propagates validation errors', async () => {
    const req = createRequest({ body: { title: 'Missing asset' } });
    const res = createRes();

    await EbookController.create(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls.at(-1)[0];
    expect(error.status).toBe(422);
  });
});

describe('EnablementController', () => {
  it('returns 404 when article missing', async () => {
    enablementServiceMock.getArticle.mockResolvedValue(null);
    const req = createRequest({ params: { slug: 'missing' } });
    const res = createRes();

    await EnablementController.getArticle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Enablement article missing not found' });
  });
});

describe('EnvironmentParityController', () => {
  it('responds with degraded status when report unhealthy', async () => {
    environmentParityServiceMock.generateReport.mockResolvedValue({ status: 'degraded' });
    const req = createRequest({});
    const res = createRes();

    await EnvironmentParityController.health(req, res, next);

    expect(environmentParityServiceMock.generateReport).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: 'degraded' });
  });
});

describe('ExplorerController', () => {
  it('executes search and records analytics', async () => {
    explorerSearchServiceMock.search.mockResolvedValue({ results: { course: { hits: [{}] } } });
    explorerAnalyticsServiceMock.recordSearchExecution.mockResolvedValue({
      eventUuid: 'evt-1',
      totalResults: 1,
      totalDisplayed: 1,
      entitySummaries: [{ isZeroResult: false }]
    });
    savedSearchServiceMock.touchUsage.mockResolvedValue();
    const req = createRequest({
      body: {
        query: 'design',
        entityTypes: ['course'],
        savedSearchId: 10,
        filters: { level: 'beginner' },
        globalFilters: {},
        sort: {},
        includeFacets: true
      },
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1'
    });
    const res = createRes();

    await ExplorerController.search(req, res, next);

    expect(explorerSearchServiceMock.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'design' }));
    expect(savedSearchServiceMock.touchUsage).toHaveBeenCalledWith(1, 10);
    expect(explorerAnalyticsServiceMock.recordSearchExecution).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        message: 'Explorer results fetched',
        data: expect.objectContaining({ analytics: expect.objectContaining({ searchEventId: 'evt-1' }) })
      })
    );
  });

  it('rejects unsupported entity types', async () => {
    const req = createRequest({ body: { entityTypes: ['unknown'] } });
    const res = createRes();

    await ExplorerController.search(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls.at(-1)[0];
    expect(error.status).toBe(422);
  });

  it('returns suggestions for trimmed query input', async () => {
    explorerSearchServiceMock.suggest.mockResolvedValue({ query: 'design', items: [{ id: 'course-1' }] });
    const req = createRequest({ query: { query: '  design ', limit: '5', entityTypes: ['course'] } });
    const res = createRes();

    await ExplorerController.suggest(req, res, next);

    expect(explorerSearchServiceMock.suggest).toHaveBeenCalledWith({
      query: 'design',
      entityTypes: ['course'],
      limit: 5
    });
    expect(success).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ message: 'Search suggestions generated' })
    );
  });

  it('enforces suggestion validation rules', async () => {
    const req = createRequest({ query: { query: '' } });
    const res = createRes();

    await ExplorerController.suggest(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls.at(-1)[0];
    expect(error.status).toBe(422);
  });
});

describe('FeedController', () => {
  it('normalises keywords for placements', async () => {
    liveFeedServiceMock.getPlacements.mockResolvedValue([{ id: 'placement-1' }]);
    const req = createRequest({ query: { keywords: 'alpha, beta', limit: '3' } });
    const res = createRes();

    await FeedController.getPlacements(req, res, next);

    expect(liveFeedServiceMock.getPlacements).toHaveBeenCalledWith({
      context: 'global_feed',
      limit: 3,
      metadata: { keywords: ['alpha', 'beta'] }
    });
    expect(success).toHaveBeenCalledWith(res, {
      data: [{ id: 'placement-1' }],
      message: 'Eligible placements generated'
    });
  });
});

describe('GovernanceController', () => {
  it('returns 404 when contract update fails', async () => {
    governanceStakeholderServiceMock.updateContract.mockResolvedValue(null);
    const req = createRequest({ params: { contractId: '22' }, body: {} });
    const res = createRes();

    await GovernanceController.updateContract(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Contract 22 not found' });
  });
});

describe('IdentityVerificationController', () => {
  it('rejects review with invalid identifier', async () => {
    const req = createRequest({ params: { verificationId: 'abc' } });
    const res = createRes();

    await reviewVerificationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid verification identifier' });
    expect(identityVerificationServiceMock.reviewVerification).not.toHaveBeenCalled();
  });

  it('reviews verification when id valid', async () => {
    identityVerificationServiceMock.reviewVerification.mockResolvedValue({ id: 5 });
    const req = createRequest({ params: { verificationId: '5' } });
    const res = createRes();

    await reviewVerificationHandler(req, res);

    expect(identityVerificationServiceMock.reviewVerification).toHaveBeenCalledWith(5, 1, {});
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 5 } });
  });
});

describe('InstructorBookingController', () => {
  it('hard deletes booking on cancel with flag', async () => {
    const req = createRequest({
      params: { bookingId: '7' },
      body: { hardDelete: true }
    });
    const res = createRes();

    await InstructorBookingController.cancel(req, res, next);

    expect(instructorBookingServiceMock.cancelBooking).toHaveBeenCalledWith(1, '7', { hardDelete: true });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});

describe('InstructorOrchestrationController', () => {
  it('sends mentor invite with accepted payload', async () => {
    instructorOrchestrationServiceMock.sendMentorInvite.mockResolvedValue({ inviteId: 'inv-1' });
    const req = createRequest({ body: { email: 'mentor@example.com' } });
    const res = createRes();

    await InstructorOrchestrationController.sendMentorInvite(req, res, next);

    expect(instructorOrchestrationServiceMock.sendMentorInvite).toHaveBeenCalledWith(1, {
      email: 'mentor@example.com',
      name: undefined,
      role: undefined
    });
    expect(success).toHaveBeenCalledWith(res, {
      data: { inviteId: 'inv-1' },
      message: 'Mentor invite dispatched',
      status: 202
    });
  });
});

describe('InstructorSchedulingController', () => {
  it('returns validation error when slot id invalid', async () => {
    const req = createRequest({ params: { slotId: 'bad' }, body: { startAt: '2024-01-01', endAt: '2024-01-02' } });
    const res = createRes();

    await InstructorSchedulingController.update(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls.at(-1)[0];
    expect(error.status).toBe(400);
    expect(instructorSchedulingServiceMock.updateSlot).not.toHaveBeenCalled();
  });
});

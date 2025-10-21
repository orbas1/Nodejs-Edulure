import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityOperationsController from '../src/controllers/CommunityOperationsController.js';

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
  listIncidents: vi.fn(),
  publishRunbook: vi.fn(),
  acknowledgeEscalation: vi.fn(),
  scheduleEvent: vi.fn(),
  updateTier: vi.fn()
}));

vi.mock('../src/utils/httpResponse.js', () => ({
  success: successSpy,
  paginated: paginatedSpy
}));

vi.mock('../src/services/CommunityOperationsService.js', () => ({
  __esModule: true,
  default: serviceMock
}));

function createReq({ user, body, query, params } = {}) {
  return {
    user: user ?? { id: 7, role: 'admin' },
    body: body ?? {},
    query: query ?? {},
    params: params ?? { communityId: 'ops-guild', caseId: 'case-1' }
  };
}

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
}

const nextSpy = vi.fn();

describe('CommunityOperationsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists incidents with validated filters', async () => {
    serviceMock.listIncidents.mockResolvedValue({ items: [], pagination: { page: 1, perPage: 20 } });
    const req = createReq({ query: { status: 'pending', page: '2', perPage: '10' } });
    const res = createRes();

    await CommunityOperationsController.listIncidents(req, res, nextSpy);

    expect(serviceMock.listIncidents).toHaveBeenCalledWith(
      'ops-guild',
      7,
      expect.objectContaining({
        status: 'pending',
        page: 2,
        perPage: 10
      })
    );
    expect(successSpy).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        message: 'Safety incidents fetched',
        meta: expect.objectContaining({ pagination: { page: 1, perPage: 20 } })
      })
    );
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('returns validation feedback for invalid incident filters', async () => {
    const req = createReq({ query: { status: 'bad-status' } });
    const res = createRes();

    await CommunityOperationsController.listIncidents(req, res, nextSpy);

    expect(serviceMock.listIncidents).not.toHaveBeenCalled();
    const error = nextSpy.mock.calls[0][0];
    expect(error.status).toBe(422);
    expect(error.details).toContain('"status" must be one of [pending, in_review, escalated, suppressed, closed, resolved]');
  });

  it('publishes runbooks and responds with created status', async () => {
    const req = createReq({
      body: {
        title: 'Launch Runbook',
        summary: 'Step by step',
        owner: 'Ops Guild',
        tags: ['launch'],
        automationReady: true
      }
    });
    const res = createRes();
    const runbook = { id: 44, title: 'Launch Runbook' };
    serviceMock.publishRunbook.mockResolvedValue(runbook);

    await CommunityOperationsController.publishRunbook(req, res, nextSpy);

    expect(serviceMock.publishRunbook).toHaveBeenCalledWith(
      'ops-guild',
      7,
      expect.objectContaining({
        title: 'Launch Runbook',
        summary: 'Step by step',
        owner: 'Ops Guild',
        tags: ['launch'],
        automationReady: true
      })
    );
    expect(successSpy).toHaveBeenCalledWith(res, {
      data: runbook,
      message: 'Runbook published',
      status: 201
    });
  });

  it('acknowledges escalations with optional notes', async () => {
    const req = createReq({ body: { note: 'On it' } });
    const res = createRes();
    const escalation = { id: 1, status: 'in_review' };
    serviceMock.acknowledgeEscalation.mockResolvedValue(escalation);

    await CommunityOperationsController.acknowledgeEscalation(req, res, nextSpy);

    expect(serviceMock.acknowledgeEscalation).toHaveBeenCalledWith('ops-guild', 7, 'case-1', { note: 'On it' });
    expect(successSpy).toHaveBeenCalledWith(res, {
      data: escalation,
      message: 'Escalation acknowledged'
    });
  });

  it('validates scheduled event payloads and surfaces errors', async () => {
    const req = createReq({ body: { title: 'Ops standup' } });
    const res = createRes();

    await CommunityOperationsController.scheduleEvent(req, res, nextSpy);

    expect(serviceMock.scheduleEvent).not.toHaveBeenCalled();
    const error = nextSpy.mock.calls[0][0];
    expect(error.status).toBe(422);
    expect(Array.isArray(error.details)).toBe(true);
  });
});

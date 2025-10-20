import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetInviteService,
  __setInviteService,
  getInvitation,
  submitInvitation
} from '../src/controllers/IntegrationKeyInviteController.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status: vi.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((payload) => {
      res.body = payload;
      return res;
    }),
    set: vi.fn().mockImplementation((key, value) => {
      res.headers[key] = value;
      return res;
    })
  };

  return res;
}

describe('IntegrationKeyInviteController', () => {
  let mockService;

  beforeEach(() => {
    mockService = {
      getInvitationDetails: vi.fn(),
      submitInvitation: vi.fn(),
      sanitize: vi.fn((invite) => ({ ...invite, sanitized: true }))
    };
    __setInviteService(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    __resetInviteService();
  });

  it('submits invitation payload after validation and sanitation', async () => {
    const req = {
      params: { token: '   token-value-1234567890   ' },
      body: {
        key: '   sk_test_12345678901234567890   ',
        rotationIntervalDays: 120,
        keyExpiresAt: '2025-06-01T00:00:00.000Z',
        actorEmail: 'USER@Example.com ',
        actorName: '  Jane Doe  ',
        reason: '  rotation review  '
      }
    };
    const res = createMockRes();
    const next = vi.fn();

    const resultPayload = { invite: { id: 'invite-1' }, apiKey: { token: 'masked' } };
    mockService.submitInvitation.mockResolvedValue(resultPayload);

    await submitInvitation(req, res, next);

    expect(mockService.submitInvitation).toHaveBeenCalledTimes(1);
    const [tokenArg, payloadArg, contextArg] = mockService.submitInvitation.mock.calls[0];
    expect(tokenArg).toBe('token-value-1234567890');
    expect(payloadArg).toMatchObject({
      key: 'sk_test_12345678901234567890',
      rotationIntervalDays: 120,
      actorEmail: 'user@example.com',
      actorName: 'Jane Doe',
      reason: 'rotation review'
    });
    expect(payloadArg.keyExpiresAt).toBeInstanceOf(Date);
    expect(contextArg).toEqual({
      actorId: null,
      actorRoles: null,
      requestId: null,
      ipAddress: null,
      userAgent: null,
      origin: null,
      method: null,
      path: null,
      tokenFingerprint: '1251557ad211cc48'
    });

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, max-age=0, must-revalidate');
    expect(res.headers['Cache-Control']).toBe('no-store, max-age=0, must-revalidate');
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(res.headers['Permissions-Policy']).toBe('interest-cohort=()');
    expect(res.headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        invite: { id: 'invite-1', sanitized: true },
        apiKey: resultPayload.apiKey
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid invitation payloads with validation errors', async () => {
    const req = {
      params: { token: 'token-value-1234567890' },
      body: { key: 'short', rotationIntervalDays: 5 }
    };
    const res = createMockRes();
    const next = vi.fn();

    await submitInvitation(req, res, next);

    expect(mockService.submitInvitation).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, max-age=0, must-revalidate');
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Validation failed'
    });
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invitation submissions when key expiration is in the past', async () => {
    const req = {
      params: { token: 'token-value-1234567890' },
      body: {
        key: 'sk_test_12345678901234567890',
        keyExpiresAt: '2020-01-01T00:00:00.000Z'
      }
    };
    const res = createMockRes();
    const next = vi.fn();

    await submitInvitation(req, res, next);

    expect(mockService.submitInvitation).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.body).toMatchObject({ success: false, message: 'Validation failed' });
    expect(res.body.errors.some((message) => message.includes('Key expiration must be in the future'))).toBe(true);
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed invitation tokens', async () => {
    const req = { params: { token: 'short' } };
    const res = createMockRes();
    const next = vi.fn();

    await getInvitation(req, res, next);

    expect(mockService.getInvitationDetails).not.toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, max-age=0, must-revalidate');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ success: false, message: 'Invalid invitation token' });
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns invitation details when token is valid', async () => {
    const req = { params: { token: '   valid-token-1234567890   ' } };
    const res = createMockRes();
    const next = vi.fn();

    mockService.getInvitationDetails.mockResolvedValue({ id: 'invite-123' });

    await getInvitation(req, res, next);

    expect(mockService.getInvitationDetails).toHaveBeenCalledWith('valid-token-1234567890');
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store, max-age=0, must-revalidate');
    expect(res.headers.Pragma).toBe('no-cache');
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(res.headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'invite-123' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to authenticated context when actor metadata not provided', async () => {
    const req = {
      params: { token: 'token-value-1234567890' },
      body: { key: 'sk_test_12345678901234567890' },
      user: { email: 'actor@example.com', name: 'Example Owner' }
    };
    const res = createMockRes();
    const next = vi.fn();

    const resultPayload = { invite: { id: 'invite-2' }, apiKey: { token: 'masked' } };
    mockService.submitInvitation.mockResolvedValue(resultPayload);

    await submitInvitation(req, res, next);

    const [, payloadArg] = mockService.submitInvitation.mock.calls[0];
    expect(payloadArg.actorEmail).toBe('actor@example.com');
    expect(payloadArg.actorName).toBe('Example Owner');
    expect(next).not.toHaveBeenCalled();
  });

  it('translates handled service errors without invoking next', async () => {
    const req = { params: { token: 'token-value-1234567890' } };
    const res = createMockRes();
    const next = vi.fn();

    const notFoundError = Object.assign(new Error('Invitation missing'), { status: 404 });
    mockService.getInvitationDetails.mockRejectedValueOnce(notFoundError);

    await getInvitation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toMatchObject({ success: false, message: 'Invitation missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('delegates unhandled server errors to next middleware', async () => {
    const req = { params: { token: 'token-value-1234567890' } };
    const res = createMockRes();
    const next = vi.fn();

    const fatalError = Object.assign(new Error('database unavailable'), { status: 503 });
    mockService.getInvitationDetails.mockRejectedValueOnce(fatalError);

    await getInvitation(req, res, next);

    expect(next).toHaveBeenCalledWith(fatalError);
    expect(res.headers['Cache-Control']).toBe('no-store, max-age=0, must-revalidate');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('passes request metadata to the invite service and records headers', async () => {
    const req = {
      params: { token: 'token-value-1234567890' },
      body: { key: 'sk_test_12345678901234567890' },
      headers: {
        'x-request-id': 'req-123',
        'user-agent': 'Vitest Agent',
        origin: 'https://portal.edulure.com'
      },
      ips: ['203.0.113.5'],
      user: {
        id: 'user-789',
        email: 'actor@example.com',
        name: 'Example Owner',
        roles: ['admin', 'integrations']
      },
      log: { info: vi.fn() }
    };
    const res = createMockRes();
    const next = vi.fn();

    const resultPayload = { invite: { id: 'invite-ctx' }, apiKey: { token: 'masked' } };
    mockService.submitInvitation.mockResolvedValue(resultPayload);

    await submitInvitation(req, res, next);

    const [, submissionArg, contextArg] = mockService.submitInvitation.mock.calls[0];
    expect(submissionArg.actorEmail).toBe('actor@example.com');
    expect(contextArg).toEqual({
      actorId: 'user-789',
      actorRoles: ['admin', 'integrations'],
      requestId: 'req-123',
      ipAddress: '203.0.113.5',
      userAgent: 'Vitest Agent',
      origin: 'https://portal.edulure.com'
    });
    expect(res.headers['Cache-Control']).toBe('no-store, max-age=0, must-revalidate');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(next).not.toHaveBeenCalled();
  });

  it('derives client ip from forwarded-for header when direct ips are unavailable', async () => {
    const req = {
      params: { token: 'token-value-1234567890' },
      body: { key: 'sk_test_12345678901234567890' },
      headers: {
        'x-forwarded-for': '198.51.100.1, 192.0.2.5',
        'user-agent': 'Vitest Agent'
      },
      ip: '192.0.2.5'
    };
    const res = createMockRes();
    const next = vi.fn();

    const resultPayload = { invite: { id: 'invite-ctx' }, apiKey: { token: 'masked' } };
    mockService.submitInvitation.mockResolvedValue(resultPayload);

    await submitInvitation(req, res, next);

    const [, , contextArg] = mockService.submitInvitation.mock.calls[0];
    expect(contextArg.ipAddress).toBe('198.51.100.1');
    expect(contextArg.userAgent).toBe('Vitest Agent');
    expect(res.headers['Referrer-Policy']).toBe('no-referrer');
    expect(next).not.toHaveBeenCalled();
  });

  it('logs invite fulfilment with a fingerprinted token', async () => {
    const req = {
      params: { token: 'token-value-1234567890' },
      body: { key: 'sk_test_12345678901234567890' },
      log: { info: vi.fn() }
    };
    const res = createMockRes();
    const next = vi.fn();

    const resultPayload = { invite: { id: 'invite-3' }, apiKey: { token: 'masked' } };
    mockService.submitInvitation.mockResolvedValue(resultPayload);

    await submitInvitation(req, res, next);

    const [meta, message] = req.log.info.mock.calls[0];
    expect(meta.inviteTokenFingerprint).toBeDefined();
    expect(meta.inviteTokenFingerprint).not.toBe('token-value-1234567890');
    expect(message).toBe('Integration invite fulfilled');
  });
});

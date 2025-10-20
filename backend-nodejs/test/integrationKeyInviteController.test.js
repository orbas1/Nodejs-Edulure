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
    status: vi.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((payload) => {
      res.body = payload;
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
    const [tokenArg, payloadArg] = mockService.submitInvitation.mock.calls[0];
    expect(tokenArg).toBe('token-value-1234567890');
    expect(payloadArg).toMatchObject({
      key: 'sk_test_12345678901234567890',
      rotationIntervalDays: 120,
      actorEmail: 'user@example.com',
      actorName: 'Jane Doe',
      reason: 'rotation review'
    });
    expect(payloadArg.keyExpiresAt).toBeInstanceOf(Date);

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
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Validation failed'
    });
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed invitation tokens', async () => {
    const req = { params: { token: 'short' } };
    const res = createMockRes();
    const next = vi.fn();

    await getInvitation(req, res, next);

    expect(mockService.getInvitationDetails).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toMatchObject({ success: false, message: 'Invalid invitation token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns invitation details when token is valid', async () => {
    const req = { params: { token: '   valid-token-1234567890   ' } };
    const res = createMockRes();
    const next = vi.fn();

    mockService.getInvitationDetails.mockResolvedValue({ id: 'invite-123' });

    await getInvitation(req, res, next);

    expect(mockService.getInvitationDetails).toHaveBeenCalledWith('valid-token-1234567890');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'invite-123' } });
    expect(next).not.toHaveBeenCalled();
  });
});

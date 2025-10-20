import { beforeEach, describe, expect, it, vi } from 'vitest';

import auth from '../../src/middleware/auth.js';

const verifyAccessToken = vi.hoisted(() => vi.fn());
const updateRequestContext = vi.hoisted(() => vi.fn());
const ensureActive = vi.hoisted(() => vi.fn());

vi.mock('../../src/config/jwtKeyStore.js', () => ({
  verifyAccessToken: verifyAccessToken
}));

vi.mock('../../src/observability/requestContext.js', () => ({
  updateRequestContext: updateRequestContext
}));

vi.mock('../../src/services/SessionRegistry.js', () => ({
  sessionRegistry: { ensureActive }
}));

const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('auth middleware', () => {
  beforeEach(() => {
    verifyAccessToken.mockReset();
    updateRequestContext.mockReset();
    ensureActive.mockReset();
  });

  it('rejects requests without Authorization header', async () => {
    const middleware = auth();
    const req = { headers: {} };
    const res = createRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Authorization header missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed headers', async () => {
    const middleware = auth();
    const req = { headers: { authorization: 'Basic token' } };
    const res = createRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Authorization header malformed' });
  });

  it('returns 401 when session is revoked', async () => {
    verifyAccessToken.mockReturnValue({ sub: 'user-1', sid: 'sess-1', role: 'user' });
    ensureActive.mockRejectedValue(Object.assign(new Error('revoked'), { code: 'SESSION_REVOKED' }));
    const middleware = auth();
    const req = { headers: { authorization: 'Bearer valid' } };
    const res = createRes();

    await middleware(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Session has been revoked. Please sign in again.'
    });
  });

  it('enforces role requirements', async () => {
    verifyAccessToken.mockReturnValue({ sub: 'admin-1', sid: 'sess-1', role: 'user' });
    ensureActive.mockResolvedValue({ id: 'sess-1' });
    const middleware = auth('admin');
    const res = createRes();

    await middleware({ headers: { authorization: 'Bearer token' } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Insufficient permissions' });
  });

  it('allows matching roles when provided as an array', async () => {
    verifyAccessToken.mockReturnValue({
      sub: 'staff-1',
      sid: 'sess-2',
      roles: ['staff'],
      role: undefined
    });
    ensureActive.mockResolvedValue({ id: 'sess-2' });
    const next = vi.fn();
    const middleware = auth(['admin', 'staff']);
    const req = { headers: { authorization: 'Bearer valid' } };
    const res = createRes();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 'staff-1', role: 'staff', sessionId: 'sess-2' });
    expect(updateRequestContext).toHaveBeenCalledWith({
      userId: 'staff-1',
      userRole: 'staff',
      sessionId: 'sess-2'
    });
  });
});

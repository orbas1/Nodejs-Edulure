import { describe, it, expect, beforeEach, vi } from 'vitest';

const findByIdMock = vi.hoisted(() => vi.fn());

vi.mock('../src/models/UserSessionModel.js', () => ({
  default: { findById: findByIdMock }
}));

import { SessionRegistry } from '../src/services/SessionRegistry.js';

describe('SessionRegistry', () => {
  beforeEach(() => {
    vi.useRealTimers();
    findByIdMock.mockReset();
  });

  it('returns cached sessions without hitting the database', async () => {
    const activeSession = {
      id: 'session-123',
      userId: 42,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      lastUsedAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest'
    };

    findByIdMock.mockResolvedValueOnce(activeSession);

    const registry = new SessionRegistry({ ttlMs: 1000 });
    const first = await registry.ensureActive('session-123');
    expect(first.id).toBe('session-123');
    expect(findByIdMock).toHaveBeenCalledTimes(1);

    const second = await registry.ensureActive('session-123');
    expect(second).toEqual(first);
    expect(findByIdMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes cache entries after ttl expiry', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const sessionA = {
      id: 'session-ttl',
      userId: 99,
      expiresAt: new Date(now + 60_000),
      lastUsedAt: new Date(now)
    };

    findByIdMock.mockResolvedValueOnce(sessionA).mockResolvedValueOnce(sessionA);

    const registry = new SessionRegistry({ ttlMs: 50 });
    await registry.ensureActive('session-ttl');
    expect(findByIdMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60);

    await registry.ensureActive('session-ttl');
    expect(findByIdMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('marks unknown sessions as revoked and throws', async () => {
    findByIdMock.mockResolvedValue(null);
    const registry = new SessionRegistry({ ttlMs: 100 });

    await expect(registry.ensureActive('missing-session')).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_REVOKED'
    });

    const cached = registry.getCacheEntry('missing-session');
    expect(cached?.status).toBe('revoked');
    expect(cached?.reason).toBe('unknown');
  });

  it('rejects revoked or expired sessions and caches revoked marker', async () => {
    const revoked = {
      id: 'session-revoked',
      userId: 55,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      revokedReason: 'user-signout'
    };

    findByIdMock.mockResolvedValue(revoked);
    const registry = new SessionRegistry({ ttlMs: 100 });

    await expect(registry.ensureActive('session-revoked')).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_REVOKED'
    });

    const cached = registry.getCacheEntry('session-revoked');
    expect(cached?.status).toBe('revoked');
    expect(cached?.reason).toBe('user-signout');
  });
});

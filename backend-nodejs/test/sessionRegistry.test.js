import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import UserSessionModel from '../src/models/UserSessionModel.js';
import { SessionRegistry } from '../src/services/SessionRegistry.js';

describe('SessionRegistry', () => {
  const now = Date.now();
  const activeSession = {
    id: 42,
    userId: 7,
    expiresAt: new Date(now + 60_000),
    lastUsedAt: new Date(now),
    revokedAt: null,
    revokedReason: null,
    revokedBy: null,
    userAgent: 'UnitTest',
    ipAddress: '127.0.0.1'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('caches validated sessions and avoids duplicate lookups within TTL', async () => {
    const registry = new SessionRegistry({ ttlMs: 5_000 });
    const spy = vi.spyOn(UserSessionModel, 'findById').mockResolvedValue(activeSession);

    const first = await registry.ensureActive(activeSession.id);
    const second = await registry.ensureActive(activeSession.id);

    expect(first.id).toBe(activeSession.id);
    expect(second.id).toBe(activeSession.id);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('marks sessions as revoked when expiration has elapsed', async () => {
    const registry = new SessionRegistry({ ttlMs: 5_000 });
    const expiredSession = { ...activeSession, id: 100, expiresAt: new Date(now - 1_000) };
    vi.spyOn(UserSessionModel, 'findById').mockResolvedValue(expiredSession);

    await expect(registry.ensureActive(expiredSession.id)).rejects.toMatchObject({
      code: 'SESSION_REVOKED'
    });
  });

  it('prevents access to revoked sessions once marked', async () => {
    const registry = new SessionRegistry({ ttlMs: 5_000 });
    vi.spyOn(UserSessionModel, 'findById').mockResolvedValue(activeSession);

    await registry.ensureActive(activeSession.id);
    registry.markRevoked(activeSession.id, 'manual');

    await expect(registry.ensureActive(activeSession.id)).rejects.toMatchObject({
      code: 'SESSION_REVOKED'
    });
  });
});

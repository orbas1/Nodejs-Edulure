import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const baseKeyset = [
  {
    kid: 'primary-key',
    secret: 'primary-secret-primary-secret-primary-secret',
    algorithm: 'HS512',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    kid: 'secondary-key',
    secret: 'secondary-secret-secondary-secret-secondary',
    algorithm: 'HS512',
    status: 'rotated',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    kid: 'disabled-key',
    secret: 'disabled-secret-disabled-secret-disabled',
    algorithm: 'HS256',
    status: 'disabled'
  }
];

vi.mock('../../src/config/env.js', () => ({
  env: {
    security: {
      jwtKeyset: baseKeyset,
      jwtActiveKeyId: 'primary-key',
      jwtActiveKey: baseKeyset[0],
      jwtAudience: 'api.edulure.test',
      jwtIssuer: 'edulure-platform'
    }
  }
}));

vi.mock('../../src/config/logger.js', () => ({
  default: {
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => ({ warn: vi.fn(), debug: vi.fn(), error: vi.fn() })
  }
}));

let jwtStore;

beforeAll(async () => {
  jwtStore = await import('../../src/config/jwtKeyStore.js');
});

describe('jwt key store', () => {
  it('exposes the active signing key', () => {
    expect(jwtStore.getActiveJwtKey().kid).toBe('primary-key');
  });

  it('verifies access tokens signed with the active key', () => {
    const token = jwt.sign({ sub: 'user-1', sid: 'session-1' }, baseKeyset[0].secret, {
      algorithm: 'HS512',
      audience: 'api.edulure.test',
      issuer: 'edulure-platform',
      header: { kid: 'primary-key' }
    });

    const payload = jwtStore.verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
  });

  it('accepts rotated keys for verification', () => {
    const token = jwt.sign({ sub: 'user-2', sid: 'session-2' }, baseKeyset[1].secret, {
      algorithm: 'HS512',
      audience: 'api.edulure.test',
      issuer: 'edulure-platform',
      header: { kid: 'secondary-key' }
    });

    const payload = jwtStore.verifyAccessToken(token);
    expect(payload.sub).toBe('user-2');
  });

  it('falls back to the active key when kid is unknown', () => {
    const token = jwt.sign({ sub: 'user-3', sid: 'session-3' }, baseKeyset[0].secret, {
      algorithm: 'HS512',
      audience: 'api.edulure.test',
      issuer: 'edulure-platform',
      header: { kid: 'non-existent' }
    });

    const payload = jwtStore.verifyAccessToken(token);
    expect(payload.sub).toBe('user-3');
  });

  it('omits secrets from verification metadata', () => {
    const metadata = jwtStore.getJwtVerificationMetadata();
    metadata.forEach((entry) => {
      expect(entry).not.toHaveProperty('secret');
      expect(entry.kid).toBeDefined();
    });
  });
});

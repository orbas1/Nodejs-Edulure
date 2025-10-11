import jwt from 'jsonwebtoken';

import logger from './logger.js';
import { env } from './env.js';

const verificationKeys = env.security.jwtKeyset.filter((key) => key.status !== 'disabled');
const activeKey = env.security.jwtActiveKey;

if (!activeKey) {
  throw new Error('JWT key store failed to initialise: no active signing key configured.');
}

function sortKeysByRecency(keys) {
  return [...keys].sort((a, b) => {
    const aDate = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bDate = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bDate - aDate;
  });
}

function buildCandidateList(kid) {
  if (kid) {
    const exactMatch = verificationKeys.find((key) => key.kid === kid);
    if (exactMatch) {
      return [exactMatch];
    }
    logger.warn({ kid }, 'JWT key not found for supplied kid. Falling back to active key.');
  }

  const fallbackKeys = sortKeysByRecency(
    verificationKeys.filter((key) => key.kid !== activeKey.kid && key.status !== 'disabled')
  );
  return [activeKey, ...fallbackKeys];
}

export function getActiveJwtKey() {
  return activeKey;
}

export function verifyAccessToken(token) {
  if (!token || typeof token !== 'string') {
    throw new jwt.JsonWebTokenError('Access token missing or not a string.');
  }

  let headerKid = null;
  try {
    const decoded = jwt.decode(token, { complete: true });
    headerKid = decoded?.header?.kid ?? null;
  } catch (_error) {
    throw new jwt.JsonWebTokenError('Unable to decode token header.');
  }

  const candidates = buildCandidateList(headerKid);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return jwt.verify(token, candidate.secret, {
        algorithms: [candidate.algorithm],
        audience: env.security.jwtAudience,
        issuer: env.security.jwtIssuer
      });
    } catch (error) {
      lastError = error;
      logger.debug(
        { kid: candidate.kid, error: error.message },
        'JWT verification failed for signing key candidate.'
      );
    }
  }

  throw lastError ?? new jwt.JsonWebTokenError('Token verification failed for all configured keys.');
}

export function getJwtVerificationMetadata() {
  return verificationKeys.map((key) => {
    const clone = { ...key };
    delete clone.secret;
    return clone;
  });
}

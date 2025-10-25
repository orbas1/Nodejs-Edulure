import { describe, expect, it } from 'vitest';

import { determineHttpLogLevel, isReleaseReadinessProbe } from '../../src/observability/httpLogLevel.js';

describe('http log level helpers', () => {
  const baseResponse = { statusCode: 200 };

  it('detects release readiness load probes', () => {
    expect(
      isReleaseReadinessProbe({
        headers: {
          'x-release-check': 'load-probe'
        }
      })
    ).toBe(true);
  });

  it('is tolerant of array header values when detecting probes', () => {
    expect(
      isReleaseReadinessProbe({
        headers: {
          'x-release-check': ['LOAD-PROBE']
        }
      })
    ).toBe(true);
  });

  it('returns debug for successful release readiness probes', () => {
    const req = {
      headers: {
        'x-release-check': 'load-probe'
      }
    };

    expect(determineHttpLogLevel(req, baseResponse)).toBe('debug');
  });

  it('returns warn for probe requests that end with a client error', () => {
    const req = {
      headers: {
        'x-release-check': 'load-probe'
      }
    };

    expect(determineHttpLogLevel(req, { statusCode: 429 })).toBe('warn');
  });

  it('returns error for probe requests that end with a server error', () => {
    const req = {
      headers: {
        'x-release-check': 'load-probe'
      }
    };

    expect(determineHttpLogLevel(req, { statusCode: 503 })).toBe('error');
  });

  it('returns info for non-probe traffic when successful', () => {
    const req = { headers: {} };
    expect(determineHttpLogLevel(req, baseResponse)).toBe('info');
  });

  it('returns error when an exception is provided', () => {
    const req = { headers: {} };
    const error = new Error('boom');
    expect(determineHttpLogLevel(req, baseResponse, error)).toBe('error');
  });
});

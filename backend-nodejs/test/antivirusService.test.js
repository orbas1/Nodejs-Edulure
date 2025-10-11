import { PassThrough } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('clamav.js', () => {
  const mock = {
    __impl: null,
    createScanner: vi.fn(() => ({
      scan: vi.fn((stream, cb) => {
        const implementation = mock.__impl;
        if (implementation) {
          implementation(stream, cb);
          return;
        }
        stream.on('data', () => {});
        stream.on('end', () => cb(null, 'stream', null));
      })
    })),
    ping: vi.fn((port, host, timeout, cb) => cb(null)),
    __setImplementation(handler) {
      mock.__impl = handler;
    },
    __clearImplementation() {
      mock.__impl = null;
    }
  };

  return { __esModule: true, default: mock };
});

import clamav from 'clamav.js';

import { AntivirusService } from '../src/services/AntivirusService.js';

describe('AntivirusService', () => {
  let storage;
  let service;

  function createStreamPayload() {
    const stream = new PassThrough();
    queueMicrotask(() => {
      stream.end(Buffer.from('payload'));
    });
    return stream;
  }

  beforeEach(() => {
    storage = {
      getObjectStream: vi.fn(async () => ({
        bucket: 'edulure-uploads',
        key: 'uploads/test.bin',
        stream: createStreamPayload(),
        contentLength: 7,
        contentType: 'application/octet-stream',
        metadata: {},
        etag: 'etag-123',
        bytes: 7
      }))
    };

    service = new AntivirusService(
      {
        enabled: true,
        host: '127.0.0.1',
        port: 3310,
        timeoutMs: 2000,
        maxFileSizeBytes: 5 * 1024 * 1024,
        failOpen: false,
        cacheTtlMs: 60000,
        skipMetadataTag: 'skip',
        quarantineBucket: 'edulure-quarantine'
      },
      storage
    );
    service.clearCache();
    clamav.__clearImplementation();
    clamav.createScanner.mockClear();
  });

  afterEach(() => {
    clamav.__clearImplementation();
  });

  it('skips scanning when the service is disabled', async () => {
    service.updateConfig({ ...service.config, enabled: false });
    const result = await service.scanObject({
      bucket: 'edulure-uploads',
      key: 'uploads/disabled.bin',
      sizeBytes: 2048,
      metadata: {}
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('scanner-disabled');
    expect(storage.getObjectStream).not.toHaveBeenCalled();
  });

  it('marks assets as infected when the scanner flags a signature', async () => {
    clamav.__setImplementation((stream, cb) => {
      stream.on('data', () => {});
      stream.on('end', () => {
        cb(null, 'stream', 'stream: Eicar-Test-Signature FOUND');
      });
    });

    const result = await service.scanObject({
      bucket: 'edulure-uploads',
      key: 'uploads/eicar.bin',
      metadata: {}
    });

    expect(result.status).toBe('infected');
    expect(result.signature).toBe('Eicar-Test-Signature');
    expect(result.bytesScanned).toBe(7);
  });

  it('caches clean scan results to avoid repeated scanner calls', async () => {
    clamav.__setImplementation((stream, cb) => {
      stream.on('data', () => {});
      stream.on('end', () => cb(null, 'stream', null));
    });

    const first = await service.scanObject({
      bucket: 'edulure-uploads',
      key: 'uploads/cache.bin',
      metadata: {}
    });

    const second = await service.scanObject({
      bucket: 'edulure-uploads',
      key: 'uploads/cache.bin',
      metadata: {}
    });

    expect(first.status).toBe('clean');
    expect(second.cached).toBe(true);
    expect(clamav.createScanner).toHaveBeenCalledTimes(1);
  });
});

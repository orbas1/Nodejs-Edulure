import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed-url.example')
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from '../src/services/StorageService.js';
import { env } from '../src/config/env.js';

const createMockClient = () => ({
  send: vi.fn()
});

describe('StorageService', () => {
  let service;

  beforeEach(() => {
    service = new StorageService(createMockClient());
    vi.clearAllMocks();
  });

  it('generates deterministic storage keys with preserved extensions', () => {
    const key = service.generateStorageKey('uploads/ebook', 'learning.epub');

    expect(key.startsWith('uploads/ebook/')).toBe(true);
    expect(key.endsWith('.epub')).toBe(true);
  });

  it('resolves visibility-aware buckets', () => {
    expect(service.resolveBucket('public')).toBe(env.storage.publicBucket);
    expect(service.resolveBucket('private')).toBe(env.storage.privateBucket);
    expect(service.resolveBucket(undefined, 'custom-bucket')).toBe('custom-bucket');
  });

  it('presigns uploads with ttl and returns bucket metadata', async () => {
    const result = await service.createUploadUrl({
      key: 'uploads/powerpoint/test.pptx',
      contentType: 'application/vnd.ms-powerpoint',
      contentLength: 1024,
      visibility: 'workspace'
    });

    expect(result.bucket).toBe(env.storage.uploadsBucket);
    expect(result.key).toBe('uploads/powerpoint/test.pptx');
    expect(result.url).toBe('https://signed-url.example');
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl.mock.calls[0][2]).toEqual({ expiresIn: env.storage.uploadTtlMinutes * 60 });
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('throws when payload exceeds configured maximum', async () => {
    await expect(
      service.createUploadUrl({
        key: 'uploads/oversized.bin',
        contentType: 'application/octet-stream',
        contentLength: env.storage.maxUploadBytes + 1
      })
    ).rejects.toMatchObject({ status: 413 });
  });

  it('builds public urls using cdn when configured and falls back to r2 hostname', () => {
    const originalCdn = env.storage.cdnUrl;
    env.storage.cdnUrl = 'https://cdn.edulure.test';
    const cdnUrl = service.buildPublicUrl({ bucket: env.storage.publicBucket, key: 'content/file.pdf' });
    expect(cdnUrl).toBe('https://cdn.edulure.test/content/file.pdf');

    env.storage.cdnUrl = undefined;
    const fallbackUrl = service.buildPublicUrl({ bucket: 'public-bucket', key: 'content/file.pdf' });
    expect(fallbackUrl).toBe(`https://public-bucket.${env.storage.accountId}.r2.cloudflarestorage.com/content/file.pdf`);

    env.storage.cdnUrl = originalCdn;
  });
});

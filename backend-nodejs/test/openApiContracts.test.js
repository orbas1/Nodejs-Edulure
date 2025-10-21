import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import path from 'path';

import { generateServiceSpecs } from '../src/docs/builders/openapiBuilder.js';
import { clearServiceSpecCache, getServiceSpecDocument, getServiceSpecIndex } from '../src/docs/serviceSpecRegistry.js';

const mockedDashboardSnapshot = {
  metrics: [],
  widgets: []
};

const INDEX_PATH_SUFFIX = path.join('generated', 'index.json');
let corruptIndexRead = false;

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn((targetPath, encoding) => {
      if (corruptIndexRead && targetPath.toString().endsWith(INDEX_PATH_SUFFIX)) {
        corruptIndexRead = false;
        return '{ invalid json';
      }

      return actual.readFileSync(targetPath, encoding);
    })
  };
});

vi.mock('../src/services/DashboardService.js', () => ({
  default: {
    getDashboardForUser: vi.fn().mockResolvedValue(mockedDashboardSnapshot)
  }
}));

describe('OpenAPI contract publications', () => {
  let appInstance;

  beforeAll(async () => {
    generateServiceSpecs({ outputDir: undefined });
    clearServiceSpecCache();
    ({ default: appInstance } = await import('../src/app.js'));
  });

  afterAll(() => {
    clearServiceSpecCache();
  });

  it('lists service spec metadata with capability descriptors', () => {
    const index = getServiceSpecIndex();
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThan(0);
    for (const item of index) {
      expect(item).toMatchObject({
        service: expect.any(String),
        capability: expect.any(String),
        description: expect.any(String),
        basePath: expect.stringMatching(/^\//)
      });

      expect(item.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(() => new Date(item.lastUpdated).toISOString()).not.toThrow();
      expect(new Date(item.lastUpdated).toISOString()).toBe(item.lastUpdated);

      if (item.documentationUrl) {
        expect(item.documentationUrl).toMatch(/^https:\/\/docs\.edulure\.com\//);
      }
    }
  });

  it('serves each service specification via HTTP with the expected OpenAPI version', async () => {
    const index = getServiceSpecIndex();
    for (const descriptor of index) {
      const response = await request(appInstance)
        .get(`/api/v1/docs/services/${descriptor.service}`)
        .expect(200);
      expect(response.body).toMatchObject({
        openapi: expect.stringMatching(/^3\.\d+\.\d+/),
        info: expect.objectContaining({ title: expect.any(String) }),
        paths: expect.any(Object)
      });

      const spec = getServiceSpecDocument(descriptor.service);
      expect(Object.keys(spec.paths).every((pathKey) => pathKey.startsWith(descriptor.basePath))).toBe(true);
    }
  });

  it('returns a curated index payload for downstream automation', async () => {
    const response = await request(appInstance).get('/api/v1/docs/index.json').expect(200);
    expect(response.body).toMatchObject({
      version: expect.any(String),
      services: expect.any(Array)
    });
    expect(response.body.services.length).toBeGreaterThan(0);
  });

  it('rejects requests for unknown service specifications', async () => {
    await request(appInstance)
      .get('/api/v1/docs/services/unknown-service')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: false,
          message: expect.stringContaining('No OpenAPI document registered')
        });
      });
  });

  it('defensively clones service specs to prevent mutations from leaking between calls', () => {
    const index = getServiceSpecIndex();
    const firstService = index[0];
    expect(firstService).toBeDefined();

    const spec = getServiceSpecDocument(firstService.service);
    expect(spec).not.toBeNull();

    if (!spec) {
      return;
    }

    spec.paths['/__test__'] = {};
    const specAgain = getServiceSpecDocument(firstService.service);
    expect(specAgain.paths['/__test__']).toBeUndefined();
  });

  it('prevents path traversal attempts when requesting service documentation', () => {
    expect(getServiceSpecDocument('../openapi.json')).toBeNull();
    expect(getServiceSpecDocument('../../etc/passwd')).toBeNull();
  });

  it('throws a descriptive error when the service index cannot be parsed', () => {
    clearServiceSpecCache();
    corruptIndexRead = true;
    expect(() => getServiceSpecIndex()).toThrow(/Failed to load service spec index/i);
    clearServiceSpecCache();
  });
});

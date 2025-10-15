import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../src/app.js';
import { generateServiceSpecs } from '../src/docs/builders/openapiBuilder.js';
import { clearServiceSpecCache, getServiceSpecDocument, getServiceSpecIndex } from '../src/docs/serviceSpecRegistry.js';

describe('OpenAPI contract publications', () => {
  beforeAll(() => {
    generateServiceSpecs({ outputDir: undefined });
    clearServiceSpecCache();
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
    }
  });

  it('serves each service specification via HTTP with the expected OpenAPI version', async () => {
    const index = getServiceSpecIndex();
    for (const descriptor of index) {
      const response = await request(app).get(`/api/v1/docs/services/${descriptor.service}`).expect(200);
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
    const response = await request(app).get('/api/v1/docs/index.json').expect(200);
    expect(response.body).toMatchObject({
      version: expect.any(String),
      services: expect.any(Array)
    });
    expect(response.body.services.length).toBeGreaterThan(0);
  });

  it('rejects requests for unknown service specifications', async () => {
    await request(app)
      .get('/api/v1/docs/services/unknown-service')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toEqual({
          success: false,
          message: expect.stringContaining('No OpenAPI document registered')
        });
      });
  });
});

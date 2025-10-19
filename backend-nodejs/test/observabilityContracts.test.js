import fs from 'fs';

import Ajv from 'ajv';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { recordHttpSloObservation, resetSloRegistry } from '../src/observability/sloRegistry.js';

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (_req, _res, next) => next()
}));

let app;
let validateListResponse;
let validateDetailResponse;

describe('Observability OpenAPI contracts', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
    const spec = JSON.parse(fs.readFileSync('backend-nodejs/src/docs/openapi.json', 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    const schemas = spec.components?.schemas ?? {};
    for (const [name, schema] of Object.entries(schemas)) {
      ajv.addSchema(schema, `#/components/schemas/${name}`);
    }
    validateListResponse = ajv.compile({ $ref: '#/components/schemas/ObservabilitySloListResponse' });
    validateDetailResponse = ajv.compile({ $ref: '#/components/schemas/ObservabilitySloDetailResponse' });
  });

  it('matches the published schema for list and detail responses', async () => {
    resetSloRegistry();
    recordHttpSloObservation({
      route: '/api/v1/provider-transition/announcements',
      method: 'GET',
      statusCode: 200,
      durationMs: 120
    });

    const listResponse = await request(app)
      .get('/api/v1/observability/slos')
      .set('Authorization', 'Bearer token');

    expect(validateListResponse(listResponse.body)).toBe(true);

    const detailResponse = await request(app)
      .get('/api/v1/observability/slos/provider-transition-availability')
      .set('Authorization', 'Bearer token');

    expect(validateDetailResponse(detailResponse.body)).toBe(true);
  });
});

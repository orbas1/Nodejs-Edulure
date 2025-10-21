import { describe, expect, it, beforeEach } from 'vitest';

import {
  success,
  paginated,
  created,
  accepted,
  noContent,
  error,
  validationError,
  fromError
} from '../src/utils/httpResponse.js';

function createResponse() {
  const headers = {};
  return {
    statusCode: null,
    body: null,
    headers,
    set: (key, value) => {
      headers[key] = value;
    },
    status(status) {
      this.statusCode = status;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    sendCalled: false,
    send() {
      this.sendCalled = true;
      this.statusCode = this.statusCode ?? 204;
      return this;
    },
    endCalled: false,
    end() {
      this.endCalled = true;
      this.statusCode = this.statusCode ?? 204;
      return this;
    }
  };
}

describe('httpResponse utilities', () => {
  let res;

  beforeEach(() => {
    res = createResponse();
  });

  it('returns a standard success response', () => {
    success(res, { data: { id: 1 }, message: 'ok' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'ok',
      data: { id: 1 }
    });
  });

  it('supports pagination metadata with defaults', () => {
    paginated(res, {
      data: [{ id: 1 }],
      pagination: { page: 3, total: 25 },
      meta: { filter: 'active' }
    });

    expect(res.body.meta).toEqual({
      filter: 'active',
      pagination: {
        page: 3,
        perPage: null,
        total: 25,
        totalPages: null
      }
    });
  });

  it('supports created and accepted helpers', () => {
    created(res, { data: { id: 'new' }, message: 'Created' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    accepted(res, { message: 'Accepted', status: 209 });
    expect(res.statusCode).toBe(209);
    expect(res.body.message).toBe('Accepted');
  });

  it('sends a no content response without body', () => {
    noContent(res, { headers: { 'X-Test': 'true' } });

    expect(res.statusCode).toBe(204);
    expect(res.sendCalled || res.endCalled).toBe(true);
    expect(res.headers['X-Test']).toBe('true');
  });

  it('formats errors with metadata and custom status', () => {
    error(res, {
      message: 'failure',
      status: 503,
      code: 'service_unavailable',
      errors: [{ message: 'downstream' }],
      meta: { retryable: true }
    });

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      success: false,
      message: 'failure',
      code: 'service_unavailable',
      errors: [{ message: 'downstream' }],
      meta: { retryable: true }
    });
  });

  it('normalises validation errors', () => {
    validationError(res, {
      errors: [
        { field: 'email', message: 'Invalid email', code: 'format' },
        'Generic issue'
      ]
    });

    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toEqual([
      { field: 'email', message: 'Invalid email', code: 'format', details: {} },
      { field: null, message: 'Generic issue', code: null, details: {} }
    ]);
  });

  it('derives HTTP response from error objects', () => {
    const err = new Error('Internal issue');
    err.code = 'E_INTERNAL';
    err.errors = [{ message: 'context' }];
    err.data = { correlationId: 'abc' };

    fromError(res, err, { statusMap: { Error: 418 } });

    expect(res.statusCode).toBe(418);
    expect(res.body.code).toBe('E_INTERNAL');
    expect(res.body.data).toEqual({ correlationId: 'abc' });
  });
});

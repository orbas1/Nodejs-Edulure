import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  accepted,
  created,
  failure,
  noContent,
  paginated,
  success,
  error
} from '../src/utils/httpResponse.js';

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res;
}

describe('httpResponse utilities', () => {
  let res;

  beforeEach(() => {
    res = createMockRes();
  });

  it('returns a success payload with defaults', () => {
    success(res, { data: { ok: true }, message: 'All good' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'All good',
      data: { ok: true }
    });
  });

  it('supports created and accepted helpers with coerced status codes', () => {
    created(res, { data: { id: 1 } });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].data).toEqual({ id: 1 });

    res.status.mockClear();
    res.json.mockClear();

    accepted(res, { message: 'Queued', status: '202' });
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Queued', data: null });
  });

  it('wraps paginated responses with metadata', () => {
    paginated(res, {
      data: [1, 2],
      pagination: { page: '2', perPage: '5', total: '10', offset: '5' }
    });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: null,
      data: [1, 2],
      meta: {
        pagination: {
          page: 2,
          perPage: 5,
          limit: 5,
          total: 10,
          totalPages: 0,
          offset: 5
        }
      }
    });
  });

  it('builds failure payloads with validation errors', () => {
    failure(res, { message: 'Invalid', errors: ['issue'], status: '418' });

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid',
      errors: ['issue']
    });
  });

  it('falls back to sane defaults for noContent and error helpers', () => {
    noContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: null, data: null });

    res.status.mockClear();
    res.json.mockClear();

    error(res, { message: 'Boom', errors: [{ field: 'test' }], status: 'not-a-status' });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Boom',
      errors: [{ field: 'test' }]
    });
  });
});

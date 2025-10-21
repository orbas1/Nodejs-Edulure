import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 101, role: 'admin' };
    next();
  }
}));

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const getById = vi.fn();
const updateById = vi.fn();

vi.mock('../src/services/UserService.js', () => ({
  default: {
    list,
    create,
    update,
    remove,
    getById,
    updateById
  }
}));

let app;

describe('User HTTP routes', () => {
  beforeAll(async () => {
    const { default: userRouter } = await import('../src/routes/user.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/users', userRouter);
    app.use((err, _req, res, _next) => {
      const status = err.status ?? 500;
      return res.status(status).json({
        success: false,
        message: err.message ?? 'Request failed',
        details: err.details
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authenticated user profile', async () => {
    getById.mockResolvedValue({ id: 101, email: 'admin@example.com' });

    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('admin@example.com');
    expect(getById).toHaveBeenCalledWith(101);
  });

  it('lists users with pagination meta', async () => {
    list.mockResolvedValue([{ id: 1, email: 'user@example.com' }]);

    const response = await request(app)
      .get('/api/v1/users?limit=10&offset=5')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.pagination).toEqual({ limit: 10, offset: 5 });
    expect(list).toHaveBeenCalledWith(10, 5);
  });

  it('creates users and returns the created payload', async () => {
    create.mockResolvedValue({ user: { id: 2, email: 'new@example.com' }, temporaryPassword: 'Temp1234' });

    const response = await request(app)
      .post('/api/v1/users')
      .send({ firstName: 'New', email: 'new@example.com' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('new@example.com');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }), { id: 101, role: 'admin' });
  });

  it('updates users via patch', async () => {
    update.mockResolvedValue({ id: 2, email: 'updated@example.com' });

    const response = await request(app)
      .patch('/api/v1/users/2')
      .send({ email: 'updated@example.com' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe('updated@example.com');
    expect(update).toHaveBeenCalledWith(2, { email: 'updated@example.com' }, { id: 101, role: 'admin' });
  });

  it('deletes users and returns no content', async () => {
    remove.mockResolvedValue();

    const response = await request(app)
      .delete('/api/v1/users/5')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(204);
    expect(remove).toHaveBeenCalledWith(5, { id: 101, role: 'admin' });
  });

  it('updates the authenticated user profile', async () => {
    updateById.mockResolvedValue({ id: 101, firstName: 'Updated' });

    const response = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer token')
      .send({ firstName: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe('Updated');
    expect(updateById).toHaveBeenCalledWith(101, { firstName: 'Updated' });
  });

  it('returns validation errors from schema failures', async () => {
    const error = new Error('Invalid input');
    error.status = 422;
    error.details = ['Provide at least one field to update'];
    update.mockRejectedValue(error);

    const response = await request(app)
      .patch('/api/v1/users/not-a-number')
      .set('Authorization', 'Bearer token')
      .send({});

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();

    const response2 = await request(app)
      .patch('/api/v1/users/10')
      .set('Authorization', 'Bearer token')
      .send({});

    expect(response2.status).toBe(422);
    expect(response2.body.details).toEqual(['Provide at least one field to update']);
  });

  it('propagates service layer errors with status codes', async () => {
    const conflict = new Error('Email already in use');
    conflict.status = 409;
    create.mockRejectedValue(conflict);

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', 'Bearer token')
      .send({ firstName: 'Existing', email: 'existing@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email already in use');
  });
});

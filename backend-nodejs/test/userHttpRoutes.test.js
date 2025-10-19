import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const userServiceMock = {
  getById: vi.fn(),
  updateById: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 91, role: 'user' };
    return next();
  }
}));

vi.mock('../src/services/UserService.js', () => ({
  default: userServiceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  Object.values(userServiceMock).forEach((fn) => fn.mockReset());
});

describe('User HTTP routes', () => {
  it('returns the authenticated profile via GET /users/me', async () => {
    userServiceMock.getById.mockResolvedValue({
      id: 91,
      firstName: 'Nova',
      profile: {
        displayName: 'Nova Quinn',
        socialLinks: [{ label: 'Website', url: 'https://nova.example' }]
      }
    });

    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(91);
    expect(response.body.data.profile.displayName).toBe('Nova Quinn');
    expect(userServiceMock.getById).toHaveBeenCalledWith(91);
  });

  it('updates the authenticated profile via PUT /users/me', async () => {
    userServiceMock.updateById.mockResolvedValue({
      id: 91,
      firstName: 'Nova',
      profile: {
        displayName: 'Nova Quinn',
        tagline: 'Community builder'
      }
    });

    const response = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer token')
      .send({
        firstName: 'Nova',
        profile: {
          displayName: 'Nova Quinn',
          tagline: 'Community builder'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Profile updated');
    expect(userServiceMock.updateById).toHaveBeenCalledWith(91, {
      firstName: 'Nova',
      profile: { displayName: 'Nova Quinn', tagline: 'Community builder' }
    });
  });

  it('validates invalid social links', async () => {
    const response = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', 'Bearer token')
      .send({
        profile: {
          socialLinks: [{ label: 'Site', url: 'nota-url' }]
        }
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
    expect(userServiceMock.updateById).not.toHaveBeenCalled();
  });
});

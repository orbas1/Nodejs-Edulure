import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  __esModule: true,
  default: () => (req, _res, next) => {
    req.user = { id: 42, role: 'user' };
    next();
  }
}));

const createUploadUrl = vi.fn();
const generateStorageKey = vi.fn((prefix, filename) => `${prefix}/${filename}`);
const buildPublicUrl = vi.fn(() => 'https://cdn.edulure.test/media/images/example.png');

vi.mock('../src/services/StorageService.js', () => ({
  __esModule: true,
  default: {
    createUploadUrl,
    generateStorageKey,
    buildPublicUrl
  }
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    storage: {
      publicBucket: 'public-uploads',
      privateBucket: 'private-uploads'
    }
  }
}));

let app;

describe('Media upload HTTP routes', () => {
  beforeAll(async () => {
    const { default: mediaRouter } = await import('../src/routes/media.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/media', mediaRouter);
    app.use((error, _req, res, _next) => {
      const status = error?.status ?? 500;
      res.status(status).json({
        success: false,
        error: error?.message ?? 'Internal Server Error',
        details: error?.details ?? undefined
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    createUploadUrl.mockResolvedValue({
      url: 'https://storage.edulure.test/upload',
      expiresAt: '2025-01-01T00:00:00.000Z',
      key: 'media/images/example.png',
      bucket: 'public-uploads'
    });
  });

  it('generates pre-signed upload URLs with sanitised metadata', async () => {
    const response = await request(app)
      .post('/api/v1/media/uploads')
      .set('Authorization', 'Bearer token')
      .send({
        kind: 'image',
        filename: 'example.png',
        mimeType: 'image/png',
        size: 1024
      });

    expect(response.status).toBe(201);
    expect(response.body.data.file.storageBucket).toBe('public-uploads');
    expect(response.body.data.file.publicUrl).toMatch(/^https:\/\//);
    expect(createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'media/images/example.png',
        visibility: 'public'
      })
    );
  });

  it('rejects filenames containing directory traversal characters', async () => {
    const response = await request(app)
      .post('/api/v1/media/uploads')
      .set('Authorization', 'Bearer token')
      .send({
        filename: '../secret.png',
        mimeType: 'image/png',
        size: 1200
      });

    expect(response.status).toBe(422);
    expect(response.body.details).toContain('Filename must not include parent directory segments');
    expect(createUploadUrl).not.toHaveBeenCalled();
  });
});


import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: {}
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

import IntegrationApiKeyService from '../src/services/IntegrationApiKeyService.js';

const encryptionServiceMock = vi.hoisted(() => ({
  hash: vi.fn(),
  encryptStructured: vi.fn()
}));

vi.mock('../src/services/DataEncryptionService.js', () => ({
  default: encryptionServiceMock
}));

const now = new Date('2025-02-25T12:00:00.000Z');

const modelMock = {
  list: vi.fn(),
  findByAlias: vi.fn(),
  findByHash: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn()
};

describe('IntegrationApiKeyService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IntegrationApiKeyService({
      model: modelMock,
      encryptionService: encryptionServiceMock,
      nowProvider: () => now
    });

    encryptionServiceMock.hash.mockImplementation((value) => `hash-${value.slice(-6)}`);
    encryptionServiceMock.encryptStructured.mockReturnValue({
      ciphertext: Buffer.from('encrypted-secret'),
      keyId: 'key-primary',
      classificationTag: 'integration-secret'
    });
  });

  it('creates a new API key with encryption, validation, and rotation metadata', async () => {
    modelMock.findByAlias.mockResolvedValue(null);
    modelMock.findByHash.mockResolvedValue(null);
    const recordResponse = {
      id: 1,
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      ownerEmail: 'ops@example.com',
      lastFour: '9xyz',
      keyHash: 'hash-9xyz',
      encryptedKey: Buffer.from('encrypted-secret'),
      encryptionKeyId: 'key-primary',
      classificationTag: 'integration-secret',
      rotationIntervalDays: 90,
      lastRotatedAt: now,
      nextRotationAt: new Date('2025-05-26T12:00:00.000Z'),
      expiresAt: null,
      disabledAt: null,
      status: 'active',
      metadata: {
        rotationHistory: [
          {
            rotatedAt: now.toISOString(),
            rotatedBy: 'integrations.lead@example.com',
            reason: 'initial-provision'
          }
        ],
        lastRotatedBy: 'integrations.lead@example.com'
      },
      createdAt: now,
      updatedAt: now
    };

    modelMock.create.mockResolvedValue(recordResponse);

    const result = await service.createKey({
      provider: 'OpenAI',
      environment: 'Production',
      alias: ' Content Studio Bot ',
      ownerEmail: 'ops@example.com',
      keyValue: 'sk-live-super-secure-credential-9xyz',
      rotationIntervalDays: 75,
      notes: 'Used for content drafting templates'
    });

    expect(encryptionServiceMock.hash).toHaveBeenCalledWith('sk-live-super-secure-credential-9xyz');
    expect(encryptionServiceMock.encryptStructured).toHaveBeenCalledWith(
      { secret: 'sk-live-super-secure-credential-9xyz' },
      expect.objectContaining({ fingerprintValues: expect.arrayContaining(['Content Studio Bot']) })
    );
    expect(modelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        environment: 'production',
        alias: 'Content Studio Bot',
        ownerEmail: 'ops@example.com',
        lastFour: '9xyz',
        rotationIntervalDays: 75
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        provider: 'openai',
        providerLabel: 'OpenAI',
        alias: 'Content Studio Bot',
        rotationIntervalDays: 90, // database response wins over request
        rotationStatus: 'ok',
        lastFour: '9xyz',
        rotationHistory: expect.arrayContaining([
          expect.objectContaining({ rotatedBy: 'integrations.lead@example.com' })
        ])
      })
    );
  });

  it('rotates an existing API key and records rotation history', async () => {
    const existingRecord = {
      id: 5,
      provider: 'anthropic',
      environment: 'staging',
      alias: 'Claude Drafting',
      ownerEmail: 'ops@example.com',
      lastFour: 'abcd',
      keyHash: 'hash-old',
      encryptedKey: Buffer.from('old'),
      encryptionKeyId: 'key-old',
      classificationTag: 'integration-secret',
      rotationIntervalDays: 45,
      lastRotatedAt: new Date('2024-12-01T12:00:00.000Z'),
      nextRotationAt: new Date('2025-01-30T12:00:00.000Z'),
      expiresAt: null,
      disabledAt: null,
      status: 'active',
      metadata: {
        rotationHistory: [
          { rotatedAt: '2024-12-01T12:00:00.000Z', rotatedBy: 'ops@example.com', reason: 'initial-provision' }
        ],
        lastRotatedBy: 'ops@example.com'
      },
      createdAt: new Date('2024-10-01T12:00:00.000Z'),
      updatedAt: new Date('2024-12-01T12:00:00.000Z')
    };

    modelMock.findById.mockResolvedValueOnce(existingRecord);

    const rotatedRecord = {
      ...existingRecord,
      lastFour: 'wxyz',
      keyHash: 'hash-wxyz',
      rotationIntervalDays: 60,
      lastRotatedAt: now,
      nextRotationAt: new Date('2025-04-26T12:00:00.000Z'),
      metadata: {
        rotationHistory: [
          { rotatedAt: now.toISOString(), rotatedBy: 'security@example.com', reason: 'scheduled-rotation' },
          ...existingRecord.metadata.rotationHistory
        ],
        lastRotatedBy: 'security@example.com'
      },
      updatedAt: now
    };

    modelMock.updateById.mockResolvedValue(rotatedRecord);

    const result = await service.rotateKey(5, {
      keyValue: 'sk-new-credential-wxyz',
      rotationIntervalDays: 45,
      rotatedBy: 'security@example.com',
      reason: 'scheduled-rotation'
    });

    expect(encryptionServiceMock.hash).toHaveBeenCalledWith('sk-new-credential-wxyz');
    expect(modelMock.updateById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        lastFour: 'wxyz',
        rotationIntervalDays: 45,
        lastRotatedAt: now,
        status: 'active'
      })
    );
    expect(result.rotationHistory[0]).toEqual(
      expect.objectContaining({
        rotatedBy: 'security@example.com',
        reason: 'scheduled-rotation'
      })
    );
    expect(result.rotationStatus).toBe('ok');
  });

  it('disables a key and preserves audit metadata', async () => {
    const existingRecord = {
      id: 7,
      provider: 'grok',
      environment: 'production',
      alias: 'Grok Experiments',
      ownerEmail: 'ops@example.com',
      lastFour: '1234',
      keyHash: 'hash-1234',
      encryptedKey: Buffer.from('secret'),
      encryptionKeyId: 'key-old',
      classificationTag: 'integration-secret',
      rotationIntervalDays: 60,
      lastRotatedAt: now,
      nextRotationAt: addDays(now, 60),
      expiresAt: null,
      disabledAt: null,
      status: 'active',
      metadata: {
        rotationHistory: [{ rotatedAt: now.toISOString(), rotatedBy: 'ops@example.com', reason: 'manual-rotation' }],
        lastRotatedBy: 'ops@example.com'
      },
      createdAt: now,
      updatedAt: now
    };

    modelMock.findById.mockResolvedValueOnce(existingRecord);
    const disabledRecord = {
      ...existingRecord,
      disabledAt: now,
      status: 'disabled',
      metadata: {
        ...existingRecord.metadata,
        disabledReason: 'Compromise suspected',
        disabledBy: 'security@example.com'
      },
      updatedAt: now
    };
    modelMock.updateById.mockResolvedValue(disabledRecord);

    const result = await service.disableKey(7, {
      disabledBy: 'security@example.com',
      reason: 'Compromise suspected'
    });

    expect(modelMock.updateById).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        status: 'disabled',
        metadata: expect.objectContaining({ disabledReason: 'Compromise suspected' })
      })
    );
    expect(result.status).toBe('disabled');
    expect(result.rotationStatus).toBe('disabled');
  });

  it('lists keys using sanitisation for rotation reminders', async () => {
    const records = [
      {
        id: 9,
        provider: 'openai',
        environment: 'production',
        alias: 'Vision Partner',
        ownerEmail: 'ops@example.com',
        lastFour: '7890',
        keyHash: 'hash-7890',
        encryptedKey: Buffer.from('secret'),
        encryptionKeyId: 'key-1',
        classificationTag: 'integration-secret',
        rotationIntervalDays: 30,
        lastRotatedAt: new Date('2025-01-20T12:00:00.000Z'),
        nextRotationAt: new Date('2025-02-19T12:00:00.000Z'),
        expiresAt: null,
        disabledAt: null,
        status: 'active',
        metadata: { rotationHistory: [], lastRotatedBy: 'ops@example.com' },
        createdAt: new Date('2024-11-20T12:00:00.000Z'),
        updatedAt: new Date('2025-01-20T12:00:00.000Z')
      }
    ];

    modelMock.list.mockResolvedValue(records);

    const result = await service.listKeys({ provider: 'openai' });

    expect(modelMock.list).toHaveBeenCalledWith({ provider: 'openai' });
    expect(result[0]).toEqual(
      expect.objectContaining({
        provider: 'openai',
        rotationStatus: 'overdue',
        daysUntilRotation: expect.any(Number)
      })
    );
  });

  it('guards against unknown providers', async () => {
    await expect(
      service.createKey({
        provider: 'unknown',
        environment: 'production',
        alias: 'Invalid',
        ownerEmail: 'ops@example.com',
        keyValue: 'some-key-1234567890'
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    integrations: {
      invites: {
        baseUrl: 'https://ops.edulure.com',
        tokenTtlHours: 72,
        acknowledgementRecipients: ['integrations@edulure.com', 'security@edulure.com']
      }
    },
    mail: {
      verificationBaseUrl: 'https://ops.edulure.com/verify'
    }
  }
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

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'invite-uuid')
}));

import IntegrationApiKeyInviteService from '../src/services/IntegrationApiKeyInviteService.js';

const inviteModelMock = {
  list: vi.fn(),
  create: vi.fn(),
  findByAlias: vi.fn(),
  findPendingForAlias: vi.fn(),
  findById: vi.fn(),
  findActiveByTokenHash: vi.fn(),
  updateById: vi.fn(),
  hashToken: vi.fn()
};

const apiKeyModelMock = {
  findByAlias: vi.fn()
};

const apiKeyServiceMock = {
  createKey: vi.fn(),
  rotateKey: vi.fn(),
  sanitize: vi.fn((record) => ({ ...record, sanitized: true }))
};

const mailServiceMock = {
  sendMail: vi.fn()
};

const trxMock = { id: 'trx' };
const databaseMock = {
  transaction: vi.fn(async (handler) => handler(trxMock))
};

const auditLoggerMock = {
  record: vi.fn()
};

const now = new Date('2025-02-26T10:00:00.000Z');

describe('IntegrationApiKeyInviteService', () => {
  let service;
  let randomBytesSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    inviteModelMock.hashToken.mockImplementation((token) => `hash-${token}`);
    mailServiceMock.sendMail.mockResolvedValue(true);
    auditLoggerMock.record.mockReset();
    auditLoggerMock.record.mockResolvedValue();
    randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockReturnValue(
      Buffer.from('token-abc123token-abc123token-abc123token-abc123', 'utf8')
    );

    service = new IntegrationApiKeyInviteService({
      inviteModel: inviteModelMock,
      apiKeyModel: apiKeyModelMock,
      apiKeyService: apiKeyServiceMock,
      mailService: mailServiceMock,
      database: databaseMock,
      nowProvider: () => now,
      auditLogger: auditLoggerMock,
      auditTenantId: 'integrations'
    });
  });

  it('creates a new invite, persists metadata, and dispatches an email', async () => {
    inviteModelMock.findPendingForAlias.mockResolvedValue(null);
    apiKeyModelMock.findByAlias.mockResolvedValue(null);
    inviteModelMock.create.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: null,
      ownerEmail: 'ops@example.com',
      requestedBy: 'admin@example.com',
      requestedAt: now,
      expiresAt: new Date('2025-02-29T10:00:00.000Z'),
      status: 'pending',
      tokenHash: 'hash-token',
      rotationIntervalDays: 90,
      keyExpiresAt: new Date('2025-03-10T10:00:00.000Z'),
      documentationUrl: 'https://docs.edulure.com/integrations/openai/rotation',
      metadata: {
        notes: 'Marketing automations',
        reason: 'Initial onboarding',
        documentationUrl: 'https://docs.edulure.com/integrations/openai/rotation'
      },
      lastSentAt: now,
      sendCount: 1
    });

    const result = await service.createInvite({
      provider: 'OpenAI',
      environment: 'Production',
      alias: 'Content Studio Bot',
      ownerEmail: 'ops@example.com',
      rotationIntervalDays: 90,
      keyExpiresAt: '2025-03-10T10:00:00.000Z',
      notes: 'Marketing automations',
      reason: 'Initial onboarding',
      requestedBy: 'admin@example.com',
      requestedByName: 'Ops Admin',
      documentationUrl: 'https://docs.edulure.com/integrations/openai/rotation'
    });

    expect(inviteModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        environment: 'production',
        alias: 'Content Studio Bot',
        rotationIntervalDays: 90,
        ownerEmail: 'ops@example.com',
        documentationUrl: 'https://docs.edulure.com/integrations/openai/rotation'
      }),
      databaseMock
    );

    expect(mailServiceMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        subject: expect.stringContaining('OpenAI'),
        html: expect.stringContaining('Submit credential'),
        text: expect.stringContaining('Submit the credential')
      })
    );

    expect(result.invite).toEqual(
      expect.objectContaining({
        id: 'invite-uuid',
        provider: 'openai',
        providerLabel: 'OpenAI',
        status: 'pending',
        rotationIntervalDays: 90,
        documentationUrl: 'https://docs.edulure.com/integrations/openai/rotation'
      })
    );
    expect(result.claimUrl).toMatch('https://ops.edulure.com/integrations/credential-invite/');
    expect(auditLoggerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'integrations.invite.created',
        entityType: 'integration_api_key_invite',
        entityId: 'invite-uuid',
        metadata: expect.objectContaining({
          provider: 'openai',
          ownerEmail: 'ops@example.com',
          rotationIntervalDays: 90,
          requestedByName: 'Ops Admin'
        })
      })
    );
  });

  it('resends an invite and refreshes expiry and token metadata', async () => {
    inviteModelMock.findById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: null,
      ownerEmail: 'ops@example.com',
      status: 'pending',
      expiresAt: new Date('2025-02-27T10:00:00.000Z'),
      sendCount: 1,
      metadata: { notes: null }
    });

    inviteModelMock.updateById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: null,
      ownerEmail: 'ops@example.com',
      status: 'pending',
      expiresAt: new Date('2025-02-29T10:00:00.000Z'),
      sendCount: 2,
      metadata: { notes: null, requestedByName: 'Ops Admin' },
      lastSentAt: now
    });

    const result = await service.resendInvite('invite-uuid', {
      requestedBy: 'admin@example.com',
      requestedByName: 'Ops Admin'
    });

    expect(inviteModelMock.updateById).toHaveBeenCalledWith(
      'invite-uuid',
      expect.objectContaining({
        status: 'pending',
        sendCount: 2
      }),
      databaseMock
    );

    expect(mailServiceMock.sendMail).toHaveBeenCalled();
    expect(result.invite).toEqual(
      expect.objectContaining({ id: 'invite-uuid', status: 'pending', sendCount: 2 })
    );
    expect(result.claimUrl).toMatch('https://ops.edulure.com/integrations/credential-invite/');
    expect(auditLoggerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'integrations.invite.resent',
        entityId: 'invite-uuid',
        metadata: expect.objectContaining({
          sendCount: 2,
          provider: 'openai'
        })
      })
    );
  });

  it('cancels an invite and records audit metadata', async () => {
    inviteModelMock.findById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      ownerEmail: 'ops@example.com',
      status: 'pending'
    });

    inviteModelMock.updateById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      ownerEmail: 'ops@example.com',
      status: 'cancelled',
      cancelledAt: now,
      cancelledBy: 'admin@example.com'
    });

    const result = await service.cancelInvite('invite-uuid', { cancelledBy: 'admin@example.com' });

    expect(inviteModelMock.updateById).toHaveBeenCalledWith(
      'invite-uuid',
      expect.objectContaining({ status: 'cancelled', cancelledBy: 'admin@example.com' }),
      databaseMock
    );
    expect(result).toEqual(expect.objectContaining({ status: 'cancelled', cancelledBy: 'admin@example.com' }));
    expect(auditLoggerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'integrations.invite.cancelled',
        entityId: 'invite-uuid',
        metadata: expect.objectContaining({ cancelledBy: 'admin@example.com' })
      })
    );
  });

  it('submits an invite by creating a new API key when no existing key is linked', async () => {
    inviteModelMock.findActiveByTokenHash.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: null,
      ownerEmail: 'ops@example.com',
      requestedBy: 'admin@example.com',
      status: 'pending',
      rotationIntervalDays: 90,
      keyExpiresAt: null,
      metadata: { notes: null }
    });

    inviteModelMock.findById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: 5,
      ownerEmail: 'ops@example.com',
      status: 'completed'
    });

    apiKeyServiceMock.createKey.mockResolvedValue({ id: 5, alias: 'Content Studio Bot', status: 'active' });
    inviteModelMock.updateById.mockResolvedValue({ id: 'invite-uuid', status: 'completed', apiKeyId: 5 });

    const result = await service.submitInvitation(
      'token-xyz',
      {
        key: 'sk-live-example-credential-1234567890',
        rotationIntervalDays: 60,
        keyExpiresAt: '2025-03-10T10:00:00.000Z',
        actorEmail: 'ops@example.com',
        actorName: 'Ops Team',
        reason: 'Initial provision'
      },
      { tokenFingerprint: 'abcdef1234567890' }
    );

    expect(databaseMock.transaction).toHaveBeenCalled();
    expect(apiKeyServiceMock.createKey).toHaveBeenCalledWith(
      expect.objectContaining({ alias: 'Content Studio Bot', ownerEmail: 'ops@example.com' }),
      { connection: trxMock }
    );
    expect(inviteModelMock.updateById).toHaveBeenCalledWith(
      'invite-uuid',
      expect.objectContaining({
        status: 'completed',
        completedBy: 'ops@example.com',
        apiKeyId: 5,
        metadata: expect.objectContaining({
          fulfilledBy: 'ops@example.com',
          fulfilledByName: 'Ops Team',
          fulfilledReason: 'Initial provision',
          fulfilledAt: now.toISOString()
        })
      }),
      trxMock
    );
    expect(inviteModelMock.updateById.mock.calls[0][1].metadata.fulfilmentNotifications).toEqual(
      expect.objectContaining({
        ackRecipients: ['ops@example.com', 'admin@example.com'],
        operationsRecipients: ['integrations@edulure.com', 'security@edulure.com'],
        actorEmail: 'ops@example.com'
      })
    );
    expect(result.apiKey).toEqual(expect.objectContaining({ id: 5, sanitized: true }));
    expect(result.invite).toEqual(expect.objectContaining({ id: 'invite-uuid', status: 'completed' }));
    expect(auditLoggerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'integrations.invite.fulfilled',
        entityId: 'invite-uuid',
        metadata: expect.objectContaining({
          apiKeyId: 5,
          tokenFingerprint: 'abcdef1234567890',
          provider: 'openai'
        })
      })
    );
    expect(mailServiceMock.sendMail).toHaveBeenCalledTimes(2);
    expect(mailServiceMock.sendMail.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        to: ['ops@example.com', 'admin@example.com'],
        headers: expect.objectContaining({ 'X-Edulure-Template': 'integration-invite-ack' })
      })
    );
    expect(mailServiceMock.sendMail.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        to: ['integrations@edulure.com', 'security@edulure.com'],
        headers: expect.objectContaining({ 'X-Edulure-Template': 'integration-invite-ops-alert' })
      })
    );
  });

  it('submits an invite by rotating an existing API key', async () => {
    inviteModelMock.findActiveByTokenHash.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: 9,
      ownerEmail: 'ops@example.com',
      requestedBy: 'admin@example.com',
      status: 'pending',
      rotationIntervalDays: 45,
      keyExpiresAt: null,
      metadata: { notes: 'existing' }
    });

    inviteModelMock.findById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: 9,
      ownerEmail: 'ops@example.com',
      status: 'completed'
    });

    apiKeyServiceMock.rotateKey.mockResolvedValue({ id: 9, alias: 'Content Studio Bot', status: 'active' });
    inviteModelMock.updateById.mockResolvedValue({ id: 'invite-uuid', status: 'completed', apiKeyId: 9 });

    const result = await service.submitInvitation('token-xyz', {
      key: 'sk-live-rotated-credential-abcdef',
      rotationIntervalDays: 75,
      actorEmail: 'rotator@example.com',
      actorName: 'Rotator',
      reason: 'delegated-rotation'
    });

    expect(apiKeyServiceMock.rotateKey).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        rotationIntervalDays: 75,
        rotatedBy: 'rotator@example.com'
      }),
      { connection: trxMock }
    );
    const [, updatePayload] = inviteModelMock.updateById.mock.calls[0];
    expect(updatePayload.metadata).toMatchObject({
      fulfilledBy: 'rotator@example.com',
      fulfilledByName: 'Rotator',
      fulfilledReason: 'delegated-rotation',
      fulfilledAt: now.toISOString()
    });
    expect(updatePayload.metadata.fulfilmentNotifications).toEqual(
      expect.objectContaining({
        ackRecipients: ['rotator@example.com', 'admin@example.com'],
        operationsRecipients: ['integrations@edulure.com', 'security@edulure.com'],
        actorEmail: 'rotator@example.com'
      })
    );
    expect(result.apiKey).toEqual(expect.objectContaining({ id: 9, sanitized: true }));
    expect(auditLoggerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'integrations.invite.fulfilled',
        metadata: expect.objectContaining({ apiKeyId: 9, provider: 'openai' })
      })
    );
    expect(mailServiceMock.sendMail).toHaveBeenCalledTimes(2);
  });

  it('persists fulfilment context metadata when provided', async () => {
    inviteModelMock.findActiveByTokenHash.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: null,
      ownerEmail: 'ops@example.com',
      requestedBy: 'admin@example.com',
      status: 'pending',
      rotationIntervalDays: 90,
      keyExpiresAt: null,
      metadata: { notes: 'Marketing automations' }
    });

    inviteModelMock.findById.mockResolvedValue({
      id: 'invite-uuid',
      provider: 'openai',
      environment: 'production',
      alias: 'Content Studio Bot',
      apiKeyId: 12,
      ownerEmail: 'ops@example.com',
      status: 'completed'
    });

    apiKeyServiceMock.createKey.mockResolvedValue({ id: 12, alias: 'Content Studio Bot', status: 'active' });

    await service.submitInvitation(
      'token-xyz',
      {
        key: 'sk-live-example-credential-1234567890',
        actorEmail: 'ops@example.com',
        reason: 'Initial provision'
      },
      {
        actorId: 'user-789',
        actorRoles: ['admin', 'integrations', 'admin'],
        requestId: 'req-123',
        ipAddress: '203.0.113.5',
        userAgent: 'Vitest Agent',
        origin: 'https://portal.edulure.com'
      }
    );

    const [, updatePayload] = inviteModelMock.updateById.mock.calls[0];
    expect(updatePayload.metadata.fulfilmentContext).toEqual({
      actorId: 'user-789',
      actorRoles: ['admin', 'integrations'],
      requestId: 'req-123',
      ipAddress: '203.0.113.5',
      userAgent: 'Vitest Agent',
      origin: 'https://portal.edulure.com'
    });
    expect(updatePayload.metadata.fulfilmentNotifications).toEqual(
      expect.objectContaining({
        ackRecipients: ['ops@example.com', 'admin@example.com'],
        operationsRecipients: ['integrations@edulure.com', 'security@edulure.com'],
        actorEmail: 'ops@example.com'
      })
    );
    expect(updatePayload.metadata.fulfilledAt).toBe(now.toISOString());
    expect(auditLoggerMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        requestContext: expect.objectContaining({ requestId: 'req-123', ipAddress: '203.0.113.5' }),
        metadata: expect.objectContaining({
          fulfilledReason: 'Initial provision',
          actorRoles: ['admin', 'integrations']
        })
      })
    );
    expect(mailServiceMock.sendMail).toHaveBeenCalledTimes(2);
  });

  afterEach(() => {
    randomBytesSpy.mockRestore();
  });
});

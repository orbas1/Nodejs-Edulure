import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

import { env } from '../config/env.js';
import db from '../config/database.js';
import logger from '../config/logger.js';
import MailService from './MailService.js';
import IntegrationApiKeyModel from '../models/IntegrationApiKeyModel.js';
import IntegrationApiKeyInviteModel from '../models/IntegrationApiKeyInviteModel.js';
import IntegrationApiKeyService, {
  PROVIDER_CATALOGUE,
  clampRotationInterval,
  isValidEmail,
  normaliseEnvironment,
  normaliseProvider,
  requireString
} from './IntegrationApiKeyService.js';

const INVITE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

function resolveProviderMeta(provider) {
  return PROVIDER_CATALOGUE[provider] ?? { id: provider, label: provider };
}

function buildClaimUrl(token) {
  const base = env.integrations?.invites?.baseUrl ?? env.mail.verificationBaseUrl;
  const normalizedBase = new URL(base);
  normalizedBase.pathname = [normalizedBase.pathname.replace(/\/$/, ''), 'integrations', 'credential-invite', token]
    .filter(Boolean)
    .join('/');
  normalizedBase.hash = '';
  return normalizedBase.toString();
}

function calculateInviteExpiry(now = new Date()) {
  const ttlHours = Number(env.integrations?.invites?.tokenTtlHours ?? 48);
  const expiry = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
  return expiry;
}

function createInviteMetadata({ notes, reason, requestedByName, rotationIntervalDays }) {
  return {
    notes: notes ?? null,
    reason: reason ?? null,
    requestedByName: requestedByName ?? null,
    rotationIntervalDays: rotationIntervalDays ?? null
  };
}

function sanitizeInvite(invite) {
  if (!invite) {
    return null;
  }

  const provider = resolveProviderMeta(invite.provider);
  return {
    id: invite.id,
    provider: provider.id,
    providerLabel: provider.label,
    environment: invite.environment,
    alias: invite.alias,
    ownerEmail: invite.ownerEmail,
    apiKeyId: invite.apiKeyId ?? null,
    status: invite.status,
    requestedAt: invite.requestedAt ? invite.requestedAt.toISOString() : null,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    lastSentAt: invite.lastSentAt ? invite.lastSentAt.toISOString() : null,
    sendCount: invite.sendCount,
    rotationIntervalDays: invite.rotationIntervalDays,
    keyExpiresAt: invite.keyExpiresAt ? invite.keyExpiresAt.toISOString() : null,
    completedAt: invite.completedAt ? invite.completedAt.toISOString() : null,
    completedBy: invite.completedBy,
    cancelledAt: invite.cancelledAt ? invite.cancelledAt.toISOString() : null,
    cancelledBy: invite.cancelledBy,
    metadata: invite.metadata ?? {}
  };
}

function buildEmailPayload({ invite, claimUrl }) {
  const provider = resolveProviderMeta(invite.provider);
  const rotationDays = invite.rotationIntervalDays;
  const humanRotation = rotationDays ? `${rotationDays} day${rotationDays === 1 ? '' : 's'}` : 'defined by policy';

  return {
    to: invite.ownerEmail,
    subject: `${provider.label} credential requested for Edulure integrations`,
    html: `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Provide your ${provider.label} API key</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a; }
        .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.1); }
        .cta { display: inline-block; margin-top: 24px; padding: 12px 24px; border-radius: 9999px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; }
        p { line-height: 1.6; margin: 16px 0; }
        .meta { color: #475569; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Secure credential request</h1>
        <p>The Edulure integrations team has requested that you provide an API key for <strong>${provider.label}</strong> (${invite.environment} environment) to power shared automations.</p>
        <p>The key will be stored encrypted and masked to administrators. Rotation cadence: <strong>${humanRotation}</strong>.</p>
        <p><a href="${claimUrl}" class="cta">Submit credential</a></p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p class="meta">${claimUrl}</p>
        <p class="meta">The link expires on ${invite.expiresAt.toUTCString()}. If you were not expecting this request, contact your Edulure technical representative.</p>
      </div>
    </body>
  </html>`,
    text: [
      'Secure credential request',
      '',
      `The Edulure integrations team has requested that you provide an API key for ${provider.label} (${invite.environment}).`,
      `Rotation cadence: ${humanRotation}.`,
      '',
      `Submit the credential: ${claimUrl}`,
      '',
      `The link expires on ${invite.expiresAt.toUTCString()}. If this request is unexpected, contact your Edulure technical representative.`
    ].join('\n')
  };
}

export default class IntegrationApiKeyInviteService {
  constructor({
    inviteModel = IntegrationApiKeyInviteModel,
    apiKeyModel = IntegrationApiKeyModel,
    apiKeyService = new IntegrationApiKeyService(),
    mailService = MailService,
    database = db,
    nowProvider = () => new Date(),
    mailerLogger = logger.child({ component: 'integration-api-key-invite-service' })
  } = {}) {
    this.inviteModel = inviteModel;
    this.apiKeyModel = apiKeyModel;
    this.apiKeyService = apiKeyService;
    this.mailService = mailService;
    this.database = database;
    this.nowProvider = nowProvider;
    this.logger = mailerLogger;
  }

  sanitize(invite) {
    return sanitizeInvite(invite);
  }

  async listInvites(filters = {}) {
    const invites = await this.inviteModel.list(filters);
    return invites.map((invite) => sanitizeInvite(invite));
  }

  async createInvite({
    provider,
    environment,
    alias,
    ownerEmail,
    rotationIntervalDays,
    keyExpiresAt,
    notes,
    reason,
    requestedBy,
    requestedByName,
    apiKeyId
  }) {
    const normalisedProvider = normaliseProvider(provider);
    if (!normalisedProvider) {
      throw Object.assign(new Error('Provider is not recognised'), { status: 422 });
    }

    const normalisedEnvironment = normaliseEnvironment(environment);
    if (!normalisedEnvironment) {
      throw Object.assign(new Error('Environment is invalid'), { status: 422 });
    }

    const resolvedAlias = requireString(alias, 'Alias', { min: 3, max: 128 });

    if (!isValidEmail(ownerEmail)) {
      throw Object.assign(new Error('Owner email is invalid'), { status: 422 });
    }

    const rotationDays = clampRotationInterval(rotationIntervalDays, normalisedProvider);

    const keyExpiryDate = keyExpiresAt ? new Date(keyExpiresAt) : null;
    if (keyExpiryDate && Number.isNaN(keyExpiryDate.getTime())) {
      throw Object.assign(new Error('Key expiry date is invalid'), { status: 422 });
    }

    const conflict = await this.inviteModel.findPendingForAlias({
      provider: normalisedProvider,
      environment: normalisedEnvironment,
      alias: resolvedAlias
    });
    if (conflict) {
      throw Object.assign(new Error('An invitation is already pending for this alias'), { status: 409 });
    }

    const existingKey = await this.apiKeyModel.findByAlias({
      provider: normalisedProvider,
      environment: normalisedEnvironment,
      alias: resolvedAlias
    });

    if (existingKey && !apiKeyId) {
      throw Object.assign(new Error('An API key already exists for this alias'), { status: 409 });
    }

    if (apiKeyId && (!existingKey || existingKey.id !== Number(apiKeyId))) {
      throw Object.assign(new Error('Referenced API key does not match alias'), { status: 422 });
    }

    const now = this.nowProvider();
    const inviteId = uuid();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.inviteModel.hashToken(rawToken);
    const expiresAt = calculateInviteExpiry(now);

    const metadata = createInviteMetadata({
      notes,
      reason,
      requestedByName,
      rotationIntervalDays: rotationDays
    });

    const invite = await this.inviteModel.create(
      {
        id: inviteId,
        provider: normalisedProvider,
        environment: normalisedEnvironment,
        alias: resolvedAlias,
        apiKeyId: apiKeyId ? Number(apiKeyId) : existingKey?.id ?? null,
        ownerEmail: ownerEmail.trim(),
        requestedBy: requestedBy ?? ownerEmail.trim(),
        requestedAt: now,
        expiresAt,
        status: INVITE_STATUS.PENDING,
        tokenHash,
        rotationIntervalDays: rotationDays,
        keyExpiresAt: keyExpiryDate,
        metadata,
        lastSentAt: now,
        sendCount: 1
      },
      this.database
    );

    const claimUrl = buildClaimUrl(rawToken);
    await this.mailService.sendMail(buildEmailPayload({ invite, claimUrl }));

    this.logger.info({ inviteId, ownerEmail: invite.ownerEmail }, 'Integration API key invite issued');

    return { invite: sanitizeInvite(invite), token: rawToken, claimUrl };
  }

  async resendInvite(id, { requestedBy: _requestedBy, requestedByName } = {}) {
    const invite = await this.inviteModel.findById(id);
    if (!invite) {
      throw Object.assign(new Error('Invitation not found'), { status: 404 });
    }

    if (invite.completedAt) {
      throw Object.assign(new Error('Invitation already completed'), { status: 409 });
    }

    if (invite.cancelledAt) {
      throw Object.assign(new Error('Invitation has been cancelled'), { status: 409 });
    }

    const now = this.nowProvider();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.inviteModel.hashToken(rawToken);
    const expiresAt = calculateInviteExpiry(now);
    const sendCount = (invite.sendCount ?? 1) + 1;

    const metadata = {
      ...invite.metadata,
      requestedByName: requestedByName ?? invite.metadata?.requestedByName ?? null
    };

    const updated = await this.inviteModel.updateById(
      id,
      {
        tokenHash,
        expiresAt,
        status: INVITE_STATUS.PENDING,
        lastSentAt: now,
        sendCount,
        metadata
      },
      this.database
    );

    const claimUrl = buildClaimUrl(rawToken);
    await this.mailService.sendMail(
      buildEmailPayload({
        invite: updated,
        claimUrl
      })
    );

    this.logger.info({ inviteId: id, ownerEmail: updated.ownerEmail }, 'Integration API key invite resent');

    return { invite: sanitizeInvite(updated), token: rawToken, claimUrl };
  }

  async cancelInvite(id, { cancelledBy } = {}) {
    const invite = await this.inviteModel.findById(id);
    if (!invite) {
      throw Object.assign(new Error('Invitation not found'), { status: 404 });
    }

    if (invite.completedAt) {
      throw Object.assign(new Error('Invitation already completed'), { status: 409 });
    }

    if (invite.cancelledAt) {
      return sanitizeInvite(invite);
    }

    const now = this.nowProvider();
    const updated = await this.inviteModel.updateById(
      id,
      {
        status: INVITE_STATUS.CANCELLED,
        cancelledAt: now,
        cancelledBy: cancelledBy ?? null
      },
      this.database
    );

    return sanitizeInvite(updated);
  }

  async loadInviteByToken(token) {
    const trimmed = typeof token === 'string' ? token.trim() : '';
    if (!trimmed) {
      throw Object.assign(new Error('Token is required'), { status: 400 });
    }

    const tokenHash = this.inviteModel.hashToken(trimmed);
    const invite = await this.inviteModel.findActiveByTokenHash(tokenHash);
    if (!invite) {
      throw Object.assign(new Error('Invitation is invalid or expired'), { status: 404 });
    }

    return invite;
  }

  async getInvitationDetails(token) {
    const invite = await this.loadInviteByToken(token);
    const provider = resolveProviderMeta(invite.provider);

    return {
      id: invite.id,
      provider: provider.id,
      providerLabel: provider.label,
      environment: invite.environment,
      alias: invite.alias,
      rotationIntervalDays: invite.rotationIntervalDays,
      keyExpiresAt: invite.keyExpiresAt ? invite.keyExpiresAt.toISOString() : null,
      requestedAt: invite.requestedAt ? invite.requestedAt.toISOString() : null,
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
      notes: invite.metadata?.notes ?? null,
      reason: invite.metadata?.reason ?? null
    };
  }

  async submitInvitation(token, { key, rotationIntervalDays, keyExpiresAt, actorEmail, actorName, reason }) {
    const invite = await this.loadInviteByToken(token);
    const rotationDays = clampRotationInterval(rotationIntervalDays ?? invite.rotationIntervalDays, invite.provider);
    const expiresAt = keyExpiresAt ? new Date(keyExpiresAt) : invite.keyExpiresAt;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw Object.assign(new Error('Key expiry date is invalid'), { status: 422 });
    }

    const actor = actorEmail && isValidEmail(actorEmail) ? actorEmail.trim() : invite.ownerEmail;

    const metadata = {
      ...invite.metadata,
      fulfilledBy: actor,
      fulfilledByName: actorName ?? null,
      fulfilledReason: reason ?? null
    };

    let result;
    await this.database.transaction(async (trx) => {
      if (invite.apiKeyId) {
        result = await this.apiKeyService.rotateKey(
          invite.apiKeyId,
          {
            keyValue: key,
            rotationIntervalDays: rotationDays,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            rotatedBy: actor,
            reason: reason ?? 'delegated-rotation',
            notes: invite.metadata?.notes ?? null
          },
          { connection: trx }
        );
      } else {
        result = await this.apiKeyService.createKey(
          {
            provider: invite.provider,
            environment: invite.environment,
            alias: invite.alias,
            ownerEmail: invite.ownerEmail,
            keyValue: key,
            rotationIntervalDays: rotationDays,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            createdBy: actor,
            notes: invite.metadata?.notes ?? null
          },
          { connection: trx }
        );
      }

      await this.inviteModel.updateById(
        invite.id,
        {
          status: INVITE_STATUS.COMPLETED,
          completedAt: this.nowProvider(),
          completedBy: actor,
          metadata,
          apiKeyId: result.id
        },
        trx
      );
    });

    this.logger.info({ inviteId: invite.id, apiKeyId: result.id }, 'Integration API key invite fulfilled');

    return {
      invite: await this.inviteModel.findById(invite.id),
      apiKey: this.apiKeyService.sanitize(result)
    };
  }
}

export { INVITE_STATUS };

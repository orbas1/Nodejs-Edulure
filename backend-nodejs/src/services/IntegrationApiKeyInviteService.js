import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

import { env } from '../config/env.js';
import db from '../config/database.js';
import logger from '../config/logger.js';
import MailService from './MailService.js';
import AuditEventService from './AuditEventService.js';
import IntegrationApiKeyModel from '../models/IntegrationApiKeyModel.js';
import IntegrationApiKeyInviteModel from '../models/IntegrationApiKeyInviteModel.js';
import IntegrationApiKeyService, {
  clampRotationInterval,
  isValidEmail,
  normaliseEnvironment,
  normaliseProvider,
  requireString
} from './IntegrationApiKeyService.js';
import {
  DEFAULT_CREDENTIAL_POLICY,
  getCredentialPolicy,
  getProviderDefinition,
  normaliseProviderId
} from './IntegrationProviderRegistry.js';

const INVITE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const AUDIT_ENTITY_TYPE = 'integration_api_key_invite';
const DEFAULT_AUDIT_TENANT = 'integrations';
const MIN_TOKEN_LENGTH = 10;
const MAX_TOKEN_LENGTH = 200;

function normaliseAuditRoles(roles) {
  if (!roles) {
    return [];
  }

  const values = Array.isArray(roles) ? roles : [roles];
  const cleaned = values
    .filter((role) => typeof role === 'string')
    .map((role) => role.trim())
    .filter((role) => role.length > 0);

  return Array.from(new Set(cleaned));
}

function resolveAuditActorDescriptor({ actor = {}, fallbackEmail } = {}) {
  const emailCandidate =
    typeof actor.email === 'string' && actor.email.trim()
      ? actor.email.trim().toLowerCase()
      : typeof fallbackEmail === 'string' && fallbackEmail.trim()
        ? fallbackEmail.trim().toLowerCase()
        : null;

  const roleCandidates = [];
  if (typeof actor.role === 'string' && actor.role.trim()) {
    roleCandidates.push(actor.role.trim());
  }
  roleCandidates.push(...normaliseAuditRoles(actor.roles));

  const roles = Array.from(new Set(roleCandidates));
  const primaryRole = roles[0] ?? 'external';

  const actorId =
    typeof actor.id === 'string' && actor.id.trim()
      ? actor.id.trim()
      : emailCandidate ?? 'external-user';

  const actorType =
    typeof actor.type === 'string' && actor.type.trim()
      ? actor.type.trim()
      : primaryRole === 'external'
        ? 'external'
        : 'user';

  return {
    auditActor: {
      id: actorId,
      type: actorType,
      role: primaryRole
    },
    metadata: {
      actorEmail: emailCandidate,
      actorRoles: roles
    }
  };
}

function normaliseAuditRequestContext(context = {}) {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  const cleaned = {};

  const assign = (key, transform = (value) => value) => {
    const raw = context[key];
    if (typeof raw === 'string') {
      const value = transform(raw.trim());
      if (value) {
        cleaned[key] = value;
      }
    }
  };

  assign('requestId');
  assign('traceId');
  assign('spanId');
  assign('ipAddress');
  assign('userAgent');
  assign('method', (value) => value.toUpperCase());
  assign('path');

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function buildAuditMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    if (Array.isArray(value)) {
      const filtered = value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
        .filter((entry) => {
          if (entry === undefined || entry === null) {
            return false;
          }
          if (typeof entry === 'string') {
            return entry.length > 0;
          }
          return true;
        });
      if (filtered.length > 0) {
        acc[key] = filtered;
      }
      return acc;
    }

    if (value instanceof Date) {
      acc[key] = value.toISOString();
      return acc;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        acc[key] = trimmed;
      }
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

function resolveProviderMeta(provider) {
  const definition = getProviderDefinition(provider);
  if (definition) {
    return { id: definition.id, label: definition.label };
  }

  const normalised = normaliseProviderId(provider);
  if (normalised) {
    const fallback = getProviderDefinition(normalised);
    if (fallback) {
      return { id: fallback.id, label: fallback.label };
    }
  }

  return { id: provider, label: provider };
}

const inviteDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatInviteDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return inviteDateFormatter.format(date);
  } catch (_error) {
    return date.toISOString();
  }
}

function describeRotationInterval(rotationIntervalDays, provider) {
  if (Number.isFinite(rotationIntervalDays) && rotationIntervalDays > 0) {
    const rounded = Math.round(rotationIntervalDays);
    return `${rounded} day${rounded === 1 ? '' : 's'} rotation cadence`;
  }

  const policy = getCredentialPolicy(provider);
  const fallback = policy?.defaultRotationDays ?? DEFAULT_CREDENTIAL_POLICY.defaultRotationDays;
  if (Number.isFinite(fallback) && fallback > 0) {
    return `${fallback} day${fallback === 1 ? '' : 's'} rotation (policy default)`;
  }

  return 'Refer to integration security policy';
}

function normaliseEmailList(values = []) {
  const recipients = Array.isArray(values) ? values : [values];
  const unique = new Set();

  for (const candidate of recipients) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const trimmed = candidate.trim().toLowerCase();
    if (!trimmed) {
      continue;
    }

    if (isValidEmail(trimmed)) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique);
}

function getInviteDocumentationUrl(invite) {
  return invite?.documentationUrl ?? invite?.metadata?.documentationUrl ?? null;
}

function toMailRecipientList(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return null;
  }

  if (recipients.length === 1) {
    return recipients[0];
  }

  return recipients;
}

function buildAcknowledgementEmail({ invite, actorName, documentationUrl, acknowledgedAt }) {
  const providerLabel = invite.providerLabel ?? invite.provider ?? 'integration';
  const alias = invite.alias ?? providerLabel;
  const environment = invite.environment ?? 'unspecified';
  const rotationCopy = invite.rotationDescription
    ?? (invite.rotationIntervalDays
      ? describeRotationInterval(invite.rotationIntervalDays, invite.provider)
      : 'Refer to integration security policy');
  const acknowledgementCopy = acknowledgedAt instanceof Date ? formatInviteDate(acknowledgedAt) : null;
  const docLink = documentationUrl ?? 'https://docs.edulure.com/integrations';

  const subject = `Edulure credential received — ${providerLabel} (${environment})`;
  const greeting = actorName ? `Hi ${actorName},` : 'Hello,';

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Credential received for ${providerLabel}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a; }
        .card { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); }
        a { color: #2563eb; }
        .meta { color: #475569; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <p>${greeting}</p>
        <p>We received the <strong>${providerLabel}</strong> credential for <strong>${alias}</strong> (${environment}). The key is encrypted in our integrations vault and masked from administrators.</p>
        <p>Rotation cadence: <strong>${rotationCopy}</strong>. Review the latest runbook here: <a href="${docLink}">${docLink}</a>.</p>
        <p class="meta">Acknowledged ${acknowledgementCopy ?? 'just now'}.</p>
        <p class="meta">We will confirm once automated connectivity checks complete. Reach out to integrations@edulure.com if anything looks unexpected.</p>
      </div>
    </body>
  </html>`;

  const text = [
    greeting,
    '',
    `We received the ${providerLabel} credential for ${alias} (${environment}). The key is encrypted in our integrations vault and masked from administrators.`,
    `Rotation cadence: ${rotationCopy}.`,
    `Runbook: ${docLink}.`,
    acknowledgementCopy ? `Acknowledged ${acknowledgementCopy}.` : 'Acknowledged just now.',
    'We will confirm once automated connectivity checks complete. Contact integrations@edulure.com if anything looks unexpected.'
  ].join('\n');

  return { subject, html, text };
}

function buildOperationsAlertEmail({ invite, actorEmail, actorName, reason, documentationUrl, acknowledgedAt, keyId }) {
  const providerLabel = invite.providerLabel ?? invite.provider ?? 'integration';
  const alias = invite.alias ?? providerLabel;
  const environment = invite.environment ?? 'unspecified';
  const rotationCopy = invite.rotationDescription
    ?? (invite.rotationIntervalDays
      ? describeRotationInterval(invite.rotationIntervalDays, invite.provider)
      : 'Refer to integration security policy');
  const acknowledgementCopy = acknowledgedAt instanceof Date ? formatInviteDate(acknowledgedAt) : null;
  const docLink = documentationUrl ?? 'https://docs.edulure.com/integrations';
  const actorDescriptor = actorName ? `${actorName} <${actorEmail}>` : actorEmail;

  const subject = `Integration credential fulfilled — ${providerLabel}/${alias}`;

  const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Integration credential fulfilled</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f1f5f9; padding: 32px; color: #0f172a; }
        .card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08); }
        .meta { color: #475569; font-size: 13px; }
        a { color: #2563eb; }
        ul { padding-left: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Integration credential fulfilled</h1>
        <p><strong>${providerLabel}</strong> (${environment}) credential submitted for alias <strong>${alias}</strong>.</p>
        <ul>
          <li>Submitted by: <strong>${actorDescriptor}</strong></li>
          <li>Rotation cadence: ${rotationCopy}</li>
          <li>Reason: ${reason ?? 'n/a'}</li>
          <li>Key record ID: ${keyId ?? 'pending'}</li>
        </ul>
        <p>Runbook: <a href="${docLink}">${docLink}</a></p>
        <p class="meta">Acknowledged ${acknowledgementCopy ?? 'just now'}.</p>
      </div>
    </body>
  </html>`;

  const text = [
    'Integration credential fulfilled',
    '',
    `${providerLabel} (${environment}) credential submitted for alias ${alias}.`,
    `Submitted by: ${actorDescriptor}.`,
    `Rotation cadence: ${rotationCopy}.`,
    `Reason: ${reason ?? 'n/a'}.`,
    `Key record ID: ${keyId ?? 'pending'}.`,
    `Runbook: ${docLink}.`,
    acknowledgementCopy ? `Acknowledged ${acknowledgementCopy}.` : 'Acknowledged just now.'
  ].join('\n');

  return { subject, html, text };
}

export function sanitizeInviteToken(token) {
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (!trimmed) {
    throw Object.assign(new Error('Invitation token is required'), {
      status: 400,
      code: 'INVITE_TOKEN_INVALID'
    });
  }

  if (trimmed.length < MIN_TOKEN_LENGTH || trimmed.length > MAX_TOKEN_LENGTH) {
    throw Object.assign(new Error('Invitation token is invalid'), {
      status: 400,
      code: 'INVITE_TOKEN_INVALID'
    });
  }

  return trimmed;
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

function normalizeDocumentationUrl(url) {
  if (url === undefined || url === null || (typeof url === 'string' && url.trim().length === 0)) {
    return null;
  }

  if (typeof url !== 'string') {
    throw Object.assign(new Error('Documentation URL must be a string'), {
      status: 422,
      code: 'INVITE_DOCUMENTATION_URL_INVALID'
    });
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol');
    }
    parsed.hash = parsed.hash ?? '';
    return parsed.toString();
  } catch (_error) {
    throw Object.assign(new Error('Documentation URL must be a valid HTTP(S) link'), {
      status: 422,
      code: 'INVITE_DOCUMENTATION_URL_INVALID'
    });
  }
}

function createInviteMetadata({ notes, reason, requestedByName, rotationIntervalDays, documentationUrl }) {
  return {
    notes: notes ?? null,
    reason: reason ?? null,
    requestedByName: requestedByName ?? null,
    rotationIntervalDays: rotationIntervalDays ?? null,
    documentationUrl: documentationUrl ?? null
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
    requestedAtDescription: formatInviteDate(invite.requestedAt),
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    expiresAtDescription: formatInviteDate(invite.expiresAt),
    lastSentAt: invite.lastSentAt ? invite.lastSentAt.toISOString() : null,
    sendCount: invite.sendCount,
    rotationIntervalDays: invite.rotationIntervalDays,
    rotationDescription: describeRotationInterval(invite.rotationIntervalDays, provider.id),
    keyExpiresAt: invite.keyExpiresAt ? invite.keyExpiresAt.toISOString() : null,
    keyExpiresAtDescription: formatInviteDate(invite.keyExpiresAt),
    completedAt: invite.completedAt ? invite.completedAt.toISOString() : null,
    completedBy: invite.completedBy,
    cancelledAt: invite.cancelledAt ? invite.cancelledAt.toISOString() : null,
    cancelledBy: invite.cancelledBy,
    documentationUrl: invite.documentationUrl ?? invite.metadata?.documentationUrl ?? null,
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

function normaliseFulfilmentContext(context = {}) {
  const { actorId, actorRoles, requestId, ipAddress, userAgent, origin } = context;

  const cleaned = {};

  if (typeof actorId === 'string' && actorId.trim()) {
    cleaned.actorId = actorId.trim();
  }

  if (Array.isArray(actorRoles)) {
    const roles = Array.from(new Set(actorRoles.filter((role) => typeof role === 'string' && role.trim().length > 0).map((role) => role.trim())));
    if (roles.length > 0) {
      cleaned.actorRoles = roles;
    }
  }

  if (typeof requestId === 'string' && requestId.trim()) {
    cleaned.requestId = requestId.trim();
  }

  if (typeof ipAddress === 'string' && ipAddress.trim()) {
    cleaned.ipAddress = ipAddress.trim();
  }

  if (typeof userAgent === 'string' && userAgent.trim()) {
    cleaned.userAgent = userAgent.trim();
  }

  if (typeof origin === 'string' && origin.trim()) {
    cleaned.origin = origin.trim();
  }

  return cleaned;
}

export default class IntegrationApiKeyInviteService {
  constructor({
    inviteModel = IntegrationApiKeyInviteModel,
    apiKeyModel = IntegrationApiKeyModel,
    apiKeyService = new IntegrationApiKeyService(),
    mailService = MailService,
    database = db,
    nowProvider = () => new Date(),
    mailerLogger = logger.child({ component: 'integration-api-key-invite-service' }),
    auditLogger = new AuditEventService({ config: { tenantId: DEFAULT_AUDIT_TENANT } }),
    auditTenantId = DEFAULT_AUDIT_TENANT
  } = {}) {
    this.inviteModel = inviteModel;
    this.apiKeyModel = apiKeyModel;
    this.apiKeyService = apiKeyService;
    this.mailService = mailService;
    this.database = database;
    this.nowProvider = nowProvider;
    this.logger = mailerLogger;
    this.auditLogger = auditLogger;
    this.auditTenantId = auditTenantId ?? DEFAULT_AUDIT_TENANT;
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
    apiKeyId,
    documentationUrl
  }, { actor = {}, requestContext = {} } = {}) {
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

    const normalisedDocumentationUrl = normalizeDocumentationUrl(documentationUrl);

    const metadata = createInviteMetadata({
      notes,
      reason,
      requestedByName,
      rotationIntervalDays: rotationDays,
      documentationUrl: normalisedDocumentationUrl
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
        sendCount: 1,
        documentationUrl: normalisedDocumentationUrl
      },
      this.database
    );

    const claimUrl = buildClaimUrl(rawToken);
    await this.mailService.sendMail(buildEmailPayload({ invite, claimUrl }));

    const sanitizedInvite = sanitizeInvite(invite);
    this.logger.info({ inviteId, ownerEmail: invite.ownerEmail }, 'Integration API key invite issued');

    const actorDescriptor = resolveAuditActorDescriptor({
      actor,
      fallbackEmail: requestedBy ?? sanitizedInvite.ownerEmail
    });

    await this.#recordAuditEvent({
      eventType: 'integrations.invite.created',
      entityId: sanitizedInvite.id,
      actor: actorDescriptor.auditActor,
      metadata: {
        ...actorDescriptor.metadata,
        provider: sanitizedInvite.provider,
        environment: sanitizedInvite.environment,
        alias: sanitizedInvite.alias,
        ownerEmail: sanitizedInvite.ownerEmail,
        rotationIntervalDays: sanitizedInvite.rotationIntervalDays,
        expiresAt: sanitizedInvite.expiresAt,
        requestedBy: requestedBy ?? null,
        requestedByName: requestedByName ?? null,
        requestOrigin: requestContext?.origin ?? null,
        hasExistingKey: Boolean(sanitizedInvite.apiKeyId)
      },
      requestContext
    });

    return { invite: sanitizedInvite, token: rawToken, claimUrl };
  }

  async resendInvite(id, { requestedBy: _requestedBy, requestedByName, actor = {}, requestContext = {} } = {}) {
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
    const sanitizedInvite = sanitizeInvite(updated);

    const actorDescriptor = resolveAuditActorDescriptor({
      actor,
      fallbackEmail: sanitizedInvite.ownerEmail
    });

    await this.#recordAuditEvent({
      eventType: 'integrations.invite.resent',
      entityId: sanitizedInvite.id,
      actor: actorDescriptor.auditActor,
      metadata: {
        ...actorDescriptor.metadata,
        provider: sanitizedInvite.provider,
        environment: sanitizedInvite.environment,
        alias: sanitizedInvite.alias,
        ownerEmail: sanitizedInvite.ownerEmail,
        sendCount: sanitizedInvite.sendCount,
        requestOrigin: requestContext?.origin ?? null,
        requestedByName: sanitizedInvite.metadata?.requestedByName ?? requestedByName ?? null
      },
      requestContext
    });

    return { invite: sanitizedInvite, token: rawToken, claimUrl };
  }

  async cancelInvite(id, { cancelledBy, actor = {}, requestContext = {} } = {}) {
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

    const sanitizedInvite = sanitizeInvite(updated);

    const actorDescriptor = resolveAuditActorDescriptor({
      actor,
      fallbackEmail: cancelledBy ?? sanitizedInvite.ownerEmail
    });

    await this.#recordAuditEvent({
      eventType: 'integrations.invite.cancelled',
      entityId: sanitizedInvite.id,
      actor: actorDescriptor.auditActor,
      metadata: {
        ...actorDescriptor.metadata,
        provider: sanitizedInvite.provider,
        environment: sanitizedInvite.environment,
        alias: sanitizedInvite.alias,
        ownerEmail: sanitizedInvite.ownerEmail,
        cancelledBy: sanitizedInvite.cancelledBy ?? null,
        requestOrigin: requestContext?.origin ?? null
      },
      requestContext
    });

    return sanitizedInvite;
  }

  async loadInviteByToken(token) {
    const sanitisedToken = sanitizeInviteToken(token);

    const tokenHash = this.inviteModel.hashToken(sanitisedToken);
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
      rotationDescription: describeRotationInterval(invite.rotationIntervalDays, provider.id),
      keyExpiresAt: invite.keyExpiresAt ? invite.keyExpiresAt.toISOString() : null,
      keyExpiresAtDescription: formatInviteDate(invite.keyExpiresAt),
      requestedAt: invite.requestedAt ? invite.requestedAt.toISOString() : null,
      requestedAtDescription: formatInviteDate(invite.requestedAt),
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
      expiresAtDescription: formatInviteDate(invite.expiresAt),
      notes: invite.metadata?.notes ?? null,
      reason: invite.metadata?.reason ?? null,
      documentationUrl: invite.documentationUrl ?? invite.metadata?.documentationUrl ?? null
    };
  }

  async submitInvitation(token, { key, rotationIntervalDays, keyExpiresAt, actorEmail, actorName, reason }, context = {}) {
    const invite = await this.loadInviteByToken(token);
    const rotationDays = clampRotationInterval(rotationIntervalDays ?? invite.rotationIntervalDays, invite.provider);
    const expiresAt = keyExpiresAt ? new Date(keyExpiresAt) : invite.keyExpiresAt;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw Object.assign(new Error('Key expiry date is invalid'), { status: 422 });
    }

    const actor = actorEmail && isValidEmail(actorEmail) ? actorEmail.trim() : invite.ownerEmail;

    const acknowledgementRecipients = this.#resolveAcknowledgementRecipients({
      actorEmail: actor,
      ownerEmail: invite.ownerEmail,
      requestedBy: invite.requestedBy
    });
    const operationsRecipients = this.#resolveOperationsRecipients();

    const metadata = {
      ...invite.metadata,
      fulfilledBy: actor,
      fulfilledByName: actorName ?? null,
      fulfilledReason: reason ?? null
    };

    const fulfilmentContext = normaliseFulfilmentContext(context);
    if (Object.keys(fulfilmentContext).length > 0) {
      metadata.fulfilmentContext = fulfilmentContext;
    }

    const completedAt = this.nowProvider();
    metadata.fulfilledAt = completedAt.toISOString();
    metadata.fulfilmentNotifications = {
      ...(invite.metadata?.fulfilmentNotifications ?? {}),
      ackRecipients: acknowledgementRecipients,
      operationsRecipients,
      ackSentAt: completedAt.toISOString(),
      actorEmail: actor,
      requestedBy: isValidEmail(invite.requestedBy) ? invite.requestedBy.trim().toLowerCase() : null
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
          { connection: trx, skipInviteId: invite.id }
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
          { connection: trx, skipInviteId: invite.id }
        );
      }

      await this.inviteModel.updateById(
        invite.id,
        {
          status: INVITE_STATUS.COMPLETED,
          completedAt,
          completedBy: actor,
          metadata,
          apiKeyId: result.id
        },
        trx
      );
    });

    const completedInvite = await this.inviteModel.findById(invite.id);
    const sanitizedInvite = sanitizeInvite(completedInvite);
    const sanitizedKey = this.apiKeyService.sanitize(result);

    this.logger.info(
      {
        inviteId: invite.id,
        apiKeyId: sanitizedKey.id,
        actor,
        tokenFingerprint: context.tokenFingerprint ?? null,
        ...fulfilmentContext
      },
      'Integration API key invite fulfilled'
    );

    const actorDescriptor = resolveAuditActorDescriptor({
      actor: {
        id: context.actorId,
        roles: context.actorRoles,
        role: Array.isArray(context.actorRoles) && context.actorRoles.length > 0 ? context.actorRoles[0] : undefined,
        type: Array.isArray(context.actorRoles) && context.actorRoles.length > 0 ? 'user' : 'external',
        email: actor
      },
      fallbackEmail: actor
    });

    await this.#recordAuditEvent({
      eventType: 'integrations.invite.fulfilled',
      entityId: sanitizedInvite.id,
      actor: actorDescriptor.auditActor,
      metadata: {
        ...actorDescriptor.metadata,
        provider: sanitizedInvite.provider,
        environment: sanitizedInvite.environment,
        alias: sanitizedInvite.alias,
        ownerEmail: sanitizedInvite.ownerEmail,
        rotationIntervalDays: rotationDays,
        keyExpiresAt: sanitizedInvite.keyExpiresAt,
        apiKeyId: sanitizedKey.id,
        requestOrigin: context.origin ?? null,
        tokenFingerprint: context.tokenFingerprint ?? null,
        fulfilledReason: reason ?? null,
        fulfilledByName: actorName ?? null
      },
      requestContext: context
    });

    try {
      await this.#dispatchFulfilmentNotifications({
        invite: sanitizedInvite,
        ackRecipients: acknowledgementRecipients,
        operationsRecipients,
        actorName,
        actorEmail: actor,
        reason,
        documentationUrl: getInviteDocumentationUrl(sanitizedInvite),
        acknowledgedAt: completedAt,
        keyId: sanitizedKey.id
      });
    } catch (notificationError) {
      this.logger.error(
        { err: notificationError, inviteId: sanitizedInvite.id },
        'Failed to dispatch integration invite fulfilment notifications'
      );
    }

    return {
      invite: completedInvite,
      apiKey: sanitizedKey
    };
  }

  #resolveOperationsRecipients() {
    const configured = env.integrations?.invites?.acknowledgementRecipients;
    if (!configured) {
      return [];
    }
    return normaliseEmailList(configured);
  }

  #resolveAcknowledgementRecipients({ actorEmail, ownerEmail, requestedBy }) {
    return normaliseEmailList([actorEmail, ownerEmail, requestedBy]);
  }

  async #dispatchFulfilmentNotifications({
    invite,
    ackRecipients,
    operationsRecipients,
    actorName,
    actorEmail,
    reason,
    documentationUrl,
    acknowledgedAt,
    keyId
  }) {
    const tasks = [];

    if (Array.isArray(ackRecipients) && ackRecipients.length > 0) {
      const acknowledgementEmail = buildAcknowledgementEmail({
        invite,
        actorName,
        documentationUrl,
        acknowledgedAt
      });
      tasks.push(
        this.mailService.sendMail({
          to: toMailRecipientList(ackRecipients),
          subject: acknowledgementEmail.subject,
          html: acknowledgementEmail.html,
          text: acknowledgementEmail.text,
          headers: { 'X-Edulure-Template': 'integration-invite-ack' }
        })
      );
    }

    if (Array.isArray(operationsRecipients) && operationsRecipients.length > 0) {
      const operationsEmail = buildOperationsAlertEmail({
        invite,
        actorEmail,
        actorName,
        reason,
        documentationUrl,
        acknowledgedAt,
        keyId
      });
      tasks.push(
        this.mailService.sendMail({
          to: toMailRecipientList(operationsRecipients),
          subject: operationsEmail.subject,
          html: operationsEmail.html,
          text: operationsEmail.text,
          headers: { 'X-Edulure-Template': 'integration-invite-ops-alert' }
        })
      );
    }

    if (tasks.length === 0) {
      return;
    }

    await Promise.all(tasks);
  }

  async #recordAuditEvent({ eventType, entityId, actor, metadata, requestContext, severity = 'notice' }) {
    if (!this.auditLogger || typeof this.auditLogger.record !== 'function') {
      return;
    }

    const auditMetadata = buildAuditMetadata(metadata);
    const auditRequestContext = normaliseAuditRequestContext(requestContext);

    try {
      await this.auditLogger.record({
        eventType,
        entityType: AUDIT_ENTITY_TYPE,
        entityId: String(entityId ?? 'unknown'),
        severity,
        actor: actor ?? { id: 'unknown', type: 'system', role: 'system' },
        metadata: auditMetadata,
        tenantId: this.auditTenantId,
        requestContext: auditRequestContext
      });
    } catch (error) {
      this.logger.warn({ err: error, eventType, entityId }, 'Failed to record integration invite audit event');
    }
  }
}

export { INVITE_STATUS };

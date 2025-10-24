import IntegrationDashboardService from '../services/IntegrationDashboardService.js';
import IntegrationApiKeyService from '../services/IntegrationApiKeyService.js';
import IntegrationApiKeyInviteService from '../services/IntegrationApiKeyInviteService.js';

const dashboardService = new IntegrationDashboardService();
const apiKeyService = new IntegrationApiKeyService();
const apiKeyInviteService = new IntegrationApiKeyInviteService();

function normaliseError(error, defaultStatus = 500, defaultMessage = 'Unexpected integration error') {
  if (!error) {
    return { status: defaultStatus, message: defaultMessage };
  }
  if (error.status && error.message) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof Error) {
    return { status: error.status ?? defaultStatus, message: error.message || defaultMessage };
  }
  return { status: defaultStatus, message: defaultMessage };
}

function buildAuditActor(req) {
  const user = req?.user ?? {};
  const email = typeof user.email === 'string' && user.email.trim() ? user.email.trim().toLowerCase() : null;
  const roles = Array.isArray(user.roles)
    ? user.roles.filter((role) => typeof role === 'string' && role.trim().length > 0).map((role) => role.trim())
    : typeof user.role === 'string' && user.role.trim()
      ? [user.role.trim()]
      : [];
  const id = typeof user.id === 'string' && user.id.trim()
    ? user.id.trim()
    : typeof user.sub === 'string' && user.sub.trim()
      ? user.sub.trim()
      : email ?? 'admin-dashboard';

  return {
    id,
    type: 'user',
    role: roles[0] ?? 'admin',
    roles,
    email
  };
}

function buildAuditRequestContext(req) {
  const requestIdHeader = typeof req?.headers?.['x-request-id'] === 'string' ? req.headers['x-request-id'].trim() : null;
  const requestId = requestIdHeader
    || (typeof req?.id === 'string' && req.id.trim() ? req.id.trim() : null)
    || (typeof req?.requestId === 'string' && req.requestId.trim() ? req.requestId.trim() : null);

  const ipCandidate = Array.isArray(req?.ips) && req.ips.length > 0 ? req.ips[0] : req?.ip;
  const ipAddress = typeof ipCandidate === 'string' && ipCandidate.trim() ? ipCandidate.trim() : null;

  const userAgentHeader = typeof req?.headers?.['user-agent'] === 'string' ? req.headers['user-agent'].trim() : null;
  const originHeader = typeof req?.headers?.origin === 'string' ? req.headers.origin.trim() : null;
  const method = typeof req?.method === 'string' ? req.method.trim().toUpperCase() || null : null;
  const path = typeof req?.originalUrl === 'string' && req.originalUrl.trim()
    ? req.originalUrl.trim()
    : typeof req?.url === 'string' && req.url.trim()
      ? req.url.trim()
      : null;

  return {
    requestId,
    ipAddress,
    userAgent: userAgentHeader || null,
    origin: originHeader || null,
    method,
    path
  };
}

export async function getIntegrationDashboard(req, res, next) {
  try {
    const snapshot = await dashboardService.buildSnapshot();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}

export async function triggerIntegrationSync(req, res, next) {
  const { integration } = req.params;
  const { windowStartAt, windowEndAt } = req.body ?? {};

  try {
    const result = await dashboardService.triggerManualSync(integration, {
      windowStartAt,
      windowEndAt
    });
    res.status(202).json({
      message: 'Integration sync accepted',
      data: result
    });
  } catch (error) {
    const { status, message } = normaliseError(error, 409, 'Unable to trigger integration sync');
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ message });
  }
}

export async function listIntegrationApiKeys(req, res, next) {
  try {
    const { provider, environment } = req.query ?? {};
    const apiKeys = await apiKeyService.listKeys({ provider, environment });
    res.json({ success: true, data: apiKeys });
  } catch (error) {
    next(error);
  }
}

export async function listIntegrationApiKeyInvitations(req, res, next) {
  try {
    const { provider, environment, status, ownerEmail } = req.query ?? {};
    const invites = await apiKeyInviteService.listInvites({ provider, environment, status, ownerEmail });
    res.json({ success: true, data: invites });
  } catch (error) {
    next(error);
  }
}

export async function createIntegrationApiKey(req, res, next) {
  const { provider, environment, alias, ownerEmail, key, rotationIntervalDays, expiresAt, notes } = req.body ?? {};

  try {
    const record = await apiKeyService.createKey({
      provider,
      environment,
      alias,
      ownerEmail,
      keyValue: key,
      rotationIntervalDays,
      expiresAt,
      createdBy: req.user?.email ?? req.user?.id ?? 'admin-dashboard',
      notes
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export async function createIntegrationApiKeyInvitation(req, res, next) {
  const {
    provider,
    environment,
    alias,
    ownerEmail,
    rotationIntervalDays,
    keyExpiresAt,
    notes,
    reason,
    apiKeyId,
    requestedByName,
    documentationUrl
  } = req.body ?? {};

  try {
    const auditActor = buildAuditActor(req);
    const requestContext = buildAuditRequestContext(req);

    const result = await apiKeyInviteService.createInvite({
      provider,
      environment,
      alias,
      ownerEmail,
      rotationIntervalDays,
      keyExpiresAt,
      notes,
      reason,
      apiKeyId,
      requestedByName,
      documentationUrl,
      requestedBy: req.user?.email ?? req.user?.id ?? 'admin-dashboard'
    }, { actor: auditActor, requestContext });

    res.status(201).json({
      success: true,
      data: result.invite,
      claimUrl: result.claimUrl
    });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export async function rotateIntegrationApiKey(req, res, next) {
  const { id } = req.params;
  const { key, rotationIntervalDays, expiresAt, reason, notes } = req.body ?? {};

  try {
    const record = await apiKeyService.rotateKey(Number(id), {
      keyValue: key,
      rotationIntervalDays,
      expiresAt,
      rotatedBy: req.user?.email ?? req.user?.id ?? 'admin-dashboard',
      reason,
      notes
    });
    res.json({ success: true, data: record });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export async function disableIntegrationApiKey(req, res, next) {
  const { id } = req.params;
  const { reason } = req.body ?? {};

  try {
    const record = await apiKeyService.disableKey(Number(id), {
      disabledBy: req.user?.email ?? req.user?.id ?? 'admin-dashboard',
      reason
    });
    res.json({ success: true, data: record });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export async function resendIntegrationApiKeyInvitation(req, res, next) {
  const { id } = req.params;
  const { requestedByName } = req.body ?? {};

  try {
    const auditActor = buildAuditActor(req);
    const requestContext = buildAuditRequestContext(req);

    const result = await apiKeyInviteService.resendInvite(id, {
      requestedBy: req.user?.email ?? req.user?.id ?? 'admin-dashboard',
      requestedByName,
      actor: auditActor,
      requestContext
    });
    res.json({ success: true, data: result.invite, claimUrl: result.claimUrl });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export async function cancelIntegrationApiKeyInvitation(req, res, next) {
  const { id } = req.params;

  try {
    const auditActor = buildAuditActor(req);
    const requestContext = buildAuditRequestContext(req);
    const invite = await apiKeyInviteService.cancelInvite(id, {
      cancelledBy: req.user?.email ?? req.user?.id ?? 'admin-dashboard',
      actor: auditActor,
      requestContext
    });
    res.json({ success: true, data: invite });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export default {
  getIntegrationDashboard,
  triggerIntegrationSync,
  listIntegrationApiKeys,
  listIntegrationApiKeyInvitations,
  createIntegrationApiKey,
  createIntegrationApiKeyInvitation,
  rotateIntegrationApiKey,
  disableIntegrationApiKey,
  resendIntegrationApiKeyInvitation,
  cancelIntegrationApiKeyInvitation
};


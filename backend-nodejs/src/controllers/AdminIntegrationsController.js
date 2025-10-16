import IntegrationDashboardService from '../services/IntegrationDashboardService.js';
import IntegrationApiKeyService from '../services/IntegrationApiKeyService.js';

const dashboardService = new IntegrationDashboardService();
const apiKeyService = new IntegrationApiKeyService();

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

export default {
  getIntegrationDashboard,
  triggerIntegrationSync,
  listIntegrationApiKeys,
  createIntegrationApiKey,
  rotateIntegrationApiKey,
  disableIntegrationApiKey
};


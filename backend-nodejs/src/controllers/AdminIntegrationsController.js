import IntegrationDashboardService from '../services/IntegrationDashboardService.js';

const dashboardService = new IntegrationDashboardService();

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

export default {
  getIntegrationDashboard,
  triggerIntegrationSync
};


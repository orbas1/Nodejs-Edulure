import logger from '../config/logger.js';
import { getSloSummaries, getSloSummary } from '../observability/sloRegistry.js';
import { success } from '../utils/httpResponse.js';

const log = logger.child({ controller: 'ObservabilityController' });

function parseBooleanQuery(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalised)) {
      return false;
    }
  }
  return defaultValue;
}

class ObservabilityController {
  static sloSnapshots(req, res) {
    const includeDefinition = parseBooleanQuery(
      req.query.includeDefinition ?? req.query.includeDefinitions,
      true
    );

    const payload = getSloSummaries({ includeDefinition });
    log.debug({ includeDefinition, count: payload.slo.length }, 'Generated SLO snapshots');

    return success(res, {
      data: payload,
      message: 'Service level objective snapshots generated'
    });
  }

  static sloDetail(req, res) {
    const includeDefinition = parseBooleanQuery(
      req.query.includeDefinition ?? req.query.includeDefinitions,
      true
    );
    const sloId = req.params.sloId;
    const snapshot = getSloSummary(sloId, { includeDefinition });

    if (!snapshot) {
      log.warn({ sloId }, 'Requested SLO not found');
      return res.status(404).json({
        success: false,
        message: `No service level objective registered with id "${sloId}"`
      });
    }

    log.debug({ sloId, status: snapshot.status }, 'Generated SLO detail snapshot');

    return success(res, {
      data: snapshot,
      message: 'Service level objective snapshot generated'
    });
  }
}

export default ObservabilityController;

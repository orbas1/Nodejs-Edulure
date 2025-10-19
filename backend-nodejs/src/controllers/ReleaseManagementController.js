import releaseOrchestrationService from '../services/ReleaseOrchestrationService.js';

function parsePagination(query) {
  const limit = Math.max(1, Math.min(200, Number.parseInt(query.limit ?? '25', 10)));
  const offset = Math.max(0, Number.parseInt(query.offset ?? '0', 10));
  return { limit, offset };
}

export default class ReleaseManagementController {
  static async getChecklist(req, res, next) {
    try {
      const filters = {};
      if (req.query.category) {
        filters.category = String(req.query.category)
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }

      const pagination = parsePagination(req.query);
      const checklist = await releaseOrchestrationService.listChecklist(filters, pagination);
      return res.json({ success: true, data: checklist });
    } catch (error) {
      return next(error);
    }
  }

  static async scheduleRun(req, res, next) {
    try {
      const payload = {
        versionTag: req.body.versionTag,
        environment: req.body.environment,
        initiatedByEmail: req.body.initiatedByEmail,
        initiatedByName: req.body.initiatedByName,
        changeWindowStart: req.body.changeWindowStart,
        changeWindowEnd: req.body.changeWindowEnd,
        summaryNotes: req.body.summaryNotes,
        metadata: req.body.metadata,
        changeTicket: req.body.changeTicket,
        scheduledAt: req.body.scheduledAt,
        initialGates: req.body.initialGates
      };

      const result = await releaseOrchestrationService.scheduleReleaseRun(payload);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async listRuns(req, res, next) {
    try {
      const filters = {};
      if (req.query.environment) {
        filters.environment = String(req.query.environment)
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      if (req.query.status) {
        filters.status = String(req.query.status)
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      if (req.query.versionTag) {
        filters.versionTag = String(req.query.versionTag).trim();
      }

      const pagination = parsePagination(req.query);
      const runs = await releaseOrchestrationService.listRuns(filters, pagination);
      return res.json({ success: true, data: runs });
    } catch (error) {
      return next(error);
    }
  }

  static async getRun(req, res, next) {
    try {
      const result = await releaseOrchestrationService.getRun(req.params.publicId);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Release run not found' });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async recordGateEvaluation(req, res, next) {
    try {
      const payload = {
        status: req.body.status,
        ownerEmail: req.body.ownerEmail,
        metrics: req.body.metrics,
        notes: req.body.notes,
        evidenceUrl: req.body.evidenceUrl,
        lastEvaluatedAt: req.body.lastEvaluatedAt
      };

      const gate = await releaseOrchestrationService.recordGateEvaluation(
        req.params.publicId,
        req.params.gateKey,
        payload
      );

      if (!gate) {
        return res.status(404).json({ success: false, message: 'Release run not found' });
      }

      return res.json({ success: true, data: gate });
    } catch (error) {
      return next(error);
    }
  }

  static async evaluateRun(req, res, next) {
    try {
      const result = await releaseOrchestrationService.evaluateRun(req.params.publicId);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Release run not found' });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      const dashboard = await releaseOrchestrationService.getDashboard({ environment: req.query.environment });
      return res.json({ success: true, data: dashboard });
    } catch (error) {
      return next(error);
    }
  }
}

import QaReadinessService from '../services/QaReadinessService.js';
import { success, error as errorResponse } from '../utils/httpResponse.js';

export default class QaReadinessController {
  static async listSurfaces(_req, res, next) {
    try {
      const summary = await QaReadinessService.getCoverageSummary();
      return success(res, {
        data: {
          surfaces: summary.surfaces,
          aggregate: summary.aggregate
        },
        message: 'QA surface readiness summary generated'
      });
    } catch (err) {
      return next(err);
    }
  }

  static async getSurface(req, res, next) {
    try {
      const surface = await QaReadinessService.getSurface(req.params.slug);
      return success(res, {
        data: surface,
        message: `QA surface ${surface.slug} resolved`
      });
    } catch (err) {
      return next(err);
    }
  }

  static async listChecklists(_req, res, next) {
    try {
      const checklists = await QaReadinessService.listManualChecklists();
      return success(res, {
        data: checklists,
        message: 'Manual QA checklists resolved'
      });
    } catch (err) {
      return next(err);
    }
  }

  static async getChecklist(req, res, next) {
    try {
      const checklist = await QaReadinessService.getManualChecklist(req.params.slug);
      return success(res, {
        data: checklist,
        message: `Manual QA checklist ${checklist.slug} resolved`
      });
    } catch (err) {
      return next(err);
    }
  }

  static async listFixtureSets(_req, res, next) {
    try {
      const fixtures = await QaReadinessService.listFixtureSets();
      return success(res, {
        data: fixtures,
        message: 'QA fixture sets resolved'
      });
    } catch (err) {
      return next(err);
    }
  }

  static async listSandboxes(req, res, next) {
    try {
      const filters = {};
      if (req.query.status) {
        filters.status = String(req.query.status);
      }
      if (req.query.environmentType) {
        filters.environmentType = String(req.query.environmentType);
      }
      const sandboxes = await QaReadinessService.listSandboxes(filters);
      return success(res, {
        data: sandboxes,
        message: 'QA sandbox environments resolved'
      });
    } catch (err) {
      return next(err);
    }
  }

  static async recordCoverage(req, res, next) {
    try {
      const matrix = req.body?.matrix;
      if (!matrix) {
        return errorResponse(res, {
          status: 400,
          message: 'matrix payload is required to persist coverage.'
        });
      }
      const runs = await QaReadinessService.recordCoverageMatrix(matrix, {
        runIdentifier: req.body?.runIdentifier ?? null,
        gitCommit: req.body?.gitCommit ?? null,
        gitBranch: req.body?.gitBranch ?? null,
        environment: req.body?.environment ?? null,
        triggeredBy: req.body?.triggeredBy ?? req.user?.email ?? null
      });
      return success(res, {
        status: 201,
        data: { runs },
        message: 'Coverage results persisted'
      });
    } catch (err) {
      return next(err);
    }
  }
}

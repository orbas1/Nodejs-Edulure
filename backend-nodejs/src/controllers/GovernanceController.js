import governanceStakeholderService from '../services/GovernanceStakeholderService.js';

function normalizeArrayParam(value) {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveTenantId(req) {
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }
  const headerTenant = req.headers['x-tenant-id'];
  if (typeof headerTenant === 'string' && headerTenant.trim()) {
    return headerTenant.trim();
  }
  return 'global';
}

function resolveActor(req) {
  if (!req.user) {
    return { id: null, type: 'system', role: 'system' };
  }
  return {
    id: req.user.id ?? req.user.email ?? null,
    type: 'user',
    role: req.user.role ?? 'admin'
  };
}

function buildRequestContext(req) {
  return {
    requestId: req.traceId ?? null,
    traceId: req.traceId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: typeof req.get === 'function' ? req.get('user-agent') : req.headers['user-agent'],
    method: req.method ?? null,
    path: req.originalUrl ?? req.url ?? null
  };
}

export default class GovernanceController {
  static async getOverview(_req, res, next) {
    try {
      const overview = await governanceStakeholderService.getOverview();
      return res.json({ success: true, data: overview });
    } catch (error) {
      return next(error);
    }
  }

  static async listContracts(req, res, next) {
    try {
      const filters = {
        status: normalizeArrayParam(req.query.status),
        vendorName: req.query.vendorName ?? req.query.vendor,
        riskTier: normalizeArrayParam(req.query.riskTier),
        ownerEmail: req.query.ownerEmail,
        renewalWithinDays: req.query.renewalWithinDays,
        overdue: req.query.overdue === 'true'
      };

      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset
      };

      const result = await governanceStakeholderService.listContracts(filters, pagination);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async updateContract(req, res, next) {
    try {
      const { contractId } = req.params;
      const payload = req.body ?? {};
      const updated = await governanceStakeholderService.updateContract(contractId, payload, {
        actor: resolveActor(req),
        tenantId: resolveTenantId(req),
        requestContext: buildRequestContext(req)
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: `Contract ${contractId} not found` });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async listVendorAssessments(req, res, next) {
    try {
      const filters = {
        vendorName: req.query.vendorName ?? req.query.vendor,
        assessmentType: normalizeArrayParam(req.query.assessmentType),
        riskLevel: normalizeArrayParam(req.query.riskLevel),
        status: normalizeArrayParam(req.query.status),
        nextReviewBefore: req.query.nextReviewBefore,
        overdue: req.query.overdue === 'true'
      };
      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset
      };

      const result = await governanceStakeholderService.listVendorAssessments(filters, pagination);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async recordVendorAssessmentDecision(req, res, next) {
    try {
      const { assessmentId } = req.params;
      const updated = await governanceStakeholderService.recordVendorAssessmentDecision(assessmentId, req.body ?? {}, {
        actor: resolveActor(req),
        tenantId: resolveTenantId(req),
        requestContext: buildRequestContext(req)
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: `Vendor assessment ${assessmentId} not found` });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async listReviewCycles(req, res, next) {
    try {
      const filters = {
        status: normalizeArrayParam(req.query.status),
        cycleName: req.query.cycleName,
        startAfter: req.query.startAfter,
        endBefore: req.query.endBefore,
        onlyUpcoming: req.query.onlyUpcoming === 'true',
        overdue: req.query.overdue === 'true'
      };
      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset
      };

      const result = await governanceStakeholderService.listReviewCycles(filters, pagination);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async recordReviewAction(req, res, next) {
    try {
      const { reviewId } = req.params;
      const updated = await governanceStakeholderService.recordReviewAction(reviewId, req.body ?? {}, {
        actor: resolveActor(req),
        tenantId: resolveTenantId(req),
        requestContext: buildRequestContext(req)
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: `Review cycle ${reviewId} not found` });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async listCommunications(req, res, next) {
    try {
      const filters = {
        status: normalizeArrayParam(req.query.status),
        audience: normalizeArrayParam(req.query.audience),
        channel: normalizeArrayParam(req.query.channel),
        scheduledBefore: req.query.scheduledBefore,
        ownerEmail: req.query.ownerEmail
      };
      const pagination = {
        limit: req.query.limit,
        offset: req.query.offset
      };

      const result = await governanceStakeholderService.listCommunications(filters, pagination);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  static async scheduleCommunication(req, res, next) {
    try {
      const created = await governanceStakeholderService.scheduleCommunication(req.body ?? {}, {
        actor: resolveActor(req),
        tenantId: resolveTenantId(req),
        requestContext: buildRequestContext(req)
      });
      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      return next(error);
    }
  }

  static async recordCommunicationMetrics(req, res, next) {
    try {
      const { communicationId } = req.params;
      const updated = await governanceStakeholderService.recordCommunicationMetrics(communicationId, req.body ?? {}, {
        actor: resolveActor(req),
        tenantId: resolveTenantId(req),
        requestContext: buildRequestContext(req)
      });
      if (!updated) {
        return res.status(404).json({ success: false, message: `Communication ${communicationId} not found` });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      return next(error);
    }
  }
}

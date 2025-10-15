import ComplianceService from '../services/ComplianceService.js';

const complianceService = new ComplianceService();

function resolveActor(req) {
  if (!req.user) {
    return { id: null, role: 'system', type: 'system' };
  }
  return {
    id: req.user.id ?? null,
    role: req.user.role ?? 'user',
    type: 'user'
  };
}

export default class ComplianceController {
  static async listDsrRequests(req, res, next) {
    try {
      const { status, dueBefore, limit, offset } = req.query;
      const payload = await complianceService.listDsrRequests({
        status,
        dueBefore,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return next(error);
    }
  }

  static async assignDsrRequest(req, res, next) {
    try {
      const { requestId } = req.params;
      const { assigneeId } = req.body;
      if (!assigneeId) {
        return res.status(400).json({ success: false, message: 'assigneeId is required' });
      }
      const record = await complianceService.assignDsrRequest({
        requestId: Number(requestId),
        assigneeId,
        actor: resolveActor(req)
      });
      return res.json({ success: true, data: record });
    } catch (error) {
      return next(error);
    }
  }

  static async updateDsrStatus(req, res, next) {
    try {
      const { requestId } = req.params;
      const { status, resolutionNotes } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }
      const record = await complianceService.updateDsrStatus({
        requestId: Number(requestId),
        status,
        resolutionNotes,
        actor: resolveActor(req)
      });
      return res.json({ success: true, data: record });
    } catch (error) {
      return next(error);
    }
  }

  static async listUserConsents(req, res, next) {
    try {
      const { userId } = req.params;
      const records = await complianceService.listConsentRecords(Number(userId));
      return res.json({ success: true, data: records });
    } catch (error) {
      return next(error);
    }
  }

  static async createConsent(req, res, next) {
    try {
      const { userId, consentType, policyVersion, channel, metadata, evidenceCiphertext } = req.body;
      if (!userId || !consentType || !policyVersion) {
        return res
          .status(400)
          .json({ success: false, message: 'userId, consentType, and policyVersion are required' });
      }
      const record = await complianceService.createConsentRecord({
        userId,
        consentType,
        policyVersion,
        channel,
        metadata,
        evidenceCiphertext,
        actor: resolveActor(req)
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      return next(error);
    }
  }

  static async revokeConsent(req, res, next) {
    try {
      const { consentId } = req.params;
      const { reason } = req.body ?? {};
      const record = await complianceService.revokeConsent({
        consentId: Number(consentId),
        reason,
        actor: resolveActor(req)
      });
      return res.json({ success: true, data: record });
    } catch (error) {
      return next(error);
    }
  }

  static async fetchPolicyTimeline(req, res, next) {
    try {
      const { policyKey } = req.query;
      const timeline = await complianceService.fetchPolicyTimeline({ policyKey });
      return res.json({ success: true, data: timeline });
    } catch (error) {
      return next(error);
    }
  }
}

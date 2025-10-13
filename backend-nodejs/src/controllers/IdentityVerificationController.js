import logger from '../config/logger.js';
import IdentityVerificationService from '../services/IdentityVerificationService.js';

function handleError(res, error, contextMessage) {
  const status = error.status ?? 500;
  if (status >= 500) {
    logger.error({ err: error }, contextMessage);
  }
  return res.status(status).json({ success: false, message: error.message ?? 'Unexpected error' });
}

export async function getOwnVerification(req, res) {
  try {
    const summary = await IdentityVerificationService.getVerificationSummaryForUser(req.user.id);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return handleError(res, error, 'Failed to load verification summary');
  }
}

export async function createUploadRequest(req, res) {
  try {
    const uploadRequest = await IdentityVerificationService.requestUpload(req.user.id, req.body);
    return res.status(201).json({ success: true, data: uploadRequest });
  } catch (error) {
    return handleError(res, error, 'Failed to create verification upload request');
  }
}

export async function attachDocument(req, res) {
  try {
    const result = await IdentityVerificationService.attachDocument(req.user.id, req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error, 'Failed to attach verification document');
  }
}

export async function submitForReview(req, res) {
  try {
    const summary = await IdentityVerificationService.submitForReview(req.user.id);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return handleError(res, error, 'Failed to submit verification for review');
  }
}

export async function reviewVerification(req, res) {
  try {
    const verificationId = Number.parseInt(req.params.verificationId, 10);
    if (!Number.isInteger(verificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid verification identifier' });
    }
    const summary = await IdentityVerificationService.reviewVerification(verificationId, req.user.id, req.body);
    return res.json({ success: true, data: summary });
  } catch (error) {
    return handleError(res, error, 'Failed to review verification');
  }
}

export async function listAuditTrail(req, res) {
  try {
    const verificationId = Number.parseInt(req.params.verificationId, 10);
    if (!Number.isInteger(verificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid verification identifier' });
    }
    const audit = await IdentityVerificationService.listAuditTrail(verificationId);
    return res.json({ success: true, data: audit });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch verification audit trail');
  }
}

export async function getAdminOverview(_req, res) {
  try {
    const overview = await IdentityVerificationService.getAdminOverview();
    return res.json({ success: true, data: overview });
  } catch (error) {
    return handleError(res, error, 'Failed to fetch verification overview');
  }
}

export default {
  getOwnVerification,
  createUploadRequest,
  attachDocument,
  submitForReview,
  reviewVerification,
  listAuditTrail,
  getAdminOverview
};

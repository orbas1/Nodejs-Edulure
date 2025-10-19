import { Router } from 'express';

import GovernanceController from '../controllers/GovernanceController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/overview', auth('admin'), GovernanceController.getOverview);
router.get('/contracts', auth('admin'), GovernanceController.listContracts);
router.patch('/contracts/:contractId', auth('admin'), GovernanceController.updateContract);
router.get('/vendor-assessments', auth('admin'), GovernanceController.listVendorAssessments);
router.post(
  '/vendor-assessments/:assessmentId/decisions',
  auth('admin'),
  GovernanceController.recordVendorAssessmentDecision
);
router.get('/review-cycles', auth('admin'), GovernanceController.listReviewCycles);
router.post('/review-cycles/:reviewId/action-items', auth('admin'), GovernanceController.recordReviewAction);
router.get('/communications', auth('admin'), GovernanceController.listCommunications);
router.post('/communications', auth('admin'), GovernanceController.scheduleCommunication);
router.post(
  '/communications/:communicationId/metrics',
  auth('admin'),
  GovernanceController.recordCommunicationMetrics
);

export default router;

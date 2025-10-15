import { Router } from 'express';

import auth from '../middleware/auth.js';
import ComplianceController from '../controllers/ComplianceController.js';

const router = Router();

router.use(auth('admin'));

router.get('/compliance/dsr/requests', ComplianceController.listDsrRequests);
router.post('/compliance/dsr/requests/:requestId/assign', ComplianceController.assignDsrRequest);
router.post('/compliance/dsr/requests/:requestId/status', ComplianceController.updateDsrStatus);

router.get('/compliance/consents/:userId', ComplianceController.listUserConsents);
router.post('/compliance/consents', ComplianceController.createConsent);
router.post('/compliance/consents/:consentId/revoke', ComplianceController.revokeConsent);

router.get('/compliance/policies', ComplianceController.fetchPolicyTimeline);

export default router;

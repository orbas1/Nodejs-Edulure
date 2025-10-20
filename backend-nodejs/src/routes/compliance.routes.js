import auth from '../middleware/auth.js';
import ComplianceController from '../controllers/ComplianceController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.use(auth('admin'));

router.get('/dsr/requests', ComplianceController.listDsrRequests);
router.post('/dsr/requests/:requestId/assign', ComplianceController.assignDsrRequest);
router.post('/dsr/requests/:requestId/status', ComplianceController.updateDsrStatus);

router.get('/consents/:userId', ComplianceController.listUserConsents);
router.post('/consents', ComplianceController.createConsent);
router.post('/consents/:consentId/revoke', ComplianceController.revokeConsent);

router.get('/policies', ComplianceController.fetchPolicyTimeline);

export default router;

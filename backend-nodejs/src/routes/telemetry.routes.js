import { Router } from 'express';

import TelemetryController from '../controllers/TelemetryController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/events', auth('user'), TelemetryController.ingestEvent);
router.post('/consents', auth('user'), TelemetryController.recordConsentDecision);
router.get('/freshness', auth('admin'), TelemetryController.listFreshness);
router.post('/export', auth('admin'), TelemetryController.triggerExport);

export default router;

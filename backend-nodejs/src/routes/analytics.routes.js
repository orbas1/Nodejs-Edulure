import { Router } from 'express';

import AnalyticsController from '../controllers/AnalyticsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/explorer/summary', auth('instructor'), AnalyticsController.getExplorerSummary);
router.get('/explorer/alerts', auth('instructor'), AnalyticsController.getExplorerAlerts);
router.post('/explorer/interactions', AnalyticsController.recordExplorerInteraction);

export default router;

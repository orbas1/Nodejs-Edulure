import { Router } from 'express';

import auth from '../middleware/auth.js';
import OfflineLearningController from '../controllers/OfflineLearningController.js';

const router = Router({ mergeParams: true });

router.get('/offline/progress-logs', auth(), OfflineLearningController.listModuleLogs);
router.post('/offline/progress-logs/preview', auth(), OfflineLearningController.previewModuleLogs);
router.post('/offline/progress-logs/commit', auth(), OfflineLearningController.commitModuleLogs);

export default router;

import { Router } from 'express';

import ObservabilityController from '../controllers/ObservabilityController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/slos', auth('admin'), ObservabilityController.sloSnapshots);
router.get('/slos/:sloId', auth('admin'), ObservabilityController.sloDetail);

export default router;

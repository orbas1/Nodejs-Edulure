import { Router } from 'express';

import AdsController from '../controllers/AdsController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/campaigns', auth('instructor'), AdsController.list);
router.post('/campaigns', auth('instructor'), AdsController.create);
router.get('/campaigns/:campaignId', auth('instructor'), AdsController.get);
router.put('/campaigns/:campaignId', auth('instructor'), AdsController.update);
router.post('/campaigns/:campaignId/pause', auth('instructor'), AdsController.pause);
router.post('/campaigns/:campaignId/resume', auth('instructor'), AdsController.resume);
router.post('/campaigns/:campaignId/metrics', auth('instructor'), AdsController.recordMetrics);
router.get('/campaigns/:campaignId/insights', auth('instructor'), AdsController.insights);

export default router;

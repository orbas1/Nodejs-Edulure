import { Router } from 'express';

import FeedController from '../controllers/FeedController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth('user'), FeedController.getFeed);
router.get('/analytics', auth('user'), FeedController.getAnalytics);
router.get('/placements', auth('user'), FeedController.getPlacements);

export default router;

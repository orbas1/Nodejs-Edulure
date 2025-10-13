import { Router } from 'express';

import DashboardController from '../controllers/DashboardController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/me', auth(), DashboardController.current);

export default router;

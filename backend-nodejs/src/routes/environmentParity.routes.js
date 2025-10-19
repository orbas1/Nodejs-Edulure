import { Router } from 'express';

import EnvironmentParityController from '../controllers/EnvironmentParityController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/environment/health', auth('admin'), EnvironmentParityController.health);

export default router;

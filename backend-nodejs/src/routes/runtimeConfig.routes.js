import { Router } from 'express';

import RuntimeConfigController from '../controllers/RuntimeConfigController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/public', RuntimeConfigController.publicSnapshot);
router.get('/user', auth(), RuntimeConfigController.userSnapshot);
router.get('/snapshot', auth('admin'), RuntimeConfigController.snapshot);

export default router;

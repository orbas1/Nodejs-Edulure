import { Router } from 'express';

import UserController from '../controllers/UserController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/me', auth(), UserController.me);
router.put('/me', auth(), UserController.updateMe);
router.get('/', auth('admin'), UserController.list);

export default router;

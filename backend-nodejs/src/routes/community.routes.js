import { Router } from 'express';

import CommunityController from '../controllers/CommunityController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth(), CommunityController.listForUser);
router.post('/', auth('instructor'), CommunityController.create);

export default router;

import { Router } from 'express';

import IntegrationKeyInviteController from '../controllers/IntegrationKeyInviteController.js';

const router = Router();

router.get('/:token', IntegrationKeyInviteController.getInvitation);
router.post('/:token', IntegrationKeyInviteController.submitInvitation);

export default router;

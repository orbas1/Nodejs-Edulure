import { Router } from 'express';

import ProviderTransitionController from '../controllers/ProviderTransitionController.js';

const router = Router();

router.get('/announcements', ProviderTransitionController.list);
router.get('/announcements/:slug', ProviderTransitionController.show);
router.post('/announcements/:slug/acknowledgements', ProviderTransitionController.acknowledge);
router.post('/announcements/:slug/status-updates', ProviderTransitionController.recordStatus);

export default router;

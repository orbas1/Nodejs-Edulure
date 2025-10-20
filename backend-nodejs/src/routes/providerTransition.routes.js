import ProviderTransitionController from '../controllers/ProviderTransitionController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/announcements', ProviderTransitionController.list);
router.get('/announcements/:slug', ProviderTransitionController.show);
router.post('/announcements/:slug/acknowledgements', ProviderTransitionController.acknowledge);
router.post('/announcements/:slug/status-updates', ProviderTransitionController.recordStatus);

export default router;

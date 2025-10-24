import NavigationAnnexController from '../controllers/NavigationAnnexController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/annex', NavigationAnnexController.describe);
router.get('/annex/strategy-briefing', NavigationAnnexController.strategyBriefing);

export default router;

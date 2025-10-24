import StrategyBriefingController from '../controllers/StrategyBriefingController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/briefing', StrategyBriefingController.describe);

export default router;

import AnalyticsController from '../controllers/AnalyticsController.js';
import BusinessIntelligenceController from '../controllers/BusinessIntelligenceController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/explorer/summary', auth('instructor'), AnalyticsController.getExplorerSummary);
router.get('/explorer/alerts', auth('instructor'), AnalyticsController.getExplorerAlerts);
router.post('/explorer/interactions', auth('user'), AnalyticsController.recordExplorerInteraction);
router.get('/bi/executive-overview', auth('admin'), BusinessIntelligenceController.getExecutiveOverview);
router.get(
  '/bi/revenue/saved-views',
  auth('admin'),
  BusinessIntelligenceController.getRevenueSavedViews
);

export default router;

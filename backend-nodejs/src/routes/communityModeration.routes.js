import CommunityModerationController from '../controllers/CommunityModerationController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.post(
  '/communities/:communityId/cases',
  auth(),
  CommunityModerationController.flagPost
);
router.get(
  '/communities/:communityId/cases',
  auth(),
  CommunityModerationController.listCases
);
router.get(
  '/communities/:communityId/cases/:caseId',
  auth(),
  CommunityModerationController.getCase
);
router.get(
  '/communities/:communityId/cases/:caseId/actions',
  auth(),
  CommunityModerationController.listCaseActions
);
router.post(
  '/communities/:communityId/cases/:caseId/actions',
  auth(),
  CommunityModerationController.applyCaseAction
);

router.post('/scam-reports', auth(), CommunityModerationController.submitScamReport);
router.get('/scam-reports', auth(), CommunityModerationController.listScamReports);
router.patch(
  '/scam-reports/:reportId',
  auth('admin'),
  CommunityModerationController.updateScamReport
);

router.post('/analytics/events', auth(), CommunityModerationController.recordAnalyticsEvent);
router.get('/analytics/summary', auth(), CommunityModerationController.getAnalyticsSummary);
router.get(
  '/communities/:communityId/analytics/summary',
  auth(),
  CommunityModerationController.getAnalyticsSummary
);

export default router;

import { Router } from 'express';

import DashboardController from '../controllers/DashboardController.js';
import LearnerDashboardActionController from '../controllers/LearnerDashboardActionController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/me', auth(), DashboardController.current);

router.post('/learner/bookings', auth(), LearnerDashboardActionController.createBooking);
router.post('/learner/bookings/export', auth(), LearnerDashboardActionController.exportBookings);
router.post('/learner/courses/goals', auth(), LearnerDashboardActionController.syncCourseGoal);
router.post('/learner/courses/calendar-sync', auth(), LearnerDashboardActionController.syncCourseCalendar);
router.post('/learner/ebooks/:ebookId/resume', auth(), LearnerDashboardActionController.resumeEbook);
router.post('/learner/ebooks/:ebookId/share', auth(), LearnerDashboardActionController.shareEbook);
router.post(
  '/learner/financial/statements/:invoiceId/download',
  auth(),
  LearnerDashboardActionController.downloadStatement
);
router.post('/learner/live-sessions/:sessionId/join', auth(), LearnerDashboardActionController.joinLiveSession);
router.post(
  '/learner/live-sessions/:sessionId/check-in',
  auth(),
  LearnerDashboardActionController.checkInLiveSession
);
router.post(
  '/learner/communities/:communityId/initiatives',
  auth(),
  LearnerDashboardActionController.createCommunityInitiative
);
router.post(
  '/learner/communities/:communityId/health-report',
  auth(),
  LearnerDashboardActionController.exportCommunityHealth
);
router.post(
  '/learner/communities/pipelines',
  auth(),
  LearnerDashboardActionController.createCommunityPipelineStage
);

export default router;

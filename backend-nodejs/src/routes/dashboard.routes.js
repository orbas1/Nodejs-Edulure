import { Router } from 'express';

import DashboardController from '../controllers/DashboardController.js';
import LearnerDashboardController from '../controllers/LearnerDashboardController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/me', auth(), DashboardController.current);
router.post('/learner/tutor-bookings', auth(), LearnerDashboardController.createTutorBooking);
router.post('/learner/tutor-bookings/export', auth(), LearnerDashboardController.exportTutorSchedule);
router.post('/learner/courses/:courseId/goals', auth(), LearnerDashboardController.createCourseGoal);
router.post('/learner/ebooks/:ebookId/resume', auth(), LearnerDashboardController.resumeEbook);
router.post('/learner/ebooks/:ebookId/share', auth(), LearnerDashboardController.shareEbook);
router.get('/learner/financial/invoices/:invoiceId/download', auth(), LearnerDashboardController.downloadInvoice);
router.put('/learner/financial/preferences', auth(), LearnerDashboardController.updateBillingPreferences);
router.post('/learner/live-sessions/:sessionId/join', auth(), LearnerDashboardController.joinLiveSession);
router.post('/learner/live-sessions/:sessionId/check-in', auth(), LearnerDashboardController.checkInToLiveSession);
router.post('/learner/communities/:communityId/actions', auth(), LearnerDashboardController.triggerCommunityAction);
router.get('/learner/support/tickets', auth(), LearnerDashboardController.listSupportTickets);
router.post('/learner/support/tickets', auth(), LearnerDashboardController.createSupportTicket);
router.put('/learner/support/tickets/:ticketId', auth(), LearnerDashboardController.updateSupportTicket);
router.post('/learner/support/tickets/:ticketId/messages', auth(), LearnerDashboardController.replyToSupportTicket);
router.post('/learner/support/tickets/:ticketId/close', auth(), LearnerDashboardController.closeSupportTicket);

export default router;

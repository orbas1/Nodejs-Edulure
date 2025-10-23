import DashboardController from '../controllers/DashboardController.js';
import LearnerDashboardController from '../controllers/LearnerDashboardController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/me', auth(), DashboardController.current);
router.get('/learner/tutor-bookings', auth(), LearnerDashboardController.listTutorBookings);
router.post('/learner/tutor-bookings', auth(), LearnerDashboardController.createTutorBooking);
router.post('/learner/tutor-bookings/export', auth(), LearnerDashboardController.exportTutorSchedule);
router.patch('/learner/tutor-bookings/:bookingId', auth(), LearnerDashboardController.updateTutorBooking);
router.post('/learner/tutor-bookings/:bookingId/cancel', auth(), LearnerDashboardController.cancelTutorBooking);
router.patch(
  '/learner/tutor-booking-requests/:bookingId',
  auth(),
  LearnerDashboardController.updateTutorBookingRequest
);
router.post(
  '/learner/tutor-booking-requests/:bookingId/cancel',
  auth(),
  LearnerDashboardController.cancelTutorBookingRequest
);
router.get('/learner/courses/progress', auth(), LearnerDashboardController.listCourseProgress);
router.post('/learner/courses/:courseId/goals', auth(), LearnerDashboardController.createCourseGoal);
router.post('/learner/ebooks/:ebookId/resume', auth(), LearnerDashboardController.resumeEbook);
router.post('/learner/ebooks/:ebookId/share', auth(), LearnerDashboardController.shareEbook);
router.post('/learner/ebooks', auth(), LearnerDashboardController.createLibraryEntry);
router.patch('/learner/ebooks/:ebookId', auth(), LearnerDashboardController.updateLibraryEntry);
router.delete('/learner/ebooks/:ebookId', auth(), LearnerDashboardController.deleteLibraryEntry);
router.post('/learner/financial/payment-methods', auth(), LearnerDashboardController.createPaymentMethod);
router.patch(
  '/learner/financial/payment-methods/:methodId',
  auth(),
  LearnerDashboardController.updatePaymentMethod
);
router.delete(
  '/learner/financial/payment-methods/:methodId',
  auth(),
  LearnerDashboardController.removePaymentMethod
);
router.delete(
  '/learner/financial/billing-contacts/:contactId',
  auth(),
  LearnerDashboardController.deleteBillingContact
);
router.get('/learner/financial/invoices/:invoiceId/download', auth(), LearnerDashboardController.downloadInvoice);
router.put('/learner/financial/preferences', auth(), LearnerDashboardController.updateBillingPreferences);
router.get('/learner/settings/system', auth(), LearnerDashboardController.getSystemPreferences);
router.put('/learner/settings/system', auth(), LearnerDashboardController.updateSystemPreferences);
router.get('/learner/settings/finance', auth(), LearnerDashboardController.getFinanceSettings);
router.put('/learner/settings/finance', auth(), LearnerDashboardController.updateFinanceSettings);
router.post('/learner/settings/finance/purchases', auth(), LearnerDashboardController.createFinancePurchase);
router.patch(
  '/learner/settings/finance/purchases/:purchaseId',
  auth(),
  LearnerDashboardController.updateFinancePurchase
);
router.delete(
  '/learner/settings/finance/purchases/:purchaseId',
  auth(),
  LearnerDashboardController.deleteFinancePurchase
);
router.post('/learner/growth/initiatives', auth(), LearnerDashboardController.createGrowthInitiative);
router.patch(
  '/learner/growth/initiatives/:initiativeId',
  auth(),
  LearnerDashboardController.updateGrowthInitiative
);
router.delete(
  '/learner/growth/initiatives/:initiativeId',
  auth(),
  LearnerDashboardController.deleteGrowthInitiative
);
router.post(
  '/learner/growth/initiatives/:initiativeId/experiments',
  auth(),
  LearnerDashboardController.createGrowthExperiment
);
router.patch(
  '/learner/growth/initiatives/:initiativeId/experiments/:experimentId',
  auth(),
  LearnerDashboardController.updateGrowthExperiment
);
router.delete(
  '/learner/growth/initiatives/:initiativeId/experiments/:experimentId',
  auth(),
  LearnerDashboardController.deleteGrowthExperiment
);
router.post('/learner/affiliate/channels', auth(), LearnerDashboardController.createAffiliateChannel);
router.patch(
  '/learner/affiliate/channels/:channelId',
  auth(),
  LearnerDashboardController.updateAffiliateChannel
);
router.delete(
  '/learner/affiliate/channels/:channelId',
  auth(),
  LearnerDashboardController.deleteAffiliateChannel
);
router.post(
  '/learner/affiliate/channels/:channelId/payouts',
  auth(),
  LearnerDashboardController.recordAffiliatePayout
);
router.post('/learner/ads/campaigns', auth(), LearnerDashboardController.createAdCampaign);
router.patch('/learner/ads/campaigns/:campaignId', auth(), LearnerDashboardController.updateAdCampaign);
router.delete('/learner/ads/campaigns/:campaignId', auth(), LearnerDashboardController.deleteAdCampaign);
router.get('/learner/teach/application', auth(), LearnerDashboardController.getInstructorApplication);
router.put('/learner/teach/application', auth(), LearnerDashboardController.saveInstructorApplication);
router.post('/learner/teach/application/submit', auth(), LearnerDashboardController.submitInstructorApplication);
router.post('/learner/live-sessions/:sessionId/join', auth(), LearnerDashboardController.joinLiveSession);
router.post('/learner/live-sessions/:sessionId/check-in', auth(), LearnerDashboardController.checkInToLiveSession);
router.post('/learner/communities/:communityId/actions', auth(), LearnerDashboardController.triggerCommunityAction);
router.post('/learner/field-services/assignments', auth(), LearnerDashboardController.createFieldServiceAssignment);
router.patch(
  '/learner/field-services/assignments/:assignmentId',
  auth(),
  LearnerDashboardController.updateFieldServiceAssignment
);
router.post(
  '/learner/field-services/assignments/:assignmentId/close',
  auth(),
  LearnerDashboardController.closeFieldServiceAssignment
);
router.get('/learner/support/tickets', auth(), LearnerDashboardController.listSupportTickets);
router.post('/learner/support/tickets', auth(), LearnerDashboardController.createSupportTicket);
router.put('/learner/support/tickets/:ticketId', auth(), LearnerDashboardController.updateSupportTicket);
router.post('/learner/support/tickets/:ticketId/messages', auth(), LearnerDashboardController.replyToSupportTicket);
router.post('/learner/support/tickets/:ticketId/close', auth(), LearnerDashboardController.closeSupportTicket);

export default router;

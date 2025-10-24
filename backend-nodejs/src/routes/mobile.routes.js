import MobileBillingController from '../controllers/MobileBillingController.js';
import MobileCommunicationController from '../controllers/MobileCommunicationController.js';
import MobileInstructorController from '../controllers/MobileInstructorController.js';
import MobileLearningController from '../controllers/MobileLearningController.js';
import MobileSupportController from '../controllers/MobileSupportController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/billing/snapshot', auth(), MobileBillingController.snapshot);
router.post('/billing/purchases', auth(), MobileBillingController.recordPurchase);
router.post('/billing/cancel', auth(), MobileBillingController.cancelSubscription);

router.get('/communications/inbox', auth(), MobileCommunicationController.inbox);
router.post(
  '/communications/threads/:threadId/messages',
  auth(),
  MobileCommunicationController.sendMessage
);
router.post(
  '/communications/threads/:threadId/read',
  auth(),
  MobileCommunicationController.markRead
);

router.post('/support/tickets', auth(), MobileSupportController.createTicket);

router.get('/learning/offline', auth(), MobileLearningController.snapshot);
router.post('/learning/downloads', auth(), MobileLearningController.recordDownload);
router.patch('/learning/downloads/:assetId', auth(), MobileLearningController.updateDownload);
router.post('/learning/assessments', auth(), MobileLearningController.queueAssessment);
router.patch(
  '/learning/assessments/:submissionId',
  auth(),
  MobileLearningController.updateAssessment
);
router.post('/learning/modules/snapshots', auth(), MobileLearningController.recordModuleSnapshot);

router.get('/instructor/actions', auth('instructor'), MobileInstructorController.list);
router.post('/instructor/actions', auth('instructor'), MobileInstructorController.enqueue);
router.patch(
  '/instructor/actions/:clientActionId',
  auth('instructor'),
  MobileInstructorController.update
);
router.delete(
  '/instructor/actions/:clientActionId',
  auth('instructor'),
  MobileInstructorController.clear
);

export default router;

import MobileBillingController from '../controllers/MobileBillingController.js';
import MobileCommunicationController from '../controllers/MobileCommunicationController.js';
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

export default router;

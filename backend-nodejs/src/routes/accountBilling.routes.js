import AccountBillingController from '../controllers/AccountBillingController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/overview', auth(), AccountBillingController.getOverview);
router.get('/payment-methods', auth(), AccountBillingController.listPaymentMethods);
router.get('/invoices', auth(), AccountBillingController.listInvoices);
router.post('/portal-sessions', auth(), AccountBillingController.createPortalSession);

export default router;

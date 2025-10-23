import PaymentController from '../controllers/PaymentController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.post('/', auth(), PaymentController.createIntent);
router.post('/checkout', auth(), PaymentController.createCheckoutSession);
router.post('/paypal/:paymentId/capture', auth(), PaymentController.capturePayPal);
router.post('/:paymentId/refunds', auth('admin'), PaymentController.issueRefund);
router.get('/reports/summary', auth('admin'), PaymentController.getSummary);
router.get('/coupons/:code', auth(), PaymentController.getCoupon);
router.post('/webhooks/stripe', PaymentController.handleStripeWebhook);

export default router;

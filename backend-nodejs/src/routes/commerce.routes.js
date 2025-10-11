import { Router } from 'express';

import PaymentController from '../controllers/PaymentController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/orders', auth(), PaymentController.createOrder);
router.post('/orders/:orderNumber/capture', auth('admin'), PaymentController.capture);
router.post('/orders/:orderNumber/refunds', auth('admin'), PaymentController.refund);
router.post('/webhooks/stripe', PaymentController.stripeWebhook);
router.post('/webhooks/paypal', PaymentController.paypalWebhook);

export default router;

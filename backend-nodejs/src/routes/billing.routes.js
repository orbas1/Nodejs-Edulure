import BillingController from '../controllers/BillingController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/catalog', auth(), BillingController.listCatalog);
router.post('/receipts/validate', auth(), BillingController.validateReceipt);

export default router;


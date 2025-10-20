import EbookController from '../controllers/EbookController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/catalogue', auth('instructor'), EbookController.catalogue);
router.post('/', auth('instructor'), EbookController.create);
router.patch('/:ebookId', auth('instructor'), EbookController.update);
router.post('/:ebookId/state', auth('instructor'), EbookController.updatePublicationState);
router.post('/:ebookId/purchase-intent', auth(), EbookController.purchaseIntent);
router.get('/', EbookController.marketplace);
router.get('/slug/:slug', EbookController.detail);

export default router;

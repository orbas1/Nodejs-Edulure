import RuntimeConfigController from '../controllers/RuntimeConfigController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET'] });

router.get('/public', RuntimeConfigController.publicSnapshot);
router.get('/user', auth(), RuntimeConfigController.userSnapshot);
router.get('/snapshot', auth('admin'), RuntimeConfigController.snapshot);
router.get('/manifest', RuntimeConfigController.capabilityManifest);

export default router;

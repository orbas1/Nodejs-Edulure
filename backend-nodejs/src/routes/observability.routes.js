import ObservabilityController from '../controllers/ObservabilityController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET'] });

router.get('/slos', auth('admin'), ObservabilityController.sloSnapshots);
router.get('/slos/:sloId', auth('admin'), ObservabilityController.sloDetail);

export default router;

import EnvironmentParityController from '../controllers/EnvironmentParityController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET'] });

router.get('/environment/health', auth('admin'), EnvironmentParityController.health);

export default router;

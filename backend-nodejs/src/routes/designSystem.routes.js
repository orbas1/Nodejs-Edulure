import DesignSystemController from '../controllers/DesignSystemController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/tokens', DesignSystemController.describe);

export default router;

import DesignSystemController from '../controllers/DesignSystemController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/system/assets', DesignSystemController.describeAssets);

export default router;

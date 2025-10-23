import AcquisitionController from '../controllers/AcquisitionController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/plans', AcquisitionController.listPlans);

export default router;

import auth from '../middleware/auth.js';
import OperatorSupportController from '../controllers/OperatorSupportController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.use(auth('admin'));

router.get('/support/overview', OperatorSupportController.overview);
router.get('/support/tenants', OperatorSupportController.listTenants);

export default router;

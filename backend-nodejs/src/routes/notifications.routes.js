import NotificationsController from '../controllers/NotificationsController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/preferences', auth(), NotificationsController.getPreferences);
router.put('/preferences', auth(), NotificationsController.updatePreferences);
router.post('/devices', auth(), NotificationsController.registerDevice);

export default router;


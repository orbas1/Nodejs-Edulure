import MobileInboxController from '../controllers/MobileInboxController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/threads', auth(), MobileInboxController.listThreads);
router.post('/threads/:threadId/messages', auth(), MobileInboxController.createMessage);

export default router;


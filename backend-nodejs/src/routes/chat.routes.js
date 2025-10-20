import DirectMessageController from '../controllers/DirectMessageController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/threads', auth(), DirectMessageController.listThreads);
router.post('/threads', auth(), DirectMessageController.createThread);
router.get('/threads/:threadId/messages', auth(), DirectMessageController.listMessages);
router.post('/threads/:threadId/messages', auth(), DirectMessageController.sendMessage);
router.post('/threads/:threadId/read', auth(), DirectMessageController.markRead);

export default router;

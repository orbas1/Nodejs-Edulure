import { Router } from 'express';

import DirectMessageController from '../controllers/DirectMessageController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/threads', auth(), DirectMessageController.listThreads);
router.post('/threads', auth(), DirectMessageController.createThread);
router.get('/threads/:threadId/messages', auth(), DirectMessageController.listMessages);
router.post('/threads/:threadId/messages', auth(), DirectMessageController.sendMessage);
router.post('/threads/:threadId/read', auth(), DirectMessageController.markRead);

export default router;

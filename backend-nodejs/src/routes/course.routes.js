import CourseController from '../controllers/CourseController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/:courseId/player', auth(), CourseController.playerSession);
router.get('/:courseId/live', auth(), CourseController.liveStatus);
router.get('/:courseId/live/chat', auth(), CourseController.listLiveChat);
router.post('/:courseId/live/chat', auth(), CourseController.postLiveChat);

export default router;


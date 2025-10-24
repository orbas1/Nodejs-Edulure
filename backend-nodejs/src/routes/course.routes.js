import CourseController from '../controllers/CourseController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/:courseId/player', auth(), CourseController.playerSession);
router.get('/:courseId/offline/manifests', auth(), CourseController.listOfflineManifests);
router.get('/:courseId/offline/progress', auth(), CourseController.listOfflineProgress);
router.post('/:courseId/offline/progress', auth(), CourseController.enqueueOfflineProgress);
router.patch('/:courseId/offline/progress/:taskId', auth(), CourseController.updateOfflineProgress);
router.get('/:courseId/live', auth(), CourseController.liveStatus);
router.get('/:courseId/live/chat', auth(), CourseController.listLiveChat);
router.post('/:courseId/live/chat', auth(), CourseController.postLiveChat);

export default router;


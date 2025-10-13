import { Router } from 'express';

import CourseController from '../controllers/CourseController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/:courseId/player', auth(), CourseController.playerSession);
router.get('/:courseId/live', auth(), CourseController.liveStatus);
router.get('/:courseId/live/chat', auth(), CourseController.listLiveChat);
router.post('/:courseId/live/chat', auth(), CourseController.postLiveChat);

export default router;


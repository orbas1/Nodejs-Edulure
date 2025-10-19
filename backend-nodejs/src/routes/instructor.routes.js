import { Router } from 'express';

import InstructorOrchestrationController from '../controllers/InstructorOrchestrationController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post(
  '/orchestration/course-outline',
  auth('instructor'),
  InstructorOrchestrationController.generateCourseOutline
);
router.post(
  '/orchestration/notion-import',
  auth('instructor'),
  InstructorOrchestrationController.importFromNotion
);
router.post('/orchestration/lms-sync', auth('instructor'), InstructorOrchestrationController.syncFromLms);
router.post(
  '/orchestration/tutor-routing',
  auth('instructor'),
  InstructorOrchestrationController.routeTutorRequest
);
router.post('/orchestration/mentor-invite', auth('instructor'), InstructorOrchestrationController.sendMentorInvite);
router.post('/orchestration/pricing-export', auth('instructor'), InstructorOrchestrationController.exportPricing);

export default router;

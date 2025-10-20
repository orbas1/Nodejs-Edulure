import { Router } from 'express';

import InstructorBookingController from '../controllers/InstructorBookingController.js';
import InstructorOrchestrationController from '../controllers/InstructorOrchestrationController.js';
import InstructorSchedulingController from '../controllers/InstructorSchedulingController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/bookings', auth('instructor'), InstructorBookingController.list);
router.post('/bookings', auth('instructor'), InstructorBookingController.create);
router.patch('/bookings/:bookingId', auth('instructor'), InstructorBookingController.update);
router.delete('/bookings/:bookingId', auth('instructor'), InstructorBookingController.cancel);

router.get('/roster', auth('instructor'), InstructorSchedulingController.list);
router.post('/roster', auth('instructor'), InstructorSchedulingController.create);
router.patch('/roster/:slotId', auth('instructor'), InstructorSchedulingController.update);
router.delete('/roster/:slotId', auth('instructor'), InstructorSchedulingController.remove);

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

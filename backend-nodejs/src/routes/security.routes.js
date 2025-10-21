import auth from '../middleware/auth.js';
import SecurityOperationsController from '../controllers/SecurityOperationsController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.use(auth('admin'));

router.get('/risk-register', SecurityOperationsController.listRiskRegister);
router.post('/risk-register', SecurityOperationsController.createRiskEntry);
router.patch('/risk-register/:riskId/status', SecurityOperationsController.updateRiskStatus);
router.delete('/risk-register/:riskId', SecurityOperationsController.deleteRisk);
router.post('/risk-register/:riskId/reviews', SecurityOperationsController.recordRiskReview);

router.get('/audit-evidence', SecurityOperationsController.listAuditEvidence);
router.post('/audit-evidence', SecurityOperationsController.recordAuditEvidence);

router.get('/continuity/exercises', SecurityOperationsController.listContinuityExercises);
router.post('/continuity/exercises', SecurityOperationsController.logContinuityExercise);

router.get('/assessments', SecurityOperationsController.listAssessments);
router.post('/assessments', SecurityOperationsController.scheduleAssessment);

export default router;

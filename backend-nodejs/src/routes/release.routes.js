import ReleaseManagementController from '../controllers/ReleaseManagementController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/checklist', auth('admin'), ReleaseManagementController.getChecklist);
router.post('/runs', auth('admin'), ReleaseManagementController.scheduleRun);
router.get('/runs', auth('admin'), ReleaseManagementController.listRuns);
router.get('/runs/:publicId', auth('admin'), ReleaseManagementController.getRun);
router.post(
  '/runs/:publicId/gates/:gateKey/evaluations',
  auth('admin'),
  ReleaseManagementController.recordGateEvaluation
);
router.post('/runs/:publicId/evaluate', auth('admin'), ReleaseManagementController.evaluateRun);
router.get('/dashboard', auth('admin'), ReleaseManagementController.getDashboard);

export default router;

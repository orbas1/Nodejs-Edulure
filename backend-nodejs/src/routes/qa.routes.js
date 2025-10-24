import QaReadinessController from '../controllers/QaReadinessController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/surfaces', QaReadinessController.listSurfaces);
router.get('/surfaces/:slug', QaReadinessController.getSurface);
router.get('/checklists', QaReadinessController.listChecklists);
router.get('/checklists/:slug', QaReadinessController.getChecklist);
router.get('/fixtures', QaReadinessController.listFixtureSets);
router.get('/sandboxes', QaReadinessController.listSandboxes);
router.post('/coverage', QaReadinessController.recordCoverage);

export default router;

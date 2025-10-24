import CatalogueController from '../controllers/CatalogueController.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter({ allowedMethods: ['GET'] });

router.get('/live-classrooms', CatalogueController.listLiveClassrooms);
router.get('/courses', CatalogueController.listCourses);
router.get('/tutors', CatalogueController.listTutors);
router.get('/filters', CatalogueController.listFilters);

export default router;

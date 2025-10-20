import { Router } from 'express';

import CatalogueController from '../controllers/CatalogueController.js';

const router = Router();

router.get('/live-classrooms', CatalogueController.listLiveClassrooms);
router.get('/courses', CatalogueController.listCourses);
router.get('/tutors', CatalogueController.listTutors);

export default router;

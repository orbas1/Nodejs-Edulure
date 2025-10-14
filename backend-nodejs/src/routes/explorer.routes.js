import { Router } from 'express';

import ExplorerController from '../controllers/ExplorerController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/search', auth('user'), ExplorerController.search);
router.get('/saved-searches', auth(), ExplorerController.listSavedSearches);
router.get('/saved-searches/:savedSearchId', auth(), ExplorerController.getSavedSearch);
router.post('/saved-searches', auth(), ExplorerController.createSavedSearch);
router.patch('/saved-searches/:savedSearchId', auth(), ExplorerController.updateSavedSearch);
router.delete('/saved-searches/:savedSearchId', auth(), ExplorerController.deleteSavedSearch);

export default router;

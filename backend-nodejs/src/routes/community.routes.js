import { Router } from 'express';

import CommunityController from '../controllers/CommunityController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth(), CommunityController.listForUser);
router.get('/feed', auth(), CommunityController.listUserFeed);
router.post('/', auth('instructor'), CommunityController.create);
router.get('/:communityId', auth(), CommunityController.getDetail);
router.get('/:communityId/posts', auth(), CommunityController.listFeed);
router.post('/:communityId/posts', auth(), CommunityController.createPost);
router.get('/:communityId/resources', auth(), CommunityController.listResources);
router.post('/:communityId/resources', auth(), CommunityController.createResource);

export default router;

import { Router } from 'express';

import SocialGraphController from '../controllers/SocialGraphController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/followers', auth(), SocialGraphController.listFollowers);
router.get('/users/:userId/followers', auth(), SocialGraphController.listFollowers);
router.get('/following', auth(), SocialGraphController.listFollowing);
router.get('/users/:userId/following', auth(), SocialGraphController.listFollowing);
router.get('/recommendations', auth(), SocialGraphController.listRecommendations);
router.get('/mutes', auth(), SocialGraphController.listMutes);
router.get('/blocks', auth(), SocialGraphController.listBlocks);

router.post('/follows/:userId', auth(), SocialGraphController.follow);
router.delete('/follows/:userId', auth(), SocialGraphController.unfollow);
router.post(
  '/users/:userId/followers/:followerId/approve',
  auth(),
  SocialGraphController.approveFollow
);
router.post(
  '/users/:userId/followers/:followerId/decline',
  auth(),
  SocialGraphController.declineFollow
);
router.delete(
  '/users/:userId/followers/:followerId',
  auth(),
  SocialGraphController.removeFollower
);

router.get('/privacy', auth(), SocialGraphController.getPrivacy);
router.get('/users/:userId/privacy', auth(), SocialGraphController.getPrivacy);
router.put('/privacy', auth(), SocialGraphController.updatePrivacy);
router.put('/users/:userId/privacy', auth(), SocialGraphController.updatePrivacy);

router.post('/mutes/:userId', auth(), SocialGraphController.muteUser);
router.delete('/mutes/:userId', auth(), SocialGraphController.unmuteUser);
router.post('/blocks/:userId', auth(), SocialGraphController.blockUser);
router.delete('/blocks/:userId', auth(), SocialGraphController.unblockUser);

export default router;

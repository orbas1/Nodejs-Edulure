import FeedController from '../controllers/FeedController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/', auth('user'), FeedController.getFeed);
router.get('/analytics', auth('user'), FeedController.getAnalytics);
router.get('/placements', auth('user'), FeedController.getPlacements);
router.post('/:postId/reactions', auth('user'), FeedController.toggleReaction);

export default router;

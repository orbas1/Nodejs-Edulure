import UserController from '../controllers/UserController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/me', auth(), UserController.me);
router.put('/me', auth(), UserController.updateMe);
router.get('/', auth('admin'), UserController.list);
router.post('/', auth('admin'), UserController.create);
router.patch('/:userId', auth('admin'), UserController.updateUser);
router.delete('/:userId', auth('admin'), UserController.removeUser);

export default router;

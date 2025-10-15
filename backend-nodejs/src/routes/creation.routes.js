import { Router } from 'express';

import CreationStudioController from '../controllers/CreationStudioController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/projects', auth('user'), CreationStudioController.listProjects);
router.post('/projects', auth('instructor'), CreationStudioController.createProject);
router.get('/projects/:projectId', auth('user'), CreationStudioController.getProject);
router.patch('/projects/:projectId', auth('instructor'), CreationStudioController.updateProject);

router.post('/projects/:projectId/collaborators', auth('instructor'), CreationStudioController.addCollaborator);
router.delete(
  '/projects/:projectId/collaborators/:userId',
  auth('instructor'),
  CreationStudioController.removeCollaborator
);

router.post('/projects/:projectId/sessions', auth('user'), CreationStudioController.startSession);
router.post(
  '/projects/:projectId/sessions/:sessionId/end',
  auth('user'),
  CreationStudioController.endSession
);

router.post('/projects/:projectId/promote', auth('instructor'), CreationStudioController.promoteToCampaign);

router.get('/templates', auth('user'), CreationStudioController.listTemplates);
router.post('/templates', auth('instructor'), CreationStudioController.createTemplate);
router.patch('/templates/:templateId', auth('instructor'), CreationStudioController.updateTemplate);

export default router;


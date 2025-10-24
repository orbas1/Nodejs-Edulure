import CreationStudioController from '../controllers/CreationStudioController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.use((req, _res, next) => {
  req.registerDomainEventDefaults?.({
    entityType: 'creation-studio-route',
    payload: {
      route: {
        namespace: 'creation-studio',
        baseUrl: req.baseUrl ?? null,
        method: req.method
      }
    }
  });
  next();
});

router.param('projectId', (req, _res, next, projectId) => {
  req.registerDomainEventDefaults?.(() => ({
    entityType: 'creation-project',
    entityId: projectId,
    payload: {
      route: {
        projectId
      }
    }
  }));
  next();
});

router.param('templateId', (req, _res, next, templateId) => {
  req.registerDomainEventDefaults?.(() => ({
    entityType: 'creation-template',
    entityId: templateId,
    payload: {
      route: {
        templateId
      }
    }
  }));
  next();
});

router.get('/projects', auth('user'), CreationStudioController.listProjects);
router.get('/analytics/summary', auth('user'), CreationStudioController.analyticsSummary);
router.get('/recommendations', auth('user'), CreationStudioController.recommendations);
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


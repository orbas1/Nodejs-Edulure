import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn()
  },
  trx: {
    fn: { now: () => new Date().toISOString() }
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  projectModel: {
    create: vi.fn(),
    findByPublicId: vi.fn(),
    list: vi.fn(),
    count: vi.fn(),
    updateById: vi.fn(),
    insertVersion: vi.fn(),
    latestVersion: vi.fn()
  },
  templateModel: {
    findByPublicId: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    list: vi.fn()
  },
  collaboratorModel: {
    add: vi.fn(),
    remove: vi.fn(),
    listByProject: vi.fn(),
    listActiveProjectIdsForUser: vi.fn(),
    findByProjectAndUser: vi.fn()
  },
  sessionModel: {
    findActiveByParticipant: vi.fn(),
    create: vi.fn(),
    markHeartbeat: vi.fn(),
    endSession: vi.fn(),
    findByPublicId: vi.fn(),
    listActiveByProject: vi.fn()
  },
  domainEventModel: {
    record: vi.fn()
  },
  adsCampaignModel: {
    create: vi.fn()
  }
}));

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => mocks.logger
  }
}));

vi.mock('../src/models/CreationProjectModel.js', () => ({
  default: mocks.projectModel
}));

vi.mock('../src/models/CreationTemplateModel.js', () => ({
  default: mocks.templateModel
}));

vi.mock('../src/models/CreationProjectCollaboratorModel.js', () => ({
  default: mocks.collaboratorModel
}));

vi.mock('../src/models/CreationCollaborationSessionModel.js', () => ({
  default: mocks.sessionModel
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: mocks.domainEventModel
}));

vi.mock('../src/models/AdsCampaignModel.js', () => ({
  default: mocks.adsCampaignModel
}));

const {
  db,
  trx,
  projectModel,
  templateModel,
  collaboratorModel,
  sessionModel,
  domainEventModel,
  adsCampaignModel
} = mocks;

import CreationStudioService from '../src/services/CreationStudioService.js';

describe('CreationStudioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) => handler(trx));
    collaboratorModel.listActiveProjectIdsForUser.mockResolvedValue([101]);
    projectModel.list.mockResolvedValue([]);
    projectModel.count.mockResolvedValue(0);
    collaboratorModel.listByProject.mockResolvedValue([]);
    projectModel.latestVersion.mockResolvedValue(null);
    sessionModel.listActiveByProject.mockResolvedValue([]);
  });

  describe('createProject', () => {
    it('applies template defaults, persists project, and records initial version', async () => {
      templateModel.findByPublicId.mockResolvedValue({
        publicId: 'tmpl-1',
        schema: {
          outline: [{ id: 'section-1', label: 'Intro' }],
          defaults: { difficulty: 'intermediate' },
          analyticsTargets: { keywords: ['marketing'] },
          publishingChannels: ['web', 'mobile'],
          summaryTemplate: 'Template summary'
        }
      });

      const createdProject = {
        id: 401,
        publicId: 'proj-401',
        ownerId: 7,
        type: 'course',
        status: 'draft',
        title: 'Marketing foundations',
        summary: 'Template summary',
        metadata: { difficulty: 'intermediate' },
        contentOutline: [{ id: 'section-1', label: 'Intro' }],
        analyticsTargets: { keywords: ['marketing'] },
        publishingChannels: ['web', 'mobile'],
        complianceNotes: []
      };

      projectModel.create.mockResolvedValue(createdProject);
      collaboratorModel.add.mockResolvedValue({
        userId: 7,
        role: 'owner',
        permissions: ['project:edit']
      });

      collaboratorModel.listByProject.mockResolvedValue([
        { userId: 7, role: 'owner', permissions: ['project:edit'] }
      ]);

      const project = await CreationStudioService.createProject(
        { id: 7, role: 'instructor' },
        {
          title: 'Marketing foundations',
          type: 'course',
          templateId: 'tmpl-1'
        }
      );

      expect(projectModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            difficulty: 'intermediate',
            objectives: expect.any(Array)
          }),
          publishingChannels: expect.arrayContaining(['web', 'mobile', 'catalogue'])
        }),
        trx
      );
      expect(collaboratorModel.add).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 401, userId: 7, role: 'owner' }),
        trx
      );
      expect(projectModel.insertVersion).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 401, versionNumber: 1 }),
        trx
      );
      expect(domainEventModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'creation.project.created' }),
        trx
      );
      expect(project.collaborators).toHaveLength(1);
    });

    it('enriches non-course creations with domain defaults and analytics baselines', async () => {
      projectModel.create.mockImplementation(async (payload) => ({
        id: 777,
        publicId: 'proj-777',
        ownerId: payload.ownerId,
        type: payload.type,
        status: 'draft',
        title: payload.title,
        summary: payload.summary ?? null,
        metadata: payload.metadata,
        contentOutline: payload.contentOutline ?? [],
        analyticsTargets: payload.analyticsTargets,
        publishingChannels: payload.publishingChannels ?? [],
        complianceNotes: payload.complianceNotes ?? []
      }));
      const ownerPermissions = [
        'project:read',
        'project:edit',
        'project:submit',
        'project:approve',
        'project:publish',
        'collaboration:manage',
        'session:start',
        'ads:draft'
      ];
      collaboratorModel.add.mockResolvedValue({ userId: 12, role: 'owner', permissions: ownerPermissions });
      collaboratorModel.listByProject.mockResolvedValue([{ userId: 12, role: 'owner', permissions: ownerPermissions }]);

      const project = await CreationStudioService.createProject(
        { id: 12, role: 'instructor' },
        {
          title: 'Mentor-in-residence',
          type: 'mentorship',
          summary: 'Connect alumni mentors with early cohorts.',
          metadata: { engagement: { cadence: 'weekly', deliveryModes: ['virtual', 'hybrid'] } },
          analyticsTargets: { goals: ['community-growth'] }
        }
      );

      expect(projectModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mentorship',
          metadata: expect.objectContaining({
            engagement: expect.objectContaining({ cadence: 'weekly', deliveryModes: ['virtual', 'hybrid'] }),
            mentors: expect.any(Array),
            mentees: expect.objectContaining({ cohortSize: 0 })
          }),
          analyticsTargets: expect.objectContaining({
            goals: ['community-growth'],
            keywords: expect.arrayContaining(['mentor']),
            audiences: expect.arrayContaining(['alumni'])
          }),
          publishingChannels: expect.arrayContaining(['mentorship_hub', 'community'])
        }),
        trx
      );

      expect(project.metadata.mentors).toEqual([]);
      expect(project.analyticsTargets.keywords).toContain('mentor');
      expect(project.collaborators).toHaveLength(1);
    });
  });

  describe('updateProject', () => {
    it('enforces status transitions and records version diff', async () => {
      projectModel.findByPublicId.mockResolvedValue({
        id: 501,
        publicId: 'proj-501',
        ownerId: 9,
        status: 'draft',
        type: 'course',
        title: 'Creator academy',
        metadata: {},
        analyticsTargets: {},
        publishingChannels: [],
        complianceNotes: []
      });
      collaboratorModel.findByProjectAndUser.mockResolvedValue({
        role: 'owner',
        permissions: ['project:edit', 'project:submit', 'project:publish']
      });
      const updatedProject = {
        id: 501,
        publicId: 'proj-501',
        ownerId: 9,
        status: 'ready_for_review',
        type: 'course',
        title: 'Creator academy',
        metadata: {},
        analyticsTargets: {},
        publishingChannels: [],
        complianceNotes: []
      };
      projectModel.updateById.mockResolvedValue(updatedProject);
      projectModel.latestVersion.mockResolvedValue({ versionNumber: 1 });
      collaboratorModel.listByProject.mockResolvedValue([
        { userId: 9, role: 'owner', permissions: ['project:edit'] }
      ]);

      const project = await CreationStudioService.updateProject('proj-501', { id: 9, role: 'instructor' }, {
        status: 'ready_for_review'
      });

      expect(projectModel.updateById).toHaveBeenCalledWith(
        501,
        expect.objectContaining({ status: 'ready_for_review' }),
        trx
      );
      expect(projectModel.insertVersion).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 501, versionNumber: 2 }),
        trx
      );
      expect(domainEventModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'creation.project.updated' }),
        trx
      );
      expect(project.status).toBe('ready_for_review');
    });
  });

  describe('promoteProjectToAdsCampaign', () => {
    it('creates ads campaign drafts when collaborator has permission', async () => {
      projectModel.findByPublicId.mockResolvedValue({
        id: 601,
        publicId: 'proj-601',
        ownerId: 11,
        title: 'Live community launch',
        status: 'approved',
        type: 'community',
        summary: 'Launch plan',
        metadata: { landingPage: 'https://edulure.test/campaigns/launch' },
        analyticsTargets: { keywords: ['community'], audiences: ['Creators'] }
      });
      collaboratorModel.findByProjectAndUser.mockResolvedValue({
        role: 'editor',
        permissions: ['ads:draft', 'project:edit']
      });
      adsCampaignModel.create.mockResolvedValue({
        id: 1,
        publicId: 'camp-1',
        name: 'Live community launch campaign'
      });

      const campaign = await CreationStudioService.promoteProjectToAdsCampaign(
        'proj-601',
        { id: 11, role: 'instructor' },
        {
          creative: { url: 'https://edulure.test/campaigns/launch' },
          budget: { currency: 'USD', dailyCents: 4000 }
        }
      );

      expect(adsCampaignModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 11,
          metadata: expect.objectContaining({ sourceProjectId: 'proj-601' })
        })
      );
      expect(domainEventModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'creation.project.promoted_to_campaign' })
      );
      expect(campaign.publicId).toBe('camp-1');
    });
  });
});


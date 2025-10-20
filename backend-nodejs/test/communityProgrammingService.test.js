import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityProgrammingService from '../src/services/CommunityProgrammingService.js';

const transactionSpy = vi.hoisted(() => vi.fn(async (handler) => handler({}))); 

const communityModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findBySlug: vi.fn()
}));

const communityMemberModelMock = vi.hoisted(() => ({
  findMembership: vi.fn()
}));

const communityWebinarModelMock = vi.hoisted(() => ({
  listForCommunity: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}));

const communityPodcastEpisodeModelMock = vi.hoisted(() => ({
  listForCommunity: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}));

const communityGrowthExperimentModelMock = vi.hoisted(() => ({
  listForCommunity: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));

vi.mock('../src/models/CommunityModel.js', () => ({
  default: communityModelMock
}));

vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: communityMemberModelMock
}));

vi.mock('../src/models/CommunityWebinarModel.js', () => ({
  default: communityWebinarModelMock
}));

vi.mock('../src/models/CommunityPodcastEpisodeModel.js', () => ({
  default: communityPodcastEpisodeModelMock
}));

vi.mock('../src/models/CommunityGrowthExperimentModel.js', () => ({
  default: communityGrowthExperimentModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

const communityRecord = {
  id: 42,
  name: 'Learning Ops Guild',
  slug: 'learning-ops-guild',
  visibility: 'private'
};

const resetMocks = () => {
  transactionSpy.mockClear();
  [
    communityModelMock,
    communityMemberModelMock,
    communityWebinarModelMock,
    communityPodcastEpisodeModelMock,
    communityGrowthExperimentModelMock,
    domainEventModelMock
  ].forEach((mock) => {
    Object.values(mock).forEach((fn) => fn.mockReset());
  });
};

describe('CommunityProgrammingService', () => {
  beforeEach(() => {
    resetMocks();
    communityModelMock.findById.mockResolvedValue(communityRecord);
    communityModelMock.findBySlug.mockResolvedValue(null);
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin', status: 'active' });
  });

  describe('listWebinars', () => {
    it('returns webinars with permission flags when viewer is manager', async () => {
      communityWebinarModelMock.listForCommunity.mockResolvedValue([
        { id: 1, topic: 'Automation dry run', status: 'announced' }
      ]);

      const result = await CommunityProgrammingService.listWebinars('42', { id: 7, role: 'instructor' }, {});

      expect(communityWebinarModelMock.listForCommunity).toHaveBeenCalledWith(42, {
        status: undefined,
        search: undefined,
        order: undefined,
        limit: undefined,
        offset: undefined
      });
      expect(result).toEqual([
        expect.objectContaining({
          id: 1,
          topic: 'Automation dry run',
          permissions: { canEdit: true }
        })
      ]);
    });

    it('throws when community is private and user lacks membership', async () => {
      communityMemberModelMock.findMembership.mockResolvedValue(null);

      await expect(
        CommunityProgrammingService.listWebinars('42', { id: 99, role: 'instructor' }, {})
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('createWebinar', () => {
    it('persists webinar within a transaction and records domain event', async () => {
      const created = { id: 5, communityId: 42, topic: 'Launch rehearsal', status: 'announced' };
      communityWebinarModelMock.create.mockResolvedValue(created);

      const payload = {
        topic: 'Launch rehearsal',
        host: 'Ops Team',
        startAt: '2024-05-01T12:00:00Z',
        status: 'announced',
        registrantCount: 120
      };

      const result = await CommunityProgrammingService.createWebinar('42', { id: 7, role: 'instructor' }, payload);

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(communityWebinarModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 42,
          topic: 'Launch rehearsal',
          startAt: '2024-05-01T12:00:00Z',
          registrantCount: 120
        }),
        expect.any(Object)
      );
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'community_webinar',
          eventType: 'community.webinar.created',
          payload: expect.objectContaining({ topic: 'Launch rehearsal', status: 'announced' })
        }),
        expect.any(Object)
      );
      expect(result).toEqual(created);
    });
  });

  describe('updateWebinar', () => {
    it('updates the targeted webinar and records domain event', async () => {
      communityWebinarModelMock.findById.mockResolvedValue({
        id: 5,
        communityId: 42,
        topic: 'Launch rehearsal',
        status: 'draft'
      });
      communityWebinarModelMock.update.mockResolvedValue({
        id: 5,
        communityId: 42,
        topic: 'Launch rehearsal',
        status: 'live'
      });

      const result = await CommunityProgrammingService.updateWebinar(
        '42',
        5,
        { id: 7, role: 'instructor' },
        { status: 'live' }
      );

      expect(communityWebinarModelMock.update).toHaveBeenCalledWith(5, { status: 'live' });
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'community_webinar',
          entityId: 5,
          eventType: 'community.webinar.updated'
        })
      );
      expect(result.status).toBe('live');
    });
  });

  describe('deleteWebinar', () => {
    it('removes webinar and records audit event', async () => {
      communityWebinarModelMock.findById.mockResolvedValue({
        id: 8,
        communityId: 42,
        topic: 'Automation retro'
      });

      await CommunityProgrammingService.deleteWebinar('42', 8, { id: 7, role: 'instructor' });

      expect(communityWebinarModelMock.delete).toHaveBeenCalledWith(8);
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'community_webinar',
          entityId: 8,
          eventType: 'community.webinar.deleted'
        })
      );
    });
  });

  describe('createPodcastEpisode', () => {
    it('enforces permissions and records creation event', async () => {
      const createdEpisode = { id: 3, communityId: 42, title: 'Growth AMA', stage: 'recording' };
      communityPodcastEpisodeModelMock.create.mockResolvedValue(createdEpisode);

      const result = await CommunityProgrammingService.createPodcastEpisode(
        '42',
        { id: 7, role: 'instructor' },
        {
          title: 'Growth AMA',
          host: 'Kai Growth',
          stage: 'recording'
        }
      );

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(communityPodcastEpisodeModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ communityId: 42, title: 'Growth AMA', stage: 'recording' }),
        expect.any(Object)
      );
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'community_podcast_episode', eventType: 'community.podcast.episode.created' }),
        expect.any(Object)
      );
      expect(result).toEqual(createdEpisode);
    });
  });

  describe('createGrowthExperiment', () => {
    it('stores experiment details and emits lifecycle event', async () => {
      const createdExperiment = { id: 11, communityId: 42, title: 'Activation uplift', status: 'design' };
      communityGrowthExperimentModelMock.create.mockResolvedValue(createdExperiment);

      const result = await CommunityProgrammingService.createGrowthExperiment(
        '42',
        { id: 7, role: 'instructor' },
        {
          title: 'Activation uplift',
          status: 'design'
        }
      );

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(communityGrowthExperimentModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ communityId: 42, title: 'Activation uplift', status: 'design' }),
        expect.any(Object)
      );
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'community_growth_experiment',
          eventType: 'community.growth.experiment.created'
        }),
        expect.any(Object)
      );
      expect(result).toEqual(createdExperiment);
    });
  });
});

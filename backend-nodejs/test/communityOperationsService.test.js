import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityOperationsService from '../src/services/CommunityOperationsService.js';

const communityModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findBySlug: vi.fn()
}));

const communityMemberModelMock = vi.hoisted(() => ({
  findMembership: vi.fn()
}));

const communityResourceModelMock = vi.hoisted(() => ({
  create: vi.fn()
}));

const communityCaseModelMock = vi.hoisted(() => ({
  findByPublicId: vi.fn(),
  updateById: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

const communityEngagementServiceMock = vi.hoisted(() => ({
  createEvent: vi.fn()
}));

const communityMonetizationServiceMock = vi.hoisted(() => ({
  updateTier: vi.fn()
}));

vi.mock('../src/models/CommunityModel.js', () => ({
  default: communityModelMock
}));

vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: communityMemberModelMock
}));

vi.mock('../src/models/CommunityResourceModel.js', () => ({
  default: communityResourceModelMock
}));

vi.mock('../src/models/CommunityPostModerationCaseModel.js', () => ({
  default: communityCaseModelMock
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

vi.mock('../src/services/CommunityEngagementService.js', () => ({
  default: communityEngagementServiceMock
}));

vi.mock('../src/services/CommunityMonetizationService.js', () => ({
  default: communityMonetizationServiceMock
}));

describe('CommunityOperationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communityModelMock.findById.mockResolvedValue(null);
    communityModelMock.findBySlug.mockResolvedValue(null);
  });

  describe('publishRunbook', () => {
    it('creates a runbook resource and records a domain event', async () => {
      communityModelMock.findById.mockResolvedValue({ id: 42, metadata: '{}' });
      communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin' });
      communityResourceModelMock.create.mockResolvedValue({
        id: 99,
        communityId: 42,
        title: 'Launch checklist',
        description: 'How we launch operations runbooks',
        metadata: JSON.stringify({ owner: 'Ops Guild', automationReady: true }),
        tags: JSON.stringify(['automation']),
        linkUrl: 'https://runbooks.edulure.test/launch',
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
        createdByName: 'Ops Guild'
      });

      const runbook = await CommunityOperationsService.publishRunbook(42, 7, {
        title: 'Launch checklist',
        summary: 'How we launch operations runbooks',
        owner: 'Ops Guild',
        tags: ['automation'],
        automationReady: true,
        linkUrl: 'https://runbooks.edulure.test/launch'
      });

      expect(communityResourceModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 42,
          createdBy: 7,
          title: 'Launch checklist',
          metadata: expect.objectContaining({ owner: 'Ops Guild', automationReady: true })
        })
      );
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'community.runbook.published',
          payload: expect.objectContaining({ automationReady: true })
        })
      );
      expect(runbook).toEqual(
        expect.objectContaining({
          id: 99,
          title: 'Launch checklist',
          owner: 'Ops Guild',
          automationReady: true,
          tags: ['automation']
        })
      );
    });
  });

  describe('acknowledgeEscalation', () => {
    it('updates moderation case metadata and status', async () => {
      const existingMetadata = { operations: { acknowledgements: [] } };
      communityModelMock.findById.mockResolvedValue({ id: 42, metadata: '{}' });
      communityMemberModelMock.findMembership.mockResolvedValue({ role: 'moderator' });
      communityCaseModelMock.findByPublicId.mockResolvedValue({
        id: 12,
        communityId: 42,
        status: 'pending',
        metadata: JSON.stringify(existingMetadata),
        escalatedAt: null
      });
      communityCaseModelMock.updateById.mockResolvedValue({
        id: 12,
        status: 'in_review',
        metadata: {
          operations: {
            acknowledgements: [
              {
                acknowledgedBy: 7,
                acknowledgedAt: new Date().toISOString(),
                note: 'Taking point'
              }
            ]
          }
        }
      });

      const result = await CommunityOperationsService.acknowledgeEscalation(42, 7, 'case-1', {
        note: 'Taking point'
      });

      expect(communityCaseModelMock.updateById).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          status: 'in_review'
        })
      );
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'community.escalation.acknowledged',
          payload: expect.objectContaining({ caseId: 'case-1' })
        })
      );
      expect(result.status).toBe('in_review');
    });
  });

  describe('resolveIncident', () => {
    it('marks the incident resolved and records resolution metadata', async () => {
      communityModelMock.findById.mockResolvedValue({ id: 42, metadata: '{}' });
      communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin' });
      communityCaseModelMock.findByPublicId.mockResolvedValue({
        id: 33,
        communityId: 42,
        status: 'in_review',
        metadata: JSON.stringify({ operations: {} })
      });
      communityCaseModelMock.updateById.mockResolvedValue({
        id: 33,
        status: 'resolved',
        metadata: {
          operations: {
            resolution: {
              summary: 'Completed remediation',
              followUp: 'Share report',
              resolvedBy: 9,
              resolvedAt: new Date().toISOString()
            }
          }
        }
      });

      const result = await CommunityOperationsService.resolveIncident(42, 9, 'case-9', {
        resolutionSummary: 'Completed remediation',
        followUp: 'Share report'
      });

      expect(communityCaseModelMock.updateById).toHaveBeenCalledWith(
        33,
        expect.objectContaining({
          status: 'resolved',
          resolvedBy: 9
        })
      );
      expect(domainEventModelMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'community.safety.resolved',
          payload: expect.objectContaining({ caseId: 'case-9' })
        })
      );
      expect(result.status).toBe('resolved');
    });
  });

  describe('scheduleEvent', () => {
    it('delegates to the engagement service', async () => {
      const scheduled = { id: 1, title: 'Town hall' };
      communityEngagementServiceMock.createEvent.mockResolvedValue(scheduled);

      const result = await CommunityOperationsService.scheduleEvent(42, 7, {
        title: 'Town hall',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });

      expect(communityEngagementServiceMock.createEvent).toHaveBeenCalledWith(
        42,
        7,
        expect.objectContaining({ title: 'Town hall' })
      );
      expect(result).toBe(scheduled);
    });
  });

  describe('manageTier', () => {
    it('forwards update payload to monetisation service', async () => {
      communityMonetizationServiceMock.updateTier.mockResolvedValue({ id: 5, name: 'Premium' });

      const result = await CommunityOperationsService.manageTier(42, 7, 5, {
        isActive: false
      });

      expect(communityMonetizationServiceMock.updateTier).toHaveBeenCalledWith(42, 7, 5, {
        isActive: false
      });
      expect(result).toEqual({ id: 5, name: 'Premium' });
    });
  });
});

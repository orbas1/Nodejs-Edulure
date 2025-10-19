import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: {}
}));

const loggerChildMock = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
vi.mock('../src/config/logger.js', () => ({
  default: {
    child: vi.fn(() => loggerChildMock)
  }
}));

const announcementModelMock = {
  listActive: vi.fn(),
  findBySlug: vi.fn()
};

const resourceModelMock = {
  forAnnouncement: vi.fn()
};

const timelineModelMock = {
  forAnnouncement: vi.fn()
};

const acknowledgementModelMock = {
  countForAnnouncement: vi.fn(),
  upsertForContact: vi.fn()
};

const statusUpdateModelMock = {
  recentForAnnouncement: vi.fn(),
  record: vi.fn()
};

vi.mock('../src/models/ProviderTransitionAnnouncementModel.js', () => ({
  default: announcementModelMock
}));

vi.mock('../src/models/ProviderTransitionResourceModel.js', () => ({
  default: resourceModelMock
}));

vi.mock('../src/models/ProviderTransitionTimelineEntryModel.js', () => ({
  default: timelineModelMock
}));

vi.mock('../src/models/ProviderTransitionAcknowledgementModel.js', () => ({
  default: acknowledgementModelMock
}));

vi.mock('../src/models/ProviderTransitionStatusUpdateModel.js', () => ({
  default: statusUpdateModelMock
}));

import ProviderTransitionService from '../src/services/ProviderTransitionService.js';

const now = new Date('2024-11-18T12:00:00Z');

describe('ProviderTransitionService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProviderTransitionService({
      nowProvider: () => now,
      loggerInstance: { child: () => loggerChildMock }
    });
  });

  it('lists active announcements with acknowledgement counts and latest status', async () => {
    const announcement = {
      id: 42,
      slug: 'provider-migration-q1',
      title: 'Migration timeline Q1',
      summary: 'Transition of classic dashboards to Provider Hub',
      bodyMarkdown: '## Overview',
      status: 'active',
      effectiveFrom: new Date('2024-11-01T00:00:00Z'),
      effectiveTo: null,
      ackRequired: true,
      ackDeadline: new Date('2024-12-05T00:00:00Z'),
      ownerEmail: 'providers@edulure.com',
      tenantScope: 'global',
      metadata: { escalationChannel: 'providers@edulure.com' },
      createdAt: new Date('2024-10-10T00:00:00Z'),
      updatedAt: new Date('2024-11-10T00:00:00Z')
    };

    announcementModelMock.listActive.mockResolvedValue([announcement]);
    acknowledgementModelMock.countForAnnouncement.mockResolvedValue(7);
    statusUpdateModelMock.recentForAnnouncement.mockResolvedValue([
      {
        id: 9,
        providerReference: 'cohort-11',
        statusCode: 'testing',
        notes: 'QA validation running',
        recordedAt: new Date('2024-11-17T18:00:00Z'),
        createdAt: new Date('2024-11-17T18:00:00Z'),
        updatedAt: new Date('2024-11-17T18:00:00Z')
      }
    ]);
    timelineModelMock.forAnnouncement.mockResolvedValue([
      {
        id: 1,
        occursOn: new Date('2024-11-05T00:00:00Z'),
        headline: 'Sandbox credentials available',
        owner: 'Partnerships',
        ctaLabel: 'Download pack',
        ctaUrl: 'https://ops.edulure.com/provider-pack',
        detailsMarkdown: '* Step 1: Review *'
      }
    ]);
    resourceModelMock.forAnnouncement.mockResolvedValue([
      {
        id: 3,
        label: 'Migration workbook',
        url: 'https://cdn.edulure.com/docs/provider-workbook.pdf',
        type: 'guide',
        locale: 'en',
        description: 'Detailed checklist',
        sortOrder: 0
      }
    ]);

    const result = await service.listActiveAnnouncements({ includeDetails: true });

    expect(result).toHaveLength(1);
    expect(result[0].announcement.slug).toBe('provider-migration-q1');
    expect(result[0].acknowledgements.total).toBe(7);
    expect(result[0].latestStatus).toEqual(
      expect.objectContaining({ statusCode: 'testing', providerReference: 'cohort-11' })
    );
    expect(result[0].timeline).toHaveLength(1);
    expect(result[0].resources[0]).toEqual(
      expect.objectContaining({ label: 'Migration workbook', type: 'guide' })
    );
  });

  it('records acknowledgements using the configured defaults and rejects invalid methods', async () => {
    announcementModelMock.findBySlug.mockResolvedValue({
      id: 101,
      slug: 'provider-migration-q1',
      tenantScope: 'global',
      metadata: { acknowledgementDefaults: { escalationChannel: 'providers@edulure.com' } }
    });

    acknowledgementModelMock.upsertForContact.mockResolvedValue({
      id: 55,
      organisationName: 'Future Skills Ltd',
      contactName: 'Alex Rivera',
      contactEmail: 'alex@futureskills.com',
      ackMethod: 'email',
      followUpRequired: false,
      followUpNotes: null,
      metadata: { escalationChannel: 'providers@edulure.com', timezone: 'UTC' },
      acknowledgedAt: new Date('2024-11-18T12:00:00Z')
    });

    const acknowledgement = await service.recordAcknowledgement(
      'provider-migration-q1',
      {
        organisationName: 'Future Skills Ltd',
        contactName: 'Alex Rivera',
        contactEmail: 'alex@futureskills.com',
        ackMethod: 'email',
        metadata: { timezone: 'UTC' }
      }
    );

    expect(acknowledgementModelMock.upsertForContact).toHaveBeenCalledWith(
      101,
      'alex@futureskills.com',
      expect.objectContaining({
        ackMethod: 'email',
        organisationName: 'Future Skills Ltd',
        metadata: expect.objectContaining({ escalationChannel: 'providers@edulure.com', timezone: 'UTC' })
      }),
      expect.any(Object)
    );
    expect(acknowledgement.ackMethod).toBe('email');

    await expect(
      service.recordAcknowledgement('provider-migration-q1', {
        organisationName: 'Future Skills Ltd',
        contactName: 'Alex Rivera',
        contactEmail: 'alex@futureskills.com',
        ackMethod: 'sms'
      })
    ).rejects.toMatchObject({ status: 422 });
  });

  it('records status updates enforcing supported codes', async () => {
    announcementModelMock.findBySlug.mockResolvedValue({
      id: 101,
      slug: 'provider-migration-q1',
      tenantScope: 'global'
    });

    statusUpdateModelMock.record.mockResolvedValue({
      id: 12,
      providerReference: 'academy-7',
      statusCode: 'blocked',
      notes: 'Waiting on contract signature',
      recordedAt: new Date('2024-11-18T10:00:00Z')
    });

    const update = await service.recordStatusUpdate(
      'provider-migration-q1',
      {
        providerReference: 'academy-7',
        statusCode: 'blocked',
        notes: 'Waiting on contract signature'
      }
    );

    expect(statusUpdateModelMock.record).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ statusCode: 'blocked', providerReference: 'academy-7' }),
      expect.any(Object)
    );
    expect(update.statusCode).toBe('blocked');

    await expect(
      service.recordStatusUpdate('provider-migration-q1', {
        statusCode: 'unknown-status'
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});

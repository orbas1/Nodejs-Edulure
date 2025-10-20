import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  growthInitiativeModel: {
    findBySlug: vi.fn(),
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    updateById: vi.fn(),
    deleteByIdForUser: vi.fn()
  },
  growthExperimentModel: {
    listByInitiativeId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn()
  },
  financialProfileModel: {
    findByUserId: vi.fn(),
    upsertForUser: vi.fn()
  },
  financeBudgetModel: {
    listByUserId: vi.fn(),
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    updateByIdForUser: vi.fn(),
    deleteByIdForUser: vi.fn()
  },
  systemPreferenceModel: {
    getForUser: vi.fn(),
    upsertForUser: vi.fn()
  },
  affiliateChannelModel: {
    listByUserId: vi.fn(),
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    updateById: vi.fn(),
    deleteByIdForUser: vi.fn()
  },
  affiliatePayoutModel: {
    listByChannelIds: vi.fn(),
    create: vi.fn()
  },
  adCampaignModel: {
    listByUserId: vi.fn(),
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    updateById: vi.fn(),
    deleteByIdForUser: vi.fn()
  },
  instructorApplicationModel: {
    findByUserId: vi.fn(),
    upsertForUser: vi.fn()
  },
  libraryEntryModel: {
    create: vi.fn(),
    findByIdForUser: vi.fn(),
    updateByIdForUser: vi.fn(),
    deleteByIdForUser: vi.fn()
  },
  fieldServiceOrderModel: {
    createAssignment: vi.fn(),
    findByIdForCustomer: vi.fn(),
    updateById: vi.fn()
  },
  fieldServiceEventModel: {
    create: vi.fn(),
    listByOrderIds: vi.fn()
  },
  fieldServiceProviderModel: {
    listByIds: vi.fn()
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  db: {
    transaction: vi.fn()
  },
  fieldServiceWorkspaceBuilder: vi.fn()
}));

vi.mock('../src/models/LearnerGrowthInitiativeModel.js', () => ({
  default: mocks.growthInitiativeModel
}));

vi.mock('../src/models/LearnerGrowthExperimentModel.js', () => ({
  default: mocks.growthExperimentModel
}));

vi.mock('../src/models/LearnerFinancialProfileModel.js', () => ({
  default: mocks.financialProfileModel
}));

vi.mock('../src/models/LearnerFinanceBudgetModel.js', () => ({
  default: mocks.financeBudgetModel
}));

vi.mock('../src/models/LearnerSystemPreferenceModel.js', () => ({
  default: mocks.systemPreferenceModel
}));

vi.mock('../src/models/LearnerAffiliateChannelModel.js', () => ({
  default: mocks.affiliateChannelModel
}));

vi.mock('../src/models/LearnerAffiliatePayoutModel.js', () => ({
  default: mocks.affiliatePayoutModel
}));

vi.mock('../src/models/LearnerAdCampaignModel.js', () => ({
  default: mocks.adCampaignModel
}));

vi.mock('../src/models/InstructorApplicationModel.js', () => ({
  default: mocks.instructorApplicationModel
}));

vi.mock('../src/models/LearnerLibraryEntryModel.js', () => ({
  default: mocks.libraryEntryModel
}));

vi.mock('../src/models/FieldServiceOrderModel.js', () => ({
  default: mocks.fieldServiceOrderModel
}));

vi.mock('../src/models/FieldServiceEventModel.js', () => ({
  default: mocks.fieldServiceEventModel
}));

vi.mock('../src/models/FieldServiceProviderModel.js', () => ({
  default: mocks.fieldServiceProviderModel
}));

vi.mock('../src/config/logger.js', () => ({
  default: { child: () => mocks.logger }
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: (handler) => mocks.db.transaction(handler)
  }
}));

vi.mock('../src/services/FieldServiceWorkspace.js', () => ({
  default: (...args) => mocks.fieldServiceWorkspaceBuilder(...args)
}));

import LearnerDashboardService from '../src/services/LearnerDashboardService.js';

const {
  growthInitiativeModel,
  growthExperimentModel,
  financialProfileModel,
  financeBudgetModel,
  systemPreferenceModel,
  affiliateChannelModel,
  affiliatePayoutModel,
  adCampaignModel,
  instructorApplicationModel,
  libraryEntryModel,
  fieldServiceOrderModel,
  fieldServiceEventModel,
  fieldServiceProviderModel,
  db,
  fieldServiceWorkspaceBuilder
} = mocks;

describe('LearnerDashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) => handler('trx'));
    financialProfileModel.findByUserId.mockResolvedValue(null);
    financialProfileModel.upsertForUser.mockResolvedValue({
      id: 1,
      autoPayEnabled: false,
      reserveTargetCents: 0,
      preferences: {}
    });
    financeBudgetModel.listByUserId.mockResolvedValue([]);
    financeBudgetModel.create.mockResolvedValue({
      id: 1,
      userId: 42,
      name: 'Default budget',
      amountCents: 0,
      currency: 'USD',
      period: 'monthly',
      alertsEnabled: true,
      alertThresholdPercent: 80,
      metadata: {},
      createdAt: null,
      updatedAt: null
    });
    financeBudgetModel.findByIdForUser.mockResolvedValue({
      id: 1,
      userId: 42,
      name: 'Default budget',
      amountCents: 0,
      currency: 'USD',
      period: 'monthly',
      alertsEnabled: true,
      alertThresholdPercent: 80,
      metadata: {},
      createdAt: null,
      updatedAt: null
    });
    financeBudgetModel.updateByIdForUser.mockResolvedValue({
      id: 1,
      userId: 42,
      name: 'Updated budget',
      amountCents: 10000,
      currency: 'USD',
      period: 'monthly',
      alertsEnabled: true,
      alertThresholdPercent: 75,
      metadata: {},
      createdAt: null,
      updatedAt: null
    });
    systemPreferenceModel.getForUser.mockResolvedValue(null);
    systemPreferenceModel.upsertForUser.mockResolvedValue({
      id: 2,
      language: 'en',
      region: 'US',
      timezone: 'UTC',
      notificationsEnabled: true,
      digestEnabled: true,
      autoPlayMedia: false,
      highContrast: false,
      reducedMotion: false,
      preferences: {}
    });
  });

  it('rejects duplicate growth initiative slugs', async () => {
    growthInitiativeModel.findBySlug.mockResolvedValue({ id: 10, slug: 'existing' });

    await expect(
      LearnerDashboardService.createGrowthInitiative(42, { slug: 'existing', title: 'Duplicate' })
    ).rejects.toMatchObject({ status: 409 });
    expect(growthInitiativeModel.create).not.toHaveBeenCalled();
  });

  it('creates a growth initiative when the slug is unique', async () => {
    growthInitiativeModel.findBySlug.mockResolvedValue(null);
    const created = { id: 11, slug: 'summer', title: 'Summer Sprint' };
    growthInitiativeModel.create.mockResolvedValue(created);

    const result = await LearnerDashboardService.createGrowthInitiative(42, {
      slug: 'summer',
      title: 'Summer Sprint',
      status: 'active'
    });

    expect(result).toEqual(created);
    expect(growthInitiativeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, slug: 'summer', title: 'Summer Sprint' })
    );
  });

  it('prevents updating experiments that do not belong to the initiative', async () => {
    growthInitiativeModel.findByIdForUser.mockResolvedValue({ id: 55, userId: 42 });
    growthExperimentModel.findById.mockResolvedValue({ id: 90, initiativeId: 99 });

    await expect(
      LearnerDashboardService.updateGrowthExperiment(42, 55, 90, { status: 'running' })
    ).rejects.toMatchObject({ status: 404 });
    expect(growthExperimentModel.updateById).not.toHaveBeenCalled();
  });

  it('records affiliate payouts and updates totals for paid payouts', async () => {
    affiliateChannelModel.findByIdForUser.mockResolvedValue({
      id: 71,
      totalEarningsCents: 120000,
      totalPaidCents: 45000
    });
    affiliatePayoutModel.create.mockResolvedValue({
      id: 301,
      status: 'paid',
      amountCents: 1500,
      currency: 'USD'
    });

    const payout = await LearnerDashboardService.recordAffiliatePayout(42, 71, {
      amountCents: 1500,
      currency: 'USD',
      status: 'paid'
    });

    expect(payout).toMatchObject({ id: 301, status: 'paid' });
    expect(affiliateChannelModel.updateById).toHaveBeenCalledWith(71, {
      totalEarningsCents: 120000,
      totalPaidCents: 46500
    });
  });

  it('requires a campaign name when creating Edulure Ads campaigns', async () => {
    await expect(LearnerDashboardService.createAdCampaign(42, {})).rejects.toThrow(/Campaign name is required/);
    expect(adCampaignModel.create).not.toHaveBeenCalled();
  });

  it('submits instructor applications and returns an acknowledgement', async () => {
    instructorApplicationModel.upsertForUser.mockResolvedValue({
      id: 'app-1',
      status: 'submitted',
      stage: 'portfolio'
    });

    const acknowledgement = await LearnerDashboardService.submitInstructorApplication(42, {
      motivation: 'Scale design leadership cohorts'
    });

    expect(acknowledgement).toMatchObject({
      reference: 'app-1',
      meta: { status: 'submitted', stage: 'portfolio' }
    });
    expect(instructorApplicationModel.upsertForUser).toHaveBeenCalledWith(42, expect.objectContaining({ status: 'submitted' }));
  });

  it('creates a learner library entry and normalises payload values', async () => {
    const lastOpened = '2024-05-01T10:00:00.000Z';
    libraryEntryModel.create.mockResolvedValue({
      id: 'lib-1',
      title: 'Focus Playbook',
      format: 'Guide',
      progress: 100,
      lastOpened,
      url: 'https://edulure.example/playbook',
      tags: ['growth'],
      highlights: [],
      metadata: {}
    });

    const entry = await LearnerDashboardService.createLearnerLibraryEntry(42, {
      title: '  Focus Playbook  ',
      format: 'Guide',
      progress: 120,
      lastOpened,
      url: 'https://edulure.example/playbook',
      tags: 'growth'
    });

    expect(libraryEntryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        title: 'Focus Playbook',
        format: 'Guide',
        progress: 100,
        tags: ['growth'],
        metadata: { source: 'learner-dashboard' }
      })
    );
    expect(entry).toMatchObject({
      id: 'lib-1',
      title: 'Focus Playbook',
      format: 'Guide',
      progress: 100,
      lastOpened,
      url: 'https://edulure.example/playbook',
      tags: ['growth']
    });
    expect(entry.lastOpenedLabel).toBeDefined();
  });

  it('throws a 404 error when updating a missing library entry', async () => {
    libraryEntryModel.findByIdForUser.mockResolvedValue(null);

    await expect(
      LearnerDashboardService.updateLearnerLibraryEntry(42, 'missing', { title: 'Updated' })
    ).rejects.toMatchObject({ status: 404 });
    expect(libraryEntryModel.updateByIdForUser).not.toHaveBeenCalled();
  });

  it('updates a learner library entry and normalises tags', async () => {
    libraryEntryModel.findByIdForUser.mockResolvedValue({ id: 'lib-2', userId: 42, tags: [] });
    libraryEntryModel.updateByIdForUser.mockResolvedValue({
      id: 'lib-2',
      title: 'Updated Title',
      format: 'Guide',
      progress: 25,
      tags: ['focus', 'growth']
    });

    const entry = await LearnerDashboardService.updateLearnerLibraryEntry(42, 'lib-2', {
      tags: ['focus', 'growth', ''],
      progress: 25,
      title: 'Updated Title'
    });

    expect(libraryEntryModel.updateByIdForUser).toHaveBeenCalledWith(
      42,
      'lib-2',
      expect.objectContaining({
        title: 'Updated Title',
        progress: 25,
        tags: ['focus', 'growth']
      })
    );
    expect(entry).toMatchObject({ id: 'lib-2', progress: 25, tags: ['focus', 'growth'] });
  });

  it('deletes a learner library entry and returns an acknowledgement', async () => {
    libraryEntryModel.deleteByIdForUser.mockResolvedValue(true);

    const acknowledgement = await LearnerDashboardService.deleteLearnerLibraryEntry(42, 'lib-3');

    expect(libraryEntryModel.deleteByIdForUser).toHaveBeenCalledWith(42, 'lib-3');
    expect(acknowledgement).toMatchObject({
      reference: 'lib-3',
      message: 'Library entry removed'
    });
  });

  it('creates a field service assignment and records the dispatch event', async () => {
    const order = {
      id: 'order-1',
      reference: 'fs_123',
      status: 'dispatched',
      priority: 'standard',
      serviceType: 'lab setup',
      metadata: {}
    };
    fieldServiceOrderModel.createAssignment.mockResolvedValue(order);
    fieldServiceEventModel.create.mockResolvedValue({ id: 'evt-1' });
    fieldServiceEventModel.listByOrderIds.mockResolvedValue([]);
    fieldServiceProviderModel.listByIds.mockResolvedValue([]);
    fieldServiceWorkspaceBuilder.mockReturnValue({
      customer: { assignments: [{ id: 'order-1', serviceType: 'lab setup', status: 'dispatched' }] }
    });

    const assignment = await LearnerDashboardService.createFieldServiceAssignment(42, {
      serviceType: 'Lab Setup',
      owner: 'Operations',
      priority: 'Critical',
      attachments: ['  checklist.pdf  ']
    });

    expect(db.transaction).toHaveBeenCalled();
    expect(fieldServiceOrderModel.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: expect.stringMatching(/^fs_/),
        customerUserId: 42,
        serviceType: 'Lab Setup',
        priority: 'critical',
        metadata: expect.objectContaining({
          owner: 'Operations',
          attachments: ['checklist.pdf']
        })
      }),
      'trx'
    );
    expect(fieldServiceEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        eventType: 'dispatch_created',
        status: 'dispatched'
      }),
      'trx'
    );
    expect(assignment).toEqual({ id: 'order-1', serviceType: 'lab setup', status: 'dispatched' });
  });

  it('updates a field service assignment and captures timeline events', async () => {
    const order = {
      id: 'order-2',
      reference: 'fs_456',
      status: 'dispatched',
      priority: 'standard',
      serviceType: 'lab setup',
      metadata: { owner: 'Ops' }
    };
    fieldServiceOrderModel.findByIdForCustomer.mockResolvedValue(order);
    fieldServiceOrderModel.updateById.mockResolvedValue({ ...order, status: 'on_site' });
    fieldServiceEventModel.create.mockResolvedValue({ id: 'evt-2' });
    fieldServiceEventModel.listByOrderIds.mockResolvedValue([]);
    fieldServiceProviderModel.listByIds.mockResolvedValue([]);
    fieldServiceWorkspaceBuilder.mockReturnValue({
      customer: { assignments: [{ id: 'order-2', status: 'on_site', serviceType: 'lab setup' }] }
    });

    const result = await LearnerDashboardService.updateFieldServiceAssignment(42, 'order-2', {
      status: 'on_site',
      fieldNotes: 'Team arrived on-site',
      attachments: ['report.pdf']
    });

    expect(fieldServiceOrderModel.updateById).toHaveBeenCalledWith(
      'order-2',
      expect.objectContaining({
        status: 'on_site',
        metadata: expect.objectContaining({ attachments: ['report.pdf'] })
      }),
      'trx'
    );
    expect(fieldServiceEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-2',
        eventType: 'status_on_site',
        status: 'on_site'
      }),
      'trx'
    );
    expect(result).toEqual({ id: 'order-2', status: 'on_site', serviceType: 'lab setup' });
  });

  it('closes a field service assignment and returns an acknowledgement', async () => {
    const order = {
      id: 'order-3',
      reference: 'fs_789',
      status: 'on_site',
      metadata: { owner: 'Ops' }
    };
    fieldServiceOrderModel.findByIdForCustomer.mockResolvedValue(order);
    fieldServiceOrderModel.updateById.mockResolvedValue({ ...order, status: 'closed' });
    fieldServiceEventModel.create.mockResolvedValue({ id: 'evt-3' });

    const acknowledgement = await LearnerDashboardService.closeFieldServiceAssignment(42, 'order-3', {
      resolution: 'Completed successfully'
    });

    expect(fieldServiceOrderModel.updateById).toHaveBeenCalledWith(
      'order-3',
      expect.objectContaining({ status: 'closed' }),
      'trx'
    );
    expect(fieldServiceEventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-3',
        eventType: 'job_completed',
        status: 'closed'
      }),
      'trx'
    );
    expect(acknowledgement).toMatchObject({
      reference: expect.stringMatching(/^fs_/),
      message: 'Field service assignment closed',
      meta: { assignmentId: 'order-3' }
    });
  });

  it('merges finance settings without disabling existing autopay', async () => {
    const existingProfile = {
      id: 9,
      autoPayEnabled: true,
      reserveTargetCents: 75000,
      preferences: { currency: 'USD', alerts: { sendEmail: true } }
    };
    financialProfileModel.findByUserId
      .mockResolvedValueOnce(existingProfile)
      .mockResolvedValueOnce({
        ...existingProfile,
        preferences: { currency: 'USD', alerts: { sendEmail: true, sendSms: true } }
      });
    financialProfileModel.upsertForUser.mockResolvedValue({
      ...existingProfile,
      preferences: { currency: 'USD', alerts: { sendEmail: true, sendSms: true } }
    });
    financeBudgetModel.listByUserId.mockResolvedValue([
      {
        id: 5,
        userId: 42,
        name: 'Mentorship',
        amountCents: 120000,
        currency: 'USD',
        period: 'monthly',
        alertsEnabled: true,
        alertThresholdPercent: 80,
        metadata: {},
        createdAt: null,
        updatedAt: null
      }
    ]);

    const acknowledgement = await LearnerDashboardService.updateFinanceSettings(42, {
      alerts: { sendSms: true }
    });

    expect(financialProfileModel.upsertForUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        autoPayEnabled: true,
        reserveTargetCents: 75000,
        preferences: expect.objectContaining({
          alerts: expect.objectContaining({ sendEmail: true, sendSms: true })
        })
      })
    );
    expect(acknowledgement.meta.financeSettings.profile.autoPayEnabled).toBe(true);
    expect(acknowledgement.meta.financeSettings.alerts.sendSms).toBe(true);
    expect(acknowledgement.meta.financeSettings.budgets).toHaveLength(1);
  });

  it('creates a finance budget and normalises values', async () => {
    financeBudgetModel.create.mockResolvedValue({
      id: 7,
      userId: 42,
      name: 'Scholarships',
      amountCents: 250000,
      currency: 'USD',
      period: 'monthly',
      alertsEnabled: true,
      alertThresholdPercent: 85,
      metadata: { category: 'scholarship' },
      createdAt: null,
      updatedAt: null
    });

    const budget = await LearnerDashboardService.createFinanceBudget(42, {
      name: 'Scholarships',
      amount: 2500,
      currency: 'usd',
      period: 'monthly',
      alertThresholdPercent: 85,
      metadata: { category: 'scholarship' }
    });

    expect(financeBudgetModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, amountCents: 250000, currency: 'USD' }),
      expect.anything()
    );
    expect(budget.amountCents).toBe(250000);
    expect(budget.amountFormatted).toBeDefined();
    expect(budget.currency).toBe('USD');
  });

  it('returns default system preferences when none stored', async () => {
    systemPreferenceModel.getForUser.mockResolvedValue(null);

    const preferences = await LearnerDashboardService.getSystemPreferences(42);

    expect(preferences.language).toBe('en');
    expect(preferences.preferences.interfaceDensity).toBe('comfortable');
    expect(preferences.notificationsEnabled).toBe(true);
  });

  it('updates system preferences and returns acknowledgement metadata', async () => {
    systemPreferenceModel.upsertForUser.mockResolvedValue({
      id: 3,
      language: 'fr',
      region: 'FR',
      timezone: 'Europe/Paris',
      notificationsEnabled: false,
      digestEnabled: false,
      autoPlayMedia: true,
      highContrast: true,
      reducedMotion: true,
      preferences: { interfaceDensity: 'compact', analyticsOptIn: false, subtitleLanguage: 'fr', audioDescription: true }
    });
    systemPreferenceModel.getForUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 3,
        language: 'fr',
        region: 'FR',
        timezone: 'Europe/Paris',
        notificationsEnabled: false,
        digestEnabled: false,
        autoPlayMedia: true,
        highContrast: true,
        reducedMotion: true,
        preferences: { interfaceDensity: 'compact', analyticsOptIn: false, subtitleLanguage: 'fr', audioDescription: true }
      });

    const acknowledgement = await LearnerDashboardService.updateSystemPreferences(42, {
      language: 'fr',
      region: 'FR',
      timezone: 'Europe/Paris',
      notificationsEnabled: false,
      digestEnabled: false,
      autoPlayMedia: true,
      highContrast: true,
      reducedMotion: true,
      preferences: {
        interfaceDensity: 'compact',
        analyticsOptIn: false,
        subtitleLanguage: 'fr',
        audioDescription: true
      }
    });

    expect(systemPreferenceModel.upsertForUser).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ language: 'fr', region: 'FR', timezone: 'Europe/Paris' })
    );
    expect(acknowledgement.meta.preference.language).toBe('fr');
    expect(acknowledgement.meta.preference.preferences.audioDescription).toBe(true);
  });
});

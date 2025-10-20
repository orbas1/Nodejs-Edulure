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
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../src/models/LearnerGrowthInitiativeModel.js', () => ({
  default: mocks.growthInitiativeModel
}));

vi.mock('../src/models/LearnerGrowthExperimentModel.js', () => ({
  default: mocks.growthExperimentModel
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

vi.mock('../src/config/logger.js', () => ({
  default: { child: () => mocks.logger }
}));

import LearnerDashboardService from '../src/services/LearnerDashboardService.js';

const {
  growthInitiativeModel,
  growthExperimentModel,
  affiliateChannelModel,
  affiliatePayoutModel,
  adCampaignModel,
  instructorApplicationModel
} = mocks;

describe('LearnerDashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

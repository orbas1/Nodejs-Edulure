import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const marketingBlockList = vi.fn();
  const marketingPlanList = vi.fn();
  const onboardingInviteList = vi.fn();
  const marketingLeadCreate = vi.fn();
  const select = vi.fn();
  const whereIn = vi.fn();
  const db = vi.fn();

  return {
    marketingBlockList,
    marketingPlanList,
    onboardingInviteList,
    marketingLeadCreate,
    select,
    whereIn,
    db
  };
});

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/models/MarketingBlockModel.js', () => ({
  default: {
    list: mocks.marketingBlockList
  }
}));

vi.mock('../src/models/MarketingPlanOfferModel.js', () => ({
  default: {
    list: mocks.marketingPlanList
  }
}));

vi.mock('../src/models/LearnerOnboardingInviteModel.js', () => ({
  default: {
    listActiveForEmail: mocks.onboardingInviteList
  }
}));

vi.mock('../src/models/MarketingLeadModel.js', () => ({
  default: {
    create: mocks.marketingLeadCreate
  }
}));

let MarketingContentService;

describe('MarketingContentService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.db.mockImplementation(() => ({ select: mocks.select }));
    mocks.select.mockImplementation(() => ({ whereIn: mocks.whereIn }));
    mocks.whereIn.mockResolvedValue([]);
    mocks.marketingBlockList.mockResolvedValue([]);
    mocks.marketingPlanList.mockResolvedValue([]);
    mocks.onboardingInviteList.mockResolvedValue([]);
    mocks.marketingLeadCreate.mockResolvedValue({ id: 99 });

    ({ default: MarketingContentService } = await import('../src/services/MarketingContentService.js'));
  });

  it('lists marketing blocks with the provided types', async () => {
    const blocks = [{ slug: 'hero', blockType: 'hero' }];
    mocks.marketingBlockList.mockResolvedValue(blocks);

    const result = await MarketingContentService.listMarketingBlocks({ types: ['hero'] });

    expect(mocks.marketingBlockList).toHaveBeenCalledWith({ types: ['hero'] });
    expect(result).toEqual(blocks);
  });

  it('maps marketing plans and trims feature metadata', async () => {
    mocks.marketingPlanList.mockResolvedValue([
      {
        id: 1,
        publicId: 'plan-community',
        name: 'Community Plan',
        headline: 'Community plan',
        tagline: 'Grow together',
        priceCents: 14900,
        currency: 'USD',
        billingInterval: 'monthly',
        isFeatured: true,
        badge: { label: 'Popular' },
        metadata: { accent: { gradient: 'from-emerald-500/30' } },
        upsell: { descriptor: 'Add-on' },
        features: [
          {
            id: 11,
            planId: 1,
            label: 'Unlimited communities',
            position: 0,
            metadata: { icon: '🤝', extra: 'ignored' },
            createdAt: 'now'
          }
        ]
      }
    ]);

    const plans = await MarketingContentService.listPlanOffers();

    expect(mocks.marketingPlanList).toHaveBeenCalledWith({ includeFeatures: true });
    expect(plans).toEqual([
      {
        id: 1,
        publicId: 'plan-community',
        name: 'Community Plan',
        headline: 'Community plan',
        tagline: 'Grow together',
        priceCents: 14900,
        currency: 'USD',
        billingInterval: 'monthly',
        isFeatured: true,
        badge: { label: 'Popular' },
        metadata: { accent: { gradient: 'from-emerald-500/30' } },
        upsell: { descriptor: 'Add-on' },
        features: [
          {
            id: 11,
            label: 'Unlimited communities',
            position: 0,
            metadata: { icon: '🤝', extra: 'ignored' }
          }
        ]
      }
    ]);
  });

  it('returns early when no email is provided for invites', async () => {
    const invites = await MarketingContentService.listActiveInvites();

    expect(invites).toEqual([]);
    expect(mocks.onboardingInviteList).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it('hydrates invite community metadata when communities are present', async () => {
    mocks.onboardingInviteList.mockResolvedValue([
      {
        inviteCode: 'FLOW5-OPS',
        email: 'flow5@edulure.test',
        status: 'pending',
        communityId: 42,
        metadata: { source: 'flow' },
        expiresAt: 'future'
      }
    ]);
    mocks.whereIn.mockResolvedValue([
      { id: 42, slug: 'ops-guild', name: 'Operations Guild' }
    ]);

    const invites = await MarketingContentService.listActiveInvites('flow5@edulure.test');

    expect(mocks.onboardingInviteList).toHaveBeenCalledWith('flow5@edulure.test', expect.any(Object));
    expect(mocks.db).toHaveBeenCalledWith('communities');
    expect(mocks.select).toHaveBeenCalledWith('id', 'slug', 'name');
    expect(mocks.whereIn).toHaveBeenCalledWith('id', [42]);
    expect(invites).toEqual([
      {
        code: 'FLOW5-OPS',
        email: 'flow5@edulure.test',
        status: 'pending',
        expiresAt: 'future',
        metadata: { source: 'flow' },
        community: { slug: 'ops-guild', name: 'Operations Guild' }
      }
    ]);
  });

  it('aggregates landing content across blocks, plans, and invites', async () => {
    mocks.marketingBlockList.mockResolvedValue([{ slug: 'hero', blockType: 'hero' }]);
    mocks.marketingPlanList.mockResolvedValue([{ id: 1, features: [] }]);
    mocks.onboardingInviteList.mockResolvedValue([]);

    const content = await MarketingContentService.getLandingContent({ types: ['hero'], email: 'flow@edulure.test' });

    expect(content).toEqual({
      blocks: [{ slug: 'hero', blockType: 'hero' }],
      plans: [{ id: 1, features: [] }],
      invites: []
    });
    expect(mocks.marketingBlockList).toHaveBeenCalledWith({ types: ['hero'] });
    expect(mocks.marketingPlanList).toHaveBeenCalledWith({ includeFeatures: true });
    expect(mocks.onboardingInviteList).toHaveBeenCalledWith('flow@edulure.test', expect.any(Object));
  });

  it('creates marketing leads and enriches metadata with invites', async () => {
    mocks.onboardingInviteList.mockResolvedValue([
      {
        code: 'FLOW5-OPS-GUILD',
        community: { slug: 'ops-guild', name: 'Operations Guild' },
        status: 'pending',
        expiresAt: 'future'
      }
    ]);

    mocks.marketingLeadCreate.mockResolvedValue({
      id: 101,
      email: 'flow5@edulure.test',
      metadata: {}
    });

    const result = await MarketingContentService.createMarketingLead({
      email: ' Flow5@Edulure.test ',
      fullName: 'Kai Watanabe',
      company: 'Ops Guild',
      persona: 'Operator',
      goal: 'Launch Flow 5 beta',
      ctaSource: 'hero-primary',
      blockSlug: 'flow-five-hero',
      metadata: { utmCampaign: 'flow5' }
    });

    expect(mocks.onboardingInviteList).toHaveBeenCalledWith('flow5@edulure.test', expect.any(Object));
    expect(mocks.marketingLeadCreate).toHaveBeenCalledWith({
      email: 'flow5@edulure.test',
      fullName: 'Kai Watanabe',
      company: 'Ops Guild',
      persona: 'Operator',
      goal: 'Launch Flow 5 beta',
      ctaSource: 'hero-primary',
      blockSlug: 'flow-five-hero',
      status: 'new',
      metadata: {
        utmCampaign: 'flow5',
        invites: [
          {
            code: 'FLOW5-OPS-GUILD',
            community: { slug: 'ops-guild', name: 'Operations Guild' },
            status: 'pending',
            expiresAt: 'future'
          }
        ]
      }
    });
    expect(result).toMatchObject({
      id: 101,
      email: 'flow5@edulure.test',
      metadata: {
        utmCampaign: 'flow5',
        invites: [
          {
            code: 'FLOW5-OPS-GUILD',
            community: { slug: 'ops-guild', name: 'Operations Guild' },
            status: 'pending',
            expiresAt: 'future'
          }
        ]
      },
      invites: [
        {
          code: 'FLOW5-OPS-GUILD',
          community: { slug: 'ops-guild', name: 'Operations Guild' },
          status: 'pending',
          expiresAt: 'future'
        }
      ]
    });
  });
});

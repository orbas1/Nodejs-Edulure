import db from '../config/database.js';
import MarketingBlockModel from '../models/MarketingBlockModel.js';
import MarketingPlanOfferModel from '../models/MarketingPlanOfferModel.js';
import LearnerOnboardingInviteModel from '../models/LearnerOnboardingInviteModel.js';

function normaliseArrayParam(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
      .filter(Boolean);
  }
  return [value].filter(Boolean).map((entry) => (typeof entry === 'string' ? entry.trim() : entry));
}

export default class MarketingContentService {
  static async listMarketingBlocks({ types } = {}) {
    const blockTypes = normaliseArrayParam(types);
    return MarketingBlockModel.list({ types: blockTypes });
  }

  static async listPlanOffers(options = {}) {
    const plans = await MarketingPlanOfferModel.list({ includeFeatures: true, ...options });
    return plans.map((plan) => ({
      ...plan,
      features: plan.features.map((feature) => ({
        id: feature.id,
        label: feature.label,
        position: feature.position,
        metadata: feature.metadata
      }))
    }));
  }

  static async listActiveInvites(email) {
    if (!email) {
      return [];
    }
    const invites = await LearnerOnboardingInviteModel.listActiveForEmail(email, db);
    if (invites.length === 0) {
      return invites;
    }
    const communityIds = invites.map((invite) => invite.communityId).filter(Boolean);
    let communities = new Map();
    if (communityIds.length > 0) {
      const rows = await db('communities')
        .select('id', 'slug', 'name')
        .whereIn('id', communityIds);
      communities = new Map(rows.map((row) => [row.id, { slug: row.slug, name: row.name }]));
    }
    return invites.map((invite) => ({
      code: invite.inviteCode,
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
      metadata: invite.metadata,
      community: invite.communityId ? communities.get(invite.communityId) ?? null : null
    }));
  }

  static async getLandingContent({ types, email } = {}) {
    const [blocks, plans, invites] = await Promise.all([
      this.listMarketingBlocks({ types }),
      this.listPlanOffers(),
      this.listActiveInvites(email)
    ]);
    return {
      blocks,
      plans,
      invites
    };
  }
}

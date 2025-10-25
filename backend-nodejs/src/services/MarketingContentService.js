import db from '../config/database.js';
import MarketingBlockModel from '../models/MarketingBlockModel.js';
import MarketingPlanOfferModel from '../models/MarketingPlanOfferModel.js';
import LearnerOnboardingInviteModel from '../models/LearnerOnboardingInviteModel.js';
import MarketingLeadModel from '../models/MarketingLeadModel.js';
import MarketingTestimonialModel from '../models/MarketingTestimonialModel.js';

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

function normaliseString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export default class MarketingContentService {
  static async listMarketingBlocks({ types, variants, surfaces } = {}) {
    const requestedTypes = normaliseArrayParam(types);
    const requestedVariants = normaliseArrayParam(variants);
    const blockTypes = Array.from(new Set([...requestedTypes, ...requestedVariants])).filter(Boolean);
    const requestedSurfaces = normaliseArrayParam(surfaces).map((surface) =>
      typeof surface === 'string' ? surface.trim().toLowerCase() : null
    ).filter(Boolean);

    const blocks = await MarketingBlockModel.list({ types: blockTypes });

    if (requestedSurfaces.length === 0) {
      return blocks;
    }

    const surfaceSet = new Set(requestedSurfaces);

    return blocks.filter((block) => {
      const blockSurfaces = Array.isArray(block.surfaces)
        ? block.surfaces
            .map((surface) => (typeof surface === 'string' ? surface.trim().toLowerCase() : null))
            .filter(Boolean)
        : [];

      if (blockSurfaces.length === 0) {
        return true;
      }

      return blockSurfaces.some((surface) => surfaceSet.has(surface));
    });
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

  static async listTestimonials({ variants, surfaces } = {}) {
    const requestedVariants = normaliseArrayParam(variants);
    const testimonials = await MarketingTestimonialModel.list({
      variants: requestedVariants.length ? requestedVariants : undefined
    });

    const filtered = MarketingTestimonialModel.filterBySurfaces(
      testimonials,
      normaliseArrayParam(surfaces)
    );

    return filtered.map((entry) => ({
      id: entry.slug ?? `testimonial-${entry.id}`,
      slug: entry.slug,
      variant: entry.variant,
      quote: entry.quote,
      authorName: entry.authorName,
      authorTitle: entry.authorTitle,
      attribution: entry.attribution,
      persona: entry.persona,
      featuredProduct: entry.featuredProduct,
      surfaces: entry.surfaces,
      metadata: entry.metadata,
      position: entry.position
    }));
  }

  static async listActiveInvites(email) {
    if (!email) {
      return [];
    }
    const invites = await LearnerOnboardingInviteModel.listActiveForEmail(email, { connection: db });
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
      code: invite.inviteCode ?? invite.code ?? null,
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
      metadata: invite.metadata,
      community: invite.communityId
        ? communities.get(invite.communityId) ?? null
        : invite.community ?? null
    }));
  }

  static async getLandingContent({ types, email, surfaces, variants } = {}) {
    const variantList = normaliseArrayParam(variants);
    const surfaceList = normaliseArrayParam(surfaces);

    const [blocks, plans, invites] = await Promise.all([
      this.listMarketingBlocks({ types, variants: variantList, surfaces: surfaceList }),
      this.listPlanOffers(),
      this.listActiveInvites(email)
    ]);

    const includeTestimonials = variantList.length > 0 || surfaceList.length > 0;
    const response = { blocks, plans, invites };

    if (includeTestimonials) {
      response.testimonials = await this.listTestimonials({ variants: variantList, surfaces: surfaceList });
    }

    return response;
  }

  static async createMarketingLead(payload = {}) {
    const email = normaliseString(payload.email ? String(payload.email).toLowerCase() : null);
    if (!email) {
      throw new Error('Email is required to capture a marketing lead');
    }

    const fullName = normaliseString(payload.fullName ?? payload.full_name);
    const company = normaliseString(payload.company);
    const persona = normaliseString(payload.persona);
    const goal = normaliseString(payload.goal);
    const ctaSource = normaliseString(payload.ctaSource ?? payload.cta_source) ?? 'home-inline';
    const blockSlug = normaliseString(payload.blockSlug ?? payload.block_slug);

    const invites = await this.listActiveInvites(email);

    const inviteSummaries = invites.map((invite) => ({
      code: invite.code,
      community: invite.community,
      status: invite.status,
      expiresAt: invite.expiresAt
    }));

    const metadataPayload = {
      ...(payload.metadata ?? {}),
      invites: inviteSummaries
    };

    const leadRecord = await MarketingLeadModel.create({
      email,
      fullName,
      company,
      persona,
      goal,
      ctaSource,
      blockSlug,
      status: 'new',
      metadata: metadataPayload
    });

    return {
      ...leadRecord,
      metadata: {
        ...metadataPayload,
        ...(leadRecord.metadata ?? {})
      },
      invites
    };
  }
}

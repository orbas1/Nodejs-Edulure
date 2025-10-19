import db from '../config/database.js';
import CommunityAffiliateModel from '../models/CommunityAffiliateModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import PaymentIntentModel from '../models/PaymentIntentModel.js';
import PlatformSettingsService from './PlatformSettingsService.js';

const COMMISSION_CATEGORY_MAP = Object.freeze({
  community_subscription: 'community_subscription',
  community_live_donation: 'community_live_donation',
  live_donation: 'community_live_donation',
  course: 'course_sale',
  course_sale: 'course_sale',
  course_enrollment: 'course_sale',
  ebook: 'ebook_sale',
  ebook_sale: 'ebook_sale',
  tutor_booking: 'tutor_booking'
});

function normaliseId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return null;
}

function normaliseReferralCode(value) {
  if (!value) {
    return null;
  }
  return String(value).trim().toUpperCase();
}

function resolveCommunityId(metadata, fallback) {
  if (!metadata) {
    return fallback ?? null;
  }
  if (metadata.communityId) {
    return normaliseId(metadata.communityId);
  }
  if (metadata.community?.id) {
    return normaliseId(metadata.community.id);
  }
  return fallback ?? null;
}

export default class CommunityAffiliateCommissionService {
  static resolveCategory(intent) {
    if (!intent?.entityType) {
      return null;
    }
    const key = String(intent.entityType).toLowerCase();
    return COMMISSION_CATEGORY_MAP[key] ?? null;
  }

  static async resolveAffiliate({ affiliateId, referralCode, communityId, connection = db }) {
    if (!affiliateId && !referralCode) {
      return null;
    }

    let affiliate = null;
    if (affiliateId) {
      affiliate = await CommunityAffiliateModel.findById(affiliateId, connection);
    }
    if (!affiliate && referralCode) {
      affiliate = await CommunityAffiliateModel.findByReferralCode(referralCode, connection);
    }

    if (!affiliate || affiliate.status !== 'approved') {
      return null;
    }

    if (communityId && Number(affiliate.communityId) !== Number(communityId)) {
      return null;
    }

    return affiliate;
  }

  static extractAffiliateMetadata(intent) {
    const metadata = intent?.metadata ?? {};
    const affiliateId = normaliseId(metadata.affiliateId ?? metadata.affiliate?.id);
    const referralCode = normaliseReferralCode(
      metadata.referralCode ?? metadata.affiliateCode ?? metadata.affiliate?.referralCode
    );
    const communityId = resolveCommunityId(metadata, metadata.communityId ?? null);
    const commissionMeta = metadata.monetization?.commission ?? {};

    return {
      affiliateId,
      referralCode,
      communityId,
      commissionMeta
    };
  }

  static async markCredited(intentId, metadata, amount, affiliateId, connection = db) {
    const nextMetadata = {
      ...metadata,
      monetization: {
        ...(metadata?.monetization ?? {}),
        commission: {
          ...(metadata?.monetization?.commission ?? {}),
          affiliateAmountCredited: amount,
          affiliateId,
          affiliateCreditedAt: new Date().toISOString()
        }
      }
    };

    await PaymentIntentModel.updateById(intentId, { metadata: nextMetadata }, connection);
  }

  static async handlePaymentCaptured(intentLike, connection = db) {
    if (!intentLike) {
      return null;
    }

    const intent = intentLike.id
      ? intentLike
      : await PaymentIntentModel.findByPublicId(String(intentLike), connection);

    if (!intent) {
      return null;
    }

    const { affiliateId, referralCode, communityId, commissionMeta } = this.extractAffiliateMetadata(intent);

    if (!communityId || (!affiliateId && !referralCode)) {
      return null;
    }

    if (commissionMeta?.affiliateAmountCredited) {
      return null;
    }

    const affiliate = await this.resolveAffiliate({ affiliateId, referralCode, communityId, connection });
    if (!affiliate) {
      return null;
    }

    const monetization = await PlatformSettingsService.getMonetizationSettings(connection);
    const category = this.resolveCategory(intent);
    const breakdown = PlatformSettingsService.calculateCommission(
      intent.amountTotal ?? 0,
      monetization.commissions,
      { category }
    );

    if (!breakdown.affiliateAmountCents || breakdown.affiliateAmountCents <= 0) {
      return null;
    }

    await CommunityAffiliateModel.incrementEarnings(
      affiliate.id,
      { amountEarnedCents: breakdown.affiliateAmountCents, amountPaidCents: 0 },
      connection
    );

    await DomainEventModel.record(
      {
        entityType: 'community_affiliate',
        entityId: String(affiliate.id),
        eventType: 'community.affiliate.earning-recorded',
        payload: {
          communityId,
          paymentIntentId: intent.id,
          amountCents: breakdown.affiliateAmountCents,
          platformShareCents: breakdown.platformAmountCents,
          commissionCategory: breakdown.category ?? category ?? null,
          referralCode: affiliate.referralCode ?? referralCode ?? null,
          entityType: intent.entityType ?? null,
          entityId: intent.entityId ?? null
        }
      },
      connection
    );

    await this.markCredited(intent.id, intent.metadata ?? {}, breakdown.affiliateAmountCents, affiliate.id, connection);

    return {
      affiliateId: affiliate.id,
      amountCents: breakdown.affiliateAmountCents,
      category: category ?? null
    };
  }
}

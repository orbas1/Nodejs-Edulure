import logger from '../config/logger.js';
import MonetizationCatalogItemModel from '../models/MonetizationCatalogItemModel.js';
import BillingReceiptSubmissionModel from '../models/BillingReceiptSubmissionModel.js';

const serviceLogger = logger.child({ module: 'billing-service' });

function mapBillingInterval(interval) {
  switch ((interval ?? '').toLowerCase()) {
    case 'annual':
      return 'yearly';
    case 'quarterly':
      return 'quarterly';
    case 'monthly':
      return 'monthly';
    case 'one_time':
      return 'monthly';
    case 'usage':
      return 'monthly';
    default:
      return 'monthly';
  }
}

function mapCatalogItemToProduct(item) {
  return {
    id: item.productCode ?? item.publicId ?? `product-${item.id}`,
    name: item.name ?? 'Subscription plan',
    description: item.description ?? '',
    price: Number(item.unitAmountCents ?? 0) / 100,
    currency: item.currency ?? 'USD',
    billingCycle: mapBillingInterval(item.billingInterval),
    active: item.status !== 'retired',
    planType: item.pricingModel ?? 'flat_fee',
    trialDays: item.metadata?.trialDays ?? null,
    metadata: {
      billingInterval: item.billingInterval,
      pricingModel: item.pricingModel,
      revenueRecognition: item.revenueRecognitionMethod,
      recognitionDurationDays: item.recognitionDurationDays ?? 0,
      revenueAccount: item.revenueAccount,
      deferredRevenueAccount: item.deferredRevenueAccount,
      usageMetric: item.usageMetric,
      features: Array.isArray(item.metadata?.features) ? item.metadata.features : [],
      badgeLabel: item.metadata?.badgeLabel,
      badgeTone: item.metadata?.badgeTone,
      landingPageUrl: item.metadata?.landingPageUrl
    }
  };
}

export default class BillingService {
  static async listCatalog({ tenantId = 'global' } = {}) {
    const items = await MonetizationCatalogItemModel.list({
      tenantId,
      status: 'active',
      includeRetired: false,
      limit: 200
    });

    const products = items.map(mapCatalogItemToProduct);
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + 12 * 60 * 60 * 1000);

    return {
      products,
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
  }

  static async recordReceiptSubmission({
    userId,
    platform,
    productId,
    transactionId,
    purchaseToken,
    payload,
    metadata
  }) {
    if (!transactionId || !purchaseToken) {
      throw new Error('transactionId and purchaseToken are required to validate receipts.');
    }

    const submission = await BillingReceiptSubmissionModel.upsert({
      userId,
      platform: (platform ?? 'unknown').toLowerCase(),
      productId,
      transactionId,
      purchaseToken,
      payload,
      metadata,
      lastAttemptAt: new Date(),
      status: 'pending',
      lastError: null,
      resetRetries: true
    });

    serviceLogger.info(
      { userId, transactionId, platform: submission.platform },
      'Queued billing receipt submission'
    );

    return submission;
  }
}


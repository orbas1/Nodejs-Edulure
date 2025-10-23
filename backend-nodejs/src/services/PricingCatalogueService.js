import MonetizationFinanceService from './MonetizationFinanceService.js';

const DEFAULT_TENANT_ID = 'global';

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

function normaliseNumber(value, fallback = 0) {
  if (Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapPlan(item) {
  if (!item) {
    return null;
  }

  const metadata = item.metadata ?? {};
  const display = metadata.display ?? {};
  const category = (metadata.category ?? metadata.planType ?? '').toLowerCase();
  if (category && category !== 'course_plan') {
    return null;
  }

  const audience = (metadata.audience ?? 'public').toLowerCase();
  if (audience && audience !== 'public') {
    return null;
  }

  const features = toArray(display.features ?? metadata.features);
  const addons = toArray(display.addons ?? metadata.addons);

  return {
    id: item.productCode,
    catalogItemId: item.id,
    publicId: item.publicId,
    name: item.name,
    description: item.description ?? display.description ?? null,
    priceCents: normaliseNumber(item.unitAmountCents, 0),
    currency: (item.currency ?? metadata.currency ?? 'USD').toUpperCase(),
    billingInterval: item.billingInterval ?? metadata.billingInterval ?? 'monthly',
    tierLabel: display.tierLabel ?? metadata.tierLabel ?? null,
    features,
    recommended: Boolean(display.recommended ?? metadata.recommended ?? false),
    ctaLabel: display.ctaLabel ?? metadata.ctaLabel ?? null,
    disclaimer: display.disclaimer ?? metadata.disclaimer ?? null,
    addons,
    sortOrder: normaliseNumber(display.order ?? metadata.order, Number.MAX_SAFE_INTEGER)
  };
}

export default class PricingCatalogueService {
  static async listPublicPlans({ tenantId = DEFAULT_TENANT_ID, limit = 20 } = {}) {
    const items = await MonetizationFinanceService.listCatalogItems({
      tenantId,
      status: 'active',
      limit
    });

    return items
      .map(mapPlan)
      .filter(Boolean)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.priceCents - b.priceCents;
      });
  }
}

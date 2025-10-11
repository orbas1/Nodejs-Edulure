import db from '../config/database.js';

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    countryCode: row.country_code,
    regionCode: row.region_code,
    ratePercentage: Number(row.rate_percentage),
    label: row.label,
    isDefault: Boolean(row.is_default),
    metadata: parseJson(row.metadata),
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    createdAt: row.created_at
  };
}

export default class CommerceTaxRateModel {
  static async resolve({ countryCode, regionCode }, connection = db) {
    const now = connection.fn.now();
    const baseQuery = connection('commerce_tax_rates')
      .where('country_code', countryCode)
      .andWhere((builder) => {
        builder.whereNull('effective_from').orWhere('effective_from', '<=', now);
      })
      .andWhere((builder) => {
        builder.whereNull('effective_until').orWhere('effective_until', '>=', now);
      })
      .orderBy([{ column: 'region_code', order: 'desc' }, { column: 'effective_from', order: 'desc' }]);

    let row = null;
    if (regionCode) {
      row = await baseQuery.clone().where('region_code', regionCode).first();
    }

    if (!row) {
      row = await baseQuery.clone().whereNull('region_code').andWhere({ is_default: true }).first();
    }

    if (!row) {
      row = await baseQuery.clone().whereNull('region_code').first();
    }

    return toDomain(row);
  }
}

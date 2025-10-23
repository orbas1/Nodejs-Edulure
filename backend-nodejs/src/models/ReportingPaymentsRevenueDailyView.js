import db from '../config/database.js';

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function normaliseNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toDateRange({ start, end }) {
  return [normaliseDate(start), normaliseDate(end)];
}

const TABLE = 'reporting_payments_revenue_daily';

export default class ReportingPaymentsRevenueDailyView {
  static async fetchDailySummaries({ start, end, currency }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return [];
    }

    const query = connection(TABLE)
      .select([
        'reporting_date as date',
        'currency',
        connection.raw('SUM(total_intents) as total_intents'),
        connection.raw('SUM(succeeded_intents) as succeeded_intents'),
        connection.raw('SUM(gross_volume_cents) as gross_volume_cents'),
        connection.raw('SUM(discount_cents) as discount_cents'),
        connection.raw('SUM(tax_cents) as tax_cents'),
        connection.raw('SUM(refunded_cents) as refunded_cents'),
        connection.raw('SUM(recognised_volume_cents) as recognised_volume_cents')
      ])
      .whereBetween('reporting_date', [startDate, endDate]);

    if (currency) {
      query.andWhere('currency', currency.toUpperCase());
    }

    const rows = await query.groupBy('reporting_date', 'currency').orderBy('reporting_date', 'asc');

    return rows.map((row) => ({
      date: normaliseDate(row.date),
      currency: row.currency,
      totalIntents: normaliseNumber(row.total_intents),
      succeededIntents: normaliseNumber(row.succeeded_intents),
      grossVolumeCents: normaliseNumber(row.gross_volume_cents),
      discountCents: normaliseNumber(row.discount_cents),
      taxCents: normaliseNumber(row.tax_cents),
      refundedCents: normaliseNumber(row.refunded_cents),
      recognisedVolumeCents: normaliseNumber(row.recognised_volume_cents)
    }));
  }

  static async fetchTotals({ start, end, currency }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return {
        grossVolumeCents: 0,
        recognisedVolumeCents: 0,
        discountCents: 0,
        taxCents: 0,
        refundedCents: 0,
        totalIntents: 0,
        succeededIntents: 0
      };
    }

    const query = connection(TABLE)
      .select([
        connection.raw('SUM(gross_volume_cents) as gross_volume_cents'),
        connection.raw('SUM(recognised_volume_cents) as recognised_volume_cents'),
        connection.raw('SUM(discount_cents) as discount_cents'),
        connection.raw('SUM(tax_cents) as tax_cents'),
        connection.raw('SUM(refunded_cents) as refunded_cents'),
        connection.raw('SUM(total_intents) as total_intents'),
        connection.raw('SUM(succeeded_intents) as succeeded_intents')
      ])
      .whereBetween('reporting_date', [startDate, endDate]);

    if (currency) {
      query.andWhere('currency', currency.toUpperCase());
    }

    const row = await query.first();

    return {
      grossVolumeCents: normaliseNumber(row?.gross_volume_cents),
      recognisedVolumeCents: normaliseNumber(row?.recognised_volume_cents),
      discountCents: normaliseNumber(row?.discount_cents),
      taxCents: normaliseNumber(row?.tax_cents),
      refundedCents: normaliseNumber(row?.refunded_cents),
      totalIntents: normaliseNumber(row?.total_intents),
      succeededIntents: normaliseNumber(row?.succeeded_intents)
    };
  }
}


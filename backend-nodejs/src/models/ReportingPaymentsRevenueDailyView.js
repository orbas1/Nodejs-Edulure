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

function normaliseCurrency(value) {
  if (!value && value !== 0) {
    return null;
  }
  const normalised = String(value).trim().toUpperCase().slice(0, 8);
  return normalised || null;
}

function parseCurrencies(input) {
  if (!input) {
    return [];
  }

  const values = Array.isArray(input)
    ? input
    : String(input)
        .split(',')
        .map((value) => value.trim());

  const unique = new Set();
  for (const value of values) {
    const normalised = normaliseCurrency(value);
    if (!normalised) continue;
    unique.add(normalised);
  }

  return Array.from(unique.values());
}

function generateDateSeries(startDate, endDate) {
  const series = [];
  if (!startDate || !endDate) {
    return series;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return series;
  }

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  for (
    let cursor = new Date(start.getTime());
    cursor.getTime() <= end.getTime();
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    series.push(cursor.toISOString().slice(0, 10));
  }

  return series;
}

function fillMissingDays(rows, startDate, endDate, currencies = []) {
  if (!rows.length) {
    return rows;
  }

  const series = generateDateSeries(startDate, endDate);
  if (!series.length) {
    return rows;
  }

  const currencySet = new Set(
    currencies.length ? currencies : rows.map((row) => normaliseCurrency(row.currency) ?? row.currency)
  );
  const lookup = new Map(
    rows.map((row) => {
      const currency = normaliseCurrency(row.currency) ?? row.currency;
      return [`${currency}:${row.date}`, { ...row, currency }];
    })
  );
  const filled = [];

  for (const currency of currencySet) {
    for (const date of series) {
      const key = `${currency}:${date}`;
      if (lookup.has(key)) {
        filled.push(lookup.get(key));
        continue;
      }

      filled.push({
        date,
        currency,
        totalIntents: 0,
        succeededIntents: 0,
        grossVolumeCents: 0,
        discountCents: 0,
        taxCents: 0,
        refundedCents: 0,
        recognisedVolumeCents: 0
      });
    }
  }

  return filled.sort((a, b) => {
    if (a.date === b.date) {
      return a.currency.localeCompare(b.currency);
    }
    return a.date.localeCompare(b.date);
  });
}

const TABLE = 'reporting_payments_revenue_daily';

export default class ReportingPaymentsRevenueDailyView {
  static async fetchDailySummaries({ start, end, currencies } = {}, connection = db, options = {}) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return [];
    }

    const currencyFilter = parseCurrencies(currencies);

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
      .whereBetween('reporting_date', [startDate, endDate])
      .groupBy('reporting_date', 'currency')
      .orderBy('reporting_date', 'asc');

    if (currencyFilter.length) {
      query.whereIn('currency', currencyFilter);
    }

    const rows = await query;

    const normalised = rows.map((row) => {
      const date = normaliseDate(row.date);
      const currency = normaliseCurrency(row.currency) ?? row.currency ?? null;
      return {
        date,
        currency,
        totalIntents: normaliseNumber(row.total_intents),
        succeededIntents: normaliseNumber(row.succeeded_intents),
        grossVolumeCents: normaliseNumber(row.gross_volume_cents),
        discountCents: normaliseNumber(row.discount_cents),
        taxCents: normaliseNumber(row.tax_cents),
        refundedCents: normaliseNumber(row.refunded_cents),
        recognisedVolumeCents: normaliseNumber(row.recognised_volume_cents)
      };
    });

    if (!options.fillGaps) {
      return normalised;
    }

    return fillMissingDays(normalised, startDate, endDate, currencyFilter);
  }

  static async fetchTotals({ start, end, currencies } = {}, connection = db) {
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

    const currencyFilter = parseCurrencies(currencies);

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

    if (currencyFilter.length) {
      query.whereIn('currency', currencyFilter);
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


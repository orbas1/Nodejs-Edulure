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

const TABLE = 'reporting_course_enrollment_daily';

export default class ReportingCourseEnrollmentDailyView {
  static async fetchDailySummaries({ start, end }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'reporting_date as date',
        connection.raw('SUM(enrollment_count) as enrollments'),
        connection.raw('SUM(completed_count) as completions'),
        connection.raw('AVG(average_progress_percent) as avg_progress'),
        connection.raw('SUM(recognised_revenue_cents) as recognised_revenue_cents')
      ])
      .whereBetween('reporting_date', [startDate, endDate])
      .groupBy('reporting_date')
      .orderBy('reporting_date', 'asc');

    return rows.map((row) => ({
      date: normaliseDate(row.date),
      enrollments: normaliseNumber(row.enrollments),
      completions: normaliseNumber(row.completions),
      averageProgressPercent: Number(normaliseNumber(row.avg_progress).toFixed(2)),
      recognisedRevenueCents: normaliseNumber(row.recognised_revenue_cents)
    }));
  }

  static async fetchCategoryBreakdown({ start, end }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'category',
        'delivery_format as deliveryFormat',
        'level',
        connection.raw('SUM(enrollment_count) as enrollments'),
        connection.raw('SUM(completed_count) as completions'),
        connection.raw('AVG(average_progress_percent) as avg_progress'),
        connection.raw('SUM(recognised_revenue_cents) as recognised_revenue_cents')
      ])
      .whereBetween('reporting_date', [startDate, endDate])
      .groupBy('category', 'delivery_format', 'level')
      .orderBy('category', 'asc');

    return rows.map((row) => ({
      category: row.category,
      deliveryFormat: row.deliveryFormat,
      level: row.level,
      enrollments: normaliseNumber(row.enrollments),
      completions: normaliseNumber(row.completions),
      averageProgressPercent: Number(normaliseNumber(row.avg_progress).toFixed(2)),
      recognisedRevenueCents: normaliseNumber(row.recognised_revenue_cents)
    }));
  }

  static async fetchTotals({ start, end }, connection = db) {
    const [startDate, endDate] = toDateRange({ start, end });
    if (!startDate || !endDate) {
      return {
        enrollments: 0,
        completions: 0,
        recognisedRevenueCents: 0,
        averageProgressPercent: 0
      };
    }

    const row = await connection(TABLE)
      .select([
        connection.raw('SUM(enrollment_count) as enrollments'),
        connection.raw('SUM(completed_count) as completions'),
        connection.raw('AVG(average_progress_percent) as avg_progress'),
        connection.raw('SUM(recognised_revenue_cents) as recognised_revenue_cents')
      ])
      .whereBetween('reporting_date', [startDate, endDate])
      .first();

    return {
      enrollments: normaliseNumber(row?.enrollments),
      completions: normaliseNumber(row?.completions),
      recognisedRevenueCents: normaliseNumber(row?.recognised_revenue_cents),
      averageProgressPercent: Number(normaliseNumber(row?.avg_progress).toFixed(2))
    };
  }
}


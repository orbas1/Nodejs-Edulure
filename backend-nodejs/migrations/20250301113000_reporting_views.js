const VIEWS = [
  {
    name: 'reporting_course_enrollment_daily',
    definition: `
      CREATE OR REPLACE VIEW reporting_course_enrollment_daily AS
      SELECT
        DATE(ce.started_at) AS reporting_date,
        c.category,
        c.delivery_format,
        c.level,
        COUNT(*) AS enrollment_count,
        SUM(CASE WHEN ce.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
        AVG(ce.progress_percent) AS average_progress_percent,
        SUM(CASE WHEN ce.status = 'completed' THEN c.price_amount ELSE 0 END) AS recognised_revenue_cents
      FROM course_enrollments ce
      INNER JOIN courses c ON c.id = ce.course_id
      GROUP BY DATE(ce.started_at), c.category, c.delivery_format, c.level
    `
  },
  {
    name: 'reporting_community_engagement_daily',
    definition: `
      CREATE OR REPLACE VIEW reporting_community_engagement_daily AS
      SELECT
        DATE(p.published_at) AS reporting_date,
        p.community_id,
        COUNT(*) AS published_posts,
        SUM(p.comment_count) AS comment_count,
        SUM(COALESCE(JSON_LENGTH(p.tags), 0)) AS tag_applications,
        SUM(CASE WHEN p.visibility = 'public' THEN 1 ELSE 0 END) AS public_posts,
        SUM(CASE WHEN p.post_type = 'event' THEN 1 ELSE 0 END) AS event_posts
      FROM community_posts p
      WHERE p.published_at IS NOT NULL
      GROUP BY DATE(p.published_at), p.community_id
    `
  },
  {
    name: 'reporting_payments_revenue_daily',
    definition: `
      CREATE OR REPLACE VIEW reporting_payments_revenue_daily AS
      SELECT
        DATE(pi.created_at) AS reporting_date,
        pi.currency,
        COUNT(*) AS total_intents,
        SUM(CASE WHEN pi.status = 'succeeded' THEN 1 ELSE 0 END) AS succeeded_intents,
        SUM(pi.amount_total) AS gross_volume_cents,
        SUM(pi.amount_discount) AS discount_cents,
        SUM(pi.amount_tax) AS tax_cents,
        SUM(pi.amount_refunded) AS refunded_cents,
        SUM(CASE WHEN pi.status = 'succeeded' THEN pi.amount_total ELSE 0 END) AS recognised_volume_cents
      FROM payment_intents pi
      GROUP BY DATE(pi.created_at), pi.currency
    `
  }
];

export async function up(knex) {
  for (const view of VIEWS) {
    await knex.raw(view.definition);
  }
}

export async function down(knex) {
  for (const view of VIEWS) {
    await knex.raw(`DROP VIEW IF EXISTS ${view.name}`);
  }
}

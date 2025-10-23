INSERT INTO acquisition_plans (
  public_id,
  slug,
  name,
  description,
  amount_cents,
  currency,
  billing_interval,
  best_value,
  badge,
  features,
  metadata
) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'cohort-foundation',
    'Cohort Foundation',
    'Launch your first live cohort with guided templates, instructor onboarding, and analytics snapshots.',
    12900,
    'USD',
    'monthly',
    0,
    'Starter',
    JSON_ARRAY(
      'Live cohort calendar orchestration',
      'Async library with two flagship programs',
      'Community feed moderation toolkit'
    ),
    JSON_OBJECT(
      'hero', JSON_OBJECT(
        'title', 'Compare cohort-ready learning plans',
        'subtitle', 'Bundle asynchronous libraries, live cohorts, and instructor support into the right subscription for your team.',
        'badge', 'Course catalogue',
        'chips', JSON_ARRAY('Live cohorts', 'Async companions', 'Enterprise-ready controls'),
        'primaryCta', JSON_OBJECT('label', 'Compare plans', 'href', '#course-plans'),
        'secondaryCta', JSON_OBJECT('label', 'Talk to sales', 'href', 'mailto:sales@edulure.com'),
        'tertiaryCta', JSON_OBJECT('label', 'Download overview', 'href', '/assets/catalogue-overview.pdf'),
        'planTitle', 'Compare plans',
        'planDescription', 'Select the plan that matches your cohort mix. Upsell descriptors highlight optional add-ons.'
      ),
      'planComparisonTitle', 'Learning plans',
      'planComparisonDescription', 'Decide how much instructor support and automation you need for upcoming launches.'
    )
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'growth-studio',
    'Growth Studio',
    'Blend async and live delivery with automations, instructor pods, and branded learner experiences.',
    21900,
    'USD',
    'monthly',
    1,
    'Most popular',
    JSON_ARRAY(
      'Automated cohort waitlists and reminders',
      'Instructor pods with shared analytics dashboards',
      'Resource gating, DRM controls, and campaign insights'
    ),
    JSON_OBJECT('planComparisonTitle', 'Learning plans')
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'enterprise-orbit',
    'Enterprise Orbit',
    'Enterprise-grade governance with SOC2 documentation, SSO, custom analytics exports, and concierge onboarding.',
    48900,
    'USD',
    'monthly',
    0,
    'Enterprise',
    JSON_ARRAY(
      'Dedicated concierge and migration support',
      'Custom analytics warehouse exports',
      'Advanced governance with audit-ready controls'
    ),
    JSON_OBJECT('planComparisonTitle', 'Learning plans')
  );

INSERT INTO acquisition_plan_addons (
  plan_id,
  public_id,
  slug,
  name,
  description,
  amount_cents,
  currency,
  billing_interval,
  optional,
  upsell_descriptor,
  metadata
) VALUES
  (
    (SELECT id FROM acquisition_plans WHERE slug = 'growth-studio' LIMIT 1),
    '44444444-4444-4444-8444-444444444444',
    'community-bundle',
    'Community bundle',
    'Unlock premium community analytics, sponsor placements, and ambassador tooling.',
    7900,
    'USD',
    'monthly',
    1,
    'Optional add-on · recommended for >200 members',
    JSON_OBJECT('surface', 'courses')
  ),
  (
    (SELECT id FROM acquisition_plans WHERE slug = 'enterprise-orbit' LIMIT 1),
    '55555555-5555-4555-8555-555555555555',
    'whiteglove-onboarding',
    'White-glove onboarding',
    'Concierge-led migration with curriculum audits, compliance review, and instructor enablement.',
    12900,
    'USD',
    'one_time',
    0,
    'Included in enterprise pilots · optional for upgrades',
    JSON_OBJECT('surface', 'courses')
  );

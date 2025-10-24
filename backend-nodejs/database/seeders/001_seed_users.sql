INSERT INTO users (
  first_name,
  last_name,
  email,
  password_hash,
  role,
  age,
  address,
  two_factor_enabled,
  two_factor_enrolled_at,
  two_factor_last_verified_at,
  email_verified_at,
  last_login_at,
  password_changed_at,
  last_verification_sent_at
)
VALUES
  (
    'Alex',
    'Morgan',
    'alex@edulure.com',
    '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq',
    'admin',
    34,
    'London, UK',
    1,
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    NOW()
  ),
  (
    'Jordan',
    'Lee',
    'jordan@edulure.com',
    '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq',
    'instructor',
    29,
    'Austin, US',
    0,
    NULL,
    NULL,
    NOW(),
    NOW(),
    NULL,
    NOW()
  ),
  (
    'Sasha',
    'Flores',
    'sasha@edulure.com',
    '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq',
    'user',
    31,
    'Toronto, CA',
    0,
    NULL,
    NULL,
    NOW(),
    NOW(),
    NULL,
    NOW()
  )
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  age = VALUES(age),
  address = VALUES(address),
  two_factor_enabled = VALUES(two_factor_enabled),
  two_factor_enrolled_at = VALUES(two_factor_enrolled_at),
  two_factor_last_verified_at = VALUES(two_factor_last_verified_at),
  email_verified_at = VALUES(email_verified_at),
  last_login_at = VALUES(last_login_at),
  password_changed_at = VALUES(password_changed_at),
  last_verification_sent_at = VALUES(last_verification_sent_at);

INSERT INTO users (
  first_name,
  last_name,
  email,
  password_hash,
  role,
  dashboard_preferences,
  unread_community_count,
  pending_payouts,
  active_live_room,
  email_verified_at,
  failed_login_attempts,
  last_login_at,
  password_changed_at,
  two_factor_enabled,
  two_factor_enrolled_at,
  two_factor_last_verified_at
)
VALUES
  (
    'Kai',
    'Watanabe',
    'kai.watanabe@edulure.test',
    '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq',
    'instructor',
    JSON_OBJECT('pinnedNavigation', JSON_ARRAY('instructor-studio', 'instructor-clients')),
    5,
    1,
    JSON_OBJECT(
      'id', 'live_course_build',
      'title', 'Cohort design working session',
      'startedAt', DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%sZ'),
      'courseId', 'course-automation-fundamentals',
      'role', 'instructor',
      'roomUrl', 'https://live.edulure.test/cohort-design'
    ),
    NOW(),
    0,
    NOW(),
    NOW(),
    0,
    NULL,
    NULL
  ),
  (
    'Noemi',
    'Carvalho',
    'noemi.carvalho@edulure.test',
    '$2a$10$D9S1mNqE9iHtlxgKOnY7Ge.2vB1hQn8sahFtF8DWZth/.RXRcvsrq',
    'user',
    JSON_OBJECT('pinnedNavigation', JSON_ARRAY('learner-community')),
    7,
    0,
    NULL,
    NOW(),
    0,
    NOW(),
    NOW(),
    0,
    NULL,
    NULL
  )
ON DUPLICATE KEY UPDATE
  dashboard_preferences = VALUES(dashboard_preferences),
  unread_community_count = VALUES(unread_community_count),
  pending_payouts = VALUES(pending_payouts),
  active_live_room = VALUES(active_live_room),
  email_verified_at = VALUES(email_verified_at),
  last_login_at = VALUES(last_login_at),
  password_changed_at = VALUES(password_changed_at),
  failed_login_attempts = VALUES(failed_login_attempts),
  two_factor_enabled = VALUES(two_factor_enabled),
  two_factor_enrolled_at = VALUES(two_factor_enrolled_at),
  two_factor_last_verified_at = VALUES(two_factor_last_verified_at);

INSERT INTO learner_system_preferences (
  user_id,
  language,
  region,
  timezone,
  notifications_enabled,
  digest_enabled,
  auto_play_media,
  high_contrast,
  reduced_motion,
  preferences
)
SELECT
  id,
  'en',
  'US',
  'America/New_York',
  1,
  1,
  0,
  0,
  0,
  JSON_OBJECT(
    'interfaceDensity', 'comfortable',
    'analyticsOptIn', TRUE,
    'subtitleLanguage', 'en',
    'audioDescription', FALSE,
    'adPersonalisation', TRUE,
    'sponsoredHighlights', TRUE,
    'adDataUsageAcknowledged', TRUE,
    'recommendedTopics', JSON_ARRAY('community-building', 'learner-success', 'automation'),
    'recommendationPreview', JSON_ARRAY(
      JSON_OBJECT(
        'id', 'course-async-leadership',
        'title', 'Design async learning rituals',
        'category', 'Course',
        'descriptor', 'Course • 6 lessons',
        'imageUrl', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80'
      ),
      JSON_OBJECT(
        'id', 'community-cohort-kickoff',
        'title', 'Launch your next cohort with confidence',
        'category', 'Playbook',
        'descriptor', 'Guide • 12 steps',
        'imageUrl', 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80'
      ),
      JSON_OBJECT(
        'id', 'ops-automation',
        'title', 'Automate learner check-ins',
        'category', 'Workflow',
        'descriptor', 'Automation • 4 rules',
        'imageUrl', 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80'
      )
    )
  )
FROM users
WHERE email = 'noemi.carvalho@edulure.test'
ON DUPLICATE KEY UPDATE
  language = VALUES(language),
  region = VALUES(region),
  timezone = VALUES(timezone),
  notifications_enabled = VALUES(notifications_enabled),
  digest_enabled = VALUES(digest_enabled),
  auto_play_media = VALUES(auto_play_media),
  high_contrast = VALUES(high_contrast),
  reduced_motion = VALUES(reduced_motion),
  preferences = VALUES(preferences);

INSERT INTO learner_financial_profiles (
  user_id,
  auto_pay_enabled,
  reserve_target_cents,
  preferences
)
SELECT
  id,
  1,
  250000,
  JSON_OBJECT(
    'currency', 'USD',
    'taxId', 'US-22-1234567',
    'invoiceDelivery', 'email',
    'payoutSchedule', 'monthly',
    'expensePolicyUrl', 'https://cdn.edulure.test/docs/expense-policy.pdf',
    'collectionMethod', 'Automatic card collection',
    'supportTier', 'Priority success desk',
    'supportNotes', 'Finance desk available via dedicated Slack channel with four-hour SLA.',
    'renewalTerm', 'Annual membership · Net 30 invoicing cadence',
    'renewalNotes', 'Renews automatically each January unless cancelled 30 days prior.',
    'seatUsage', JSON_OBJECT('used', 18, 'total', 25),
    'alerts', JSON_OBJECT(
      'sendEmail', TRUE,
      'sendSms', FALSE,
      'escalationEmail', 'finance-alerts@edulure.test',
      'notifyThresholdPercent', 80
    ),
    'reimbursements', JSON_OBJECT(
      'enabled', TRUE,
      'instructions', 'Submit receipts within 30 days via the finance workspace.'
    ),
    'documents', JSON_ARRAY(
      JSON_OBJECT(
        'name', 'W-9 tax form',
        'url', 'https://cdn.edulure.test/docs/seed-w9.pdf',
        'uploadedAt', '2024-01-10T10:30:00Z'
      )
    )
  )
FROM users
WHERE email = 'noemi.carvalho@edulure.test'
ON DUPLICATE KEY UPDATE
  auto_pay_enabled = VALUES(auto_pay_enabled),
  reserve_target_cents = VALUES(reserve_target_cents),
  preferences = VALUES(preferences);

INSERT INTO learner_payment_methods (
  user_id,
  label,
  brand,
  last4,
  expiry,
  is_primary,
  metadata
)
SELECT
  id,
  'Academy Visa',
  'visa',
  '4242',
  '12/26',
  1,
  JSON_OBJECT(
    'funding', 'credit',
    'country', 'US',
    'fingerprint', 'seeded-visa-fingerprint'
  )
FROM users
WHERE email = 'noemi.carvalho@edulure.test'
ON DUPLICATE KEY UPDATE
  brand = VALUES(brand),
  last4 = VALUES(last4),
  expiry = VALUES(expiry),
  is_primary = VALUES(is_primary),
  metadata = VALUES(metadata);

INSERT INTO learner_billing_contacts (
  user_id,
  name,
  email,
  phone,
  company,
  metadata
)
SELECT
  id,
  'Finance Desk',
  'finance@edulure.test',
  '+1-555-0123',
  'Edulure Academy',
  JSON_OBJECT('role', 'Billing owner', 'notes', 'Handles renewals and payment escalations.')
FROM users
WHERE email = 'noemi.carvalho@edulure.test'
ON DUPLICATE KEY UPDATE
  phone = VALUES(phone),
  company = VALUES(company),
  metadata = VALUES(metadata);

INSERT INTO learner_finance_purchases (
  user_id,
  reference,
  description,
  amount_cents,
  currency,
  status,
  purchased_at,
  metadata
)
SELECT
  id,
  'EDU-INV-2024-001',
  'Annual academy membership renewal',
  180000,
  'USD',
  'paid',
  '2024-01-05 14:30:00',
  JSON_OBJECT('invoiceUrl', 'https://cdn.edulure.test/invoices/EDU-INV-2024-001.pdf')
FROM users
WHERE email = 'noemi.carvalho@edulure.test'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  amount_cents = VALUES(amount_cents),
  status = VALUES(status),
  purchased_at = VALUES(purchased_at),
  metadata = VALUES(metadata);

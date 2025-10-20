import knex from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import MonetizationCatalogItemModel from '../src/models/MonetizationCatalogItemModel.js';
import MonetizationReconciliationRunModel from '../src/models/MonetizationReconciliationRunModel.js';
import MonetizationRevenueScheduleModel from '../src/models/MonetizationRevenueScheduleModel.js';
import MonetizationUsageRecordModel from '../src/models/MonetizationUsageRecordModel.js';
import PaymentCouponModel from '../src/models/PaymentCouponModel.js';
import PaymentIntentModel from '../src/models/PaymentIntentModel.js';
import PaymentRefundModel from '../src/models/PaymentRefundModel.js';
import PlatformSettingModel from '../src/models/PlatformSettingModel.js';
import PodcastEpisodeModel from '../src/models/PodcastEpisodeModel.js';
import PodcastShowModel from '../src/models/PodcastShowModel.js';
import ProviderTransitionAcknowledgementModel from '../src/models/ProviderTransitionAcknowledgementModel.js';
import ProviderTransitionAnnouncementModel from '../src/models/ProviderTransitionAnnouncementModel.js';
import ProviderTransitionResourceModel from '../src/models/ProviderTransitionResourceModel.js';
import ProviderTransitionStatusUpdateModel from '../src/models/ProviderTransitionStatusUpdateModel.js';
import ProviderTransitionTimelineEntryModel from '../src/models/ProviderTransitionTimelineEntryModel.js';
import ReleaseChecklistItemModel from '../src/models/ReleaseChecklistItemModel.js';
import ReleaseGateResultModel from '../src/models/ReleaseGateResultModel.js';
import ReleaseRunModel from '../src/models/ReleaseRunModel.js';
import ReportingCommunityEngagementDailyView from '../src/models/ReportingCommunityEngagementDailyView.js';
import DataEncryptionService from '../src/services/DataEncryptionService.js';

let connection;

const TABLES = [
  'monetization_catalog_items',
  'monetization_reconciliation_runs',
  'monetization_revenue_schedules',
  'monetization_usage_records',
  'payment_coupon_redemptions',
  'payment_coupons',
  'payment_intents',
  'payment_refunds',
  'platform_settings',
  'podcast_episodes',
  'podcast_shows',
  'provider_transition_acknowledgements',
  'provider_transition_announcements',
  'provider_transition_resources',
  'provider_transition_status_updates',
  'provider_transition_timeline_entries',
  'release_gate_results',
  'release_checklist_items',
  'release_runs',
  'reporting_community_engagement_daily',
  'communities',
  'users'
];

async function createSchema(knexInstance) {
  await knexInstance.schema.createTable('monetization_catalog_items', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.string('tenant_id').notNullable();
    table.string('product_code').notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.string('pricing_model');
    table.string('billing_interval');
    table.string('revenue_recognition_method');
    table.integer('recognition_duration_days');
    table.integer('unit_amount_cents');
    table.string('currency');
    table.string('usage_metric');
    table.string('revenue_account');
    table.string('deferred_revenue_account');
    table.text('metadata');
    table.string('status');
    table.timestamp('effective_from');
    table.timestamp('effective_to');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
    table.timestamp('retired_at');
  });

  await knexInstance.schema.createTable('monetization_reconciliation_runs', (table) => {
    table.increments('id');
    table.string('tenant_id').notNullable();
    table.timestamp('window_start').notNullable();
    table.timestamp('window_end').notNullable();
    table.string('status').notNullable();
    table.integer('invoiced_cents');
    table.integer('usage_cents');
    table.integer('recognized_cents');
    table.integer('deferred_cents');
    table.integer('variance_cents');
    table.decimal('variance_ratio');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('monetization_revenue_schedules', (table) => {
    table.increments('id');
    table.string('tenant_id').notNullable();
    table.string('payment_intent_id');
    table.integer('catalog_item_id');
    table.integer('usage_record_id');
    table.string('product_code');
    table.string('status');
    table.string('recognition_method');
    table.timestamp('recognition_start');
    table.timestamp('recognition_end');
    table.integer('amount_cents');
    table.integer('recognized_amount_cents');
    table.string('currency');
    table.string('revenue_account');
    table.string('deferred_revenue_account');
    table.timestamp('recognized_at');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('monetization_usage_records', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.string('tenant_id').notNullable();
    table.integer('catalog_item_id');
    table.string('product_code');
    table.string('account_reference');
    table.integer('user_id');
    table.timestamp('usage_date');
    table.decimal('quantity');
    table.integer('unit_amount_cents');
    table.integer('amount_cents');
    table.string('currency');
    table.string('source');
    table.string('external_reference');
    table.string('payment_intent_id');
    table.text('metadata');
    table.timestamp('recorded_at');
    table.timestamp('processed_at');
  });

  await knexInstance.schema.createTable('payment_coupons', (table) => {
    table.increments('id');
    table.string('code').notNullable();
    table.string('name');
    table.text('description');
    table.string('discount_type');
    table.decimal('discount_value');
    table.string('currency');
    table.integer('max_redemptions');
    table.integer('per_user_limit');
    table.integer('times_redeemed').defaultTo(0);
    table.boolean('is_stackable').defaultTo(false);
    table.string('status');
    table.timestamp('valid_from');
    table.timestamp('valid_until');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
    table.timestamp('archived_at');
  });

  await knexInstance.schema.createTable('payment_coupon_redemptions', (table) => {
    table.increments('id');
    table.integer('coupon_id').notNullable();
    table.string('payment_intent_id');
    table.integer('user_id');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('payment_intents', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.integer('user_id');
    table.string('provider');
    table.string('provider_intent_id');
    table.string('provider_capture_id');
    table.string('provider_latest_charge_id');
    table.string('status');
    table.string('currency');
    table.integer('amount_subtotal');
    table.integer('amount_discount');
    table.integer('amount_tax');
    table.integer('amount_total');
    table.integer('amount_refunded');
    table.text('tax_breakdown');
    table.text('metadata');
    table.integer('coupon_id');
    table.string('entity_type');
    table.string('entity_id');
    table.string('receipt_email');
    table.timestamp('captured_at');
    table.timestamp('canceled_at');
    table.timestamp('expires_at');
    table.string('failure_code');
    table.string('failure_message');
    table.binary('sensitive_details_ciphertext');
    table.string('sensitive_details_hash');
    table.string('classification_tag');
    table.string('encryption_key_version');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('payment_refunds', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.string('payment_intent_id');
    table.string('provider_refund_id');
    table.string('status');
    table.integer('amount');
    table.string('currency');
    table.string('reason');
    table.string('requested_by');
    table.timestamp('processed_at');
    table.string('failure_code');
    table.string('failure_message');
    table.binary('sensitive_details_ciphertext');
    table.string('sensitive_details_hash');
    table.string('classification_tag');
    table.string('encryption_key_version');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('platform_settings', (table) => {
    table.increments('id');
    table.string('key').unique().notNullable();
    table.text('value');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('podcast_shows', (table) => {
    table.increments('id');
    table.integer('community_id');
    table.integer('owner_id');
    table.string('title');
    table.string('slug');
    table.string('subtitle');
    table.text('description');
    table.string('cover_image_url');
    table.string('category');
    table.string('status');
    table.boolean('is_public');
    table.string('distribution_channels');
    table.text('metadata');
    table.timestamp('launch_at');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('podcast_episodes', (table) => {
    table.increments('id');
    table.integer('show_id').notNullable();
    table.string('title');
    table.string('slug');
    table.text('summary');
    table.text('description');
    table.string('audio_url');
    table.string('video_url');
    table.integer('duration_seconds');
    table.integer('season_number');
    table.integer('episode_number');
    table.string('status');
    table.timestamp('publish_at');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('provider_transition_announcements', (table) => {
    table.increments('id');
    table.string('slug').unique();
    table.string('title');
    table.text('summary');
    table.text('body_markdown');
    table.string('status');
    table.timestamp('effective_from');
    table.timestamp('effective_to');
    table.boolean('ack_required');
    table.timestamp('ack_deadline');
    table.string('owner_email');
    table.string('tenant_scope');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('provider_transition_acknowledgements', (table) => {
    table.increments('id');
    table.integer('announcement_id');
    table.string('provider_reference');
    table.string('organisation_name');
    table.string('contact_name');
    table.string('contact_email');
    table.string('ack_method');
    table.boolean('follow_up_required');
    table.text('follow_up_notes');
    table.text('metadata');
    table.timestamp('acknowledged_at');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('provider_transition_resources', (table) => {
    table.increments('id');
    table.integer('announcement_id');
    table.string('label');
    table.string('url');
    table.string('type');
    table.string('locale');
    table.text('description');
    table.integer('sort_order');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('provider_transition_status_updates', (table) => {
    table.increments('id');
    table.integer('announcement_id');
    table.string('provider_reference');
    table.string('status_code');
    table.text('notes');
    table.timestamp('recorded_at');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('provider_transition_timeline_entries', (table) => {
    table.increments('id');
    table.integer('announcement_id');
    table.timestamp('occurs_on');
    table.string('headline');
    table.string('owner');
    table.string('cta_label');
    table.string('cta_url');
    table.text('details_markdown');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('release_checklist_items', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.string('slug').unique();
    table.string('category');
    table.string('title');
    table.text('description');
    table.boolean('auto_evaluated');
    table.integer('weight');
    table.string('default_owner_email');
    table.text('success_criteria');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('release_gate_results', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.integer('run_id');
    table.integer('checklist_item_id');
    table.string('gate_key');
    table.string('status');
    table.string('owner_email');
    table.text('metrics');
    table.text('notes');
    table.string('evidence_url');
    table.timestamp('last_evaluated_at');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('release_runs', (table) => {
    table.increments('id');
    table.uuid('public_id');
    table.string('version_tag');
    table.string('environment');
    table.string('status');
    table.string('initiated_by_email');
    table.string('initiated_by_name');
    table.timestamp('scheduled_at');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.timestamp('change_window_start');
    table.timestamp('change_window_end');
    table.text('summary_notes');
    table.text('checklist_snapshot');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(knexInstance.fn.now());
    table.timestamp('updated_at').defaultTo(knexInstance.fn.now());
  });

  await knexInstance.schema.createTable('reporting_community_engagement_daily', (table) => {
    table.increments('id');
    table.date('reporting_date');
    table.integer('community_id');
    table.integer('published_posts');
    table.integer('comment_count');
    table.integer('tag_applications');
    table.integer('public_posts');
    table.integer('event_posts');
  });

  await knexInstance.schema.createTable('communities', (table) => {
    table.increments('id');
    table.string('name');
  });

  await knexInstance.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('email');
    table.string('first_name');
    table.string('last_name');
  });
}

async function truncateAll(knexInstance) {
  for (const table of TABLES) {
    await knexInstance(table).delete();
  }
}

beforeAll(async () => {
  connection = knex({
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  });

  await createSchema(connection);
});

afterAll(async () => {
  if (connection) {
    await connection.destroy();
  }
});

beforeEach(async () => {
  await truncateAll(connection);
});

function iso(date) {
  return new Date(date).toISOString();
}

describe('Monetization catalog models', () => {
  it('creates and lists catalog items with normalization', async () => {
    const created = await MonetizationCatalogItemModel.create(
      {
        tenantId: 'Tenant-A',
        productCode: ' Pro Plan ',
        name: 'Pro Plan',
        currency: 'gbp',
        metadata: { tier: 'pro' }
      },
      connection
    );

    expect(created).toMatchObject({
      tenantId: 'tenant-a',
      productCode: 'pro-plan',
      currency: 'GBP',
      metadata: { tier: 'pro' }
    });

    const fetched = await MonetizationCatalogItemModel.findByProductCode('Tenant-A', 'PRO-PLAN', connection);
    expect(fetched?.id).toBe(created.id);

    const list = await MonetizationCatalogItemModel.list({ tenantId: 'tenant-a' }, connection);
    expect(list).toHaveLength(1);
    expect(await MonetizationCatalogItemModel.distinctTenants(connection)).toEqual(['tenant-a']);
  });

  it('creates reconciliation runs and returns latest for tenant', async () => {
    const created = await MonetizationReconciliationRunModel.create(
      {
        tenantId: 'tenant-b',
        windowStart: iso('2024-01-01T00:00:00Z'),
        windowEnd: iso('2024-01-31T23:59:59Z'),
        varianceRatio: 0.123456
      },
      connection
    );

    expect(created.varianceRatio).toBeCloseTo(0.1235, 4);

    const latest = await MonetizationReconciliationRunModel.latest({ tenantId: 'tenant-b' }, connection);
    expect(latest?.id).toBe(created.id);

    const list = await MonetizationReconciliationRunModel.list({ tenantId: 'tenant-b' }, connection);
    expect(list).toHaveLength(1);
  });

  it('handles revenue schedule recognition lifecycle', async () => {
    const schedule = await MonetizationRevenueScheduleModel.create(
      {
        tenantId: 'tenant-c',
        paymentIntentId: 'pi_test',
        productCode: 'bundle',
        amountCents: 5000,
        recognizedAmountCents: 0,
        metadata: { source: 'initial' }
      },
      connection
    );

    expect(schedule.status).toBe('pending');

    const recognized = await MonetizationRevenueScheduleModel.markRecognized(
      schedule.id,
      { recognizedAt: iso('2024-02-01T00:00:00Z') },
      connection
    );
    expect(recognized.status).toBe('recognized');
    expect(recognized.recognizedAmountCents).toBe(5000);

    const reduced = await MonetizationRevenueScheduleModel.reduceRecognizedAmount(
      schedule.id,
      2000,
      { reason: 'partial refund' },
      connection
    );
    expect(reduced.recognizedAmountCents).toBe(3000);

    const summary = await MonetizationRevenueScheduleModel.sumRecognizedForWindow(
      { tenantId: 'tenant-c', start: '2024-01-01', end: '2024-12-31' },
      connection
    );
    expect(summary).toBe(3000);
  });

  it('upserts usage records by external reference', async () => {
    const created = await MonetizationUsageRecordModel.create(
      {
        tenantId: 'tenant-d',
        productCode: 'usage',
        accountReference: 'acct-1',
        quantity: 1.5,
        unitAmountCents: 200,
        externalReference: 'ext-1',
        usageDate: '2024-03-01T00:00:00Z'
      },
      connection
    );

    expect(created.amountCents).toBe(300);

    const updated = await MonetizationUsageRecordModel.upsertByExternalReference(
      {
        tenantId: 'tenant-d',
        productCode: 'usage',
        accountReference: 'acct-1',
        quantity: 2,
        unitAmountCents: 250,
        externalReference: 'ext-1',
        processedAt: iso('2024-03-01T00:00:00Z')
      },
      connection
    );

    expect(updated.amountCents).toBe(500);
    expect(updated.processedAt).toBe(iso('2024-03-01T00:00:00.000Z'));

    const sum = await MonetizationUsageRecordModel.sumForWindow(
      { tenantId: 'tenant-d', start: '2024-01-01', end: '2024-12-31' },
      connection
    );
    expect(sum).toBe(500);
  });
});

describe('Payments models', () => {
  it('retrieves coupons respecting limits and currency', async () => {
    const evaluationDate = new Date('2024-05-01T00:00:00Z');

    await connection('payment_coupons').insert({
      code: 'SAVE10',
      name: 'Save 10',
      discount_type: 'fixed_amount',
      discount_value: 1000,
      currency: 'USD',
      max_redemptions: 5,
      per_user_limit: 2,
      times_redeemed: 1,
      is_stackable: 0,
      status: 'active',
      valid_from: new Date('2024-01-01T00:00:00Z'),
      valid_until: new Date('2024-12-31T00:00:00Z'),
      metadata: JSON.stringify({})
    });

    const coupon = await PaymentCouponModel.findActiveForRedemption(
      'save10',
      'USD',
      connection,
      evaluationDate
    );
    expect(coupon).toMatchObject({ code: 'SAVE10', timesRedeemed: 1 });

    const countBefore = await PaymentCouponModel.countUserRedemptions(coupon.id, 42, connection);
    expect(countBefore).toBe(0);

    await PaymentCouponModel.recordRedemption(
      { couponId: coupon.id, paymentIntentId: 'pi_record', userId: 42 },
      connection
    );

    const countAfter = await PaymentCouponModel.countUserRedemptions(coupon.id, 42, connection);
    expect(countAfter).toBe(1);

    const refreshed = await PaymentCouponModel.findById(coupon.id, connection);
    expect(refreshed?.timesRedeemed).toBe(2);
  });

  it('creates and updates payment intents with encrypted sensitive details', async () => {
    const intent = await PaymentIntentModel.create(
      {
        publicId: 'pi_public',
        userId: 7,
        provider: 'stripe',
        providerIntentId: 'pi_provider',
        providerCaptureId: 'cap_123',
        providerLatestChargeId: 'ch_123',
        currency: 'eur',
        amountSubtotal: 1000,
        amountTotal: 1200,
        entityType: 'course',
        entityId: 'course-1',
        receiptEmail: 'payer@example.com',
        failureCode: 'init',
        failureMessage: 'initial failure'
      },
      connection
    );

    const expectedFingerprint = DataEncryptionService.hash('pi_provider');
    expect(intent.currency).toBe('eur');
    expect(intent.providerIntentId).toBe(expectedFingerprint);
    expect(intent.receiptEmail).toBe('encrypted');
    expect(intent.sensitiveDetailsHash).toBeTruthy();

    const storedCiphertext = await connection('payment_intents')
      .select('sensitive_details_ciphertext')
      .where({ id: intent.id })
      .first();
    expect(Buffer.isBuffer(storedCiphertext.sensitive_details_ciphertext)).toBe(true);

    const lookupByProvider = await PaymentIntentModel.findByProviderIntentId('pi_provider', connection);
    expect(lookupByProvider?.publicId).toBe(intent.publicId);

    await PaymentIntentModel.updateByPublicId(
      intent.publicId,
      {
        status: 'requires_capture',
        receiptEmail: 'payer+updated@example.com',
        failureMessage: 'declined'
      },
      connection
    );

    const updated = await PaymentIntentModel.findByPublicId(intent.publicId, connection);
    expect(updated?.status).toBe('requires_capture');
    expect(updated?.receiptEmail).toBe('encrypted');
    expect(updated?.failureMessage).toBe('encrypted');

  });

  it('creates and updates payment refunds securely', async () => {
    const refund = await PaymentRefundModel.create(
      {
        publicId: 're_1',
        paymentIntentId: 'pi_public',
        providerRefundId: 'pr_123',
        amount: 600,
        currency: 'USD',
        reason: 'requested_by_customer',
        failureCode: 'init',
        failureMessage: 'initial failure'
      },
      connection
    );

    const expectedHash = DataEncryptionService.hash('pr_123');
    expect(refund.providerRefundId).toBe(expectedHash);
    expect(refund.sensitiveDetailsHash).toBeTruthy();

    const updated = await PaymentRefundModel.updateById(
      refund.id,
      {
        status: 'succeeded',
        failureCode: 'none',
        failureMessage: null,
        processedAt: iso('2024-04-01T00:00:00Z')
      },
      connection
    );

    expect(updated?.status).toBe('succeeded');
    expect(updated?.processedAt).toBe('2024-04-01T00:00:00.000Z');
    expect(updated?.failureMessage).toBeNull();
  });
});

describe('Platform settings', () => {
  it('upserts and fetches platform settings JSON payloads', async () => {
    const saved = await PlatformSettingModel.upsert('theme', { darkMode: true }, connection);
    expect(saved?.value).toEqual({ darkMode: true });

    const updated = await PlatformSettingModel.upsert('theme', { darkMode: false }, connection);
    expect(updated?.value).toEqual({ darkMode: false });

    const fetched = await PlatformSettingModel.findByKey('theme', connection);
    expect(fetched?.value).toEqual({ darkMode: false });
  });
});

describe('Podcast models', () => {
  it('manages shows and episodes with slug normalisation', async () => {
    const show = await PodcastShowModel.create(
      {
        title: 'Learning Lab',
        slug: 'Learning Lab',
        ownerId: 1,
        status: 'published',
        metadata: { category: 'education' }
      },
      connection
    );

    expect(show.slug).toBe('learning-lab');

    const updatedShow = await PodcastShowModel.updateById(
      show.id,
      { distributionChannels: ['spotify', 'apple'] },
      connection
    );
    expect(updatedShow.distributionChannels).toBe('spotify, apple');

    const episode = await PodcastEpisodeModel.create(
      {
        showId: show.id,
        title: 'Episode 1',
        slug: 'Episode 1',
        status: 'published',
        metadata: { duration: '10m' }
      },
      connection
    );

    expect(episode.slug).toBe('episode-1');

    const list = await PodcastEpisodeModel.listByShow(show.id, { status: 'published' }, connection);
    expect(list).toHaveLength(1);
    expect(await PodcastEpisodeModel.countByShow(show.id, { status: 'published' }, connection)).toBe(1);
  });
});

describe('Provider transition models', () => {
  it('upserts announcements and related artefacts', async () => {
    const announcement = await ProviderTransitionAnnouncementModel.upsert(
      {
        slug: 'transition-1',
        title: 'Transition Plan',
        status: 'active',
        effectiveFrom: iso(Date.now()),
        tenantScope: 'global'
      },
      { connection }
    );

    expect(announcement.slug).toBe('transition-1');

    const resources = await ProviderTransitionResourceModel.bulkReplace(
      announcement.id,
      [
        { label: 'Guide', url: 'https://example.com', type: 'guide', locale: 'en' },
        { label: 'FAQ', url: 'https://example.com/faq', type: 'faq', locale: 'en' }
      ],
      { connection }
    );
    expect(resources).toHaveLength(2);

    const timeline = await ProviderTransitionTimelineEntryModel.bulkReplace(
      announcement.id,
      [
        { occursOn: iso('2024-06-01T00:00:00Z'), headline: 'Kickoff', detailsMarkdown: 'Start' },
        { occursOn: iso('2024-07-01T00:00:00Z'), headline: 'Launch', detailsMarkdown: 'Go live' }
      ],
      { connection }
    );
    expect(timeline[0].headline).toBe('Kickoff');

    const acknowledgement = await ProviderTransitionAcknowledgementModel.upsertForContact(
      announcement.id,
      'contact@example.com',
      { organisationName: 'Acme', contactName: 'Alice' },
      { connection }
    );
    expect(acknowledgement.contactEmail).toBe('contact@example.com');

    const statusUpdate = await ProviderTransitionStatusUpdateModel.record(
      announcement.id,
      { statusCode: 'in_progress', notes: 'On track' },
      { connection }
    );
    expect(statusUpdate.statusCode).toBe('in_progress');

    const activeAnnouncements = await ProviderTransitionAnnouncementModel.listActive(
      { tenantScope: 'global', connection },
      connection
    );
    expect(activeAnnouncements).toHaveLength(1);
  });
});

describe('Release orchestration models', () => {
  it('handles checklist items and gate results', async () => {
    const checklist = await ReleaseChecklistItemModel.create(
      {
        slug: 'security-review',
        title: 'Security Review',
        weight: 5,
        successCriteria: { required: true }
      },
      connection
    );

    expect(checklist.successCriteria).toEqual({ required: true });

    const updatedChecklist = await ReleaseChecklistItemModel.updateBySlug(
      'security-review',
      { weight: 10 },
      connection
    );
    expect(updatedChecklist.weight).toBe(10);

    const run = await ReleaseRunModel.create(
      {
        publicId: 'run_1',
        versionTag: 'v1.0.0',
        environment: 'staging',
        checklistSnapshot: [checklist]
      },
      connection
    );

    const gate = await ReleaseGateResultModel.upsertByRunAndGate(
      run.id,
      'quality',
      { checklistItemId: checklist.id, status: 'passed', metrics: { score: 95 } },
      connection
    );

    expect(gate.status).toBe('passed');

    const breakdown = await ReleaseGateResultModel.getStatusSummary(run.id, connection);
    expect(breakdown.passed).toBe(1);

    const list = await ReleaseRunModel.list({ environment: 'staging' }, {}, connection);
    expect(list.total).toBe(1);
  });
});

describe('Reporting view', () => {
  it('aggregates community engagement metrics', async () => {
    await connection('communities').insert({ id: 1, name: 'Edulure Community' });

    await connection('reporting_community_engagement_daily').insert([
      {
        reporting_date: '2024-05-01',
        community_id: 1,
        published_posts: 5,
        comment_count: 12,
        tag_applications: 7,
        public_posts: 4,
        event_posts: 1
      },
      {
        reporting_date: '2024-05-02',
        community_id: 1,
        published_posts: 3,
        comment_count: 4,
        tag_applications: 2,
        public_posts: 2,
        event_posts: 0
      }
    ]);

    const daily = await ReportingCommunityEngagementDailyView.fetchDailySummaries(
      { start: '2024-05-01', end: '2024-05-02' },
      connection
    );
    expect(daily).toHaveLength(2);

    const top = await ReportingCommunityEngagementDailyView.fetchTopCommunities(
      { start: '2024-05-01', end: '2024-05-02' },
      connection
    );
    expect(top[0]).toMatchObject({ communityId: 1, posts: 8 });

    const totals = await ReportingCommunityEngagementDailyView.fetchTotals(
      { start: '2024-05-01', end: '2024-05-02' },
      connection
    );
    expect(totals).toEqual({ posts: 8, comments: 16, tags: 9, publicPosts: 6, eventPosts: 1 });
  });
});

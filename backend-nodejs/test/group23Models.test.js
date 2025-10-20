import knex from 'knex';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import MonetizationCatalogItemModel from '../src/models/MonetizationCatalogItemModel.js';
import MonetizationReconciliationRunModel from '../src/models/MonetizationReconciliationRunModel.js';
import MonetizationRevenueScheduleModel from '../src/models/MonetizationRevenueScheduleModel.js';
import MonetizationUsageRecordModel from '../src/models/MonetizationUsageRecordModel.js';
import PaymentCouponModel from '../src/models/PaymentCouponModel.js';
import PaymentIntentModel from '../src/models/PaymentIntentModel.js';
import PaymentLedgerEntryModel from '../src/models/PaymentLedgerEntryModel.js';
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

let connection;

const TABLE_ORDER = [
  'users',
  'communities',
  'monetization_catalog_items',
  'monetization_reconciliation_runs',
  'monetization_revenue_schedules',
  'monetization_usage_records',
  'payment_coupons',
  'payment_coupon_redemptions',
  'payment_intents',
  'payment_refunds',
  'payment_ledger_entries',
  'platform_settings',
  'podcast_shows',
  'podcast_episodes',
  'provider_transition_announcements',
  'provider_transition_acknowledgements',
  'provider_transition_resources',
  'provider_transition_status_updates',
  'provider_transition_timeline_entries',
  'release_runs',
  'release_checklist_items',
  'release_gate_results',
  'reporting_community_engagement_daily'
];

const TABLE_DEFINITIONS = {
  users(table) {
    table.increments('id');
    table.string('email').notNullable();
    table.string('first_name');
    table.string('last_name');
    table.timestamps(true, true);
  },
  communities(table) {
    table.increments('id');
    table.string('name').notNullable();
    table.timestamps(true, true);
  },
  monetization_catalog_items(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
    table.string('tenant_id').notNullable();
    table.string('product_code').notNullable();
    table.string('name').notNullable();
    table.text('description');
    table.string('pricing_model').notNullable();
    table.string('billing_interval').notNullable();
    table.string('revenue_recognition_method').notNullable();
    table.integer('recognition_duration_days').defaultTo(0);
    table.integer('unit_amount_cents').defaultTo(0);
    table.string('currency').notNullable();
    table.string('usage_metric');
    table.string('revenue_account');
    table.string('deferred_revenue_account');
    table.text('metadata');
    table.string('status').notNullable();
    table.timestamp('effective_from');
    table.timestamp('effective_to');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
    table.timestamp('retired_at');
  },
  monetization_reconciliation_runs(table) {
    table.increments('id');
    table.string('tenant_id').notNullable();
    table.timestamp('window_start').notNullable();
    table.timestamp('window_end').notNullable();
    table.string('status').notNullable();
    table.integer('invoiced_cents').defaultTo(0);
    table.integer('usage_cents').defaultTo(0);
    table.integer('recognized_cents').defaultTo(0);
    table.integer('deferred_cents').defaultTo(0);
    table.integer('variance_cents').defaultTo(0);
    table.decimal('variance_ratio', 8, 4).defaultTo(0);
    table.text('metadata');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  monetization_revenue_schedules(table) {
    table.increments('id');
    table.string('tenant_id').notNullable();
    table.string('payment_intent_id');
    table.integer('catalog_item_id');
    table.integer('usage_record_id');
    table.string('product_code');
    table.string('status').notNullable();
    table.string('recognition_method').notNullable();
    table.timestamp('recognition_start');
    table.timestamp('recognition_end');
    table.integer('amount_cents').defaultTo(0);
    table.integer('recognized_amount_cents').defaultTo(0);
    table.string('currency').notNullable();
    table.string('revenue_account');
    table.string('deferred_revenue_account');
    table.timestamp('recognized_at');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  monetization_usage_records(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
    table.string('tenant_id').notNullable();
    table.integer('catalog_item_id');
    table.string('product_code').notNullable();
    table.string('account_reference');
    table.integer('user_id');
    table.timestamp('usage_date');
    table.decimal('quantity', 10, 4).defaultTo(0);
    table.integer('unit_amount_cents').defaultTo(0);
    table.integer('amount_cents').defaultTo(0);
    table.string('currency').notNullable();
    table.string('source');
    table.string('external_reference');
    table.string('payment_intent_id');
    table.text('metadata');
    table.timestamp('recorded_at');
    table.timestamp('processed_at');
  },
  payment_coupons(table) {
    table.increments('id');
    table.string('code').notNullable();
    table.string('name');
    table.text('description');
    table.string('discount_type').notNullable();
    table.integer('discount_value').notNullable();
    table.string('currency');
    table.integer('max_redemptions');
    table.integer('per_user_limit');
    table.integer('times_redeemed').defaultTo(0);
    table.boolean('is_stackable').defaultTo(false);
    table.string('status').notNullable();
    table.timestamp('valid_from');
    table.timestamp('valid_until');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
    table.timestamp('archived_at');
  },
  payment_coupon_redemptions(table) {
    table.increments('id');
    table.integer('coupon_id').notNullable();
    table.string('payment_intent_id');
    table.integer('user_id');
    table.timestamp('created_at').defaultTo(connection.fn.now());
  },
  payment_intents(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
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
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  payment_refunds(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
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
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  payment_ledger_entries(table) {
    table.increments('id');
    table.string('payment_intent_id').notNullable();
    table.string('entry_type').notNullable();
    table.integer('amount').defaultTo(0);
    table.string('currency').notNullable();
    table.text('details');
    table.timestamp('recorded_at').notNullable().defaultTo(connection.fn.now());
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  platform_settings(table) {
    table.increments('id');
    table.string('key').notNullable();
    table.text('value');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  podcast_shows(table) {
    table.increments('id');
    table.integer('community_id');
    table.integer('owner_id');
    table.string('title').notNullable();
    table.string('slug').notNullable();
    table.string('subtitle');
    table.text('description');
    table.string('cover_image_url');
    table.string('category');
    table.string('status');
    table.boolean('is_public').defaultTo(false);
    table.string('distribution_channels');
    table.text('metadata');
    table.timestamp('launch_at');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  podcast_episodes(table) {
    table.increments('id');
    table.integer('show_id').notNullable();
    table.string('title').notNullable();
    table.string('slug').notNullable();
    table.string('summary');
    table.text('description');
    table.string('audio_url');
    table.string('video_url');
    table.integer('duration_seconds');
    table.integer('season_number');
    table.integer('episode_number');
    table.string('status');
    table.timestamp('publish_at');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  provider_transition_announcements(table) {
    table.increments('id');
    table.string('slug').notNullable();
    table.string('title').notNullable();
    table.string('summary');
    table.text('body_markdown');
    table.string('status');
    table.timestamp('effective_from');
    table.timestamp('effective_to');
    table.boolean('ack_required').defaultTo(true);
    table.timestamp('ack_deadline');
    table.string('owner_email');
    table.string('tenant_scope');
    table.text('metadata');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  provider_transition_acknowledgements(table) {
    table.increments('id');
    table.integer('announcement_id').notNullable();
    table.string('provider_reference');
    table.string('organisation_name');
    table.string('contact_name');
    table.string('contact_email').notNullable();
    table.string('ack_method');
    table.boolean('follow_up_required').defaultTo(false);
    table.text('follow_up_notes');
    table.text('metadata');
    table.timestamp('acknowledged_at');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  provider_transition_resources(table) {
    table.increments('id');
    table.integer('announcement_id').notNullable();
    table.string('label').notNullable();
    table.string('url');
    table.string('type');
    table.string('locale');
    table.text('description');
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  provider_transition_status_updates(table) {
    table.increments('id');
    table.integer('announcement_id').notNullable();
    table.string('provider_reference');
    table.string('status_code').notNullable();
    table.text('notes');
    table.timestamp('recorded_at').notNullable();
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  provider_transition_timeline_entries(table) {
    table.increments('id');
    table.integer('announcement_id').notNullable();
    table.timestamp('occurs_on').notNullable();
    table.string('headline').notNullable();
    table.string('owner');
    table.string('cta_label');
    table.string('cta_url');
    table.text('details_markdown');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  release_runs(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
    table.string('version_tag').notNullable();
    table.string('environment').notNullable();
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
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  release_checklist_items(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
    table.string('slug').notNullable();
    table.string('category');
    table.string('title');
    table.text('description');
    table.boolean('auto_evaluated').defaultTo(false);
    table.integer('weight').defaultTo(1);
    table.string('default_owner_email');
    table.text('success_criteria');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  release_gate_results(table) {
    table.increments('id');
    table.uuid('public_id').notNullable();
    table.integer('run_id').notNullable();
    table.integer('checklist_item_id');
    table.string('gate_key').notNullable();
    table.string('status');
    table.string('owner_email');
    table.text('metrics');
    table.text('notes');
    table.string('evidence_url');
    table.timestamp('last_evaluated_at');
    table.timestamp('created_at').defaultTo(connection.fn.now());
    table.timestamp('updated_at').defaultTo(connection.fn.now());
  },
  reporting_community_engagement_daily(table) {
    table.increments('id');
    table.date('reporting_date').notNullable();
    table.integer('community_id');
    table.integer('published_posts').defaultTo(0);
    table.integer('comment_count').defaultTo(0);
    table.integer('tag_applications').defaultTo(0);
    table.integer('public_posts').defaultTo(0);
    table.integer('event_posts').defaultTo(0);
  }
};

async function createSchema(knexInstance) {
  await knexInstance.raw('PRAGMA foreign_keys = OFF');
  for (const tableName of TABLE_ORDER) {
    const definition = TABLE_DEFINITIONS[tableName];
    await knexInstance.schema.createTable(tableName, definition);
  }
  await knexInstance.raw('PRAGMA foreign_keys = ON');
}

async function resetTables() {
  for (const table of TABLE_ORDER) {
    await connection(table).del();
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

beforeEach(async () => {
  await resetTables();
});

afterAll(async () => {
  await connection.destroy();
});

function iso(date) {
  return new Date(date).toISOString();
}

describe('Group 23 model flows', () => {
  it('manages monetization catalog, usage, schedules, and reconciliation runs end-to-end', async () => {
    const created = await MonetizationCatalogItemModel.create(
      {
        tenantId: 'Tenant-A',
        productCode: 'PRO-PLAN',
        name: 'Pro Plan',
        metadata: { tier: 'premium' },
        unitAmountCents: 2500,
        currency: 'gbp'
      },
      connection
    );

    expect(created).toMatchObject({
      tenantId: 'tenant-a',
      productCode: 'pro-plan',
      currency: 'GBP',
      revenueAccount: '4000-education-services',
      metadata: { tier: 'premium' }
    });

    const usage = await MonetizationUsageRecordModel.create(
      {
        tenantId: 'tenant-a',
        productCode: 'pro-plan',
        accountReference: 'acct-123',
        quantity: 3,
        unitAmountCents: 2500,
        metadata: { region: 'emea' },
        usageDate: iso('2024-04-01T09:00:00Z'),
        recordedAt: iso('2024-04-01T09:05:00Z')
      },
      connection
    );

    expect(usage).toMatchObject({
      amountCents: 7500,
      currency: 'GBP',
      metadata: { region: 'emea' }
    });

    const updatedUsage = await MonetizationUsageRecordModel.upsertByExternalReference(
      {
        tenantId: 'tenant-a',
        productCode: 'pro-plan',
        externalReference: 'usage-1',
        quantity: 2,
        unitAmountCents: 2500,
        metadata: { adjustment: true },
        usageDate: iso('2024-04-15T10:00:00Z')
      },
      connection
    );

    expect(updatedUsage).toMatchObject({
      productCode: 'pro-plan',
      quantity: 2,
      amountCents: 5000,
      metadata: { adjustment: true }
    });

    const schedule = await MonetizationRevenueScheduleModel.create(
      {
        tenantId: 'tenant-a',
        paymentIntentId: 'pi_123',
        productCode: 'pro-plan',
        amountCents: 5000,
        recognitionEnd: iso('2024-01-15')
      },
      connection
    );

    expect(schedule).toMatchObject({
      status: 'pending',
      amountCents: 5000,
      currency: 'GBP'
    });

    const recognized = await MonetizationRevenueScheduleModel.markRecognized(schedule.id, { recognizedAt: iso('2024-01-16') }, connection);
    expect(recognized).toMatchObject({ status: 'recognized', recognizedAmountCents: 5000 });

    const reduced = await MonetizationRevenueScheduleModel.reduceRecognizedAmount(
      schedule.id,
      2000,
      { type: 'refund', reason: 'partial credit' },
      connection
    );

    expect(reduced).toMatchObject({ recognizedAmountCents: 3000, amountCents: 3000 });
    expect(reduced.metadata.adjustments.at(-1)).toMatchObject({ amountCents: 2000, reason: 'partial credit' });

    const reconciliation = await MonetizationReconciliationRunModel.create(
      {
        tenantId: 'tenant-a',
        windowStart: iso('2024-01-01'),
        windowEnd: iso('2024-01-31'),
        invoicedCents: 3000,
        usageCents: 3000
      },
      connection
    );

    expect(reconciliation).toMatchObject({ status: 'completed', invoicedCents: 3000 });

    const latest = await MonetizationReconciliationRunModel.latest({ tenantId: 'tenant-a' }, connection);
    expect(latest.id).toEqual(reconciliation.id);

    const total = await MonetizationUsageRecordModel.sumForWindow(
      { tenantId: 'tenant-a', start: '2024-04-01', end: '2024-04-30' },
      connection
    );
    expect(total).toBe(usage.amountCents + updatedUsage.amountCents);

    const tenants = await MonetizationCatalogItemModel.distinctTenants(connection);
    expect(tenants).toEqual(['tenant-a']);
  });

  it('applies coupons, encrypts payment intents, and handles refunds securely', async () => {
    const [couponId] = await connection('payment_coupons').insert({
      code: 'SAVE20',
      name: 'Save 20%',
      discount_type: 'percentage',
      discount_value: 20,
      status: 'active',
      is_stackable: 1,
      currency: 'USD',
      metadata: JSON.stringify({ segments: ['beta'] }),
      valid_from: new Date('2024-01-01T00:00:00Z'),
      valid_until: new Date('2024-12-31T00:00:00Z'),
      max_redemptions: 100
    });

    const coupon = await PaymentCouponModel.findActiveForRedemption('save20', 'USD', connection, new Date('2024-06-01'));
    expect(coupon).toMatchObject({ code: 'SAVE20', discountType: 'percentage' });
    expect(Boolean(coupon?.isStackable)).toBe(true);

    await PaymentCouponModel.recordRedemption({ couponId, paymentIntentId: 'pi_coupon', userId: 99 }, connection);
    const redemptionCount = await PaymentCouponModel.countUserRedemptions(couponId, 99, connection);
    expect(redemptionCount).toBe(1);

    const intent = await PaymentIntentModel.create(
      {
        userId: 42,
        provider: 'stripe',
        providerIntentId: 'pi_abc',
        status: 'requires_capture',
        currency: 'GBP',
        amountSubtotal: 3000,
        amountTotal: 3600,
        entityType: 'subscription',
        entityId: 'sub_123'
      },
      connection
    );

    expect(intent).toMatchObject({ provider: 'stripe', currency: 'GBP', status: 'requires_capture' });

    const hashedLookup = await PaymentIntentModel.findByProviderIntentId('pi_abc', connection);
    expect(hashedLookup?.publicId).toEqual(intent.publicId);

    const refreshed = await PaymentIntentModel.updateById(
      intent.id,
      {
        status: 'succeeded',
        providerCaptureId: 'ca_123',
        receiptEmail: 'customer@example.com'
      },
      connection
    );
    expect(refreshed).toMatchObject({ status: 'succeeded' });

    const refund = await PaymentRefundModel.create(
      {
        paymentIntentId: intent.publicId,
        providerRefundId: 're_987',
        amount: 1200,
        currency: 'GBP',
        reason: 'user_request'
      },
      connection
    );

    expect(refund).toMatchObject({ status: 'pending', amount: 1200 });

    const fetched = await PaymentRefundModel.findByProviderRefundId('re_987', connection);
    expect(fetched?.publicId).toEqual(refund.publicId);

    const processed = await PaymentRefundModel.updateById(
      refund.id,
      { status: 'succeeded', processedAt: iso('2024-02-01'), failureMessage: null },
      connection
    );
    expect(processed).toMatchObject({ status: 'succeeded', processedAt: iso('2024-02-01') });

    await expect(PaymentLedgerEntryModel.record({ entryType: 'credit' }, connection)).rejects.toThrow(
      /paymentIntentId is required/
    );

    const ledgerEntry = await PaymentLedgerEntryModel.record(
      {
        paymentIntentId: intent.publicId,
        entryType: 'Captured Revenue',
        amount: 3600.49,
        currency: 'gbp',
        details: { source: 'checkout', reference: 'order-123' }
      },
      connection
    );

    expect(ledgerEntry).toMatchObject({
      paymentIntentId: intent.publicId,
      entryType: 'captured-revenue',
      amount: 3600,
      currency: 'GBP'
    });
    expect(ledgerEntry.details).toMatchObject({ source: 'checkout', currency: 'GBP', entryType: 'captured-revenue' });

    const ledgerEntries = await PaymentLedgerEntryModel.listForPayment(intent.publicId, connection);
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0].recordedAt).toBeTruthy();
  });

  it('stores platform settings and synchronises podcast show and episode metadata', async () => {
    const [communityId] = await connection('communities').insert({ name: 'Growth Community' });
    const [ownerId] = await connection('users').insert({
      email: 'host@example.com',
      first_name: 'Ava',
      last_name: 'Instructor'
    });

    const themeSetting = await PlatformSettingModel.upsert('ui.theme', { mode: 'dark', accent: '#663399' }, connection);
    expect(themeSetting).toMatchObject({ value: { mode: 'dark', accent: '#663399' } });

    const show = await PodcastShowModel.create(
      {
        communityId,
        ownerId,
        title: 'Campus Insider',
        description: 'Weekly updates',
        distributionChannels: ['rss', 'spotify'],
        metadata: { tags: ['education'] }
      },
      connection
    );

    expect(show).toMatchObject({
      communityId,
      ownerId,
      slug: 'campus-insider',
      metadata: { tags: ['education'] }
    });

    const episode = await PodcastEpisodeModel.create(
      {
        showId: show.id,
        title: 'Orientation Tips',
        summary: 'Helping new students',
        durationSeconds: 900,
        status: 'scheduled',
        publishAt: iso('2024-02-10')
      },
      connection
    );

    expect(episode).toMatchObject({
      showId: show.id,
      slug: 'orientation-tips',
      status: 'scheduled'
    });

    const updatedEpisode = await PodcastEpisodeModel.updateById(
      episode.id,
      { status: 'published', metadata: { chapters: 4 } },
      connection
    );
    expect(updatedEpisode).toMatchObject({ status: 'published', metadata: { chapters: 4 } });

    const list = await PodcastEpisodeModel.listByShow(show.id, { status: 'published' }, connection);
    expect(list).toHaveLength(1);
    expect(list[0].showTitle).toBe('Campus Insider');

    const shows = await PodcastShowModel.listAll({ status: 'draft' }, connection);
    expect(shows).toHaveLength(1);
    expect(shows[0]).toMatchObject({ title: 'Campus Insider', distributionChannels: 'rss, spotify' });
  });

  it('tracks provider transitions across announcements, acknowledgements, status, and resources', async () => {
    const announcement = await ProviderTransitionAnnouncementModel.upsert(
      {
        slug: 'cloud-migration',
        title: 'Cloud Migration',
        summary: 'We are moving providers',
        status: 'active',
        effectiveFrom: new Date('2024-03-01T09:00:00Z'),
        tenantScope: 'enterprise'
      },
      { connection }
    );

    expect(announcement).toMatchObject({ slug: 'cloud-migration', tenantScope: 'enterprise', ackRequired: true });

    const acknowledgement = await ProviderTransitionAcknowledgementModel.upsertForContact(
      announcement.id,
      'contact@example.com',
      {
        organisationName: 'Example Org',
        contactName: 'Jordan Smith',
        metadata: { region: 'emea' }
      },
      { connection }
    );

    expect(acknowledgement).toMatchObject({
      announcementId: announcement.id,
      contactEmail: 'contact@example.com',
      metadata: { region: 'emea' }
    });

    const resources = await ProviderTransitionResourceModel.bulkReplace(
      announcement.id,
      [
        {
          label: 'Migration Playbook',
          url: 'https://example.com/playbook',
          type: 'guide',
          locale: 'en'
        }
      ],
      { connection }
    );

    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({ label: 'Migration Playbook', type: 'guide' });

    const statusUpdate = await ProviderTransitionStatusUpdateModel.record(
      announcement.id,
      {
        statusCode: 'pilot-complete',
        notes: 'Alpha tenants migrated',
        recordedAt: new Date('2024-03-05T10:00:00Z')
      },
      { connection }
    );

    expect(statusUpdate).toMatchObject({ statusCode: 'pilot-complete', notes: 'Alpha tenants migrated' });

    const timelineEntries = await ProviderTransitionTimelineEntryModel.bulkReplace(
      announcement.id,
      [
        {
          occursOn: new Date('2024-03-05T12:00:00Z'),
          headline: 'Pilot Finished',
          detailsMarkdown: 'All pilot tenants migrated'
        }
      ],
      { connection }
    );

    expect(timelineEntries).toHaveLength(1);
    expect(timelineEntries[0]).toMatchObject({ headline: 'Pilot Finished' });

    const active = await ProviderTransitionAnnouncementModel.listActive({ tenantScope: 'enterprise', connection });
    expect(active).toHaveLength(1);

    const acknowledgements = await ProviderTransitionAcknowledgementModel.countForAnnouncement(announcement.id, { connection });
    expect(acknowledgements).toBe(1);
  });

  it('coordinates release readiness workflows and aggregates engagement reporting', async () => {
    const run = await ReleaseRunModel.create(
      {
        versionTag: 'v2024.05.01',
        environment: 'staging',
        initiatedByEmail: 'release@edulure.test'
      },
      connection
    );

    expect(run).toMatchObject({ status: 'scheduled', versionTag: 'v2024.05.01' });

    const checklist = await ReleaseChecklistItemModel.create(
      {
        slug: 'observability-health',
        title: 'Observability Health',
        autoEvaluated: true,
        successCriteria: { errorBudget: '<5%' }
      },
      connection
    );

    const gate = await ReleaseGateResultModel.upsertByRunAndGate(
      run.id,
      'observability-health',
      {
        checklistItemId: checklist.id,
        status: 'approved',
        metrics: { apdex: 0.98 },
        ownerEmail: 'sre@example.com'
      },
      connection
    );

    expect(gate).toMatchObject({ gateKey: 'observability-health', status: 'approved', metrics: { apdex: 0.98 } });

    const summary = await ReleaseGateResultModel.getStatusSummary(run.id, connection);
    expect(summary).toEqual({ approved: 1 });

    const dailyRows = [
      { reporting_date: '2024-04-01', community_id: 1, published_posts: 6, comment_count: 12, tag_applications: 9, public_posts: 5, event_posts: 1 },
      { reporting_date: '2024-04-02', community_id: 2, published_posts: 8, comment_count: 20, tag_applications: 11, public_posts: 6, event_posts: 2 }
    ];
    await connection('communities').insert([{ id: 1, name: 'Product Updates' }, { id: 2, name: 'Community Lounge' }]);
    await connection('reporting_community_engagement_daily').insert(dailyRows);

    const totals = await ReportingCommunityEngagementDailyView.fetchTotals(
      { start: '2024-04-01', end: '2024-04-30' },
      connection
    );
    expect(totals).toMatchObject({ posts: 14, comments: 32, tags: 20 });

    const topCommunities = await ReportingCommunityEngagementDailyView.fetchTopCommunities(
      { start: '2024-04-01', end: '2024-04-30', limit: 1 },
      connection
    );
    expect(topCommunities[0]).toMatchObject({ communityId: 2, name: 'Community Lounge', posts: 8 });
  });
});

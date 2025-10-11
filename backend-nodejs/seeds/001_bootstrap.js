import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const makeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx('payment_audit_logs').del();
    await trx('payment_refunds').del();
    await trx('payment_transactions').del();
    await trx('payment_order_items').del();
    await trx('payment_orders').del();
    await trx('commerce_tax_rates').del();
    await trx('commerce_coupons').del();
    await trx('feature_flag_audits').del();
    await trx('feature_flags').del();
    await trx('configuration_entries').del();
    await trx('community_members').del();
    await trx('asset_conversion_outputs').del();
    await trx('asset_ingestion_jobs').del();
    await trx('ebook_read_progress').del();
    await trx('content_asset_events').del();
    await trx('content_audit_logs').del();
    await trx('content_assets').del();
    await trx('domain_events').del();
    await trx('user_sessions').del();
    await trx('user_email_verification_tokens').del();
    await trx('communities').del();
    await trx('users').del();

    const passwordHash = await bcrypt.hash('LaunchReady!2024', 12);

    const [adminId] = await trx('users').insert({
      first_name: 'Amina',
      last_name: 'Diallo',
      email: 'amina.diallo@edulure.test',
      password_hash: passwordHash,
      role: 'admin',
      email_verified_at: trx.fn.now(),
      failed_login_attempts: 0,
      last_login_at: trx.fn.now(),
      password_changed_at: trx.fn.now()
    });

    const [instructorId] = await trx('users').insert({
      first_name: 'Kai',
      last_name: 'Watanabe',
      email: 'kai.watanabe@edulure.test',
      password_hash: passwordHash,
      role: 'instructor',
      email_verified_at: trx.fn.now(),
      failed_login_attempts: 0,
      last_login_at: trx.fn.now(),
      password_changed_at: trx.fn.now()
    });

    const [learnerId] = await trx('users').insert({
      first_name: 'Noemi',
      last_name: 'Carvalho',
      email: 'noemi.carvalho@edulure.test',
      password_hash: passwordHash,
      role: 'user',
      email_verified_at: trx.fn.now(),
      failed_login_attempts: 0,
      last_login_at: trx.fn.now(),
      password_changed_at: trx.fn.now()
    });

    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const [launchCouponId] = await trx('commerce_coupons').insert({
      code: 'LAUNCH25',
      discount_type: 'percentage',
      discount_value: 25,
      currency: 'USD',
      max_redemptions: 500,
      redemption_count: 0,
      valid_from: trx.fn.now(),
      valid_until: nextYear,
      stackable: false,
      status: 'active',
      metadata: JSON.stringify({
        description: 'Launch celebration – 25% off flagship programs',
        appliesTo: ['courses', 'ebooks', 'tutor_packages']
      })
    });

    const [usDigitalTaxId] = await trx('commerce_tax_rates').insert({
      country_code: 'US',
      region_code: null,
      rate_percentage: 0,
      label: 'US Digital Goods (Tax Exempt)',
      is_default: true,
      metadata: JSON.stringify({ reason: 'Most digital goods exempt at federal level' })
    });

    const [caTaxId] = await trx('commerce_tax_rates').insert({
      country_code: 'US',
      region_code: 'CA',
      rate_percentage: 8.50,
      label: 'California – Digital Services',
      is_default: false,
      metadata: JSON.stringify({ nexus: 'US-CA', complianceNote: 'County average blended rate' })
    });

    const [seedOrderId] = await trx('payment_orders').insert({
      user_id: learnerId,
      order_number: 'ORD-2024-0001',
      currency: 'USD',
      subtotal_amount: 320,
      discount_amount: 80,
      tax_amount: 20.4,
      total_amount: 260.4,
      status: 'completed',
      payment_provider: 'stripe',
      provider_intent_id: 'pi_seed_checkout_001',
      provider_client_secret: 'pi_seed_checkout_001_secret',
      metadata: JSON.stringify({
        channel: 'seed',
        note: 'Bootstrapped order for analytics dashboards',
        defaultTaxRateId: usDigitalTaxId
      }),
      billing_email: 'noemi.carvalho@edulure.test',
      billing_country: 'US',
      billing_region: 'CA',
      applied_coupon_id: launchCouponId,
      applied_tax_rate_id: caTaxId,
      paid_at: trx.fn.now()
    });

    await trx('payment_order_items').insert([
      {
        order_id: seedOrderId,
        item_type: 'course',
        item_id: 'course-ops-blueprint',
        name: 'Learning Ops Blueprint – Masterclass',
        quantity: 1,
        unit_amount: 220,
        total_amount: 220,
        tax_amount: 18.7,
        discount_amount: 55,
        metadata: JSON.stringify({ delivery: 'course', durationWeeks: 6 })
      },
      {
        order_id: seedOrderId,
        item_type: 'ebook',
        item_id: 'ebook-systems',
        name: 'Systems Thinking for Educators',
        quantity: 1,
        unit_amount: 100,
        total_amount: 100,
        tax_amount: 1.7,
        discount_amount: 25,
        metadata: JSON.stringify({ format: 'epub+audio', drm: true })
      }
    ]);

    const [seedTransactionId] = await trx('payment_transactions').insert({
      order_id: seedOrderId,
      transaction_type: 'capture',
      status: 'succeeded',
      payment_provider: 'stripe',
      provider_transaction_id: 'pi_seed_checkout_001',
      amount: 260.4,
      currency: 'USD',
      payment_method_type: 'card',
      response_snapshot: JSON.stringify({
        provider: 'stripe',
        receipt_url: 'https://stripe.local/receipts/pi_seed_checkout_001'
      }),
      processed_at: trx.fn.now()
    });

    await trx('payment_audit_logs').insert([
      {
        event_type: 'order.created',
        order_id: seedOrderId,
        performed_by: learnerId,
        payload: JSON.stringify({
          subtotal: 320,
          currency: 'USD',
          coupon: 'LAUNCH25',
          taxRateId: caTaxId
        })
      },
      {
        event_type: 'payment.captured',
        order_id: seedOrderId,
        transaction_id: seedTransactionId,
        performed_by: adminId,
        payload: JSON.stringify({
          provider: 'stripe',
          amount: 260.4,
          currency: 'USD'
        })
      }
    ]);

    const [opsCommunityId] = await trx('communities').insert({
      owner_id: instructorId,
      name: 'Learning Ops Guild',
      slug: 'learning-ops-guild',
      description:
        'Operations leaders share classroom launch playbooks, QA scorecards, and tooling automation recipes.',
      visibility: 'public',
      metadata: JSON.stringify({
        focus: ['operations', 'automation'],
        timezone: 'UTC',
        defaultChannel: 'weekly-war-room'
      })
    });

    const [growthCommunityId] = await trx('communities').insert({
      owner_id: adminId,
      name: 'Creator Growth Lab',
      slug: 'creator-growth-lab',
      description: 'Creators refine monetisation funnels, ad experiments, and marketplace launches together.',
      visibility: 'private',
      metadata: JSON.stringify({
        focus: ['growth', 'ads'],
        ndaRequired: true,
        defaultChannel: 'campaign-sprint'
      })
    });

    await trx('community_members').insert([
      {
        community_id: opsCommunityId,
        user_id: adminId,
        role: 'admin',
        status: 'active'
      },
      {
        community_id: opsCommunityId,
        user_id: learnerId,
        role: 'member',
        status: 'active'
      },
      {
        community_id: growthCommunityId,
        user_id: instructorId,
        role: 'moderator',
        status: 'active'
      },
      {
        community_id: growthCommunityId,
        user_id: learnerId,
        role: 'member',
        status: 'pending'
      }
    ]);

    const [opsPlaybookAssetId] = await trx('content_assets').insert({
      public_id: crypto.randomUUID(),
      type: 'powerpoint',
      original_filename: 'learning-ops-blueprint.pptx',
      storage_key: 'learning-ops/ops-blueprint-v1.pptx',
      storage_bucket: 'edulure-r2-private',
      converted_key: 'learning-ops/ops-blueprint-v1.pdf',
      converted_bucket: 'edulure-r2-public',
      status: 'ready',
      visibility: 'workspace',
      checksum: makeHash('learning-ops-blueprint.v1'),
      size_bytes: 18304972,
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      created_by: instructorId,
      published_at: trx.fn.now(),
      metadata: JSON.stringify({
        communityId: opsCommunityId,
        deckVersion: 1,
        ingestionPipeline: 'cloudconvert-v2'
      })
    });

    await trx('asset_ingestion_jobs').insert({
      asset_id: opsPlaybookAssetId,
      job_type: 'powerpoint-conversion',
      status: 'completed',
      attempts: 1,
      result_metadata: JSON.stringify({
        converter: 'cloudconvert',
        durationSeconds: 62
      }),
      started_at: trx.fn.now(),
      completed_at: trx.fn.now()
    });

    await trx('asset_conversion_outputs').insert({
      asset_id: opsPlaybookAssetId,
      format: 'pdf',
      storage_key: 'learning-ops/ops-blueprint-v1.pdf',
      storage_bucket: 'edulure-r2-public',
      checksum: makeHash('learning-ops-blueprint.v1.pdf'),
      size_bytes: 4820032,
      metadata: JSON.stringify({ pages: 52 })
    });

    await trx('ebook_read_progress').insert({
      asset_id: opsPlaybookAssetId,
      user_id: learnerId,
      progress_percent: 36.5,
      last_location: 'slide-19',
      time_spent_seconds: 1804
    });

    await trx('content_asset_events').insert([
      {
        asset_id: opsPlaybookAssetId,
        user_id: learnerId,
        event_type: 'viewed',
        metadata: JSON.stringify({ slide: 12 }),
        occurred_at: trx.fn.now()
      },
      {
        asset_id: opsPlaybookAssetId,
        user_id: learnerId,
        event_type: 'annotation-created',
        metadata: JSON.stringify({ slide: 14, note: 'Create versioned QA gate.' }),
        occurred_at: trx.fn.now()
      }
    ]);

    await trx('content_audit_logs').insert({
      asset_id: opsPlaybookAssetId,
      event: 'publish',
      performed_by: instructorId,
      payload: JSON.stringify({ release: 'v1', visibility: 'workspace' })
    });

    await trx('domain_events').insert([
      {
        entity_type: 'community',
        entity_id: String(opsCommunityId),
        event_type: 'membership.added',
        payload: JSON.stringify({ userId: adminId, role: 'admin' }),
        performed_by: instructorId
      },
      {
        entity_type: 'asset',
        entity_id: String(opsPlaybookAssetId),
        event_type: 'asset.published',
        payload: JSON.stringify({ version: 1 }),
        performed_by: instructorId
      }
    ]);

    const [adminConsoleFlagId] = await trx('feature_flags').insert({
      key: 'admin.operational-console',
      name: 'Admin Operational Console',
      description: 'Gates the operations console surface for vetted administrators.',
      enabled: true,
      kill_switch: false,
      rollout_strategy: 'segment',
      rollout_percentage: 100,
      segment_rules: JSON.stringify({
        allowedRoles: ['admin'],
        allowedTenants: ['edulure-internal'],
        schedule: { start: '2024-10-01T00:00:00.000Z' }
      }),
      variants: JSON.stringify([
        { key: 'core', weight: 80 },
        { key: 'beta-insights', weight: 20 }
      ]),
      environments: JSON.stringify(['staging', 'production']),
      metadata: JSON.stringify({ owner: 'Platform Ops', jiraKey: 'OPS-1124' })
    });

    const [checkoutFlagId] = await trx('feature_flags').insert({
      key: 'commerce.checkout-v2',
      name: 'Commerce Checkout v2',
      description: 'Rollout for the tax-aware checkout surface with split payments.',
      enabled: true,
      kill_switch: false,
      rollout_strategy: 'percentage',
      rollout_percentage: 35,
      environments: JSON.stringify(['staging', 'production']),
      metadata: JSON.stringify({ owner: 'Commerce', jiraKey: 'PAY-872' })
    });

    const [liveClassroomsFlagId] = await trx('feature_flags').insert({
      key: 'learning.live-classrooms',
      name: 'Live Classroom Availability',
      description: 'Controls Agora-backed live classroom readiness per tenant.',
      enabled: true,
      kill_switch: false,
      rollout_strategy: 'segment',
      rollout_percentage: 70,
      segment_rules: JSON.stringify({
        allowedRoles: ['admin', 'instructor'],
        allowedTenants: ['learning-ops-guild', 'creator-growth-lab'],
        percentage: 70,
        schedule: { start: '2024-09-15T08:00:00.000Z' }
      }),
      environments: JSON.stringify(['development', 'staging', 'production']),
      metadata: JSON.stringify({ owner: 'Learning', jiraKey: 'LIVE-304' })
    });

    await trx('feature_flag_audits').insert([
      {
        flag_id: adminConsoleFlagId,
        change_type: 'seed',
        payload: JSON.stringify({ actor: 'seed', reason: 'baseline rollout' })
      },
      {
        flag_id: checkoutFlagId,
        change_type: 'rollout-percentage',
        payload: JSON.stringify({ previous: 20, next: 35, changedBy: 'commerce.ops' })
      },
      {
        flag_id: liveClassroomsFlagId,
        change_type: 'segment-update',
        payload: JSON.stringify({ addedTenant: 'creator-growth-lab', changedBy: 'learning.ops' })
      }
    ]);

    await trx('configuration_entries').insert([
      {
        key: 'support.contact-email',
        environment_scope: 'global',
        value_type: 'string',
        value: 'support@edulure.com',
        description: 'Primary customer support email address displayed in public clients.',
        exposure_level: 'public',
        sensitive: false,
        metadata: JSON.stringify({ owner: 'Support' })
      },
      {
        key: 'admin.console.escalation-channel',
        environment_scope: 'production',
        value_type: 'string',
        value: '#admin-escalations',
        description: 'Slack channel for escalations raised by admin console operators.',
        exposure_level: 'ops',
        sensitive: false,
        metadata: JSON.stringify({ pagerDutyService: 'edulure-admin' })
      },
      {
        key: 'live-classrooms.max-concurrent-rooms',
        environment_scope: 'production',
        value_type: 'number',
        value: '35',
        description: 'Operational ceiling for concurrent live classrooms per tenant.',
        exposure_level: 'ops',
        sensitive: false,
        metadata: JSON.stringify({ owner: 'Learning Ops' })
      },
      {
        key: 'commerce.checkout-v2.guardrail',
        environment_scope: 'staging',
        value_type: 'json',
        value: JSON.stringify({ minVersion: '2.5.0', fallback: 'checkout-v1' }),
        description: 'Client guardrail instructing UI to fall back when checkout v2 is unsupported.',
        exposure_level: 'internal',
        sensitive: false,
        metadata: JSON.stringify({ owner: 'Commerce' })
      }
    ]);

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    await trx('user_sessions').insert([
      {
        user_id: adminId,
        refresh_token_hash: makeHash('admin-active-session'),
        user_agent: 'Chrome/120.0 (Mac OS X)',
        ip_address: '102.89.10.8',
        expires_at: ninetyDaysFromNow,
        last_used_at: now
      },
      {
        user_id: instructorId,
        refresh_token_hash: makeHash('instructor-stale-session'),
        user_agent: 'Safari/17.1 (iOS)',
        ip_address: '176.23.45.100',
        expires_at: sixtyDaysAgo,
        last_used_at: sixtyDaysAgo,
        revoked_at: now,
        revoked_reason: 'credential_rotation'
      }
    ]);

    await trx('user_email_verification_tokens').insert({
      user_id: learnerId,
      token_hash: makeHash('learner-email-token'),
      expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000)
    });
  });
}

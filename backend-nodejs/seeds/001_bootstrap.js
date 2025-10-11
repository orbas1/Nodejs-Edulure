import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const makeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx('feature_flag_audits').del();
    await trx('feature_flags').del();
    await trx('configuration_entries').del();
    await trx('community_resources').del();
    await trx('community_posts').del();
    await trx('community_channels').del();
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

    const [opsGeneralChannelId] = await trx('community_channels').insert({
      community_id: opsCommunityId,
      name: 'Operations HQ',
      slug: 'operations-hq',
      description: 'Daily standups, automation updates, and production escalations.',
      channel_type: 'general',
      is_default: true,
      metadata: JSON.stringify({ analyticsKey: 'ops-hq' })
    });

    const [opsWarRoomChannelId] = await trx('community_channels').insert({
      community_id: opsCommunityId,
      name: 'Weekly War Room',
      slug: 'weekly-war-room',
      description: 'Live classroom launch reviews and quality scorecards.',
      channel_type: 'classroom',
      metadata: JSON.stringify({ defaultMeetingDay: 'Thursday' })
    });

    const [growthAnnouncementsChannelId] = await trx('community_channels').insert({
      community_id: growthCommunityId,
      name: 'Growth Broadcasts',
      slug: 'growth-broadcasts',
      description: 'Announcements, campaign retrospectives, and monetisation briefs.',
      channel_type: 'announcements',
      is_default: true,
      metadata: JSON.stringify({ cadence: 'bi-weekly' })
    });

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

    const [opsRoadmapPostId] = await trx('community_posts')
      .insert({
        community_id: opsCommunityId,
        channel_id: opsGeneralChannelId,
        author_id: instructorId,
        post_type: 'update',
        title: 'Automation Roadmap Drop',
        body:
          '🎯 New automation roadmap covering classroom launch scorecards, incident playbooks, and R2 cost tracking shipped to the resource library. Reply with blockers ahead of Thursday’s launch rehearsal.',
        tags: JSON.stringify(['Roadmap', 'Automation']),
        visibility: 'members',
        status: 'published',
        published_at: trx.fn.now(),
        comment_count: 6,
        reaction_summary: JSON.stringify({ applause: 18, thumbsUp: 9, total: 27 }),
        metadata: JSON.stringify({ relatedResource: 'ops-blueprint-v1', analyticsKey: 'ops-hq-roadmap-drop' })
      });

    const [growthCampaignPostId] = await trx('community_posts')
      .insert({
        community_id: growthCommunityId,
        channel_id: growthAnnouncementsChannelId,
        author_id: adminId,
        post_type: 'event',
        title: 'Campaign Lab AMA',
        body:
          '🔥 We are running a live AMA on multi-channel launch funnels this Friday. Seats are capped at 120. Secure your spot and drop campaign questions in advance.',
        tags: JSON.stringify(['Campaigns', 'Live Session']),
        visibility: 'members',
        status: 'published',
        published_at: trx.fn.now(),
        comment_count: 12,
        reaction_summary: JSON.stringify({ insights: 32, total: 32 }),
        metadata: JSON.stringify({
          classroomReference: 'LC-AMA-001',
          registrationUrl: 'https://events.edulure.test/ama-multi-channel-funnels'
        })
      });

    const [opsBlueprintResourceId] = await trx('community_resources').insert({
        community_id: opsCommunityId,
        created_by: instructorId,
        title: 'Classroom Launch Readiness Blueprint',
        description: 'Step-by-step readiness checklist covering Agora seat prep, tutor briefing, and QA handoff.',
        resource_type: 'content_asset',
        asset_id: opsPlaybookAssetId,
        tags: JSON.stringify(['Launch', 'QA', 'Automation']),
        visibility: 'members',
        status: 'published',
        published_at: trx.fn.now(),
        metadata: JSON.stringify({ version: 1, checksum: makeHash('learning-ops-blueprint.v1') })
    });

    const [growthDashboardResourceId] = await trx('community_resources').insert({
        community_id: growthCommunityId,
        created_by: adminId,
        title: 'Creator Funnel Benchmark Dashboard',
        description: 'Realtime look at CPM, conversion rate, and LTV across the Creator Growth Lab cohort.',
        resource_type: 'external_link',
        link_url: 'https://analytics.edulure.test/dashboards/creator-funnel-benchmark',
        tags: JSON.stringify(['Analytics', 'Benchmarks']),
        visibility: 'members',
        status: 'published',
        published_at: trx.fn.now(),
        metadata: JSON.stringify({ requiresSso: true })
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
      },
      {
        entity_type: 'community_post',
        entity_id: String(opsRoadmapPostId),
        event_type: 'community.post.published',
        payload: JSON.stringify({ channelId: opsGeneralChannelId, communityId: opsCommunityId }),
        performed_by: instructorId
      },
      {
        entity_type: 'community_post',
        entity_id: String(growthCampaignPostId),
        event_type: 'community.post.published',
        payload: JSON.stringify({ channelId: growthAnnouncementsChannelId, communityId: growthCommunityId }),
        performed_by: adminId
      },
      {
        entity_type: 'community_channel',
        entity_id: String(opsWarRoomChannelId),
        event_type: 'community.channel.created',
        payload: JSON.stringify({ communityId: opsCommunityId, channelType: 'classroom' }),
        performed_by: instructorId
      },
      {
        entity_type: 'community_resource',
        entity_id: String(opsBlueprintResourceId),
        event_type: 'community.resource.published',
        payload: JSON.stringify({ communityId: opsCommunityId, resourceType: 'content_asset' }),
        performed_by: instructorId
      },
      {
        entity_type: 'community_resource',
        entity_id: String(growthDashboardResourceId),
        event_type: 'community.resource.published',
        payload: JSON.stringify({ communityId: growthCommunityId, resourceType: 'external_link' }),
        performed_by: adminId
      }
    ]);
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

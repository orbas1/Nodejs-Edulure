import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const makeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const makeVerificationRef = () => `kyc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx('analytics_forecasts').del();
    await trx('analytics_alerts').del();
    await trx('explorer_search_daily_metrics').del();
    await trx('explorer_search_event_interactions').del();
    await trx('explorer_search_event_entities').del();
    await trx('explorer_search_events').del();
    await trx('ads_campaign_metrics_daily').del();
    await trx('ads_campaigns').del();
    await trx('live_classroom_registrations').del();
    await trx('live_classrooms').del();
    await trx('tutor_bookings').del();
    await trx('tutor_availability_slots').del();
    await trx('tutor_profiles').del();
    await trx('ebook_watermark_events').del();
    await trx('ebook_reader_settings').del();
    await trx('ebook_bookmarks').del();
    await trx('ebook_highlights').del();
    await trx('ebook_chapters').del();
    await trx('ebooks').del();
    await trx('course_progress').del();
    await trx('course_enrollments').del();
    await trx('course_assignments').del();
    await trx('course_lessons').del();
    await trx('course_modules').del();
    await trx('courses').del();
    await trx('community_affiliate_payouts').del();
    await trx('community_subscriptions').del();
    await trx('community_paywall_tiers').del();
    await trx('community_role_definitions').del();
    await trx('community_affiliates').del();
    await trx('payment_ledger_entries').del();
    await trx('payment_refunds').del();
    await trx('payment_intents').del();
    await trx('feature_flag_audits').del();
    await trx('feature_flags').del();
    await trx('configuration_entries').del();
    await trx('community_resources').del();
    await trx('community_message_moderation_actions').del();
    await trx('community_message_reactions').del();
    await trx('community_channel_members').del();
    await trx('community_messages').del();
    await trx('direct_message_participants').del();
    await trx('direct_messages').del();
    await trx('direct_message_threads').del();
    await trx('user_presence_sessions').del();
    await trx('social_audit_logs').del();
    await trx('user_follow_recommendations').del();
    await trx('user_block_list').del();
    await trx('user_mute_list').del();
    await trx('user_follows').del();
    await trx('user_privacy_settings').del();
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
    await trx('kyc_audit_logs').del();
    await trx('kyc_documents').del();
    await trx('kyc_verifications').del();
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

    const adminVerificationRef = makeVerificationRef();
    const instructorVerificationRef = makeVerificationRef();
    const learnerVerificationRef = makeVerificationRef();

    const [adminVerificationId] = await trx('kyc_verifications').insert({
      user_id: adminId,
      reference: adminVerificationRef,
      status: 'approved',
      documents_required: 3,
      documents_submitted: 3,
      risk_score: 1.75,
      needs_manual_review: false,
      escalation_level: 'none',
      last_submitted_at: trx.fn.now(),
      last_reviewed_at: trx.fn.now(),
      reviewed_by: adminId,
      policy_references: JSON.stringify(['AML-2024', 'KYC-GLOBAL'])
    });

    const [instructorVerificationId] = await trx('kyc_verifications').insert({
      user_id: instructorId,
      reference: instructorVerificationRef,
      status: 'pending_review',
      documents_required: 3,
      documents_submitted: 3,
      risk_score: 12.5,
      needs_manual_review: true,
      escalation_level: 't1',
      last_submitted_at: trx.fn.now(),
      rejection_reason: null
    });

    const [learnerVerificationId] = await trx('kyc_verifications').insert({
      user_id: learnerId,
      reference: learnerVerificationRef,
      status: 'collecting',
      documents_required: 3,
      documents_submitted: 1,
      risk_score: 0,
      needs_manual_review: false,
      escalation_level: 'none'
    });

    await trx('kyc_documents').insert([
      {
        verification_id: adminVerificationId,
        document_type: 'government-id-front',
        status: 'accepted',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${adminVerificationRef}/passport-front.png`,
        file_name: 'passport-front.png',
        mime_type: 'image/png',
        size_bytes: 324567,
        checksum_sha256: makeHash('admin-passport-front'),
        submitted_at: trx.fn.now(),
        reviewed_at: trx.fn.now()
      },
      {
        verification_id: adminVerificationId,
        document_type: 'government-id-back',
        status: 'accepted',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${adminVerificationRef}/passport-back.png`,
        file_name: 'passport-back.png',
        mime_type: 'image/png',
        size_bytes: 287654,
        checksum_sha256: makeHash('admin-passport-back'),
        submitted_at: trx.fn.now(),
        reviewed_at: trx.fn.now()
      },
      {
        verification_id: adminVerificationId,
        document_type: 'identity-selfie',
        status: 'accepted',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${adminVerificationRef}/selfie.png`,
        file_name: 'selfie.png',
        mime_type: 'image/png',
        size_bytes: 198765,
        checksum_sha256: makeHash('admin-selfie'),
        submitted_at: trx.fn.now(),
        reviewed_at: trx.fn.now()
      },
      {
        verification_id: instructorVerificationId,
        document_type: 'government-id-front',
        status: 'pending',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${instructorVerificationRef}/id-front.png`,
        file_name: 'id-front.png',
        mime_type: 'image/png',
        size_bytes: 256784,
        checksum_sha256: makeHash('instructor-front'),
        submitted_at: trx.fn.now(),
        reviewed_at: null
      },
      {
        verification_id: instructorVerificationId,
        document_type: 'government-id-back',
        status: 'pending',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${instructorVerificationRef}/id-back.png`,
        file_name: 'id-back.png',
        mime_type: 'image/png',
        size_bytes: 244112,
        checksum_sha256: makeHash('instructor-back'),
        submitted_at: trx.fn.now(),
        reviewed_at: null
      },
      {
        verification_id: instructorVerificationId,
        document_type: 'identity-selfie',
        status: 'pending',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${instructorVerificationRef}/selfie.png`,
        file_name: 'selfie.png',
        mime_type: 'image/png',
        size_bytes: 201223,
        checksum_sha256: makeHash('instructor-selfie'),
        submitted_at: trx.fn.now(),
        reviewed_at: null
      },
      {
        verification_id: learnerVerificationId,
        document_type: 'government-id-front',
        status: 'pending',
        storage_bucket: 'edulure-uploads',
        storage_key: `kyc/${learnerVerificationRef}/id-front.png`,
        file_name: 'id-front.png',
        mime_type: 'image/png',
        size_bytes: 243888,
        checksum_sha256: makeHash('learner-front'),
        submitted_at: trx.fn.now(),
        reviewed_at: null
      }
    ]);

    await trx('kyc_audit_logs').insert([
      {
        verification_id: adminVerificationId,
        actor_id: adminId,
        action: 'review_approved',
        notes: 'Identity verified for platform operator account.',
        metadata: JSON.stringify({ riskScore: 1.75 }),
        created_at: trx.fn.now()
      },
      {
        verification_id: instructorVerificationId,
        actor_id: instructorId,
        action: 'submitted_for_review',
        metadata: JSON.stringify({ documentsSubmitted: 3 }),
        created_at: trx.fn.now()
      },
      {
        verification_id: instructorVerificationId,
        actor_id: adminId,
        action: 'review_pending',
        notes: 'Queued for manual verification due to glare detected on ID back image.',
        metadata: JSON.stringify({ escalationLevel: 't1' }),
        created_at: trx.fn.now()
      },
      {
        verification_id: learnerVerificationId,
        actor_id: learnerId,
        action: 'document_attached',
        metadata: JSON.stringify({ documentType: 'government-id-front' }),
        created_at: trx.fn.now()
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
        defaultChannel: 'weekly-war-room',
        category: 'operations',
        tagline: 'Incident-proof live classrooms and automation squads',
        country: 'US',
        languages: ['en']
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
        defaultChannel: 'campaign-sprint',
        category: 'growth',
        tagline: 'Experiment-led growth and paid acquisition guild',
        country: 'GB',
        languages: ['en']
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

    await trx('community_channel_members').insert([
      {
        channel_id: opsGeneralChannelId,
        user_id: adminId,
        role: 'moderator',
        notifications_enabled: true,
        metadata: JSON.stringify({ digestWindow: 'daily' })
      },
      {
        channel_id: opsGeneralChannelId,
        user_id: learnerId,
        role: 'member',
        notifications_enabled: true,
        metadata: JSON.stringify({ digestWindow: 'daily' })
      },
      {
        channel_id: opsWarRoomChannelId,
        user_id: instructorId,
        role: 'moderator',
        notifications_enabled: true,
        metadata: JSON.stringify({ cadence: 'weekly' })
      },
      {
        channel_id: growthAnnouncementsChannelId,
        user_id: adminId,
        role: 'moderator',
        notifications_enabled: true,
        metadata: JSON.stringify({ digestWindow: 'weekly' })
      },
      {
        channel_id: growthAnnouncementsChannelId,
        user_id: instructorId,
        role: 'member',
        notifications_enabled: false,
        metadata: JSON.stringify({ digestWindow: 'weekly' })
      }
    ]);

    const [opsStandupMessageId] = await trx('community_messages').insert({
      community_id: opsCommunityId,
      channel_id: opsGeneralChannelId,
      author_id: adminId,
      message_type: 'text',
      body: 'Ops guild daily: confirm R2 retention job completed and flag blockers before 10:00 UTC.',
      attachments: JSON.stringify([]),
      metadata: JSON.stringify({ tags: ['standup'], priority: 'high' }),
      delivered_at: trx.fn.now()
    });

    const [opsReplyMessageId] = await trx('community_messages').insert({
      community_id: opsCommunityId,
      channel_id: opsGeneralChannelId,
      author_id: learnerId,
      message_type: 'text',
      body: 'Retention job succeeded in 4m12s. I am drafting the retro doc before today’s war room.',
      attachments: JSON.stringify([]),
      metadata: JSON.stringify({ reply: true }),
      thread_root_id: opsStandupMessageId,
      reply_to_message_id: opsStandupMessageId,
      delivered_at: trx.fn.now()
    });

    await trx('community_message_reactions').insert({
      message_id: opsReplyMessageId,
      user_id: adminId,
      emoji: '✅'
    });

    await trx('community_channel_members')
      .where({ channel_id: opsGeneralChannelId, user_id: adminId })
      .update({ last_read_message_id: opsReplyMessageId, last_read_at: trx.fn.now() });

    await trx('community_channel_members')
      .where({ channel_id: opsGeneralChannelId, user_id: learnerId })
      .update({ last_read_message_id: opsReplyMessageId, last_read_at: trx.fn.now() });

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

    const [growthPlaybookEbookAssetId] = await trx('content_assets').insert({
      public_id: crypto.randomUUID(),
      type: 'ebook',
      original_filename: 'creator-growth-funnel-playbook.epub',
      storage_key: 'growth-lab/creator-growth-funnel-playbook.epub',
      storage_bucket: 'edulure-r2-private',
      converted_key: 'growth-lab/creator-growth-funnel-playbook.html',
      converted_bucket: 'edulure-r2-secure',
      status: 'ready',
      visibility: 'private',
      checksum: makeHash('growth-funnel-playbook.v1'),
      size_bytes: 4829930,
      mime_type: 'application/epub+zip',
      created_by: adminId,
      published_at: trx.fn.now(),
      metadata: JSON.stringify({
        communityId: growthCommunityId,
        drmProfile: 'watermark-v1',
        ingestionPipeline: 'ebook-normaliser'
      })
    });

    await trx('asset_ingestion_jobs').insert({
      asset_id: growthPlaybookEbookAssetId,
      job_type: 'ebook-normalisation',
      status: 'completed',
      attempts: 1,
      result_metadata: JSON.stringify({ normalisedChapters: 8, sanitizer: 'calibre-6.0' }),
      started_at: trx.fn.now(),
      completed_at: trx.fn.now()
    });

    await trx('asset_conversion_outputs').insert({
      asset_id: growthPlaybookEbookAssetId,
      format: 'html',
      storage_key: 'growth-lab/creator-growth-funnel-playbook.html',
      storage_bucket: 'edulure-r2-secure',
      checksum: makeHash('growth-funnel-playbook.v1.html'),
      size_bytes: 1932400,
      metadata: JSON.stringify({ chapters: 8 })
    });

    const [growthStrategiesEbookId] = await trx('ebooks').insert({
      public_id: crypto.randomUUID(),
      asset_id: growthPlaybookEbookAssetId,
      title: 'Creator Funnel Intelligence Playbook',
      slug: 'creator-funnel-intelligence-playbook',
      subtitle: 'Forecasting CPM, conversion velocity, and retention for creator-led ads funnels.',
      description:
        'An operator-grade manual for diagnosing creator funnel performance with actionable benchmarks, anomaly alerts, and optimisation cadences.',
      authors: JSON.stringify(['Amina Diallo', 'Growth Lab Analysts']),
      tags: JSON.stringify(['Ads', 'Funnels', 'Analytics']),
      categories: JSON.stringify(['Marketing', 'Growth']),
      languages: JSON.stringify(['en', 'pt']),
      isbn: '978-1-4028-9462-6',
      reading_time_minutes: 148,
      price_currency: 'USD',
      price_amount: 4900,
      rating_average: 4.6,
      rating_count: 112,
      watermark_id: crypto.randomUUID(),
      status: 'published',
      is_public: true,
      release_at: trx.fn.now(),
      metadata: JSON.stringify({ cohort: 'beta-ops', featureFlag: 'explorer-ads-insights' })
    });

    const [introChapterId] = await trx('ebook_chapters').insert({
      ebook_id: growthStrategiesEbookId,
      title: 'Diagnostic Dashboards',
      slug: 'diagnostic-dashboards',
      position: 1,
      word_count: 2150,
      summary: 'Explains telemetry sources, key ratios, and the baseline diagnostic workflow for creator funnel teams.',
      metadata: JSON.stringify({ chartCount: 6 })
    });

    const [forecastChapterId] = await trx('ebook_chapters').insert({
      ebook_id: growthStrategiesEbookId,
      title: 'Forecasting Campaign Velocity',
      slug: 'forecasting-campaign-velocity',
      position: 2,
      word_count: 3280,
      summary: 'Step-by-step modelling guide covering spend pacing, conversion runway, and anomaly handling.',
      metadata: JSON.stringify({ templateDownloadId: 'forecast-spreadsheet-v2' })
    });

    await trx('ebook_highlights').insert({
      ebook_id: growthStrategiesEbookId,
      chapter_id: introChapterId,
      user_id: learnerId,
      highlight_color: '#A855F7',
      location: 'chapter-1-paragraph-8',
      text: 'Weekly run-rate reviews catch 78% of CPM anomalies before spend spikes.',
      note: 'Surface in dashboard alerts for affiliates.',
      metadata: JSON.stringify({ priority: 'high' })
    });

    await trx('ebook_bookmarks').insert({
      ebook_id: growthStrategiesEbookId,
      chapter_id: forecastChapterId,
      user_id: instructorId,
      label: 'Campaign velocity checklist',
      location: 'chapter-2-section-3',
      metadata: JSON.stringify({ bookmarkedFor: 'Friday AMA' })
    });

    await trx('ebook_reader_settings')
      .insert({
        user_id: learnerId,
        theme: 'dark',
        font_size: 18,
        line_height: 1.6,
        font_family: 'Inter',
        metadata: JSON.stringify({ syncSource: 'web-app' })
      })
      .onConflict('user_id')
      .merge();

    await trx('ebook_watermark_events').insert({
      ebook_id: growthStrategiesEbookId,
      user_id: learnerId,
      download_reference: `DL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      watermark_hash: makeHash('learnerId-watermark'),
      metadata: JSON.stringify({ device: 'ios-tablet', ipAddress: '10.0.0.42' })
    });

    await trx('ebook_read_progress').insert({
      asset_id: growthPlaybookEbookAssetId,
      user_id: learnerId,
      progress_percent: 58.25,
      last_location: 'chapter-2-section-4',
      time_spent_seconds: 2643
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

    const [opsAutomationCourseId] = await trx('courses').insert({
      public_id: crypto.randomUUID(),
      instructor_id: instructorId,
      title: 'Automation Launch Masterclass',
      slug: 'automation-launch-masterclass',
      summary: 'Production blueprint for running live classroom automation squads with incident rehearsal safeguards.',
      description:
        'This cohort-based programme equips operations leaders with the tooling, cadences, and telemetry to launch live classrooms without regression risks. Modules cover command center setup, incident simulations, telemetry dashboards, and stakeholder escalation workflows.',
      level: 'advanced',
      category: 'operations',
      skills: JSON.stringify(['automation', 'incident response', 'quality assurance']),
      tags: JSON.stringify(['Automation', 'Launch', 'Ops Guild']),
      languages: JSON.stringify(['en']),
      delivery_format: 'cohort',
      thumbnail_url: 'https://cdn.edulure.test/thumbnails/automation-masterclass.png',
      price_currency: 'USD',
      price_amount: 129900,
      rating_average: 4.8,
      rating_count: 187,
      enrolment_count: 421,
      is_published: true,
      release_at: trx.fn.now(),
      status: 'published',
      metadata: JSON.stringify({
        syllabusVersion: '2024-Q4',
        analyticsKey: 'ops-masterclass',
        dripCampaign: {
          cadence: 'weekly',
          anchor: 'enrollment-date',
          timezone: 'America/New_York',
          segments: ['Foundational cohort', 'Advanced operators'],
          modules: [
            {
              moduleSlug: 'launch-command-center',
              releaseOffsetDays: 0,
              releaseWindow: 'Mondays 09:00 ET',
              gating: 'Immediate access',
              notifications: ['Email 24h before', 'Slack reminder 1h before'],
              workspace: 'Ops Launch HQ'
            },
            {
              moduleSlug: 'incident-simulation-drills',
              releaseOffsetDays: 7,
              releaseWindow: 'Mondays 09:00 ET',
              gating: 'Requires Module 1 completion',
              notifications: ['Email 24h before', 'SMS 2h before'],
              workspace: 'Ops Launch HQ'
            }
          ]
        },
        refresherLessons: [
          {
            id: 'refresh-ops-sim',
            title: 'Quarterly incident rehearsal',
            format: 'Live simulation',
            cadence: 'Quarterly',
            owner: 'Kai Watanabe',
            status: 'Scheduled',
            nextSessionAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            channel: 'Zoom studio',
            enrollmentWindow: 'Opens 14 days prior'
          },
          {
            id: 'refresh-ops-audit',
            title: 'Automation audit checklist',
            format: 'Async module',
            cadence: 'Bi-annual',
            owner: 'Kai Watanabe',
            status: 'Draft',
            nextSessionAt: null,
            channel: 'Learning hub',
            enrollmentWindow: 'Self-paced access'
          }
        ],
        videoLibrary: [
          {
            id: 'vid-command-tour',
            title: 'Command center war room tour',
            durationMinutes: 18,
            quality: '1080p',
            sizeMb: 942,
            status: 'Encoded',
            updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            language: 'English',
            aspectRatio: '16:9'
          },
          {
            id: 'vid-incident-sim',
            title: 'Incident drill facilitation',
            durationMinutes: 27,
            quality: '4K',
            sizeMb: 1460,
            status: 'Quality review',
            updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            language: 'English',
            aspectRatio: '16:9'
          }
        ],
        catalogueListings: [
          {
            id: 'catalog-marketplace',
            channel: 'Marketplace',
            status: 'Published',
            impressions: 18452,
            conversions: 136,
            conversionRate: 0.0737,
            price: 129900,
            currency: 'USD',
            lastSyncedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'catalog-enterprise',
            channel: 'Enterprise network',
            status: 'Pilot',
            impressions: 42,
            conversions: 10,
            conversionRate: 0.238,
            price: 189900,
            currency: 'USD',
            lastSyncedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        reviews: [
          {
            id: 'review-launchhub',
            reviewer: 'Lina Gomez',
            role: 'Director of Operations',
            company: 'LaunchHub',
            rating: 5,
            headline: 'Launch readiness transformed our go-live',
            feedback:
              'The drip sequencing and rehearsal cadences meant our entire ops guild showed up prepared. We saw a 38% reduction in launch escalations.',
            submittedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
            delivery: 'Cohort',
            experience: 'Web and mobile parity'
          },
          {
            id: 'review-ops-guild',
            reviewer: 'Ops Guild Collective',
            role: 'Peer review board',
            company: 'Ops Guild',
            rating: 4.6,
            headline: 'Enterprise-grade runbook system',
            feedback:
              'Module creation workflows and refresher loops were robust enough for our multi-market programme. Mobile execution matched the desktop experience.',
            submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            delivery: 'Hybrid cohort',
            experience: 'Mobile parity certified'
          }
        ],
        mobileParity: {
          status: 'Aligned',
          experiences: ['drip modules', 'refresher lessons', 'recorded videos']
        }
      })
    });

    const [opsModuleKickoffId] = await trx('course_modules').insert({
      course_id: opsAutomationCourseId,
      title: 'Launch Command Center',
      slug: 'launch-command-center',
      position: 1,
      release_offset_days: 0,
      metadata: JSON.stringify({
        recommendedDurationMinutes: 120,
        drip: {
          gating: 'Immediate access',
          prerequisites: [],
          notifications: ['Email 24h before release'],
          workspace: 'Ops Launch HQ'
        },
        creation: {
          owner: 'Kai Watanabe',
          status: 'Approved',
          lastUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          qualityGate: 'QA passed'
        }
      })
    });

    const [opsModuleIncidentId] = await trx('course_modules').insert({
      course_id: opsAutomationCourseId,
      title: 'Incident Simulation Drills',
      slug: 'incident-simulation-drills',
      position: 2,
      release_offset_days: 7,
      metadata: JSON.stringify({
        hasSimulation: true,
        drip: {
          gating: 'Requires Module 1 completion',
          prerequisites: ['Launch Command Center'],
          notifications: ['Email 24h before release', 'SMS 2h before release'],
          workspace: 'Ops Launch HQ'
        },
        creation: {
          owner: 'Kai Watanabe',
          status: 'In review',
          lastUpdatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          qualityGate: 'Needs simulation QA'
        }
      })
    });

    const [commandCenterLessonId] = await trx('course_lessons').insert({
      course_id: opsAutomationCourseId,
      module_id: opsModuleKickoffId,
      asset_id: opsPlaybookAssetId,
      title: 'Command Center Blueprint',
      slug: 'command-center-blueprint',
      position: 1,
      duration_minutes: 45,
      release_at: trx.fn.now(),
      metadata: JSON.stringify({ format: 'presentation', keyTakeaway: 'Runbook readiness matrix' })
    });

    const [telemetryLessonId] = await trx('course_lessons').insert({
      course_id: opsAutomationCourseId,
      module_id: opsModuleIncidentId,
      asset_id: growthPlaybookEbookAssetId,
      title: 'Funnel Telemetry Deep Dive',
      slug: 'funnel-telemetry-deep-dive',
      position: 1,
      duration_minutes: 60,
      release_at: trx.fn.now(),
      metadata: JSON.stringify({ format: 'reading', worksheet: 'forecast-checklist' })
    });

    await trx('course_assignments').insert({
      course_id: opsAutomationCourseId,
      module_id: opsModuleIncidentId,
      title: 'Automation Readiness Audit',
      instructions:
        'Upload the incident rehearsal scorecard summarising escalation roles, telemetry dashboards, and fallback runbooks for your next classroom launch.',
      max_score: 100,
      due_offset_days: 10,
      rubric: JSON.stringify({ automationCoverage: 40, rehearsalRigor: 30, reportingClarity: 30 }),
      metadata: JSON.stringify({ submissionType: 'upload', requiresReview: true })
    });

    const [opsEnrollmentId] = await trx('course_enrollments').insert({
      public_id: crypto.randomUUID(),
      course_id: opsAutomationCourseId,
      user_id: learnerId,
      status: 'active',
      progress_percent: 46.5,
      started_at: trx.fn.now(),
      metadata: JSON.stringify({ cohort: '2024-Q4', enrollmentSource: 'seed' })
    });

    await trx('course_progress').insert([
      {
        enrollment_id: opsEnrollmentId,
        lesson_id: commandCenterLessonId,
        completed: true,
        completed_at: trx.fn.now(),
        progress_percent: 100,
        metadata: JSON.stringify({ completionSource: 'web' })
      },
      {
        enrollment_id: opsEnrollmentId,
        lesson_id: telemetryLessonId,
        completed: false,
        progress_percent: 25,
        metadata: JSON.stringify({ lastLocation: 'section-2', note: 'Review telemetry thresholds' })
      }
    ]);

    const [opsStrategistRoleId] = await trx('community_role_definitions').insert({
      community_id: opsCommunityId,
      role_key: 'ops-strategist',
      name: 'Ops Strategist',
      description: 'Owns automation runbooks, resource QA, and high-risk escalation workflows.',
      permissions: JSON.stringify({
        manageChannels: true,
        publishContent: true,
        viewFinanceDashboards: false,
        orchestrateSimulations: true
      }),
      is_default_assignable: false,
      created_by: instructorId
    });

    const [growthAnalystRoleId] = await trx('community_role_definitions').insert({
      community_id: growthCommunityId,
      role_key: 'growth-analyst',
      name: 'Growth Analyst',
      description: 'Responsible for attribution dashboards, paywall KPI reviews, and affiliate QA.',
      permissions: JSON.stringify({
        manageChannels: false,
        publishContent: true,
        viewFinanceDashboards: true,
        manageAffiliates: true
      }),
      is_default_assignable: true,
      created_by: adminId
    });

    const [opsPremiumTierId] = await trx('community_paywall_tiers').insert({
      community_id: opsCommunityId,
      slug: 'premium-ops-lab',
      name: 'Premium Ops Lab',
      description:
        'Monthly access to incident simulations, automation labs, and priority escalation office hours.',
      price_cents: 8900,
      currency: 'USD',
      billing_interval: 'monthly',
      trial_period_days: 7,
      is_active: true,
      benefits: JSON.stringify([
        'Weekly live incident rehearsal',
        'Automation playbook library access',
        'Priority escalation office hours'
      ]),
      metadata: JSON.stringify({ analyticsKey: 'ops-premium', featureFlag: 'ops-lab-paywall' }),
      stripe_price_id: 'price_ops_premium_monthly'
    });

    const [growthInsiderTierId] = await trx('community_paywall_tiers').insert({
      community_id: growthCommunityId,
      slug: 'growth-insiders-annual',
      name: 'Growth Insiders Annual',
      description:
        'Annual membership bundling campaign labs, attribution tooling, and co-marketing office hours.',
      price_cents: 189900,
      currency: 'USD',
      billing_interval: 'annual',
      trial_period_days: 14,
      is_active: true,
      benefits: JSON.stringify([
        'Quarterly campaign tear-down workshops',
        'Attribution dashboard access',
        'Affiliate co-marketing slots'
      ]),
      metadata: JSON.stringify({ analyticsKey: 'growth-insider', slaHours: 12 }),
      stripe_price_id: 'price_growth_insider_annual',
      paypal_plan_id: 'P-GROWTH-ANNUAL'
    });

    const affiliateReferralCode = 'GROWTHLAB20';
    const [growthAffiliateId] = await trx('community_affiliates').insert({
      community_id: growthCommunityId,
      user_id: learnerId,
      status: 'approved',
      referral_code: affiliateReferralCode,
      commission_rate_bps: 2000,
      total_earned_cents: 0,
      total_paid_cents: 0,
      metadata: JSON.stringify({ campaign: 'beta-cohort', payoutEmail: 'noemi.carvalho@edulure.test' }),
      approved_at: trx.fn.now()
    });

    const subscriptionPublicId = crypto.randomUUID();
    const providerIntentId = `pi_${crypto.randomBytes(8).toString('hex')}`;
    const providerChargeId = `ch_${crypto.randomBytes(6).toString('hex')}`;

    const [subscriptionPaymentId] = await trx('payment_intents').insert({
      public_id: crypto.randomUUID(),
      user_id: learnerId,
      provider: 'stripe',
      provider_intent_id: providerIntentId,
      provider_latest_charge_id: providerChargeId,
      status: 'succeeded',
      currency: 'USD',
      amount_subtotal: 189900,
      amount_discount: 0,
      amount_tax: 15192,
      amount_total: 205092,
      amount_refunded: 0,
      tax_breakdown: JSON.stringify({ jurisdiction: 'US-CA', rate: 0.08 }),
      metadata: JSON.stringify({
        public_id: subscriptionPublicId,
        entity_type: 'community_subscription',
        entity_id: subscriptionPublicId,
        items: [
          {
            id: 'growth-insiders-annual',
            name: 'Growth Insiders Annual',
            unitAmount: 189900,
            quantity: 1,
            discount: 0,
            tax: 15192,
            total: 205092
          }
        ],
        taxableSubtotal: 189900,
        taxableAfterDiscount: 189900,
        couponCode: null,
        couponId: null,
        referralCode: affiliateReferralCode
      }),
      coupon_id: null,
      entity_type: 'community_subscription',
      entity_id: subscriptionPublicId,
      receipt_email: 'noemi.carvalho@edulure.test',
      captured_at: trx.fn.now()
    });

    await trx('payment_ledger_entries').insert({
      payment_intent_id: subscriptionPaymentId,
      entry_type: 'charge',
      amount: 205092,
      currency: 'USD',
      details: JSON.stringify({
        provider: 'stripe',
        chargeId: providerChargeId,
        paymentMethod: ['card'],
        statementDescriptor: 'EDULURE INSIDER'
      })
    });

    const now = new Date();
    const nextYear = new Date(now.getTime());
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const affiliateCommission = Math.floor(205092 * 0.2);

    const [growthSubscriptionId] = await trx('community_subscriptions').insert({
      public_id: subscriptionPublicId,
      community_id: growthCommunityId,
      user_id: learnerId,
      tier_id: growthInsiderTierId,
      status: 'active',
      started_at: now,
      current_period_start: now,
      current_period_end: nextYear,
      cancel_at_period_end: false,
      provider: 'stripe',
      provider_customer_id: `cus_${crypto.randomBytes(6).toString('hex')}`,
      provider_subscription_id: `sub_${crypto.randomBytes(6).toString('hex')}`,
      provider_status: 'active',
      latest_payment_intent_id: subscriptionPaymentId,
      affiliate_id: growthAffiliateId,
      metadata: JSON.stringify({ referralCode: affiliateReferralCode, source: 'seed' })
    });

    await trx('community_affiliates')
      .where({ id: growthAffiliateId })
      .update({ total_earned_cents: affiliateCommission, updated_at: trx.fn.now() });

    await trx('community_affiliate_payouts').insert({
      affiliate_id: growthAffiliateId,
      amount_cents: Math.floor(affiliateCommission / 2),
      status: 'processing',
      payout_reference: 'PAYOUT-2024-10-001',
      scheduled_at: trx.fn.now(),
      metadata: JSON.stringify({ invoiceNumber: 'INV-2024-10-001', subscriptionId: growthSubscriptionId })
    });

    await trx('community_members')
      .where({ community_id: growthCommunityId, user_id: learnerId })
      .update({
        status: 'active',
        role: 'growth-analyst',
        metadata: JSON.stringify({
          subscriptionPublicId,
          referralCode: affiliateReferralCode,
          affiliateId: growthAffiliateId,
          roleDefinitionId: growthAnalystRoleId
        }),
        updated_at: trx.fn.now()
      });

    await trx('community_members')
      .where({ community_id: opsCommunityId, user_id: adminId })
      .update({
        role: 'ops-strategist',
        metadata: JSON.stringify({ playbookOwner: true, roleDefinitionId: opsStrategistRoleId }),
        updated_at: trx.fn.now()
      });

    await trx('domain_events').insert([
      {
        entity_type: 'community_paywall_tier',
        entity_id: String(opsPremiumTierId),
        event_type: 'community.paywall.tier.created',
        payload: JSON.stringify({ communityId: opsCommunityId, slug: 'premium-ops-lab' }),
        performed_by: instructorId
      },
      {
        entity_type: 'community_paywall_tier',
        entity_id: String(growthInsiderTierId),
        event_type: 'community.paywall.tier.created',
        payload: JSON.stringify({ communityId: growthCommunityId, slug: 'growth-insiders-annual' }),
        performed_by: adminId
      },
      {
        entity_type: 'community_subscription',
        entity_id: subscriptionPublicId,
        event_type: 'community.subscription.activated',
        payload: JSON.stringify({
          communityId: growthCommunityId,
          tierId: growthInsiderTierId,
          affiliateId: growthAffiliateId,
          paymentIntentId: subscriptionPaymentId
        }),
        performed_by: learnerId
      },
      {
        entity_type: 'community_affiliate',
        entity_id: String(growthAffiliateId),
        event_type: 'community.affiliate.payout-scheduled',
        payload: JSON.stringify({
          amount: Math.floor(affiliateCommission / 2),
          payoutReference: 'PAYOUT-2024-10-001',
          subscriptionId: growthSubscriptionId
        }),
        performed_by: adminId
      }
    ]);

    const tutorSlotStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    tutorSlotStart.setUTCHours(13, 0, 0, 0);
    const tutorSlotEnd = new Date(tutorSlotStart.getTime() + 60 * 60 * 1000);
    const openSlotStart = new Date(tutorSlotStart.getTime() + 3 * 24 * 60 * 60 * 1000);
    openSlotStart.setUTCHours(15, 0, 0, 0);
    const openSlotEnd = new Date(openSlotStart.getTime() + 60 * 60 * 1000);

    const [opsTutorProfileId] = await trx('tutor_profiles').insert({
      user_id: instructorId,
      display_name: 'Kai Watanabe',
      headline: 'Automation launch strategist & Agora live operations lead',
      bio: 'Kai orchestrates hybrid live learning launches for global cohorts, specialising in incident rehearsal and telemetry roll-outs.',
      skills: JSON.stringify(['Automation', 'Live Operations', 'Incident Response']),
      languages: JSON.stringify(['en', 'ja']),
      country: 'JP',
      timezones: JSON.stringify(['Asia/Tokyo', 'Etc/UTC']),
      availability_preferences: JSON.stringify({ weeklyHours: 12, officeHours: ['Tuesday 09:00Z', 'Thursday 14:00Z'] }),
      hourly_rate_amount: 18000,
      hourly_rate_currency: 'USD',
      rating_average: 4.9,
      rating_count: 86,
      completed_sessions: 312,
      response_time_minutes: 18,
      is_verified: true,
      metadata: JSON.stringify({ onboardingStatus: 'complete', calendlyLink: 'https://meet.edulure.test/kai' })
    });

    const [bookedAvailabilityId] = await trx('tutor_availability_slots').insert({
      tutor_id: opsTutorProfileId,
      start_at: tutorSlotStart,
      end_at: tutorSlotEnd,
      status: 'booked',
      is_recurring: false,
      metadata: JSON.stringify({ bookingReference: 'OPS-LAUNCH-SESSION' })
    });

    await trx('tutor_availability_slots').insert({
      tutor_id: opsTutorProfileId,
      start_at: openSlotStart,
      end_at: openSlotEnd,
      status: 'open',
      is_recurring: true,
      recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,WE',
      metadata: JSON.stringify({ channel: 'ops-guild', durationMinutes: 60 })
    });

    const [opsTutorBookingId] = await trx('tutor_bookings').insert({
      public_id: crypto.randomUUID(),
      tutor_id: opsTutorProfileId,
      learner_id: learnerId,
      requested_at: trx.fn.now(),
      confirmed_at: trx.fn.now(),
      scheduled_start: tutorSlotStart,
      scheduled_end: tutorSlotEnd,
      duration_minutes: 60,
      hourly_rate_amount: 18000,
      hourly_rate_currency: 'USD',
      meeting_url: 'https://meet.edulure.test/ops-masterclass-sync',
      status: 'confirmed',
      metadata: JSON.stringify({ availabilitySlotId: bookedAvailabilityId, communityId: opsCommunityId })
    });

    const liveClassroomStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    liveClassroomStart.setUTCHours(17, 0, 0, 0);
    const liveClassroomEnd = new Date(liveClassroomStart.getTime() + 90 * 60 * 1000);

    const [opsLiveClassroomId] = await trx('live_classrooms').insert({
      public_id: crypto.randomUUID(),
      community_id: opsCommunityId,
      instructor_id: instructorId,
      title: 'Automation Command Simulation',
      slug: 'automation-command-simulation',
      summary: 'Live simulation covering escalation workflows, telemetry dashboards, and tutor hand-offs.',
      description:
        'Learners practise running an automation-driven classroom rehearsal with live alerts, R2 asset sync, and tutor escalation drills anchored to the ops guild war room.',
      type: 'workshop',
      status: 'scheduled',
      is_ticketed: true,
      price_amount: 9900,
      price_currency: 'USD',
      capacity: 120,
      reserved_seats: 64,
      timezone: 'Etc/UTC',
      start_at: liveClassroomStart,
      end_at: liveClassroomEnd,
      topics: JSON.stringify(['Automation', 'Live Operations']),
      metadata: JSON.stringify({ agoraChannel: 'OPS-LAUNCH-001', featureFlag: 'live-simulations' })
    });

    await trx('live_classroom_registrations').insert({
      classroom_id: opsLiveClassroomId,
      user_id: learnerId,
      status: 'registered',
      ticket_type: 'premium',
      amount_paid: 9900,
      currency: 'USD',
      registered_at: trx.fn.now(),
      metadata: JSON.stringify({ bookingId: opsTutorBookingId, seat: 'A-14' })
    });

    const [directThreadId] = await trx('direct_message_threads').insert({
      subject: 'Launch Readiness Sync',
      is_group: false,
      metadata: JSON.stringify({ seeded: true, playbook: 'launch-readiness' }),
      last_message_at: trx.fn.now(),
      last_message_preview: 'Checklist signed off and synced to the ops drive.'
    });

    await trx('direct_message_participants').insert([
      {
        thread_id: directThreadId,
        user_id: adminId,
        role: 'admin',
        notifications_enabled: true
      },
      {
        thread_id: directThreadId,
        user_id: instructorId,
        role: 'member',
        notifications_enabled: true
      }
    ]);

    await trx('direct_messages').insert({
      thread_id: directThreadId,
      sender_id: adminId,
      message_type: 'text',
      body: 'Kai, can you confirm the launch checklist is ready for Friday’s dry run?',
      attachments: JSON.stringify([]),
      metadata: JSON.stringify({ topic: 'launch-checklist' }),
      status: 'delivered',
      delivered_at: trx.fn.now()
    });

    const [directMessageReplyId] = await trx('direct_messages').insert({
      thread_id: directThreadId,
      sender_id: instructorId,
      message_type: 'text',
      body: 'Checklist signed off and synced to the ops drive. I added the QA runbook link.',
      attachments: JSON.stringify([]),
      metadata: JSON.stringify({ checklistVersion: '2024-Q4' }),
      status: 'read',
      delivered_at: trx.fn.now(),
      read_at: trx.fn.now()
    });

    await trx('direct_message_threads')
      .where({ id: directThreadId })
      .update({
        last_message_at: trx.fn.now(),
        last_message_preview: 'Checklist signed off and synced to the ops drive.'
      });

    await trx('direct_message_participants')
      .where({ thread_id: directThreadId, user_id: adminId })
      .update({ last_read_message_id: directMessageReplyId, last_read_at: trx.fn.now() });

    await trx('direct_message_participants')
      .where({ thread_id: directThreadId, user_id: instructorId })
      .update({ last_read_message_id: directMessageReplyId, last_read_at: trx.fn.now() });

    await trx('user_presence_sessions').insert([
      {
        user_id: adminId,
        session_id: 'seed-admin-web',
        client: 'web',
        status: 'online',
        connected_at: trx.fn.now(),
        last_seen_at: trx.fn.now(),
        metadata: JSON.stringify({ region: 'eu-west-1', appVersion: '1.0.0' })
      },
      {
        user_id: instructorId,
        session_id: 'seed-instructor-mobile',
        client: 'mobile',
        status: 'away',
        connected_at: trx.fn.now(),
        last_seen_at: trx.fn.now(),
        expires_at: trx.raw('DATE_ADD(NOW(), INTERVAL 5 MINUTE)'),
        metadata: JSON.stringify({ region: 'ap-southeast-1', appVersion: '1.0.0' })
      }
    ]);

    await trx('user_privacy_settings').insert([
      {
        user_id: adminId,
        profile_visibility: 'public',
        follow_approval_required: false,
        message_permission: 'anyone',
        share_activity: true,
        metadata: JSON.stringify({ spotlight: 'operations-guild' })
      },
      {
        user_id: instructorId,
        profile_visibility: 'followers',
        follow_approval_required: true,
        message_permission: 'followers',
        share_activity: true,
        metadata: JSON.stringify({ acceptsOfficeHours: true })
      },
      {
        user_id: learnerId,
        profile_visibility: 'private',
        follow_approval_required: true,
        message_permission: 'followers',
        share_activity: false,
        metadata: JSON.stringify({ reason: 'beta-tester' })
      }
    ]);

    await trx('user_follows').insert([
      {
        follower_id: adminId,
        following_id: instructorId,
        status: 'accepted',
        source: 'seed',
        accepted_at: trx.fn.now(),
        metadata: JSON.stringify({ context: 'ops-collaboration' })
      },
      {
        follower_id: instructorId,
        following_id: adminId,
        status: 'accepted',
        source: 'seed',
        accepted_at: trx.fn.now(),
        metadata: JSON.stringify({ context: 'launch-readiness' })
      },
      {
        follower_id: learnerId,
        following_id: instructorId,
        status: 'pending',
        source: 'seed',
        metadata: JSON.stringify({ note: 'requested mentorship' })
      }
    ]);

    await trx('user_mute_list').insert({
      user_id: instructorId,
      muted_user_id: learnerId,
      muted_until: trx.raw('DATE_ADD(NOW(), INTERVAL 2 DAY)'),
      reason: 'Focus mode before launch',
      metadata: JSON.stringify({ createdBy: 'seed' })
    });

    await trx('user_follow_recommendations').insert([
      {
        user_id: learnerId,
        recommended_user_id: adminId,
        score: 87.5,
        mutual_followers_count: 1,
        reason_code: 'community_admin',
        metadata: JSON.stringify({ message: 'Admins share launch retrospectives' })
      },
      {
        user_id: adminId,
        recommended_user_id: learnerId,
        score: 65.25,
        mutual_followers_count: 1,
        reason_code: 'new_member',
        metadata: JSON.stringify({ message: 'New cohort member awaiting onboarding' })
      }
    ]);

    await trx('social_audit_logs').insert([
      {
        user_id: adminId,
        target_user_id: instructorId,
        action: 'follow.accepted',
        source: 'seed',
        metadata: JSON.stringify({ seed: true })
      },
      {
        user_id: instructorId,
        target_user_id: learnerId,
        action: 'mute.applied',
        source: 'seed',
        metadata: JSON.stringify({ durationMinutes: 2 * 24 * 60 })
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

    const adsStart = new Date();
    adsStart.setDate(adsStart.getDate() - 7);
    adsStart.setUTCHours(0, 0, 0, 0);
    const adsEnd = new Date();
    adsEnd.setDate(adsEnd.getDate() + 21);
    adsEnd.setUTCHours(0, 0, 0, 0);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setUTCHours(0, 0, 0, 0);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setUTCHours(0, 0, 0, 0);

    const [growthAdsCampaignId] = await trx('ads_campaigns').insert({
      public_id: crypto.randomUUID(),
      created_by: adminId,
      name: 'Creator Funnel Boost Q4',
      objective: 'conversions',
      status: 'active',
      budget_currency: 'USD',
      budget_daily_cents: 500000,
      spend_currency: 'USD',
      spend_total_cents: 182500,
      performance_score: 88.4,
      ctr: 0.0425,
      cpc_cents: 185,
      cpa_cents: 1299,
      targeting_keywords: JSON.stringify(['creator ads', 'funnel analytics', 'ops playbook']),
      targeting_audiences: JSON.stringify(['Creators', 'Ops Leads']),
      targeting_locations: JSON.stringify(['US', 'GB', 'BR']),
      targeting_languages: JSON.stringify(['en', 'pt']),
      creative_headline: 'Scale creator funnels with telemetry-grade insights',
      creative_description: 'Drive conversions with automation playbooks, live simulations, and monetisation labs.',
      creative_url: 'https://edulure.test/ads/creator-funnel-boost',
      start_at: adsStart,
      end_at: adsEnd,
      metadata: JSON.stringify({ promotedCommunityId: growthCommunityId, featureFlag: 'ads-explorer-placements' })
    });

    await trx('ads_campaign_metrics_daily').insert([
      {
        campaign_id: growthAdsCampaignId,
        metric_date: twoDaysAgo,
        impressions: 42000,
        clicks: 1785,
        conversions: 214,
        spend_cents: 36500,
        revenue_cents: 98200,
        metadata: JSON.stringify({ source: 'meilisearch-reports', funnel: 'creator-growth' })
      },
      {
        campaign_id: growthAdsCampaignId,
        metric_date: oneDayAgo,
        impressions: 48750,
        clicks: 2043,
        conversions: 238,
        spend_cents: 41200,
        revenue_cents: 109500,
        metadata: JSON.stringify({ source: 'meilisearch-reports', funnel: 'creator-growth' })
      }
    ]);

    const analyticsToday = new Date();
    analyticsToday.setUTCHours(0, 0, 0, 0);
    const analyticsYesterday = new Date(analyticsToday.getTime() - 24 * 60 * 60 * 1000);
    const analyticsTwoDaysAgo = new Date(analyticsToday.getTime() - 2 * 24 * 60 * 60 * 1000);

    const explorerSeedUuid = crypto.randomUUID();
    const [explorerSeedEventId] = await trx('explorer_search_events').insert({
      event_uuid: explorerSeedUuid,
      user_id: adminId,
      session_id: crypto.randomUUID(),
      trace_id: makeHash('explorer-seed-trace').slice(0, 32),
      query: 'automation launch',
      result_total: 42,
      is_zero_result: false,
      latency_ms: 210,
      filters: JSON.stringify({ courses: { level: ['advanced'] } }),
      global_filters: JSON.stringify({ languages: ['en'] }),
      sort_preferences: JSON.stringify({ courses: 'rating', communities: 'trending' }),
      metadata: JSON.stringify({ source: 'seed', cohort: 'operations' })
    });

    await trx('explorer_search_event_entities').insert([
      {
        event_id: explorerSeedEventId,
        entity_type: 'communities',
        total_hits: 18,
        displayed_hits: 6,
        processing_time_ms: 95,
        is_zero_result: false,
        click_count: 2,
        conversion_count: 0,
        metadata: JSON.stringify({ category: 'operations', timezone: 'UTC' })
      },
      {
        event_id: explorerSeedEventId,
        entity_type: 'courses',
        total_hits: 14,
        displayed_hits: 5,
        processing_time_ms: 72,
        is_zero_result: false,
        click_count: 3,
        conversion_count: 1,
        metadata: JSON.stringify({ delivery: 'cohort', rating: 4.8 })
      },
      {
        event_id: explorerSeedEventId,
        entity_type: 'tutors',
        total_hits: 10,
        displayed_hits: 4,
        processing_time_ms: 43,
        is_zero_result: false,
        click_count: 1,
        conversion_count: 0,
        metadata: JSON.stringify({ languages: ['en'], verified: true })
      }
    ]);

    await trx('explorer_search_event_interactions').insert([
      {
        event_id: explorerSeedEventId,
        entity_type: 'courses',
        result_id: 'automation-masterclass',
        interaction_type: 'click',
        position: 1,
        metadata: JSON.stringify({ action: 'primary_cta' })
      },
      {
        event_id: explorerSeedEventId,
        entity_type: 'communities',
        result_id: 'learning-ops-guild',
        interaction_type: 'detail_view',
        position: 2,
        metadata: JSON.stringify({ action: 'open_preview' })
      }
    ]);

    await trx('explorer_search_daily_metrics').insert([
      {
        metric_date: analyticsTwoDaysAgo,
        entity_type: 'all',
        searches: 320,
        zero_results: 42,
        displayed_results: 1216,
        total_results: 6420,
        clicks: 205,
        conversions: 58,
        average_latency_ms: 198,
        metadata: JSON.stringify({ cohort: 'operations' })
      },
      {
        metric_date: analyticsTwoDaysAgo,
        entity_type: 'communities',
        searches: 110,
        zero_results: 14,
        displayed_results: 420,
        total_results: 2150,
        clicks: 68,
        conversions: 14,
        average_latency_ms: 182,
        metadata: JSON.stringify({ category: 'operations' })
      },
      {
        metric_date: analyticsTwoDaysAgo,
        entity_type: 'courses',
        searches: 128,
        zero_results: 18,
        displayed_results: 512,
        total_results: 2860,
        clicks: 92,
        conversions: 33,
        average_latency_ms: 166,
        metadata: JSON.stringify({ track: 'automation' })
      },
      {
        metric_date: analyticsTwoDaysAgo,
        entity_type: 'tutors',
        searches: 82,
        zero_results: 10,
        displayed_results: 284,
        total_results: 1410,
        clicks: 45,
        conversions: 11,
        average_latency_ms: 132,
        metadata: JSON.stringify({ locale: 'global' })
      },
      {
        metric_date: analyticsYesterday,
        entity_type: 'all',
        searches: 348,
        zero_results: 36,
        displayed_results: 1320,
        total_results: 7012,
        clicks: 248,
        conversions: 66,
        average_latency_ms: 187,
        metadata: JSON.stringify({ cohort: 'growth' })
      },
      {
        metric_date: analyticsYesterday,
        entity_type: 'communities',
        searches: 124,
        zero_results: 11,
        displayed_results: 470,
        total_results: 2295,
        clicks: 84,
        conversions: 19,
        average_latency_ms: 170,
        metadata: JSON.stringify({ category: 'growth' })
      },
      {
        metric_date: analyticsYesterday,
        entity_type: 'courses',
        searches: 141,
        zero_results: 16,
        displayed_results: 555,
        total_results: 3100,
        clicks: 118,
        conversions: 35,
        average_latency_ms: 158,
        metadata: JSON.stringify({ track: 'commerce' })
      },
      {
        metric_date: analyticsYesterday,
        entity_type: 'tutors',
        searches: 83,
        zero_results: 9,
        displayed_results: 295,
        total_results: 1617,
        clicks: 46,
        conversions: 12,
        average_latency_ms: 128,
        metadata: JSON.stringify({ locale: 'emea' })
      },
      {
        metric_date: analyticsToday,
        entity_type: 'all',
        searches: 362,
        zero_results: 31,
        displayed_results: 1384,
        total_results: 7288,
        clicks: 261,
        conversions: 74,
        average_latency_ms: 176,
        metadata: JSON.stringify({ cohort: 'live-classroom' })
      },
      {
        metric_date: analyticsToday,
        entity_type: 'communities',
        searches: 132,
        zero_results: 9,
        displayed_results: 492,
        total_results: 2421,
        clicks: 88,
        conversions: 22,
        average_latency_ms: 164,
        metadata: JSON.stringify({ category: 'live' })
      },
      {
        metric_date: analyticsToday,
        entity_type: 'courses',
        searches: 150,
        zero_results: 12,
        displayed_results: 575,
        total_results: 3268,
        clicks: 128,
        conversions: 38,
        average_latency_ms: 152,
        metadata: JSON.stringify({ track: 'delivery' })
      },
      {
        metric_date: analyticsToday,
        entity_type: 'tutors',
        searches: 80,
        zero_results: 10,
        displayed_results: 317,
        total_results: 1599,
        clicks: 45,
        conversions: 14,
        average_latency_ms: 121,
        metadata: JSON.stringify({ locale: 'amer' })
      }
    ]);

    await trx('analytics_alerts').insert([
      {
        alert_code: 'explorer.zero-result-rate',
        severity: 'warning',
        message: 'Zero-result rate for tutors exceeded 18% in the last 24h',
        metadata: JSON.stringify({ zeroRate: 0.19, entity: 'tutors' }),
        detected_at: new Date(analyticsToday.getTime() - 6 * 60 * 60 * 1000)
      },
      {
        alert_code: 'explorer.click-through-rate',
        severity: 'info',
        message: 'Explorer CTR recovered above baseline after experiment rollout',
        metadata: JSON.stringify({ ctr: 0.032, experiment: 'explorer.personalised-facets' }),
        detected_at: new Date(analyticsYesterday.getTime() + 8 * 60 * 60 * 1000),
        resolved_at: analyticsToday
      }
    ]);

    const forecastBase = analyticsToday.getTime();
    for (let i = 1; i <= 7; i += 1) {
      const targetDate = new Date(forecastBase + i * 24 * 60 * 60 * 1000);
      await trx('analytics_forecasts').insert({
        forecast_code: 'explorer.search-volume',
        target_date: targetDate,
        metric_value: 360 + i * 8,
        lower_bound: 320 + i * 6,
        upper_bound: 410 + i * 9,
        metadata: JSON.stringify({ methodology: 'exponential_smoothing', alpha: 0.35 })
      });
      await trx('analytics_forecasts').insert({
        forecast_code: 'explorer.click-through-rate',
        target_date: targetDate,
        metric_value: Number((0.031 + i * 0.0005).toFixed(4)),
        lower_bound: Number((0.027 + i * 0.0004).toFixed(4)),
        upper_bound: Number((0.036 + i * 0.0006).toFixed(4)),
        metadata: JSON.stringify({ methodology: 'exponential_smoothing', alpha: 0.4 })
      });
    }

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    await trx('saved_searches').insert({
      user_id: adminId,
      name: 'Automation program discovery',
      search_query: 'automation',
      entity_types: JSON.stringify(['communities', 'courses', 'tutors']),
      filters: JSON.stringify({
        communities: { visibility: ['public'] },
        courses: { level: ['advanced'], category: ['operations'] },
        tutors: { languages: ['en'], isVerified: true }
      }),
      global_filters: JSON.stringify({ languages: ['en'] }),
      sort_preferences: JSON.stringify({ communities: 'trending', courses: 'rating' }),
      is_pinned: true,
      last_used_at: trx.fn.now()
    });

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

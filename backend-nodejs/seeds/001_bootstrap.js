import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { generateConsentPolicyChecksum } from '../src/database/domains/compliance.js';
import { TABLES as TELEMETRY_TABLES } from '../src/database/domains/telemetry.js';
import DataEncryptionService from '../src/services/DataEncryptionService.js';
import PaymentIntentModel from '../src/models/PaymentIntentModel.js';
import CommunityAffiliatePayoutModel from '../src/models/CommunityAffiliatePayoutModel.js';
import { ensureSeedImage } from './_helpers/seedAssets.js';

const makeHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const makeVerificationRef = () => `kyc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
const incidentEncryptionKey = process.env.SECURITY_INCIDENT_ENCRYPTION_KEY
  ? Buffer.from(process.env.SECURITY_INCIDENT_ENCRYPTION_KEY, 'hex')
  : crypto.createHash('sha256').update('edulure-security-seed-key').digest();

const sealSensitive = (value) => {
  if (!value) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', incidentEncryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
};

const buildEncryptedKycDocument = (
  verificationId,
  documentType,
  { status = 'pending', storageBucket, storageKey, fileName, mimeType, sizeBytes, checksum, submittedAt, reviewedAt }
) => {
  const payload = {
    storageBucket,
    storageKey,
    fileName,
    mimeType,
    sizeBytes,
    checksumSha256: checksum
  };
  const encrypted = DataEncryptionService.encryptStructured(payload, {
    classificationTag: 'kyc.document',
    fingerprintValues: [storageKey ?? '', checksum ?? '']
  });

  return {
    verification_id: verificationId,
    document_type: documentType,
    status,
    storage_bucket: 'encrypted',
    storage_key: storageKey ? `enc:${DataEncryptionService.hash(storageKey).slice(0, 48)}` : `enc:${documentType}`,
    file_name: fileName ? 'encrypted' : 'encrypted',
    mime_type: mimeType ? 'encrypted' : 'encrypted',
    size_bytes: sizeBytes,
    checksum_sha256: checksum ? DataEncryptionService.hash(checksum) : DataEncryptionService.hash(`${verificationId}:${documentType}`),
    submitted_at: submittedAt,
    reviewed_at: reviewedAt,
    document_payload_ciphertext: encrypted.ciphertext,
    document_payload_hash: encrypted.hash,
    classification_tag: encrypted.classificationTag,
    encryption_key_version: encrypted.keyId
  };
};

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
    await trx('podcast_episodes').del();
    await trx('podcast_shows').del();
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
    await trx('feature_flag_tenant_states').del();
    await trx('feature_flags').del();
    await trx('configuration_entries').del();
    await trx('community_resources').del();
    await trx('community_growth_experiments').del();
    await trx('community_podcast_episodes').del();
    await trx('community_webinars').del();
    await trx('community_message_moderation_actions').del();
    await trx('community_post_moderation_followups').del();
    await trx('community_post_moderation_actions').del();
    await trx('community_post_moderation_cases').del();
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
    await trx('telemetry_lineage_runs').del();
    await trx('telemetry_freshness_monitors').del();
    await trx('telemetry_events').del();
    await trx('telemetry_event_batches').del();
    await trx('telemetry_consent_ledger').del();
    await trx('release_gate_results').del();
    await trx('release_runs').del();
    await trx('release_checklist_items').del();
    await trx('domain_event_dispatch_queue').del();
    await trx('domain_events').del();
    await trx('security_incidents').del();
    await trx('dsr_requests').del();
    await trx('cdc_outbox').del();
    await trx('consent_policies').del();
    await trx('consent_records').del();
    await trx('audit_events').del();
    await trx('kyc_audit_logs').del();
    await trx('kyc_documents').del();
    await trx('kyc_verifications').del();
    await trx('user_sessions').del();
    await trx('user_email_verification_tokens').del();
    await trx('user_profiles').del();
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

    const adminAvatar = await ensureSeedImage('profile-amina-diallo', {
      title: 'Amina Diallo',
      subtitle: 'Platform operator',
      badge: 'Admin',
      colors: ['#14b8a6', '#0f766e']
    });
    const instructorAvatar = await ensureSeedImage('profile-kai-watanabe', {
      title: 'Kai Watanabe',
      subtitle: 'Automation strategist',
      badge: 'Instructor',
      colors: ['#f97316', '#ea580c']
    });
    const learnerAvatar = await ensureSeedImage('profile-noemi-carvalho', {
      title: 'Noemi Carvalho',
      subtitle: 'Learner community lead',
      badge: 'Learner',
      colors: ['#3b82f6', '#1d4ed8']
    });

    await trx('user_profiles').insert([
      {
        user_id: adminId,
        display_name: 'Amina Diallo',
        tagline: 'Platform operator',
        location: 'Dakar, SN',
        avatar_url: adminAvatar.url,
        metadata: JSON.stringify({ role: 'admin', pronouns: 'she/her' })
      },
      {
        user_id: instructorId,
        display_name: 'Kai Watanabe',
        tagline: 'Automation launch strategist',
        location: 'Tokyo, JP',
        avatar_url: instructorAvatar.url,
        metadata: JSON.stringify({ role: 'instructor', pronouns: 'he/him' })
      },
      {
        user_id: learnerId,
        display_name: 'Noemi Carvalho',
        tagline: 'Learner success partner',
        location: 'Lisbon, PT',
        avatar_url: learnerAvatar.url,
        metadata: JSON.stringify({ role: 'learner', pronouns: 'she/her' })
      }
    ]);

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
      buildEncryptedKycDocument(adminVerificationId, 'government-id-front', {
        status: 'accepted',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${adminVerificationRef}/passport-front.png`,
        fileName: 'passport-front.png',
        mimeType: 'image/png',
        sizeBytes: 324567,
        checksum: makeHash('admin-passport-front'),
        submittedAt: trx.fn.now(),
        reviewedAt: trx.fn.now()
      }),
      buildEncryptedKycDocument(adminVerificationId, 'government-id-back', {
        status: 'accepted',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${adminVerificationRef}/passport-back.png`,
        fileName: 'passport-back.png',
        mimeType: 'image/png',
        sizeBytes: 287654,
        checksum: makeHash('admin-passport-back'),
        submittedAt: trx.fn.now(),
        reviewedAt: trx.fn.now()
      }),
      buildEncryptedKycDocument(adminVerificationId, 'identity-selfie', {
        status: 'accepted',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${adminVerificationRef}/selfie.png`,
        fileName: 'selfie.png',
        mimeType: 'image/png',
        sizeBytes: 198765,
        checksum: makeHash('admin-selfie'),
        submittedAt: trx.fn.now(),
        reviewedAt: trx.fn.now()
      }),
      buildEncryptedKycDocument(instructorVerificationId, 'government-id-front', {
        status: 'pending',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${instructorVerificationRef}/id-front.png`,
        fileName: 'id-front.png',
        mimeType: 'image/png',
        sizeBytes: 256784,
        checksum: makeHash('instructor-front'),
        submittedAt: trx.fn.now(),
        reviewedAt: null
      }),
      buildEncryptedKycDocument(instructorVerificationId, 'government-id-back', {
        status: 'pending',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${instructorVerificationRef}/id-back.png`,
        fileName: 'id-back.png',
        mimeType: 'image/png',
        sizeBytes: 244112,
        checksum: makeHash('instructor-back'),
        submittedAt: trx.fn.now(),
        reviewedAt: null
      }),
      buildEncryptedKycDocument(instructorVerificationId, 'identity-selfie', {
        status: 'pending',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${instructorVerificationRef}/selfie.png`,
        fileName: 'selfie.png',
        mimeType: 'image/png',
        sizeBytes: 201223,
        checksum: makeHash('instructor-selfie'),
        submittedAt: trx.fn.now(),
        reviewedAt: null
      }),
      buildEncryptedKycDocument(learnerVerificationId, 'government-id-front', {
        status: 'pending',
        storageBucket: 'edulure-uploads',
        storageKey: `kyc/${learnerVerificationRef}/id-front.png`,
        fileName: 'id-front.png',
        mimeType: 'image/png',
        sizeBytes: 243888,
        checksum: makeHash('learner-front'),
        submittedAt: trx.fn.now(),
        reviewedAt: null
      })
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

    const learningOpsCover = await ensureSeedImage('community-learning-ops', {
      title: 'Learning Ops Guild',
      subtitle: 'Incident-proof live classrooms',
      badge: 'Community access',
      colors: ['#6366f1', '#4338ca']
    });

    const [opsCommunityId] = await trx('communities').insert({
      owner_id: instructorId,
      name: 'Learning Ops Guild',
      slug: 'learning-ops-guild',
      description:
        'Operations leaders share classroom launch playbooks, QA scorecards, and tooling automation recipes.',
      visibility: 'public',
      cover_image_url: learningOpsCover.url,
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

    const growthLabCover = await ensureSeedImage('community-growth-lab', {
      title: 'Creator Growth Lab',
      subtitle: 'Experiment-led monetisation guild',
      badge: 'Invitation only',
      colors: ['#f97316', '#fb7185']
    });

    const [growthCommunityId] = await trx('communities').insert({
      owner_id: adminId,
      name: 'Creator Growth Lab',
      slug: 'creator-growth-lab',
      description: 'Creators refine monetisation funnels, ad experiments, and marketplace launches together.',
      visibility: 'private',
      cover_image_url: growthLabCover.url,
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

    const growthPlaybookCover = await ensureSeedImage('ebook-creator-funnel', {
      title: 'Creator Funnel Intelligence',
      subtitle: 'Forecast actionable growth signals',
      badge: 'E-book',
      colors: ['#a855f7', '#6366f1']
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
      cover_image_url: growthPlaybookCover.url,
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

    const opsModerationCasePublicId = crypto.randomUUID();
    const opsModerationFlaggedAt = new Date('2025-03-02T10:15:00Z');
    const opsModerationEscalatedAt = new Date('2025-03-02T15:40:00Z');
    const opsFollowUpPublicId = `fup_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const opsFollowUpRemindAt = new Date('2025-03-04T09:00:00Z');
    const opsCaseMetadata = {
      summary: 'Potential vendor impersonation flagged on automation roadmap update.',
      flags: [
        {
          actorId: adminId,
          reason: 'Member reported call-to-action mirroring known impersonation scripts.',
          riskScore: 78,
          flaggedSource: 'user_report',
          evidence: [
            {
              type: 'screenshot',
              value: 'https://cdn.edulure.test/moderation/case-ops-01.png'
            }
          ],
          tags: ['impersonation', 'automation', 'vendor'],
          flaggedAt: opsModerationFlaggedAt.toISOString()
        }
      ],
      riskHistory: [
        { riskScore: 78, at: opsModerationFlaggedAt.toISOString() },
        { riskScore: 82, at: opsModerationEscalatedAt.toISOString() }
      ],
      notes: [
        {
          message: 'Escalated to policy desk for vendor verification and templated response.',
          authorId: adminId,
          createdAt: opsModerationEscalatedAt.toISOString(),
          action: 'escalate'
        }
      ],
      policySnippets: [
        {
          id: 'community-code-of-conduct',
          contractPublicId: 'gov-contract-community',
          title: 'Community Code of Conduct',
          summary: 'Harassment, impersonation, and fraud are prohibited across Edulure spaces.',
          url: 'https://policies.edulure.test/community-code-of-conduct',
          tags: ['moderation', 'harassment'],
          owner: 'policy@edulure.test',
          riskTier: 'high'
        }
      ],
      aiSuggestions: [
        {
          id: 'ai-escalate-critical',
          message: 'Escalate to trust & safety leadership for immediate review.',
          severity: 'critical'
        },
        {
          id: 'ai-policy-community-code-of-conduct',
          message: 'Reference policy “Community Code of Conduct” before finalising the decision.',
          severity: 'high',
          policyId: 'community-code-of-conduct'
        }
      ],
      reminders: [
        {
          id: opsFollowUpPublicId,
          remindAt: opsFollowUpRemindAt.toISOString(),
          status: 'pending',
          reason: 'Await vendor authenticity verification from compliance review.',
          requestedBy: adminId
        }
      ]
    };

    const [opsModerationCaseId] = await trx('community_post_moderation_cases').insert({
      public_id: opsModerationCasePublicId,
      community_id: opsCommunityId,
      post_id: opsRoadmapPostId,
      reporter_id: adminId,
      assigned_to: adminId,
      status: 'in_review',
      severity: 'high',
      flagged_source: 'user_report',
      reason: 'Suspected vendor impersonation on automation roadmap update.',
      risk_score: 82,
      metadata: JSON.stringify(opsCaseMetadata),
      escalated_at: opsModerationEscalatedAt,
      created_at: opsModerationFlaggedAt,
      updated_at: opsModerationEscalatedAt
    });

    await trx('community_post_moderation_actions').insert([
      {
        case_id: opsModerationCaseId,
        actor_id: adminId,
        action: 'flagged',
        notes: 'Vendor impersonation flagged by automation lead.',
        metadata: JSON.stringify({
          riskScore: 78,
          severity: 'high',
          flaggedSource: 'user_report',
          tags: ['impersonation']
        }),
        created_at: opsModerationFlaggedAt
      },
      {
        case_id: opsModerationCaseId,
        actor_id: adminId,
        action: 'assigned',
        notes: 'Assigned to automation pod moderator for review.',
        metadata: JSON.stringify({ assignedTo: adminId }),
        created_at: new Date('2025-03-02T12:05:00Z')
      },
      {
        case_id: opsModerationCaseId,
        actor_id: adminId,
        action: 'updated',
        notes: 'Added policy snippet guidance and AI recommendation context.',
        metadata: JSON.stringify({ riskScore: 82, severity: 'high' }),
        created_at: opsModerationEscalatedAt
      }
    ]);

    await trx('community_post_moderation_followups').insert({
      case_id: opsModerationCaseId,
      public_id: opsFollowUpPublicId,
      status: 'pending',
      remind_at: opsFollowUpRemindAt,
      reason: 'Await vendor authenticity verification from compliance review.',
      metadata: JSON.stringify({
        requestedBy: adminId,
        casePublicId: opsModerationCasePublicId,
        lastAction: 'updated'
      }),
      created_at: opsModerationEscalatedAt,
      updated_at: opsModerationEscalatedAt
    });

    await trx('community_posts')
      .where({ id: opsRoadmapPostId })
      .update({
        moderation_state: 'under_review',
        moderation_metadata: JSON.stringify(opsCaseMetadata),
        last_moderated_at: opsModerationEscalatedAt
      });

    const growthModerationCasePublicId = crypto.randomUUID();
    const growthModerationFlaggedAt = new Date('2025-02-24T14:20:00Z');
    const growthModerationResolvedAt = new Date('2025-02-24T16:45:00Z');
    const growthFollowUpPublicId = `fup_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const growthFollowUpRemindAt = new Date('2025-02-25T09:00:00Z');
    const growthFollowUpProcessedAt = new Date('2025-02-25T09:05:00Z');
    const growthCaseMetadata = {
      summary: 'Automated detection flagged duplicate promotional link for AMA campaign.',
      flags: [
        {
          actorId: instructorId,
          reason: 'Automated detection flagged duplicate promotional link.',
          riskScore: 46,
          flaggedSource: 'automated_detection',
          evidence: [
            {
              type: 'detection',
              value: 'https://cdn.edulure.test/moderation/detection-growth-ama.json'
            }
          ],
          tags: ['promotion', 'spam'],
          flaggedAt: growthModerationFlaggedAt.toISOString()
        }
      ],
      riskHistory: [
        { riskScore: 46, at: growthModerationFlaggedAt.toISOString() },
        { riskScore: 32, at: growthModerationResolvedAt.toISOString() }
      ],
      notes: [
        {
          message: 'Confirmed co-host legitimacy and reinstated promotional link with guardrails.',
          authorId: adminId,
          createdAt: growthModerationResolvedAt.toISOString(),
          action: 'approve'
        }
      ],
      policySnippets: [
        {
          id: 'promotion-guidelines',
          contractPublicId: 'gov-contract-growth',
          title: 'Promotions & Affiliate Guidelines',
          summary: 'Requirements for sharing promotional and affiliate links during community events.',
          url: 'https://policies.edulure.test/promo-affiliate',
          tags: ['moderation', 'spam'],
          owner: 'growth-ops@edulure.test',
          riskTier: 'medium'
        }
      ],
      aiSuggestions: [
        {
          id: 'ai-acknowledge',
          message: 'Acknowledge the report and update the reporter within 24 hours.',
          severity: 'medium'
        },
        {
          id: 'ai-policy-promotion-guidelines',
          message: 'Reference policy “Promotions & Affiliate Guidelines” before finalising the decision.',
          severity: 'medium',
          policyId: 'promotion-guidelines'
        }
      ],
      reminders: [
        {
          id: growthFollowUpPublicId,
          remindAt: growthFollowUpRemindAt.toISOString(),
          status: 'notified',
          reason: 'Confirm AMA host posted compliance summary and link guardrails.',
          requestedBy: instructorId,
          processedAt: growthFollowUpProcessedAt.toISOString()
        }
      ]
    };

    const [growthModerationCaseId] = await trx('community_post_moderation_cases').insert({
      public_id: growthModerationCasePublicId,
      community_id: growthCommunityId,
      post_id: growthCampaignPostId,
      reporter_id: instructorId,
      assigned_to: adminId,
      status: 'approved',
      severity: 'medium',
      flagged_source: 'automated_detection',
      reason: 'Automated detection flagged duplicate promotional link.',
      risk_score: 46,
      metadata: JSON.stringify(growthCaseMetadata),
      resolved_at: growthModerationResolvedAt,
      resolved_by: adminId,
      created_at: growthModerationFlaggedAt,
      updated_at: growthModerationResolvedAt
    });

    await trx('community_post_moderation_actions').insert([
      {
        case_id: growthModerationCaseId,
        actor_id: instructorId,
        action: 'flagged',
        notes: 'Automated detection queued the AMA promo link for review.',
        metadata: JSON.stringify({ riskScore: 46, flaggedSource: 'automated_detection' }),
        created_at: growthModerationFlaggedAt
      },
      {
        case_id: growthModerationCaseId,
        actor_id: adminId,
        action: 'escalated',
        notes: 'Growth operations validating promo guardrails with compliance.',
        metadata: JSON.stringify({ severity: 'medium' }),
        created_at: new Date('2025-02-24T15:05:00Z')
      },
      {
        case_id: growthModerationCaseId,
        actor_id: adminId,
        action: 'approved',
        notes: 'Legitimate co-host promotion confirmed and post restored.',
        metadata: JSON.stringify({ riskScore: 32, archivePost: false }),
        created_at: growthModerationResolvedAt
      }
    ]);

    await trx('community_post_moderation_followups').insert({
      case_id: growthModerationCaseId,
      public_id: growthFollowUpPublicId,
      status: 'notified',
      remind_at: growthFollowUpRemindAt,
      reason: 'Confirm AMA host posted compliance summary and link guardrails.',
      metadata: JSON.stringify({
        requestedBy: instructorId,
        casePublicId: growthModerationCasePublicId,
        lastAction: 'approve',
        processedAt: growthFollowUpProcessedAt.toISOString()
      }),
      processed_at: growthFollowUpProcessedAt,
      created_at: growthModerationResolvedAt,
      updated_at: growthFollowUpProcessedAt
    });

    await trx('community_posts')
      .where({ id: growthCampaignPostId })
      .update({
        moderation_state: 'clean',
        moderation_metadata: JSON.stringify(growthCaseMetadata),
        last_moderated_at: growthModerationResolvedAt
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

    const upcomingOpsWebinarStartAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const followUpOpsWebinarStartAt = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);

    await trx('community_webinars').insert([
      {
        community_id: opsCommunityId,
        created_by: instructorId,
        topic: 'Incident command rehearsal',
        host: 'Learning Ops Guild',
        start_at: upcomingOpsWebinarStartAt,
        status: 'announced',
        registrant_count: 128,
        watch_url: 'https://events.edulure.test/ops-incident-command',
        description:
          'Live tabletop drill walking through classroom failover, paging flows, and escalation runbooks ahead of launch week.',
        metadata: JSON.stringify({ track: 'operations', tags: ['automation', 'qa'] })
      },
      {
        community_id: opsCommunityId,
        created_by: instructorId,
        topic: 'Automation war room retrospective',
        host: 'Amina Diallo',
        start_at: followUpOpsWebinarStartAt,
        status: 'draft',
        registrant_count: 64,
        watch_url: 'https://events.edulure.test/ops-automation-retro',
        description:
          'Post-launch retrospective covering automation wins, failure points, and roadmap items queued for the next sprint.',
        metadata: JSON.stringify({ track: 'operations', requiresPrep: true })
      }
    ]);

    const primaryPodcastReleaseOn = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const teaserPodcastReleaseOn = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await trx('community_podcast_episodes').insert([
      {
        community_id: growthCommunityId,
        created_by: adminId,
        title: 'Paid social lift-off',
        host: 'Kai Growth',
        stage: 'recording',
        release_on: teaserPodcastReleaseOn,
        duration_minutes: 28,
        summary:
          'Creative teardown of the top performing reels and how they ladder into the multi-touch nurture sequence.',
        audio_url: 'https://cdn.edulure.test/audio/paid-social-liftoff.mp3',
        cover_art_url: 'https://cdn.edulure.test/podcasts/growth-lab/cover.jpg',
        metadata: JSON.stringify({ keywords: ['paid', 'creative'], transcriptAvailable: true })
      },
      {
        community_id: growthCommunityId,
        created_by: adminId,
        title: 'Lifecycle automation AMA',
        host: 'Creator Growth Lab',
        stage: 'scheduled',
        release_on: primaryPodcastReleaseOn,
        duration_minutes: 42,
        summary:
          'Answering community questions on lifecycle segmentation, audience syncs, and nurture performance benchmarks.',
        audio_url: null,
        cover_art_url: 'https://cdn.edulure.test/podcasts/growth-lab/lifecycle-ama.png',
        metadata: JSON.stringify({ guests: ['Amina Diallo'], format: 'ask-me-anything' })
      }
    ]);

    const growthExperimentStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const growthExperimentEnd = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await trx('community_growth_experiments').insert([
      {
        community_id: growthCommunityId,
        created_by: adminId,
        title: 'Creator onboarding nurture revamp',
        owner_name: 'Kai Growth',
        status: 'building',
        target_metric: 'Activation rate',
        baseline_value: 32.5,
        target_value: 45.0,
        impact_score: 4.5,
        start_date: growthExperimentStart,
        end_date: growthExperimentEnd,
        hypothesis:
          'If we layer interactive briefs into the onboarding sequence, creators will publish their first campaign faster.',
        notes: 'Needs updated product education assets from the ops guild.',
        experiment_url: 'https://analytics.edulure.test/exp/onboarding-nurture-revamp',
        metadata: JSON.stringify({ segment: 'new_creators', squad: 'growth' })
      },
      {
        community_id: opsCommunityId,
        created_by: instructorId,
        title: 'Tutor readiness scoring',
        owner_name: 'Learning Ops Guild',
        status: 'design',
        target_metric: 'Tutor NPS',
        baseline_value: 71.2,
        target_value: 78.0,
        impact_score: 3.8,
        start_date: growthExperimentStart,
        end_date: null,
        hypothesis:
          'A readiness score combining rehearsal attendance and quiz scores will surface at-risk tutors before launch.',
        notes: 'Requires data feed from rehearsal attendance tool.',
        experiment_url: null,
        metadata: JSON.stringify({ requiresModeling: true })
      }
    ]);

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

    const automationCourseArtwork = await ensureSeedImage('course-automation-masterclass', {
      title: 'Automation Launch Masterclass',
      subtitle: 'Incident rehearsal & telemetry playbooks',
      badge: 'Advanced cohort',
      colors: ['#0ea5e9', '#2563eb']
    });

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
      thumbnail_url: automationCourseArtwork.url,
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
      commission_rate_bps: 250,
      total_earned_cents: 0,
      total_paid_cents: 0,
      metadata: JSON.stringify({ campaign: 'beta-cohort', payoutEmail: 'noemi.carvalho@edulure.test' }),
      approved_at: trx.fn.now()
    });

    const subscriptionPublicId = crypto.randomUUID();
    const providerIntentId = `pi_${crypto.randomBytes(8).toString('hex')}`;
    const providerChargeId = `ch_${crypto.randomBytes(6).toString('hex')}`;

    const subscriptionPayment = await PaymentIntentModel.create(
      {
        publicId: crypto.randomUUID(),
        userId: learnerId,
        provider: 'stripe',
        providerIntentId,
        providerLatestChargeId: providerChargeId,
        status: 'succeeded',
        currency: 'USD',
        amountSubtotal: 189900,
        amountDiscount: 0,
        amountTax: 15192,
        amountTotal: 205092,
        amountRefunded: 0,
        taxBreakdown: { jurisdiction: 'US-CA', rate: 0.08 },
        metadata: {
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
        },
        couponId: null,
        entityType: 'community_subscription',
        entityId: subscriptionPublicId,
        receiptEmail: 'noemi.carvalho@edulure.test',
        capturedAt: trx.fn.now()
      },
      trx
    );
    const subscriptionPaymentId = subscriptionPayment.id;

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

    const [catalogItemId] = await trx('monetization_catalog_items').insert({
      public_id: crypto.randomUUID(),
      tenant_id: 'global',
      product_code: 'growth-insiders-annual',
      name: 'Growth Insiders Annual',
      description: 'Annual enablement subscription covering growth analytics workshops and concierge support.',
      pricing_model: 'flat_fee',
      billing_interval: 'annual',
      revenue_recognition_method: 'deferred',
      recognition_duration_days: 365,
      unit_amount_cents: 189900,
      currency: 'USD',
      usage_metric: 'seats',
      revenue_account: '4000-education-services',
      deferred_revenue_account: '2050-deferred-revenue',
      metadata: JSON.stringify({ seed: true, owner: 'finance-ops' }),
      status: 'active',
      effective_from: trx.fn.now()
    });

    const subscriptionTimestamp = new Date();
    const nextYear = new Date(subscriptionTimestamp.getTime());
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const [usageRecordId] = await trx('monetization_usage_records').insert({
      public_id: crypto.randomUUID(),
      tenant_id: 'global',
      catalog_item_id: catalogItemId,
      product_code: 'growth-insiders-annual',
      account_reference: 'ops-guild',
      user_id: learnerId,
      usage_date: subscriptionTimestamp,
      quantity: 1,
      unit_amount_cents: 189900,
      amount_cents: 189900,
      currency: 'USD',
      source: 'seed-data',
      external_reference: `seed-usage-${subscriptionPublicId}`,
      payment_intent_id: subscriptionPaymentId,
      metadata: JSON.stringify({ cohort: 'alpha', recordedBy: 'seed-script' }),
      recorded_at: subscriptionTimestamp,
      processed_at: subscriptionTimestamp
    });

    const [scheduleId] = await trx('monetization_revenue_schedules').insert({
      tenant_id: 'global',
      payment_intent_id: subscriptionPaymentId,
      catalog_item_id: catalogItemId,
      usage_record_id: usageRecordId,
      product_code: 'growth-insiders-annual',
      status: 'pending',
      recognition_method: 'deferred',
      recognition_start: subscriptionTimestamp,
      recognition_end: nextYear,
      amount_cents: 205092,
      recognized_amount_cents: 0,
      currency: 'USD',
      revenue_account: '4000-education-services',
      deferred_revenue_account: '2050-deferred-revenue',
      metadata: JSON.stringify({ source: 'seed-data', schedule: 'annual' }),
      created_at: subscriptionTimestamp
    });

    await trx('monetization_reconciliation_runs').insert({
      tenant_id: 'global',
      window_start: subscriptionTimestamp,
      window_end: nextYear,
      status: 'completed',
      invoiced_cents: 205092,
      usage_cents: 189900,
      recognized_cents: 0,
      deferred_cents: 205092,
      variance_cents: -189900,
      variance_ratio: 0,
      metadata: JSON.stringify({ seed: true, scheduleId, usageRecordId }),
      created_at: subscriptionTimestamp
    });

    const affiliateCommission = Math.floor(205092 * 0.2);

    const [growthSubscriptionId] = await trx('community_subscriptions').insert({
      public_id: subscriptionPublicId,
      community_id: growthCommunityId,
      user_id: learnerId,
      tier_id: growthInsiderTierId,
      status: 'active',
      started_at: subscriptionTimestamp,
      current_period_start: subscriptionTimestamp,
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

    await CommunityAffiliatePayoutModel.create(
      {
        affiliateId: growthAffiliateId,
        amountCents: Math.floor(affiliateCommission / 2),
        status: 'processing',
        payoutReference: 'PAYOUT-2024-10-001',
        scheduledAt: trx.fn.now(),
        metadata: { invoiceNumber: 'INV-2024-10-001', subscriptionId: growthSubscriptionId }
      },
      trx
    );

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
      avatar_url: instructorAvatar.url,
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

    const [opsPodcastShowId] = await trx('podcast_shows').insert({
      community_id: opsCommunityId,
      owner_id: instructorId,
      title: 'Ops Control Tower',
      slug: 'ops-control-tower',
      subtitle: 'War-room briefings and launch retrospectives with automation leads.',
      description:
        'Weekly debriefs with automation captains, discussing incident response drills, telemetry rollouts, and service desk upgrades.',
      cover_image_url: 'https://cdn.edulure.test/podcasts/ops-control.jpg',
      category: 'operations',
      status: 'published',
      is_public: true,
      distribution_channels: 'Spotify, Apple Podcasts, RSS',
      launch_at: trx.fn.now(),
      metadata: JSON.stringify({ cadence: 'weekly', producer: 'Ops Enablement' })
    });

    await trx('podcast_episodes').insert([
      {
        show_id: opsPodcastShowId,
        title: 'Incident Simulation Playbook',
        slug: 'incident-simulation-playbook',
        summary: 'Simulating escalation drills and telemetry guardrails for live classrooms.',
        description:
          'Breakdown of the automation rehearsal used in the latest live classroom, with mitigation timelines, tooling walkthroughs, and post-mortem highlights.',
        audio_url: 'https://cdn.edulure.test/audio/ops-control/episode-1.mp3',
        video_url: null,
        duration_seconds: 1800,
        season_number: 1,
        episode_number: 1,
        status: 'published',
        publish_at: trx.fn.now(),
        metadata: JSON.stringify({ guest: 'Kai Watanabe', topics: ['Automation', 'Telemetry'] })
      },
      {
        show_id: opsPodcastShowId,
        title: 'Service Desk Automation Matrix',
        slug: 'service-desk-automation-matrix',
        summary: 'Designing orchestration matrices for hybrid tutor and automation workflows.',
        description:
          'Discussion on blending tutor escalations with automation bots, featuring metrics from the service suite and updates on compliance guardrails.',
        audio_url: 'https://cdn.edulure.test/audio/ops-control/episode-2.mp3',
        video_url: 'https://cdn.edulure.test/video/ops-control/episode-2.mp4',
        duration_seconds: 2100,
        season_number: 1,
        episode_number: 2,
        status: 'scheduled',
        publish_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ guest: 'Amina Diallo', topics: ['Service Desk', 'Automation'] })
      }
    ]);

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

    const tenantFlagStates = [
      {
        feature_flag_id: adminConsoleFlagId,
        tenant_id: 'edulure-internal',
        environment: 'production',
        state: 'enabled',
        variant_key: 'core',
        rollout_percentage: 100,
        criteria: { allowedRoles: ['admin'] },
        notes: 'Baseline operations console access for internal administrators.',
        updated_by: 'seed-script',
        activated_at: trx.fn.now(),
        deactivated_at: null
      },
      {
        feature_flag_id: adminConsoleFlagId,
        tenant_id: 'edulure-internal',
        environment: 'staging',
        state: 'enabled',
        variant_key: 'beta-insights',
        rollout_percentage: 100,
        criteria: { allowedRoles: ['admin'], enableInsights: true },
        notes: 'Expose beta insights variant in staging for internal QA.',
        updated_by: 'seed-script',
        activated_at: trx.fn.now(),
        deactivated_at: null
      },
      {
        feature_flag_id: checkoutFlagId,
        tenant_id: 'learning-ops-guild',
        environment: 'production',
        state: 'conditional',
        variant_key: null,
        rollout_percentage: 45.0,
        criteria: {
          allowSegments: ['beta'],
          guardrails: {
            minClientVersion: '2.5.0',
            fallbackVariant: 'checkout-v1'
          }
        },
        notes: 'Gradual checkout v2 rollout pending commerce KPIs.',
        updated_by: 'seed-script',
        activated_at: null,
        deactivated_at: null
      },
      {
        feature_flag_id: liveClassroomsFlagId,
        tenant_id: 'creator-growth-lab',
        environment: 'production',
        state: 'enabled',
        variant_key: null,
        rollout_percentage: 100,
        criteria: { classroomReadiness: true, slaMinutes: 5 },
        notes: 'Tenant cleared readiness review and SLAs.',
        updated_by: 'seed-script',
        activated_at: trx.fn.now(),
        deactivated_at: null
      },
      {
        feature_flag_id: liveClassroomsFlagId,
        tenant_id: 'learning-ops-guild',
        environment: 'production',
        state: 'conditional',
        variant_key: null,
        rollout_percentage: 60.0,
        criteria: {
          classroomReadiness: true,
          rolloutGuardrails: {
            slo: 'live-classroom-availability',
            rollbackChannel: '#live-classroom-rollout'
          }
        },
        notes: 'Phased ramp with live classroom guardrails.',
        updated_by: 'seed-script',
        activated_at: null,
        deactivated_at: null
      }
    ];

    await trx('feature_flag_tenant_states').insert(
      tenantFlagStates.map((state) => ({
        ...state,
        criteria: JSON.stringify(state.criteria ?? {}),
        notes: state.notes ?? null
      }))
    );

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

    const timelineNow = new Date();
    const subtractMinutes = (minutes) => new Date(timelineNow.getTime() - minutes * 60 * 1000);
    const addMinutes = (minutes) => new Date(timelineNow.getTime() + minutes * 60 * 1000);

    const [fieldOpsUserId] = await trx('users').insert({
      first_name: 'Mira',
      last_name: 'Patel',
      email: 'mira.patel@edulure.test',
      password_hash: passwordHash,
      role: 'instructor',
      email_verified_at: trx.fn.now(),
      failed_login_attempts: 0,
      last_login_at: trx.fn.now(),
      password_changed_at: trx.fn.now()
    });

    const [emergencyOpsUserId] = await trx('users').insert({
      first_name: 'Jonah',
      last_name: 'Adeyemi',
      email: 'jonah.adeyemi@edulure.test',
      password_hash: passwordHash,
      role: 'instructor',
      email_verified_at: trx.fn.now(),
      failed_login_attempts: 0,
      last_login_at: trx.fn.now(),
      password_changed_at: trx.fn.now()
    });

    const [kaiProviderId] = await trx('field_service_providers').insert({
      user_id: instructorId,
      name: 'Kai Watanabe',
      email: 'kai.watanabe@edulure.test',
      phone: '+44 20 7946 0045',
      status: 'active',
      specialties: JSON.stringify(['AV engineering', 'Smart classrooms', 'Diagnostics']),
      rating: 4.92,
      last_check_in_at: subtractMinutes(12),
      location_lat: 51.50745,
      location_lng: -0.12775,
      location_label: 'Westminster hub',
      location_updated_at: subtractMinutes(12),
      metadata: JSON.stringify({
        serviceArea: ['Central London'],
        certifications: ['Crestron LV2', 'Cisco Meraki'],
        shift: 'day'
      })
    });

    const [miraProviderId] = await trx('field_service_providers').insert({
      user_id: fieldOpsUserId,
      name: 'Mira Patel',
      email: 'mira.patel@edulure.test',
      phone: '+44 161 555 0912',
      status: 'active',
      specialties: JSON.stringify(['Network resilience', 'Power redundancy', 'IoT calibration']),
      rating: 4.87,
      last_check_in_at: subtractMinutes(5),
      location_lat: 51.52068,
      location_lng: -0.08715,
      location_label: 'Shoreditch operations pod',
      location_updated_at: subtractMinutes(5),
      metadata: JSON.stringify({
        serviceArea: ['East London', 'Docklands'],
        certifications: ['AWS Networking', 'CompTIA Security+'],
        shift: 'swing'
      })
    });

    const [jonahProviderId] = await trx('field_service_providers').insert({
      user_id: emergencyOpsUserId,
      name: 'Jonah Adeyemi',
      email: 'jonah.adeyemi@edulure.test',
      phone: '+44 113 555 4402',
      status: 'active',
      specialties: JSON.stringify(['Emergency response', 'Access control', 'HVAC optimisation']),
      rating: 4.95,
      last_check_in_at: subtractMinutes(2),
      location_lat: 51.49858,
      location_lng: -0.09045,
      location_label: 'South Bank mobile unit',
      location_updated_at: subtractMinutes(2),
      metadata: JSON.stringify({
        serviceArea: ['Central London', 'South London'],
        certifications: ['Prince2 Practitioner', 'NEBOSH'],
        shift: 'night'
      })
    });

    const [orderAlphaId] = await trx('field_service_orders').insert({
      reference: 'FS-240531-A1',
      customer_user_id: learnerId,
      provider_id: kaiProviderId,
      status: 'en_route',
      priority: 'urgent',
      service_type: 'Smart classroom projector calibration',
      summary: 'Stabilise auto-tracking, recalibrate lens, confirm diagnostics.',
      requested_at: subtractMinutes(95),
      scheduled_for: subtractMinutes(15),
      eta_minutes: 18,
      sla_minutes: 120,
      distance_km: 4.2,
      location_lat: 51.51532,
      location_lng: -0.09821,
      location_label: 'Edulure Farringdon campus',
      address_line_1: '22 Charterhouse Street',
      city: 'London',
      region: 'Greater London',
      postal_code: 'EC1M 6AX',
      metadata: JSON.stringify({
        customerContact: '+44 20 7456 8800',
        accessNotes: 'Security badge at reception. Use loading bay B.',
        riskLevel: 'warning'
      })
    });

    const [orderBravoId] = await trx('field_service_orders').insert({
      reference: 'FS-240531-B7',
      customer_user_id: learnerId,
      provider_id: miraProviderId,
      status: 'on_site',
      priority: 'standard',
      service_type: 'Learning lab network optimisation',
      summary: 'Deploy redundant uplink, verify Wi-Fi 6 telemetry, confirm QoS policies.',
      requested_at: subtractMinutes(240),
      scheduled_for: subtractMinutes(45),
      eta_minutes: 0,
      sla_minutes: 180,
      distance_km: 3.1,
      location_lat: 51.52412,
      location_lng: -0.10245,
      location_label: 'Old Street innovation loft',
      address_line_1: '81 City Road',
      city: 'London',
      region: 'Greater London',
      postal_code: 'EC1Y 1BD',
      metadata: JSON.stringify({
        customerContact: '+44 20 7568 2200',
        escalated: false,
        changeWindow: '08:00-12:00',
        riskLevel: 'on_track'
      })
    });

    const [orderCharlieId] = await trx('field_service_orders').insert({
      reference: 'FS-240531-C3',
      customer_user_id: learnerId,
      provider_id: jonahProviderId,
      status: 'scheduled',
      priority: 'high',
      service_type: 'Emergency access control remediation',
      summary: 'Restore biometric readers, rotate credentials, validate audit logs.',
      requested_at: subtractMinutes(30),
      scheduled_for: addMinutes(25),
      eta_minutes: 32,
      sla_minutes: 90,
      distance_km: 6.4,
      location_lat: 51.50083,
      location_lng: -0.11892,
      location_label: 'Riverfront leadership suite',
      address_line_1: '1 Lambeth Palace Road',
      city: 'London',
      region: 'Greater London',
      postal_code: 'SE1 7EU',
      metadata: JSON.stringify({
        customerContact: '+44 20 7990 4000',
        accessNotes: 'Out-of-hours clearance required. Control room to escort.',
        riskLevel: 'critical',
        contingency: 'Switch to mechanical override if biometric reset fails.'
      })
    });

    await trx('field_service_events').insert([
      {
        order_id: orderAlphaId,
        event_type: 'dispatch_created',
        status: 'accepted',
        notes: 'Request triaged by Fixnado desk. Dispatch approved.',
        author: 'Ops automation',
        occurred_at: subtractMinutes(92),
        metadata: JSON.stringify({ channel: 'slack', slaRemainingMinutes: 148 })
      },
      {
        order_id: orderAlphaId,
        event_type: 'technician_en_route',
        status: 'in_transit',
        notes: 'Technician departed Westminster hub. Live telemetry locked.',
        author: 'Kai Watanabe',
        occurred_at: subtractMinutes(28),
        metadata: JSON.stringify({ vehicle: 'EV Van 12', etaMinutes: 18, distanceKm: 4.2 })
      },
      {
        order_id: orderAlphaId,
        event_type: 'incident_flagged',
        status: 'investigating',
        notes: 'Customer reported intermittent HDMI sync drops during lecture capture.',
        author: 'Customer success',
        occurred_at: subtractMinutes(18),
        metadata: JSON.stringify({
          severity: 'medium',
          impactedRooms: 2,
          mitigation: 'Switch to fallback encoder if failure reoccurs',
          isIncident: true
        })
      },
      {
        order_id: orderBravoId,
        event_type: 'technician_on_site',
        status: 'on_site',
        notes: 'Arrived on site. Conducting baseline throughput tests.',
        author: 'Mira Patel',
        occurred_at: subtractMinutes(38),
        metadata: JSON.stringify({ baselineMbps: 940, packetLoss: 0.1 })
      },
      {
        order_id: orderBravoId,
        event_type: 'change_control',
        status: 'executing',
        notes: 'Applied redundant uplink config. Monitoring for drift.',
        author: 'Network automation',
        occurred_at: subtractMinutes(22),
        metadata: JSON.stringify({ approvalCode: 'CAB-7721', changeType: 'standard' })
      },
      {
        order_id: orderBravoId,
        event_type: 'quality_assurance',
        status: 'validating',
        notes: 'Live telemetry steady. Preparing to handover to customer.',
        author: 'Quality operations',
        occurred_at: subtractMinutes(8),
        metadata: JSON.stringify({ jitterMs: 3, slaRemainingMinutes: 122 })
      },
      {
        order_id: orderCharlieId,
        event_type: 'dispatch_created',
        status: 'pending_assignment',
        notes: 'Emergency badge failures flagged by monitoring. High priority queue.',
        author: 'Ops automation',
        occurred_at: subtractMinutes(28),
        metadata: JSON.stringify({ severity: 'high', impactedDoors: 4 })
      },
      {
        order_id: orderCharlieId,
        event_type: 'provider_assigned',
        status: 'scheduled',
        notes: 'Jonah Adeyemi assigned by duty manager. Confirmed equipment loadout.',
        author: 'Duty manager',
        occurred_at: subtractMinutes(12),
        metadata: JSON.stringify({
          equipment: ['Biometric toolkit', 'Credential issuer'],
          etaMinutes: 32
        })
      }
    ]);

    const ninetyDaysFromNow = new Date(timelineNow.getTime() + 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(timelineNow.getTime() - 60 * 24 * 60 * 60 * 1000);

    const opsBridgeContacts = {
      slack: '#security-incidents',
      bridge: 'Zoom 927-555-1443',
      onCall: 'Ops Duty Manager',
      phone: '+44 20 3000 0000'
    };

    const securityIncidents = [
      {
        incident_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        reporter_id: adminId,
        assigned_to: adminId,
        category: 'scam',
        severity: 'high',
        status: 'triaged',
        title: 'Payout phishing escalation',
        description: 'Phishing payout update campaign blocked by heuristics before any funds were diverted.',
        source: 'fraud-desk',
        external_case_id: 'OPS-2045',
        reported_at: new Date('2025-02-03T08:45:00Z'),
        triaged_at: new Date('2025-02-03T09:02:00Z'),
        acknowledged_at: new Date('2025-02-03T09:05:00Z'),
        detected_at: new Date('2025-02-03T08:45:00Z'),
        impact_assessment: JSON.stringify({
          segments: ['Instructors', 'Payout admins'],
          geos: ['GB', 'NG'],
          metrics: { flaggedLearners: 32, blockedPayments: 11200 },
          watchers: 14
        }),
        containment_actions: JSON.stringify({
          summary:
            'Monitoring for replays across payout endpoints. Wallet monitoring enabled with on-call watchers.',
          currentOwner: 'Ops Duty Manager',
          recommendedActions: [
            'Lock payout profiles for flagged instructors until manual verification completes.',
            'Publish phishing warning banner across operator dashboard and learner feed.',
            'Trigger credential rotation advisory for impacted instructors.'
          ]
        }),
        metadata: JSON.stringify({
          reference: 'OPS-2045',
          summary:
            'Phishing lure targeting instructor payout confirmations. Links disabled before funds moved and affected accounts locked.',
          detectionChannel: 'fraud-desk',
          watchers: 14,
          metrics: { flaggedLearners: 32, blockedPayments: 11200 },
          ack: {
            acknowledgedAt: '2025-02-03T09:05:00Z',
            ackSlaMinutes: 15,
            ackBreached: false,
            responder: 'Ops Duty Manager'
          },
          resolution: {
            targetAt: '2025-02-03T12:45:00Z',
            resolutionSlaMinutes: 240,
            resolutionBreached: false
          },
          recommendedActions: [
            'Lock payout profiles for flagged instructors until manual verification completes.',
            'Publish phishing warning banner across operator dashboard and learner feed.',
            'Trigger credential rotation advisory for impacted instructors.'
          ],
          playbook: {
            id: 'phishing-rapid-lockdown',
            title: 'Phishing rapid lockdown',
            url: 'https://runbooks.edulure.test/phishing-rapid-lockdown'
          },
          relatedCapabilities: ['payments-and-payouts', 'operator-dashboard', 'identity-authentication'],
          attachments: [
            {
              type: 'link',
              label: 'Fraud desk escalation thread',
              url: 'https://slack.test/security-incidents/ops-2045'
            },
            {
              type: 'link',
              label: 'DM screenshot evidence',
              url: 'https://cdn.edulure.test/incidents/ops-2045/screenshot.png'
            }
          ],
          contactPoints: opsBridgeContacts,
          impact: { segments: ['Instructors', 'Payout admins'], geos: ['GB', 'NG'] },
          timeline: [
            {
              timestamp: '2025-02-03T08:45:00Z',
              event: 'detected',
              detail: 'Automated payout heuristics blocked suspicious DM link.'
            },
            {
              timestamp: '2025-02-03T08:48:00Z',
              event: 'escalated',
              detail: 'Fraud desk escalated to on-call operator via PagerDuty.'
            },
            {
              timestamp: '2025-02-03T09:05:00Z',
              event: 'acknowledged',
              detail: 'Duty manager confirmed mitigation steps and locked payouts.'
            }
          ]
        })
      },
      {
        incident_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        reporter_id: adminId,
        assigned_to: adminId,
        category: 'account_takeover',
        severity: 'critical',
        status: 'triaged',
        title: 'Admin account takeover attempt',
        description:
          'Multiple admin MFA prompts originating from Lagos region indicated attempted account takeover of console users.',
        source: 'pagerduty',
        external_case_id: 'OPS-2046',
        reported_at: new Date('2025-02-03T06:58:00Z'),
        triaged_at: new Date('2025-02-03T07:06:00Z'),
        acknowledged_at: new Date('2025-02-03T07:07:00Z'),
        detected_at: new Date('2025-02-03T06:58:00Z'),
        impact_assessment: JSON.stringify({
          segments: ['Admins'],
          geos: ['NG', 'GB'],
          metrics: { elevatedSessions: 4, blockedPayments: 0 },
          watchers: 21
        }),
        containment_actions: JSON.stringify({
          summary:
            'Initiated forced credential reset and session revocation. Monitoring elevated login attempts for 24 hours.',
          currentOwner: 'Security On Call',
          recommendedActions: [
            'Continue monitoring login anomalies for 24 hours.',
            'Notify impacted admins to confirm device trust resets.',
            'Capture indicators for fraud intelligence feeds.'
          ]
        }),
        metadata: JSON.stringify({
          reference: 'OPS-2046',
          summary:
            'Account takeover signals blocked by adaptive MFA and session revocation safeguards. Elevated monitoring activated.',
          detectionChannel: 'pagerduty',
          watchers: 21,
          metrics: { elevatedSessions: 4, flaggedLearners: 0, blockedPayments: 0 },
          ack: {
            acknowledgedAt: '2025-02-03T07:07:00Z',
            ackSlaMinutes: 10,
            ackBreached: false,
            responder: 'Security On Call'
          },
          resolution: {
            targetAt: '2025-02-03T08:37:00Z',
            resolutionSlaMinutes: 90,
            resolutionBreached: false,
            followUp: 'Run credential stuffing drill during next chaos exercise.'
          },
          recommendedActions: [
            'Continue monitoring login anomalies for 24 hours.',
            'Notify impacted admins to confirm device trust resets.',
            'Capture indicators for fraud intelligence feeds.'
          ],
          playbook: {
            id: 'account-takeover-high',
            title: 'Account takeover response (high severity)',
            url: 'https://runbooks.edulure.test/account-takeover-high'
          },
          relatedCapabilities: ['identity-authentication', 'operator-dashboard'],
          attachments: [
            {
              type: 'link',
              label: 'PagerDuty timeline',
              url: 'https://pagerduty.test/incidents/OPS-2046'
            }
          ],
          contactPoints: {
            ...opsBridgeContacts,
            bridge: 'Teams 610-883-441',
            phone: '+44 20 3000 0450'
          },
          impact: { segments: ['Admins'], geos: ['NG', 'GB'] },
          timeline: [
            {
              timestamp: '2025-02-03T06:58:00Z',
              event: 'detected',
              detail: 'MFA anomaly detection triggered for two admin accounts.'
            },
            {
              timestamp: '2025-02-03T07:06:00Z',
              event: 'triaged',
              detail: 'Security on-call initiated forced logout sequence.'
            },
            {
              timestamp: '2025-02-03T07:22:00Z',
              event: 'mitigation',
              detail: 'Credential rotation emails dispatched to impacted admins.'
            }
          ]
        })
      },
      {
        incident_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        reporter_id: instructorId,
        assigned_to: adminId,
        category: 'fraud',
        severity: 'medium',
        status: 'new',
        title: 'Marketplace listing dispute',
        description:
          'Learner reported suspicious marketplace listing cloning premium course material with fake payout link.',
        source: 'support-portal',
        external_case_id: 'OPS-2047',
        reported_at: new Date('2025-02-02T19:22:00Z'),
        detected_at: new Date('2025-02-02T19:22:00Z'),
        impact_assessment: JSON.stringify({
          segments: ['Learners'],
          geos: ['BR'],
          metrics: { flaggedLearners: 5, blockedPayments: 0 },
          watchers: 6
        }),
        containment_actions: JSON.stringify({
          summary: 'Waiting on compliance review for takedown and refund guidance. Social moderation notified.',
          currentOwner: 'Compliance review queue',
          recommendedActions: [
            'Suspend listing until compliance review completes.',
            'Notify impacted learners via secure messaging.',
            'Capture evidence for payment dispute with processor.'
          ]
        }),
        metadata: JSON.stringify({
          reference: 'OPS-2047',
          summary: 'Marketplace listing flagged as fraudulent reseller attempt. Pending compliance takedown approval.',
          detectionChannel: 'support-portal',
          watchers: 6,
          metrics: { flaggedLearners: 5, blockedPayments: 0 },
          ack: {
            ackSlaMinutes: 30,
            ackBreached: true
          },
          resolution: {
            targetAt: '2025-02-03T18:00:00Z',
            resolutionSlaMinutes: 480,
            resolutionBreached: false
          },
          recommendedActions: [
            'Suspend listing until compliance review completes.',
            'Notify impacted learners via secure messaging.',
            'Capture evidence for payment dispute with processor.'
          ],
          playbook: {
            id: 'marketplace-fraud-triage',
            title: 'Marketplace fraud triage',
            url: 'https://runbooks.edulure.test/marketplace-fraud-triage'
          },
          relatedCapabilities: ['content-library', 'operator-dashboard'],
          attachments: [
            {
              type: 'link',
              label: 'Support ticket',
              url: 'https://support.edulure.test/tickets/OPS-2047'
            }
          ],
          contactPoints: opsBridgeContacts,
          impact: { segments: ['Learners'], geos: ['BR'] },
          timeline: [
            {
              timestamp: '2025-02-02T19:22:00Z',
              event: 'reported',
              detail: 'Learner filed ticket referencing cloned checkout link.'
            }
          ]
        })
      },
      {
        incident_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        reporter_id: adminId,
        assigned_to: adminId,
        category: 'scam',
        severity: 'high',
        status: 'resolved',
        title: 'Smishing campaign against payout admins',
        description: 'Smishing attempt targeted payout administrators with credential harvesting messages.',
        source: 'fraud-desk',
        external_case_id: 'OPS-2038',
        reported_at: new Date('2025-01-27T14:10:00Z'),
        triaged_at: new Date('2025-01-27T14:18:00Z'),
        acknowledged_at: new Date('2025-01-27T14:19:00Z'),
        detected_at: new Date('2025-01-27T14:10:00Z'),
        resolved_at: new Date('2025-01-27T17:42:00Z'),
        impact_assessment: JSON.stringify({
          segments: ['Admins'],
          geos: ['GB'],
          metrics: { flaggedLearners: 0, blockedPayments: 8200 },
          watchers: 11
        }),
        containment_actions: JSON.stringify({
          summary: 'Telecom takedown executed. No credentials compromised.',
          currentOwner: 'Ops Duty Manager',
          recommendedActions: [
            'Maintain SMS filtering heuristics with telecom provider.',
            'Publish post-incident summary for leadership.',
            'Verify absence of credential reuse across admin accounts.'
          ]
        }),
        metadata: JSON.stringify({
          reference: 'OPS-2038',
          summary: 'Resolved smishing incident against payout admins after telecom takedown and credential rotation.',
          detectionChannel: 'fraud-desk',
          watchers: 11,
          metrics: { flaggedLearners: 0, blockedPayments: 8200 },
          ack: {
            acknowledgedAt: '2025-01-27T14:19:00Z',
            ackSlaMinutes: 15,
            ackBreached: false,
            responder: 'Ops Duty Manager'
          },
          resolution: {
            targetAt: '2025-01-27T18:10:00Z',
            resolvedAt: '2025-01-27T17:42:00Z',
            resolutionSlaMinutes: 240,
            resolutionBreached: false,
            followUp: 'Coordinate telecom takedown post-mortem and update SMS filtering rules.'
          },
          recommendedActions: [
            'Maintain SMS filtering heuristics with telecom provider.',
            'Publish post-incident summary for leadership.',
            'Verify absence of credential reuse across admin accounts.'
          ],
          playbook: {
            id: 'smishing-response',
            title: 'Smishing response workflow',
            url: 'https://runbooks.edulure.test/smishing-response'
          },
          relatedCapabilities: ['payments-and-payouts', 'operator-dashboard'],
          attachments: [],
          contactPoints: opsBridgeContacts,
          impact: { segments: ['Admins'], geos: ['GB'] },
          timeline: [
            {
              timestamp: '2025-01-27T14:10:00Z',
              event: 'detected',
              detail: 'Fraud heuristics flagged telecom messages with phishing link.'
            },
            {
              timestamp: '2025-01-27T17:42:00Z',
              event: 'resolved',
              detail: 'Telecom takedown confirmed and admin credentials rotated.'
            }
          ]
        })
      },
      {
        incident_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        reporter_id: adminId,
        assigned_to: adminId,
        category: 'abuse',
        severity: 'low',
        status: 'resolved',
        title: 'Community spam bot sweep',
        description: 'Community spam bots promoting referral codes across public channels.',
        source: 'community-report',
        external_case_id: 'OPS-2035',
        reported_at: new Date('2025-01-18T09:32:00Z'),
        triaged_at: new Date('2025-01-18T09:45:00Z'),
        acknowledged_at: new Date('2025-01-18T09:46:00Z'),
        detected_at: new Date('2025-01-18T09:32:00Z'),
        resolved_at: new Date('2025-01-18T10:12:00Z'),
        impact_assessment: JSON.stringify({
          segments: ['Community owners'],
          geos: ['US'],
          metrics: { flaggedLearners: 0, blockedPayments: 0 },
          watchers: 5
        }),
        containment_actions: JSON.stringify({
          summary: 'Bots banned and moderation heuristics updated with new signatures.',
          currentOwner: 'Community Duty Manager',
          recommendedActions: [
            'Share updated spam signatures with moderation team.',
            'Notify affected community owners of resolution.',
            'Review moderation automation coverage for referral campaigns.'
          ]
        }),
        metadata: JSON.stringify({
          reference: 'OPS-2035',
          summary: 'Spam bots removed from communities following rapid moderation response.',
          detectionChannel: 'community-report',
          watchers: 5,
          metrics: { flaggedLearners: 0, blockedPayments: 0 },
          ack: {
            acknowledgedAt: '2025-01-18T09:46:00Z',
            ackSlaMinutes: 20,
            ackBreached: false,
            responder: 'Community Duty Manager'
          },
          resolution: {
            targetAt: '2025-01-18T11:00:00Z',
            resolvedAt: '2025-01-18T10:12:00Z',
            resolutionSlaMinutes: 120,
            resolutionBreached: false,
            followUp: 'Deploy updated spam signatures to provider moderation dashboards.'
          },
          recommendedActions: [
            'Share updated spam signatures with moderation team.',
            'Notify affected community owners of resolution.',
            'Review moderation automation coverage for referral campaigns.'
          ],
          playbook: {
            id: 'community-abuse-triage',
            title: 'Community abuse triage',
            url: 'https://runbooks.edulure.test/community-abuse-triage'
          },
          relatedCapabilities: ['community-collaboration', 'operator-dashboard'],
          attachments: [],
          contactPoints: opsBridgeContacts,
          impact: { segments: ['Community owners'], geos: ['US'] },
          timeline: [
            {
              timestamp: '2025-01-18T09:32:00Z',
              event: 'reported',
              detail: 'Community owner escalated spam via operations console.'
            },
            {
              timestamp: '2025-01-18T10:12:00Z',
              event: 'resolved',
              detail: 'Bots removed, members notified, and heuristics tuned.'
            }
          ]
        })
      }
    ];

    await trx('security_incidents').insert(securityIncidents);

    const [
      phishingIncident,
      takeoverIncident,
      _marketplaceIncident,
      resolvedSmishingIncident,
      _resolvedAbuseIncident
    ] = securityIncidents;

    await trx('audit_events').insert([
      {
        event_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        actor_id: adminId,
        actor_type: 'user',
        actor_role: 'admin',
        event_type: 'incident.acknowledged',
        event_severity: 'warning',
        entity_type: 'security_incident',
        entity_id: phishingIncident.incident_uuid,
        payload: JSON.stringify({
          status: 'mitigating',
          responder: 'Ops Duty Manager',
          ackMinutes: 13,
          reference: phishingIncident.metadata ? JSON.parse(phishingIncident.metadata).reference : 'OPS-2045'
        }),
        ip_address_ciphertext: sealSensitive('102.89.10.8'),
        ip_address_hash: makeHash('102.89.10.8'),
        request_id: crypto.randomUUID(),
        occurred_at: new Date('2025-02-03T09:05:00Z'),
        metadata: JSON.stringify({ channel: 'fraud-desk' })
      },
      {
        event_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        actor_id: adminId,
        actor_type: 'user',
        actor_role: 'admin',
        event_type: 'incident.runbook_launched',
        event_severity: 'warning',
        entity_type: 'security_incident',
        entity_id: takeoverIncident.incident_uuid,
        payload: JSON.stringify({
          runbookId: 'account-takeover-high',
          launchedBy: 'Security On Call',
          reference: takeoverIncident.metadata ? JSON.parse(takeoverIncident.metadata).reference : 'OPS-2046'
        }),
        ip_address_ciphertext: sealSensitive('102.89.10.8'),
        ip_address_hash: makeHash('102.89.10.8'),
        request_id: crypto.randomUUID(),
        occurred_at: new Date('2025-02-03T07:09:00Z'),
        metadata: JSON.stringify({ bridge: 'Teams 610-883-441' })
      },
      {
        event_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        actor_id: adminId,
        actor_type: 'user',
        actor_role: 'admin',
        event_type: 'incident.closed',
        event_severity: 'info',
        entity_type: 'security_incident',
        entity_id: resolvedSmishingIncident.incident_uuid,
        payload: JSON.stringify({
          status: 'resolved',
          resolvedAt: '2025-01-27T17:42:00Z',
          reference: 'OPS-2038'
        }),
        ip_address_ciphertext: sealSensitive('102.89.10.8'),
        ip_address_hash: makeHash('102.89.10.8'),
        request_id: crypto.randomUUID(),
        occurred_at: new Date('2025-01-27T17:42:00Z'),
        metadata: JSON.stringify({ channel: 'fraud-desk' })
      }
    ]);

    const [marketingConsentPolicyId] = await trx('consent_policies').insert({
      policy_key: 'marketing.email',
      version: '2025-02',
      status: 'published',
      effective_at: new Date('2025-02-01T00:00:00Z'),
      title: 'Marketing email communications',
      summary: 'Describes how Edulure uses opted-in marketing email preferences across newsletters and updates.',
      document_locations: JSON.stringify({
        url: 'https://edulure.com/policies/marketing-email-2025-02',
        locale: 'en-GB'
      }),
      content_hash: generateConsentPolicyChecksum({
        key: 'marketing.email',
        version: '2025-02',
        sections: ['Purpose', 'Data Usage', 'Revocation'],
        locales: ['en-GB']
      })
    });

    const [analyticsConsentPolicyId] = await trx('consent_policies').insert({
      policy_key: 'data.analytics',
      version: '2025-02',
      status: 'published',
      effective_at: new Date('2025-02-01T00:00:00Z'),
      title: 'Analytics instrumentation consent',
      summary: 'Sets out how product analytics events are collected for instructors and operators.',
      document_locations: JSON.stringify({
        url: 'https://edulure.com/policies/data-analytics-2025-02',
        locale: 'en-SG'
      }),
      content_hash: generateConsentPolicyChecksum({
        key: 'data.analytics',
        version: '2025-02',
        sections: ['Purpose', 'Metrics Captured', 'Opt-out'],
        locales: ['en-SG']
      })
    });

    await trx('consent_records').insert([
      {
        user_id: learnerId,
        consent_type: 'marketing.email',
        policy_version: '2025-02',
        policy_id: marketingConsentPolicyId,
        status: 'granted',
        granted_at: new Date('2025-02-01T10:00:00Z'),
        channel: 'web',
        evidence_ciphertext: sealSensitive('Learner accepted updated marketing email consent via web preferences.'),
        evidence_checksum: makeHash('learner-marketing-email-2025-02'),
        metadata: JSON.stringify({ ip: '102.89.10.8', userAgent: 'Chrome/120.0', locale: 'en-GB' })
      },
      {
        user_id: instructorId,
        consent_type: 'data.analytics',
        policy_version: '2025-02',
        policy_id: analyticsConsentPolicyId,
        status: 'granted',
        granted_at: new Date('2025-02-02T09:30:00Z'),
        channel: 'web',
        evidence_ciphertext: sealSensitive('Instructor accepted analytics instrumentation consent in dashboard settings.'),
        evidence_checksum: makeHash('instructor-analytics-consent-2025-02'),
        metadata: JSON.stringify({ ip: '176.23.45.100', userAgent: 'Safari/17.1', locale: 'en-SG' })
      }
    ]);

    await trx('dsr_requests').insert([
      {
        request_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        user_id: learnerId,
        request_type: 'access',
        status: 'in_review',
        submitted_at: new Date('2025-01-20T09:00:00Z'),
        due_at: new Date('2025-02-19T09:00:00Z'),
        handled_by: adminId,
        escalated: false,
        case_reference: 'DSR-2025-0001',
        sla_days: 30,
        request_ciphertext: sealSensitive('Learner requested export of historical progress and direct messages.'),
        response_ciphertext: sealSensitive('Operations compiling export and awaiting legal approval.'),
        metadata: JSON.stringify({ channel: 'support-portal', priority: 'standard' })
      },
      {
        request_uuid: crypto.randomUUID(),
        tenant_id: 'global',
        user_id: instructorId,
        request_type: 'erasure',
        status: 'completed',
        submitted_at: new Date('2024-12-10T15:00:00Z'),
        due_at: new Date('2025-01-09T15:00:00Z'),
        closed_at: new Date('2024-12-22T11:30:00Z'),
        handled_by: adminId,
        escalated: true,
        escalated_at: new Date('2024-12-15T09:10:00Z'),
        case_reference: 'DSR-2024-0198',
        sla_days: 30,
        request_ciphertext: sealSensitive('Instructor requested erasure of deprecated sandbox account data.'),
        response_ciphertext: sealSensitive('Account anonymised and retention exceptions logged for compliance.'),
        metadata: JSON.stringify({ channel: 'support-portal', priority: 'high' })
      }
    ]);

    const eventsForDispatch = await trx('domain_events')
      .whereIn('event_type', ['community.post.published', 'community.subscription.activated'])
      .orderBy('id', 'asc');

    const queueEntries = [];
    const nowExpression = trx.fn.now();

    if (eventsForDispatch[0]) {
      queueEntries.push({
        domain_event_id: eventsForDispatch[0].id,
        status: 'delivered',
        delivery_channel: 'webhook',
        attempts: 1,
        max_attempts: 12,
        available_at: nowExpression,
        locked_at: nowExpression,
        locked_by: 'seed-worker-1',
        delivered_at: nowExpression,
        payload_checksum: makeHash(`seed:${eventsForDispatch[0].id}:delivered`),
        metadata: JSON.stringify({ eventType: eventsForDispatch[0].event_type, delivered: true }),
        dry_run: false,
        trace_id: makeHash(`trace-delivered-${eventsForDispatch[0].id}`).slice(0, 32),
        correlation_id: `seed-${eventsForDispatch[0].id}`
      });
    }

    if (eventsForDispatch[1]) {
      queueEntries.push({
        domain_event_id: eventsForDispatch[1].id,
        status: 'delivering',
        delivery_channel: 'webhook',
        attempts: 2,
        max_attempts: 12,
        available_at: nowExpression,
        locked_at: nowExpression,
        locked_by: 'seed-worker-2',
        payload_checksum: makeHash(`seed:${eventsForDispatch[1].id}:delivering`),
        metadata: JSON.stringify({ eventType: eventsForDispatch[1].event_type, attempt: 2 }),
        dry_run: false,
        trace_id: makeHash(`trace-delivering-${eventsForDispatch[1].id}`).slice(0, 32),
        correlation_id: `seed-${eventsForDispatch[1].id}`
      });
    }

    if (eventsForDispatch[2]) {
      queueEntries.push({
        domain_event_id: eventsForDispatch[2].id,
        status: 'pending',
        delivery_channel: 'webhook',
        attempts: 0,
        max_attempts: 12,
        available_at: nowExpression,
        payload_checksum: makeHash(`seed:${eventsForDispatch[2].id}:pending`),
        metadata: JSON.stringify({ eventType: eventsForDispatch[2].event_type, priority: 'standard' }),
        dry_run: false,
        trace_id: makeHash(`trace-pending-${eventsForDispatch[2].id}`).slice(0, 32),
        correlation_id: `seed-${eventsForDispatch[2].id}`
      });
    }

    if (eventsForDispatch[3]) {
      queueEntries.push({
        domain_event_id: eventsForDispatch[3].id,
        status: 'failed',
        delivery_channel: 'webhook',
        attempts: 5,
        max_attempts: 12,
        available_at: nowExpression,
        failed_at: nowExpression,
        last_error: 'HTTP 500 from integration target',
        last_error_at: nowExpression,
        payload_checksum: makeHash(`seed:${eventsForDispatch[3].id}:failed`),
        metadata: JSON.stringify({ eventType: eventsForDispatch[3].event_type, lastError: 'upstream_http_500' }),
        dry_run: false,
        trace_id: makeHash(`trace-failed-${eventsForDispatch[3].id}`).slice(0, 32),
        correlation_id: `seed-${eventsForDispatch[3].id}`
      });
    }

    if (queueEntries.length > 0) {
      await trx('domain_event_dispatch_queue').insert(queueEntries);
    }

    const [{ total: tenantOverrideTotal }] = await trx('feature_flag_tenant_states').count({ total: '*' });
    if (Number(tenantOverrideTotal ?? 0) === 0) {
      throw new Error('Feature flag tenant state bootstrap failed to create overrides.');
    }

    const [{ total: pendingDispatchTotal }] = await trx('domain_event_dispatch_queue')
      .where({ status: 'pending' })
      .count({ total: '*' });
    if (Number(pendingDispatchTotal ?? 0) === 0) {
      throw new Error('Domain event dispatch queue bootstrap did not seed pending work.');
    }

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
        last_used_at: timelineNow
      },
      {
        user_id: instructorId,
        refresh_token_hash: makeHash('instructor-stale-session'),
        user_agent: 'Safari/17.1 (iOS)',
        ip_address: '176.23.45.100',
        expires_at: sixtyDaysAgo,
        last_used_at: sixtyDaysAgo,
        revoked_at: timelineNow,
        revoked_reason: 'credential_rotation'
      }
    ]);

    await trx('user_email_verification_tokens').insert({
      user_id: learnerId,
      token_hash: makeHash('learner-email-token'),
      expires_at: new Date(timelineNow.getTime() + 24 * 60 * 60 * 1000)
    });
    await trx(TELEMETRY_TABLES.CONSENT_LEDGER).insert([
      {
        user_id: adminId,
        tenant_id: 'global',
        consent_scope: 'product.analytics',
        consent_version: 'v1',
        status: 'granted',
        is_active: true,
        recorded_at: trx.fn.now(),
        effective_at: trx.fn.now(),
        metadata: JSON.stringify({ capturedBy: 'seed', channel: 'bootstrap' }),
        evidence: JSON.stringify({ method: 'policy-acceptance', version: '2025-03' })
      },
      {
        user_id: instructorId,
        tenant_id: 'global',
        consent_scope: 'product.analytics',
        consent_version: 'v1',
        status: 'granted',
        is_active: true,
        recorded_at: trx.fn.now(),
        effective_at: trx.fn.now(),
        metadata: JSON.stringify({ capturedBy: 'seed', channel: 'bootstrap' }),
        evidence: JSON.stringify({ method: 'policy-acceptance', version: '2025-03' })
      },
      {
        user_id: learnerId,
        tenant_id: 'global',
        consent_scope: 'product.analytics',
        consent_version: 'v1',
        status: 'granted',
        is_active: true,
        recorded_at: trx.fn.now(),
        effective_at: trx.fn.now(),
        metadata: JSON.stringify({ capturedBy: 'seed', channel: 'bootstrap' }),
        evidence: JSON.stringify({ method: 'policy-acceptance', version: '2025-03' })
      }
    ]);

    await trx(TELEMETRY_TABLES.FRESHNESS_MONITORS).insert([
      {
        pipeline_key: 'ingestion.raw',
        status: 'healthy',
        threshold_minutes: 15,
        last_event_at: trx.fn.now(),
        lag_seconds: 0,
        metadata: JSON.stringify({ seeded: true })
      },
      {
        pipeline_key: 'warehouse.export',
        status: 'healthy',
        threshold_minutes: 30,
        last_event_at: trx.fn.now(),
        lag_seconds: 0,
        metadata: JSON.stringify({ seeded: true })
      }
    ]);

    const vendorContractPublicId = crypto.randomUUID();
    const dataProcessingContractPublicId = crypto.randomUUID();
    const communicationsContractPublicId = crypto.randomUUID();

    const vendorContractObligations = [
      {
        id: crypto.randomUUID(),
        description: 'Provide quarterly penetration test summary and remediation status.',
        owner: 'security@edulure.com',
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        completedAt: null,
        status: 'open'
      },
      {
        id: crypto.randomUUID(),
        description: 'Refresh incident response contact roster within 5 business days of staff turnover.',
        owner: 'security@edulure.com',
        dueAt: null,
        completedAt: null,
        status: 'monitor'
      }
    ];

    const dataProcessingObligations = [
      {
        id: crypto.randomUUID(),
        description: 'Publish annual GDPR Article 28 addendum update for customer signature.',
        owner: 'legal@edulure.com',
        dueAt: '2025-05-15T00:00:00.000Z',
        completedAt: null,
        status: 'open'
      }
    ];

    const communicationsObligations = [
      {
        id: crypto.randomUUID(),
        description: 'Distribute roadmap summary to executive sponsors within two weeks of review cycle.',
        owner: 'enablement@edulure.com',
        dueAt: '2025-04-29T00:00:00.000Z',
        completedAt: null,
        status: 'planned'
      }
    ];

    await trx('governance_contracts').insert([
      {
        public_id: vendorContractPublicId,
        vendor_name: 'ShieldGuard Security',
        contract_type: 'penetration-testing',
        status: 'active',
        owner_email: 'security@edulure.com',
        risk_tier: 'high',
        contract_value_cents: 1800000,
        currency: 'USD',
        effective_date: '2024-07-01',
        renewal_date: '2025-07-01',
        termination_notice_date: '2025-04-01',
        obligations: JSON.stringify(vendorContractObligations),
        metadata: JSON.stringify({ classification: 'critical', regions: ['US', 'EU'] }),
        last_renewal_evaluated_at: trx.fn.now(),
        next_governance_check_at: trx.fn.now()
      },
      {
        public_id: dataProcessingContractPublicId,
        vendor_name: 'CloudSignal Data Platform',
        contract_type: 'data-processing-addendum',
        status: 'pending_renewal',
        owner_email: 'legal@edulure.com',
        risk_tier: 'medium',
        contract_value_cents: 960000,
        currency: 'USD',
        effective_date: '2023-10-01',
        renewal_date: '2025-04-15',
        termination_notice_date: '2025-03-01',
        obligations: JSON.stringify(dataProcessingObligations),
        metadata: JSON.stringify({ classification: 'sensitive', processorType: 'CDP' }),
        last_renewal_evaluated_at: trx.fn.now(),
        next_governance_check_at: trx.fn.now()
      },
      {
        public_id: communicationsContractPublicId,
        vendor_name: 'Brightwave Communications',
        contract_type: 'strategic-communications',
        status: 'active',
        owner_email: 'enablement@edulure.com',
        risk_tier: 'low',
        contract_value_cents: 420000,
        currency: 'USD',
        effective_date: '2024-01-05',
        renewal_date: '2025-01-05',
        termination_notice_date: '2024-11-01',
        obligations: JSON.stringify(communicationsObligations),
        metadata: JSON.stringify({ deliverables: ['roadmap-briefings', 'executive-townhalls'] }),
        last_renewal_evaluated_at: trx.fn.now(),
        next_governance_check_at: trx.fn.now()
      }
    ]);

    const shieldGuardContract = await trx('governance_contracts')
      .select('id')
      .where({ public_id: vendorContractPublicId })
      .first();
    const cdpContract = await trx('governance_contracts')
      .select('id')
      .where({ public_id: dataProcessingContractPublicId })
      .first();

    await trx('governance_vendor_assessments').insert([
      {
        public_id: crypto.randomUUID(),
        contract_id: shieldGuardContract.id,
        vendor_name: 'ShieldGuard Security',
        assessment_type: 'security',
        risk_score: 7.8,
        risk_level: 'high',
        status: 'remediation',
        last_assessed_at: '2025-03-15',
        next_review_at: '2025-05-01',
        owner_email: 'security@edulure.com',
        findings: JSON.stringify([
          {
            id: crypto.randomUUID(),
            category: 'vulnerability-management',
            severity: 'high',
            description: 'Missed SLA for patching critical findings during February engagement.'
          }
        ]),
        remediation_plan: JSON.stringify({
          status: 'in_progress',
          targetDate: '2025-04-12',
          owner: 'ShieldGuard TAM'
        }),
        evidence_links: JSON.stringify([
          'https://ops.edulure.com/compliance/shieldguard-feb-2025-report.pdf'
        ]),
        metadata: JSON.stringify({ cadence: 'quarterly' })
      },
      {
        public_id: crypto.randomUUID(),
        contract_id: cdpContract.id,
        vendor_name: 'CloudSignal Data Platform',
        assessment_type: 'privacy',
        risk_score: 4.2,
        risk_level: 'medium',
        status: 'approved',
        last_assessed_at: '2025-02-28',
        next_review_at: '2025-08-31',
        owner_email: 'legal@edulure.com',
        findings: JSON.stringify([
          {
            id: crypto.randomUUID(),
            category: 'data-retention',
            severity: 'medium',
            description: 'Customer deletion SLA improved to 14 days but requires quarterly attestation.'
          }
        ]),
        remediation_plan: JSON.stringify({
          status: 'monitor',
          nextCheckpoint: '2025-06-01',
          notes: 'Request automated retention evidence feed.'
        }),
        evidence_links: JSON.stringify([
          'https://ops.edulure.com/legal/cloudsignal-art28-2025.pdf'
        ]),
        metadata: JSON.stringify({ cadence: 'biannual' })
      }
    ]);

    await trx('governance_review_cycles').insert([
      {
        public_id: crypto.randomUUID(),
        cycle_name: 'Quarterly Trust Review Q2 FY25',
        status: 'in_progress',
        start_date: '2025-04-01',
        end_date: '2025-04-30',
        next_milestone_at: '2025-04-15',
        focus_areas: JSON.stringify(['security', 'privacy', 'resilience']),
        participants: JSON.stringify([
          { name: 'Tara Singh', role: 'CISO' },
          { name: 'Miguel Rosa', role: 'Head of Data Governance' },
          { name: 'Dana Ellis', role: 'VP Product' }
        ]),
        action_items: JSON.stringify([
          {
            id: crypto.randomUUID(),
            summary: 'Finalize FY25 breach notification runbook refresh.',
            owner: 'security@edulure.com',
            dueAt: '2025-04-12T00:00:00.000Z',
            status: 'open'
          }
        ]),
        outcome_notes: null,
        readiness_score: 62
      },
      {
        public_id: crypto.randomUUID(),
        cycle_name: 'Stakeholder Steering Committee – April 2025',
        status: 'planned',
        start_date: '2025-04-18',
        end_date: '2025-04-18',
        next_milestone_at: '2025-04-16',
        focus_areas: JSON.stringify(['roadmap', 'enablement', 'customer-advisory']),
        participants: JSON.stringify([
          { name: 'Iris Akintola', role: 'Chief Customer Officer' },
          { name: 'Kenji Morita', role: 'VP Enablement' },
          { name: 'Lauren Patel', role: 'Head of Partnerships' }
        ]),
        action_items: JSON.stringify([]),
        outcome_notes: null,
        readiness_score: 48
      }
    ]);

    await trx('governance_roadmap_communications').insert([
      {
        public_id: crypto.randomUUID(),
        slug: 'fy25-trust-roadmap-briefing',
        audience: 'executive-sponsors',
        channel: 'webinar',
        subject: 'FY25 Trust & Compliance Roadmap Briefing',
        body:
          'Walk executive sponsors through the FY25 security, privacy, and resilience initiatives with clear risk posture updates and request for prioritisation feedback.',
        status: 'scheduled',
        schedule_at: new Date('2025-04-22T16:00:00Z'),
        sent_at: null,
        owner_email: 'enablement@edulure.com',
        metrics: JSON.stringify({
          targetAudience: 32,
          expectedRecipients: 32,
          delivered: 0,
          engagementRate: 0
        }),
        attachments: JSON.stringify([
          {
            name: 'briefing-deck',
            url: 'https://cdn.edulure.com/roadmap/fy25-trust-briefing.pdf'
          }
        ]),
        metadata: JSON.stringify({ cadence: 'quarterly' })
      },
      {
        public_id: crypto.randomUUID(),
        slug: 'provider-migration-update-apr-2025',
        audience: 'provider-partners',
        channel: 'newsletter',
        subject: 'Provider Migration Update – April 2025',
        body:
          'Summarise milestone burn-down, highlight enablement resources, and flag required actions ahead of the May cut-over.',
        status: 'draft',
        schedule_at: new Date('2025-04-10T12:00:00Z'),
        sent_at: null,
        owner_email: 'partners@edulure.com',
        metrics: JSON.stringify({ targetAudience: 640, delivered: 0, expectedRecipients: 640 }),
        attachments: JSON.stringify([
          { name: 'migration-checklist', url: 'https://cdn.edulure.com/providers/migration-checklist.pdf' }
        ]),
        metadata: JSON.stringify({ cadence: 'biweekly' })
      }
    ]);

    const releaseChecklistEntries = [
      {
        public_id: crypto.randomUUID(),
        slug: 'quality-verification',
        category: 'quality',
        title: 'Quality assurance sign-off',
        description:
          'CI pipelines must report stable automated testing with coverage above 90% and failure rate below 2%.',
        auto_evaluated: true,
        weight: 3,
        default_owner_email: 'qa@edulure.com',
        success_criteria: JSON.stringify({ minCoverage: 0.9, maxFailureRate: 0.02 })
      },
      {
        public_id: crypto.randomUUID(),
        slug: 'security-review',
        category: 'security',
        title: 'Security review with zero critical findings',
        description: 'Vulnerability scans must report zero critical issues and fewer than five high-severity findings.',
        auto_evaluated: true,
        weight: 3,
        default_owner_email: 'security@edulure.com',
        success_criteria: JSON.stringify({ maxCriticalVulnerabilities: 0, maxHighVulnerabilities: 5 })
      },
      {
        public_id: crypto.randomUUID(),
        slug: 'observability-health',
        category: 'observability',
        title: 'Observability and incident health check',
        description: 'No live incidents may be open and error rate must remain below 1% across the change window.',
        auto_evaluated: true,
        weight: 2,
        default_owner_email: 'sre@edulure.com',
        success_criteria: JSON.stringify({ maxOpenIncidents: 0, maxErrorRate: 0.01 })
      },
      {
        public_id: crypto.randomUUID(),
        slug: 'compliance-evidence',
        category: 'compliance',
        title: 'Compliance evidence packaged',
        description: 'SOC 2, ISO 27001, and privacy change reviews must be uploaded to the evidence vault.',
        auto_evaluated: false,
        weight: 2,
        default_owner_email: 'compliance@edulure.com',
        success_criteria: JSON.stringify({ requiredEvidence: ['soc2-signoff', 'privacy-review'] })
      },
      {
        public_id: crypto.randomUUID(),
        slug: 'change-approval',
        category: 'change_management',
        title: 'Change advisory board approval',
        description:
          'Change ticket must be approved, change review completed, and deployment must respect the freeze calendar.',
        auto_evaluated: true,
        weight: 2,
        default_owner_email: 'release@edulure.com',
        success_criteria: JSON.stringify({ changeReviewRequired: true, freezeWindowCheck: true })
      }
    ];

    await trx('release_checklist_items').insert(releaseChecklistEntries);

    const releaseChecklistSnapshot = releaseChecklistEntries.map((item) => ({
      id: item.id ?? null,
      publicId: item.public_id,
      slug: item.slug,
      category: item.category,
      title: item.title,
      description: item.description,
      autoEvaluated: item.auto_evaluated,
      weight: item.weight,
      defaultOwnerEmail: item.default_owner_email,
      successCriteria: JSON.parse(item.success_criteria)
    }));

    const releaseRunPublicId = crypto.randomUUID();
    const releaseRunMetadata = {
      requiredGates: [
        'quality-verification',
        'security-review',
        'observability-health',
        'compliance-evidence',
        'change-approval'
      ],
      thresholds: {
        minCoverage: 0.9,
        maxTestFailureRate: 0.02,
        maxCriticalVulnerabilities: 0,
        maxHighVulnerabilities: 5,
        maxOpenIncidents: 0,
        maxErrorRate: 0.01
      },
      readinessScore: 68,
      changeTicket: 'CHG-2048'
    };

    await trx('release_runs').insert({
      public_id: releaseRunPublicId,
      version_tag: 'v1.0.0-rc.5',
      environment: 'staging',
      status: 'in_progress',
      initiated_by_email: 'helena.brooks@edulure.com',
      initiated_by_name: 'Helena Brooks',
      scheduled_at: trx.fn.now(),
      started_at: trx.fn.now(),
      completed_at: null,
      change_window_start: new Date('2025-04-18T18:00:00Z'),
      change_window_end: new Date('2025-04-18T19:00:00Z'),
      summary_notes: 'Readiness rehearsal for Version 1.00 production cut-over.',
      checklist_snapshot: JSON.stringify(releaseChecklistSnapshot),
      metadata: JSON.stringify(releaseRunMetadata)
    });

    const releaseRun = await trx('release_runs')
      .select('id')
      .where({ public_id: releaseRunPublicId })
      .first();

    const releaseChecklistRows = await trx('release_checklist_items')
      .select('id', 'slug')
      .whereIn('slug', releaseRunMetadata.requiredGates);

    const gateLookup = new Map(releaseChecklistRows.map((row) => [row.slug, row.id]));

    await trx('release_gate_results').insert([
      {
        public_id: crypto.randomUUID(),
        run_id: releaseRun.id,
        checklist_item_id: gateLookup.get('quality-verification'),
        gate_key: 'quality-verification',
        status: 'pass',
        owner_email: 'qa@edulure.com',
        metrics: JSON.stringify({ coverage: 0.92, testFailureRate: 0.01 }),
        notes: 'Vitest, Cypress, and contract suites passed on the latest build.',
        evidence_url: 'https://ci.edulure.com/jobs/qa/v1.0.0-rc.5',
        last_evaluated_at: trx.fn.now()
      },
      {
        public_id: crypto.randomUUID(),
        run_id: releaseRun.id,
        checklist_item_id: gateLookup.get('security-review'),
        gate_key: 'security-review',
        status: 'in_progress',
        owner_email: 'security@edulure.com',
        metrics: JSON.stringify({ criticalVulnerabilities: 0, highVulnerabilities: 3 }),
        notes: 'Awaiting verification that backlog high findings are mitigated.',
        evidence_url: 'https://security.edulure.com/vuln/summary',
        last_evaluated_at: trx.fn.now()
      },
      {
        public_id: crypto.randomUUID(),
        run_id: releaseRun.id,
        checklist_item_id: gateLookup.get('observability-health'),
        gate_key: 'observability-health',
        status: 'pass',
        owner_email: 'sre@edulure.com',
        metrics: JSON.stringify({ openIncidents: 0, errorRate: 0.004 }),
        notes: 'SLO dashboards green for the last 24 hours.',
        evidence_url: 'https://observability.edulure.com/releases/v1.0.0-rc.5',
        last_evaluated_at: trx.fn.now()
      },
      {
        public_id: crypto.randomUUID(),
        run_id: releaseRun.id,
        checklist_item_id: gateLookup.get('compliance-evidence'),
        gate_key: 'compliance-evidence',
        status: 'pending',
        owner_email: 'compliance@edulure.com',
        metrics: JSON.stringify({ evidence: ['soc2-signoff'] }),
        notes: 'Privacy review pending final DPO sign-off.',
        evidence_url: 'https://compliance.edulure.com/evidence/v1.0.0-rc.5',
        last_evaluated_at: null
      },
      {
        public_id: crypto.randomUUID(),
        run_id: releaseRun.id,
        checklist_item_id: gateLookup.get('change-approval'),
        gate_key: 'change-approval',
        status: 'in_progress',
        owner_email: 'release@edulure.com',
        metrics: JSON.stringify({ changeReviewCompleted: true, freezeWindowBypassed: false }),
        notes: 'Change advisory board met, awaiting CAB minutes upload.',
        evidence_url: 'https://change.edulure.com/tickets/CHG-2048',
        last_evaluated_at: trx.fn.now()
      }
    ]);

    await trx(TELEMETRY_TABLES.LINEAGE_RUNS).insert({
      tool: 'dbt',
      model_name: 'telemetry_events_rollup',
      status: 'success',
      started_at: trx.fn.now(),
      completed_at: trx.fn.now(),
      input: JSON.stringify({ source: 'telemetry_events', range: 'seed' }),
      output: JSON.stringify({ recordsProcessed: 0, checksum: 'seed-init' })
    });
  });
}

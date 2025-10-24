import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import { generateConsentPolicyChecksum } from '../src/database/domains/compliance.js';
import { TABLES as TELEMETRY_TABLES, generateTelemetryDedupeHash } from '../src/database/domains/telemetry.js';
import DataEncryptionService from '../src/services/DataEncryptionService.js';
import PaymentIntentModel from '../src/models/PaymentIntentModel.js';
import CommunityAffiliatePayoutModel from '../src/models/CommunityAffiliatePayoutModel.js';
import {
  COMMUNITY_EVENT_PARTICIPANT_STATUSES,
  COMMUNITY_EVENT_REMINDER_CHANNELS,
  COMMUNITY_EVENT_REMINDER_STATUSES
} from '../src/models/communityEventConstants.js';
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
    await trx('blog_media').del();
    await trx('blog_post_tags').del();
    await trx('blog_posts').del();
    await trx('blog_tags').del();
    await trx('blog_categories').del();
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
    await trx('learning_offline_module_snapshots').del();
    await trx('learning_offline_assessment_submissions').del();
    await trx('learning_offline_downloads').del();
    await trx('instructor_action_queue').del();
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
    await trx('billing_portal_sessions').del();
    await trx('learner_finance_purchases').del();
    await trx('learner_financial_profiles').del();
    await trx('learner_payment_methods').del();
    await trx('learner_billing_contacts').del();
    await trx('learner_system_preferences').del();
    await trx('learner_onboarding_responses').del();
    await trx('learner_onboarding_invites').del();
    await trx('learner_course_goals').del();
    await trx('feature_flag_audits').del();
    await trx('feature_flag_tenant_states').del();
    await trx('feature_flags').del();
    await trx('configuration_entries').del();
    await trx('community_resources').del();
    await trx('community_growth_experiments').del();
    await trx('community_podcast_episodes').del();
    await trx('community_webinars').del();
    await trx('community_message_moderation_actions').del();
    await trx('moderation_follow_ups').del();
    await trx('community_post_moderation_actions').del();
    await trx('community_post_reactions').del();
    await trx('community_post_moderation_cases').del();
    await trx('scam_reports').del();
    await trx('moderation_analytics_events').del();
    await trx('learner_support_messages').del();
    await trx('learner_support_cases').del();
    await trx('support_articles').del();
    await trx('community_message_reactions').del();
    await trx('community_channel_members').del();
    await trx('community_messages').del();
    await trx('notification_dispatch_queue').del();
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
    await trx('community_event_reminders').del();
    await trx('community_channels').del();
    await trx('community_members').del();
    await trx('asset_conversion_outputs').del();
    await trx('asset_ingestion_jobs').del();
    await trx('integration_api_key_invites').del();
    await trx('integration_api_keys').del();
    await trx('environment_parity_snapshots').del();
    await trx('ebook_read_progress').del();
    await trx('content_asset_events').del();
    await trx('content_audit_logs').del();
    await trx('content_assets').del();
    await trx('marketing_plan_features').del();
    await trx('marketing_plan_offers').del();
    await trx('marketing_testimonials').del();
    await trx('marketing_blocks').del();
    await trx('marketing_leads').del();
    await trx('telemetry_lineage_runs').del();
    await trx('telemetry_freshness_monitors').del();
    await trx('telemetry_events').del();
    await trx('telemetry_event_batches').del();
    await trx('telemetry_consent_ledger').del();
    await trx('release_gate_results').del();
    await trx('release_runs').del();
    await trx('setup_run_tasks').del();
    await trx('setup_runs').del();
    await trx('release_checklist_items').del();
    await trx('domain_event_dispatch_queue').del();
    await trx('background_job_states').del();
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
    const operationsSyncStartedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const studioSessionStartedAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const [adminId] = await trx('users').insert({
      first_name: 'Amina',
      last_name: 'Diallo',
      email: 'amina.diallo@edulure.test',
      password_hash: passwordHash,
      role: 'admin',
      email_verified_at: trx.fn.now(),
      failed_login_attempts: 0,
      last_login_at: trx.fn.now(),
      password_changed_at: trx.fn.now(),
      dashboard_preferences: JSON.stringify({ pinnedNavigation: ['admin-operations', 'admin-governance'] }),
      unread_community_count: 9,
      pending_payouts: 2,
      active_live_room: JSON.stringify({
        id: 'live_ops_sync',
        title: 'Weekly operations sync',
        startedAt: operationsSyncStartedAt,
        role: 'admin',
        roomUrl: 'https://live.edulure.test/ops-sync'
      })
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
      password_changed_at: trx.fn.now(),
      dashboard_preferences: JSON.stringify({ pinnedNavigation: ['instructor-studio', 'instructor-clients'] }),
      unread_community_count: 5,
      pending_payouts: 1,
      active_live_room: JSON.stringify({
        id: 'live_course_build',
        title: 'Cohort design working session',
        startedAt: studioSessionStartedAt,
        courseId: 'course-automation-fundamentals',
        role: 'instructor',
        roomUrl: 'https://live.edulure.test/cohort-design'
      })
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
      password_changed_at: trx.fn.now(),
      dashboard_preferences: JSON.stringify({ pinnedNavigation: ['learner-community'] }),
      unread_community_count: 7,
      pending_payouts: 0,
      active_live_room: null
    });

    const [flowPreviewUserId] = await trx('users').insert({
      first_name: 'Jordan',
      last_name: 'Rivera',
      email: 'flow5-preview@edulure.test',
      password_hash: passwordHash,
      role: 'instructor',
      email_verified_at: null,
      failed_login_attempts: 0,
      last_login_at: null,
      password_changed_at: null,
      dashboard_preferences: JSON.stringify({ pinnedNavigation: ['instructor-onboarding'] }),
      unread_community_count: 0,
      pending_payouts: 0,
      active_live_room: null,
      two_factor_enabled: 0,
      two_factor_secret: null,
      two_factor_enrolled_at: null,
      two_factor_last_verified_at: null,
      created_at: trx.fn.now(),
      updated_at: trx.fn.now()
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

    const learnerRecommendationPreview = [
      {
        id: 'course-async-leadership',
        title: 'Design async learning rituals',
        category: 'Course',
        descriptor: 'Course • 6 lessons',
        imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'community-cohort-kickoff',
        title: 'Launch your next cohort with confidence',
        category: 'Playbook',
        descriptor: 'Guide • 12 steps',
        imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80'
      },
      {
        id: 'ops-automation',
        title: 'Automate learner check-ins',
        category: 'Workflow',
        descriptor: 'Automation • 4 rules',
        imageUrl: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80'
      }
    ];

    await trx('learner_system_preferences').insert({
      user_id: learnerId,
      language: 'en',
      region: 'US',
      timezone: 'America/New_York',
      notifications_enabled: true,
      digest_enabled: true,
      auto_play_media: false,
      high_contrast: false,
      reduced_motion: false,
      preferences: JSON.stringify({
        interfaceDensity: 'comfortable',
        analyticsOptIn: true,
        subtitleLanguage: 'en',
        audioDescription: false,
        adPersonalisation: true,
        sponsoredHighlights: true,
        adDataUsageAcknowledged: true,
        recommendedTopics: ['community-building', 'learner-success', 'automation'],
        recommendationPreview: learnerRecommendationPreview
      })
    });

    const financeDocuments = [
      {
        name: 'W-9 tax form',
        url: 'https://cdn.edulure.test/docs/seed-w9.pdf',
        uploadedAt: new Date('2024-01-10T10:30:00Z').toISOString()
      }
    ];

    await trx('learner_financial_profiles').insert({
      user_id: learnerId,
      auto_pay_enabled: true,
      reserve_target_cents: 250000,
      preferences: JSON.stringify({
        currency: 'USD',
        taxId: 'US-22-1234567',
        invoiceDelivery: 'email',
        payoutSchedule: 'monthly',
        expensePolicyUrl: 'https://cdn.edulure.test/docs/expense-policy.pdf',
        collectionMethod: 'Automatic card collection',
        supportTier: 'Priority success desk',
        supportNotes: 'Finance desk available via dedicated Slack channel with four-hour SLA.',
        renewalTerm: 'Annual membership · Net 30 invoicing cadence',
        renewalNotes: 'Renews automatically each January unless cancelled 30 days prior.',
        seatUsage: { used: 18, total: 25 },
        alerts: {
          sendEmail: true,
          sendSms: false,
          escalationEmail: 'finance-alerts@edulure.test',
          notifyThresholdPercent: 80
        },
        reimbursements: {
          enabled: true,
          instructions: 'Submit receipts within 30 days via the finance workspace.'
        },
        documents: financeDocuments
      })
    });

    await trx('learner_payment_methods').insert([
      {
        user_id: learnerId,
        label: 'Academy Visa',
        brand: 'visa',
        last4: '4242',
        expiry: '12/26',
        is_primary: true,
        metadata: JSON.stringify({ provider: 'stripe', fingerprint: 'pm_card_visa' })
      },
      {
        user_id: learnerId,
        label: 'Innovation Mastercard',
        brand: 'mastercard',
        last4: '4444',
        expiry: '08/27',
        is_primary: false,
        metadata: JSON.stringify({ provider: 'stripe', fingerprint: 'pm_card_mastercard' })
      }
    ]);

    await trx('learner_billing_contacts').insert({
      user_id: learnerId,
      name: 'Edulure Finance Desk',
      email: 'finance@edulure.test',
      phone: '+1-415-555-0123',
      company: 'Edulure Collective',
      metadata: JSON.stringify({ preferredChannel: 'email', role: 'controller' })
    });

    await trx('learner_finance_purchases').insert([
      {
        user_id: learnerId,
        reference: 'INV-100',
        description: 'Growth Insiders Annual membership',
        amount_cents: 205092,
        currency: 'USD',
        status: 'paid',
        purchased_at: new Date('2024-01-12T14:45:00Z'),
        metadata: JSON.stringify({
          receiptUrl: 'https://cdn.edulure.test/receipts/inv-100.pdf',
          memo: 'Annual membership including analytics add-on'
        })
      },
      {
        user_id: learnerId,
        reference: 'INV-205',
        description: 'Mentorship intensive stipend',
        amount_cents: 89000,
        currency: 'USD',
        status: 'pending',
        purchased_at: new Date('2024-02-05T09:15:00Z'),
        metadata: JSON.stringify({
          receiptUrl: 'https://cdn.edulure.test/receipts/inv-205.pdf',
          memo: 'Awaiting mentor invoice reconciliation'
        })
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

    const nowIso = new Date().toISOString();
    const learningOpsCover = await ensureSeedImage('community-learning-ops', {
      title: 'Learning Ops Guild',
      subtitle: 'Incident-proof live classrooms',
      badge: 'Community access',
      colors: ['#6366f1', '#4338ca']
    });

    const learningOpsMetadata = {
      focus: ['operations', 'automation'],
      timezone: 'UTC',
      defaultChannel: 'weekly-war-room',
      category: 'operations',
      tagline: 'Incident-proof live classrooms and automation squads',
      country: 'US',
      languages: ['en'],
      analyticsKey: 'OPS-HQ',
      primaryPersona: 'operators',
      personas: ['operators', 'instructors'],
      personaSignals: {
        operators: {
          focus: 'Launch control, incident readiness, automation runbooks',
          membershipShare: 0.62,
          trending: true,
          highlights: ['Weekly incident drills', 'Automation guild office hours'],
          sampleMembers: ['Amina Diallo', 'Kai Watanabe', 'Noemi Carvalho']
        },
        instructors: {
          focus: 'Live classroom facilitation & async curriculum enablement',
          membershipShare: 0.38,
          trending: false,
          highlights: ['Instructor studio rotations', 'Peer review pods'],
          sampleMembers: ['Leo Okafor', 'Maya Patel']
        }
      },
      momentum: {
        lastActivityAt: nowIso,
        boost: 12,
        recencyWindowDays: 35,
        trailing30Days: {
          posts: 42,
          resources: 18,
          events: 4
        }
      },
      access: {
        model: 'open',
        ndaRequired: false,
        joinUrl: 'https://app.edulure.test/communities/learning-ops-guild/join'
      },
      ratings: {
        average: 4.94,
        totalReviews: 212,
        highlight: 'Trusted launch control hub for revenue classrooms',
        breakdown: { '5': 0.86, '4': 0.12, '3': 0.02 }
      },
      reviews: [
        {
          id: 'ops-review-1',
          reviewer: 'Linh Tran',
          role: 'VP Learning Ops, Aurora',
          rating: 5,
          comment: 'Runbooks, escalation drills, and monetisation guardrails in one place.',
          publishedAt: nowIso
        },
        {
          id: 'ops-review-2',
          reviewer: 'Mason Patel',
          role: 'Director of Enablement, Alloy',
          rating: 5,
          comment: 'The automation labs and weekly war room keep launches resilient.',
          publishedAt: nowIso
        }
      ],
      membershipMap: {
        totalCountries: 18,
        lastUpdatedAt: nowIso,
        clusters: [
          { region: 'North America', percentage: 0.38, change: '+3.8%' },
          { region: 'EMEA', percentage: 0.31, change: '+2.1%' },
          { region: 'APAC', percentage: 0.22, change: '+1.4%' },
          { region: 'LATAM', percentage: 0.09, change: '+0.7%' }
        ],
        avatars: [
          'https://images.generated.photos/ops1.png',
          'https://images.generated.photos/ops2.png',
          'https://images.generated.photos/ops3.png',
          'https://images.generated.photos/ops4.png',
          'https://images.generated.photos/ops5.png'
        ]
      },
      classrooms: {
        liveClassroom: {
          host: 'Learning Ops Guild',
          status: 'Standby',
          capacity: 180,
          streamUrl: 'https://events.edulure.test/live/ops-stage'
        },
        live: [
          {
            id: 'ops-live-blueprint',
            title: 'Launch Readiness Blueprint AMA',
            facilitator: 'Amina Diallo',
            startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            durationMinutes: 75,
            seatsRemaining: 24,
            status: 'announced',
            registrationUrl: 'https://events.edulure.test/ops-blueprint-ama'
          }
        ],
        recorded: [
          {
            id: 'ops-recorded-staging',
            title: 'Staging Failover Simulation',
            facilitator: 'Kai Watanabe',
            startsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            durationMinutes: 58,
            watchUrl: 'https://cdn.edulure.test/replays/staging-failover.mp4'
          }
        ],
        chatChannels: ['operations-hq', 'weekly-war-room', 'exec-briefings']
      },
      subscription: {
        currency: 'USD',
        billingInterval: 'monthly',
        addons: [
          {
            id: 'ops-addon-sim',
            name: 'Simulation Pack',
            priceCents: 2900,
            description: 'Additional quarterly live automation simulations.'
          },
          {
            id: 'ops-addon-office-hours',
            name: 'Priority office hours',
            priceCents: 1900,
            description: 'Direct incident coaching slots with the ops strategist team.'
          }
        ],
        collection: { provider: 'stripe', mode: 'subscription' },
        metrics: { churnRate: 0.018 }
      },
      events: [
        {
          id: 'ops-event-summit',
          title: 'Automation Summit Workshop',
          type: 'Workshop',
          startsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Virtual',
          registrationUrl: 'https://events.edulure.test/ops-summit-workshop'
        }
      ],
      roles: {},
      security: {
        zeroTrust: true,
        singleSignOn: true,
        auditLog: true,
        lastPenTest: '2024-Q1',
        dataResidency: 'US-East / EU-West mirrored'
      },
      launchChecklist: {
        overallStatus: 'green',
        items: [
          { id: 'ops-check-1', label: 'QA playbooks reviewed', status: 'complete', owner: 'Amina Diallo' },
          { id: 'ops-check-2', label: 'Incident escalation tree refreshed', status: 'complete', owner: 'Kai Watanabe' },
          { id: 'ops-check-3', label: 'Telemetry alerts tuned', status: 'in-progress', owner: 'Noemi Carvalho' }
        ]
      },
      links: {
        hub: 'https://app.edulure.test/communities/learning-ops-guild',
        knowledgeBase: 'https://docs.edulure.test/ops/playbooks'
      }
    };

    const [opsCommunityId] = await trx('communities').insert({
      owner_id: instructorId,
      name: 'Learning Ops Guild',
      slug: 'learning-ops-guild',
      description:
        'Operations leaders share classroom launch playbooks, QA scorecards, and tooling automation recipes.',
      visibility: 'public',
      cover_image_url: learningOpsCover.url,
      metadata: JSON.stringify(learningOpsMetadata)
    });

    const growthLabCover = await ensureSeedImage('community-growth-lab', {
      title: 'Creator Growth Lab',
      subtitle: 'Experiment-led monetisation guild',
      badge: 'Invitation only',
      colors: ['#f97316', '#fb7185']
    });

    const growthLabMetadata = {
      focus: ['growth', 'ads'],
      ndaRequired: true,
      defaultChannel: 'campaign-sprint',
      category: 'growth',
      tagline: 'Experiment-led growth and paid acquisition guild',
      country: 'GB',
      languages: ['en'],
      analyticsKey: 'GROWTH-LAB',
      primaryPersona: 'operators',
      personas: ['operators', 'partners', 'sponsors'],
      personaSignals: {
        operators: {
          focus: 'Lifecycle monetisation, revenue experimentation',
          membershipShare: 0.54,
          trending: true,
          highlights: ['Bi-weekly revenue retros', 'Lifecycle monetisation benchmarks'],
          sampleMembers: ['Sofia Martínez', 'Linh Tran']
        },
        partners: {
          focus: 'Agency collaborators & ecosystem advisors',
          membershipShare: 0.28,
          trending: false,
          highlights: ['Agency deal room', 'Co-marketing canvases'],
          sampleMembers: ['Elias Noor', 'Grace Osei']
        },
        sponsors: {
          focus: 'Brand activations & sponsorship readiness',
          membershipShare: 0.18,
          trending: true,
          highlights: ['Sponsorship pitch lab', 'Brand asset showcase'],
          sampleMembers: ['Anika Bose']
        }
      },
      momentum: {
        lastActivityAt: nowIso,
        boost: 18,
        recencyWindowDays: 30,
        trailing30Days: {
          posts: 58,
          resources: 21,
          events: 6
        }
      },
      access: {
        model: 'invite',
        ndaRequired: true,
        joinUrl: 'https://app.edulure.test/communities/creator-growth-lab/request'
      },
      ratings: {
        average: 4.88,
        totalReviews: 168,
        highlight: 'High-trust lab for multi-channel launch strategy',
        breakdown: { '5': 0.8, '4': 0.17, '3': 0.03 }
      },
      reviews: [
        {
          id: 'growth-review-1',
          reviewer: 'Sasha Idris',
          role: 'Growth Lead, Nova',
          rating: 5,
          comment: 'Campaign retros and benchmark dashboards make optimisation effortless.',
          publishedAt: nowIso
        }
      ],
      membershipMap: {
        totalCountries: 22,
        lastUpdatedAt: nowIso,
        clusters: [
          { region: 'North America', percentage: 0.34, change: '+4.1%' },
          { region: 'EMEA', percentage: 0.27, change: '+1.9%' },
          { region: 'APAC', percentage: 0.25, change: '+2.5%' },
          { region: 'LATAM', percentage: 0.14, change: '+1.2%' }
        ],
        avatars: [
          'https://images.generated.photos/growth1.png',
          'https://images.generated.photos/growth2.png',
          'https://images.generated.photos/growth3.png',
          'https://images.generated.photos/growth4.png'
        ]
      },
      classrooms: {
        liveClassroom: {
          host: 'Creator Growth Lab',
          status: 'Standby',
          capacity: 220,
          streamUrl: 'https://events.edulure.test/live/growth-stage'
        },
        live: [],
        recorded: [],
        chatChannels: ['growth-broadcasts', 'campaign-sprint', 'partner-ops']
      },
      subscription: {
        currency: 'USD',
        billingInterval: 'annual',
        addons: [
          {
            id: 'growth-addon-affiliate',
            name: 'Affiliate accelerator',
            priceCents: 4900,
            description: 'Additional slots for affiliate cohort and concierge campaign tuning.'
          }
        ],
        collection: { provider: 'stripe', mode: 'subscription' },
        metrics: { churnRate: 0.024 }
      },
      events: [
        {
          id: 'growth-event-campaign-lab',
          title: 'Campaign Lab AMA',
          type: 'AMA',
          startsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          registrationUrl: 'https://events.edulure.test/campaign-lab-ama'
        }
      ],
      roles: {},
      security: {
        zeroTrust: true,
        singleSignOn: true,
        auditLog: true,
        lastPenTest: '2024-Q1',
        dataResidency: 'EU-West with US DR'
      },
      launchChecklist: {
        overallStatus: 'amber',
        items: [
          { id: 'growth-check-1', label: 'Affiliate offer refresh', status: 'in-progress', owner: 'Kai Watanabe' },
          { id: 'growth-check-2', label: 'Attribution dashboard QA', status: 'complete', owner: 'Amina Diallo' }
        ]
      },
      links: {
        hub: 'https://app.edulure.test/communities/creator-growth-lab',
        monetisationGuide: 'https://docs.edulure.test/growth/monetisation-playbook'
      }
    };

    const [growthCommunityId] = await trx('communities').insert({
      owner_id: adminId,
      name: 'Creator Growth Lab',
      slug: 'creator-growth-lab',
      description: 'Creators refine monetisation funnels, ad experiments, and marketplace launches together.',
      visibility: 'private',
      cover_image_url: growthLabCover.url,
      metadata: JSON.stringify(growthLabMetadata)
    });

    await trx('marketing_testimonials').insert([
      {
        slug: 'lena-ortiz',
        variant: 'testimonial',
        quote: 'We shipped our cohort in two weeks with the templates and live ops tools.',
        author_name: 'Lena Ortiz',
        author_title: 'Founder, CohortCraft',
        persona: 'Cohort operations lead',
        featured_product: 'Flow 5 Launch Kits',
        surfaces: JSON.stringify(['home', 'learner-register']),
        metadata: JSON.stringify({
          localeKeys: {
            quote: 'home.testimonials.items.lena.quote',
            name: 'home.testimonials.items.lena.name',
            role: 'home.testimonials.items.lena.role'
          }
        }),
        position: 10
      },
      {
        slug: 'noah-winter',
        variant: 'testimonial',
        quote: 'Billing, scheduling, and community rooms finally live in one workflow.',
        author_name: 'Noah Winter',
        author_title: 'Director, Global Learning Lab',
        persona: 'Director of learning innovation',
        featured_product: 'Unified campus workspace',
        surfaces: JSON.stringify(['home']),
        metadata: JSON.stringify({
          localeKeys: {
            quote: 'home.testimonials.items.noah.quote',
            name: 'home.testimonials.items.noah.name',
            role: 'home.testimonials.items.noah.role'
          }
        }),
        position: 20
      },
      {
        slug: 'ops-director-flow5',
        variant: 'social_proof',
        quote:
          'Flow 5 onboarding kept our entire revenue pod aligned in the first week. We knew which communities to launch next.',
        attribution: 'Operations Director · Flow 5',
        persona: 'Revenue operations',
        surfaces: JSON.stringify(['learner-register']),
        metadata: JSON.stringify({ channel: 'learner', emphasis: 'onboarding' }),
        position: 30
      },
      {
        slug: 'creator-growth-lab',
        variant: 'social_proof',
        quote:
          'The interest tags we submitted here now power our cohort roadmap. Edulure turned those signals into real launches.',
        attribution: 'Program Lead · Creator Growth Lab',
        persona: 'Program lead',
        surfaces: JSON.stringify(['learner-register']),
        metadata: JSON.stringify({ channel: 'learner', emphasis: 'signals' }),
        position: 40
      },
      {
        slug: 'global-campus-network',
        variant: 'social_proof',
        quote:
          'International onboarding used to take days. Now the regional preferences we capture sync instantly across dashboards.',
        attribution: 'Learning Ops Manager · Global Campus Network',
        persona: 'Learning operations manager',
        surfaces: JSON.stringify(['learner-register']),
        metadata: JSON.stringify({ channel: 'learner', emphasis: 'international' }),
        position: 50
      },
      {
        slug: 'cohort-architect-guild',
        variant: 'social_proof',
        quote:
          'The application captured everything we needed—portfolio links, cohort goals, even marketing campaigns—in one pass.',
        attribution: 'Lead Instructor · Cohort Architect Guild',
        persona: 'Instructor lead',
        surfaces: JSON.stringify(['instructor-register']),
        metadata: JSON.stringify({ channel: 'instructor', emphasis: 'application' }),
        position: 60
      },
      {
        slug: 'studio-growth-lab',
        variant: 'social_proof',
        quote: 'Edulure surfaced the right learners as soon as we submitted the form. Our waitlist converted within days.',
        attribution: 'Founder · Studio Growth Lab',
        persona: 'Studio founder',
        surfaces: JSON.stringify(['instructor-register']),
        metadata: JSON.stringify({ channel: 'instructor', emphasis: 'conversion' }),
        position: 70
      }
    ]);

    await trx('marketing_blocks').insert([
      {
        slug: 'flow-five-hero',
        block_type: 'hero',
        eyebrow: 'Flow 5 launchpad',
        title: 'Bring learners from hello to enrolled in one Flow 5 launchpad',
        subtitle:
          'Design acquisition experiments, surface personal invites, and hand learners into live cohorts without handing off between tools.',
        status_label: 'Flow 5 beta open',
        chips: JSON.stringify(['Acquisition experiments', 'Community invites', 'Live cohorts']),
        media: JSON.stringify({
          type: 'video',
          poster: 'https://images.edulure.test/flow5/hero-poster-960.webp',
          videoSources: [
            { src: 'https://media.edulure.test/flow5/hero-loop.webm', type: 'video/webm', resolution: 1080 },
            { src: 'https://media.edulure.test/flow5/hero-loop.mp4', type: 'video/mp4', resolution: 1080 }
          ],
          imageSources: [
            { src: 'https://images.edulure.test/flow5/hero-poster-960.webp', width: 960 },
            { src: 'https://images.edulure.test/flow5/hero-poster-720.webp', width: 720 },
            { src: 'https://images.edulure.test/flow5/hero-poster-480.webp', width: 480 }
          ],
          caption: 'Flow 5 orchestrates marketing, onboarding, and payouts in one workspace.',
          alt: 'Operators reviewing Flow 5 dashboards during a live session.'
        }),
        primary_cta: JSON.stringify({ label: 'Start free trial', to: '/register' }),
        secondary_cta: JSON.stringify({ label: 'View pricing', to: '/pricing' }),
        tertiary_cta: JSON.stringify({ label: 'See how Flow 5 works', href: 'https://marketing.edulure.test/flow-5-demo' }),
        metadata: JSON.stringify({ analyticsKey: 'flow5-hero', layout: 'split-right' })
      },
      {
        slug: 'flow-five-proof',
        block_type: 'proof',
        eyebrow: 'Customer spotlight',
        title: 'Ops Guild lifted enrolment 28% after consolidating onboarding',
        subtitle:
          'Kai and Amina used Flow 5 checklists, templated CTAs, and invite sync to cut drop-off across marketing and register flows.',
        status_label: null,
        chips: JSON.stringify(['28% conversion lift', '5 minute checkout', 'Invite sync ready']),
        media: JSON.stringify({
          type: 'stat-stack',
          stats: [
            { label: 'Marketing → enrolment', value: '+28%' },
            { label: 'Flow setup time', value: '2 weeks' },
            { label: 'NPS after onboarding', value: '64' }
          ]
        }),
        primary_cta: JSON.stringify({ label: 'Read the story', href: 'https://stories.edulure.test/flow5-ops-guild' }),
        secondary_cta: JSON.stringify({ label: 'Download checklist', href: 'https://docs.edulure.test/flow5/checklist.pdf' }),
        tertiary_cta: JSON.stringify({}),
        metadata: JSON.stringify({ analyticsKey: 'flow5-proof', theme: 'slate' })
      },
      {
        slug: 'flow-five-case-studies',
        block_type: 'case-study',
        eyebrow: 'Operator proof',
        title: 'Operators scaling revenue with Flow 5',
        subtitle: 'Revenue, community, and tutor teams growing through shared Edulure workflows.',
        status_label: null,
        chips: JSON.stringify(['Acquisition lift', 'Time to launch', 'Sponsor-ready pods']),
        media: JSON.stringify({}),
        primary_cta: JSON.stringify({}),
        secondary_cta: JSON.stringify({}),
        tertiary_cta: JSON.stringify({}),
        metadata: JSON.stringify({
          analyticsKey: 'flow5-case-studies',
          caseStudies: [
            {
              slug: 'ops-guild',
              title: 'Ops Guild lifted enrolment 28%',
              summary: 'Kai unified marketing experiments, onboarding checklists, and sponsor offers to lift enrolment across the Flow 5 pipeline.',
              persona: 'Kai • Revenue Ops',
              metric: '+28% enrolment',
              cta: { href: 'https://stories.edulure.test/flow5-ops-guild', label: 'Read Ops Guild story' },
              media: {
                imageSources: [
                  { src: 'https://images.edulure.test/case-studies/ops-guild-960.webp', width: 960 },
                  { src: 'https://images.edulure.test/case-studies/ops-guild-720.webp', width: 720 },
                  { src: 'https://images.edulure.test/case-studies/ops-guild-480.webp', width: 480 }
                ],
                alt: 'Ops Guild reviewing Flow 5 enrolment metrics.'
              }
            },
            {
              slug: 'cohort-studio',
              title: 'Cohort Studio halved production time',
              summary: 'Amina replaced siloed spreadsheets with Flow 5 lesson kits and automated sponsor unlocks for each cohort launch.',
              persona: 'Amina • Learning Designer',
              metric: '-50% build time',
              cta: { href: 'https://stories.edulure.test/cohort-studio', label: 'Explore Cohort Studio playbook' },
              media: {
                imageSources: [
                  { src: 'https://images.edulure.test/case-studies/cohort-studio-960.webp', width: 960 },
                  { src: 'https://images.edulure.test/case-studies/cohort-studio-720.webp', width: 720 },
                  { src: 'https://images.edulure.test/case-studies/cohort-studio-480.webp', width: 480 }
                ],
                alt: 'Cohort Studio team planning curriculum in Flow 5.'
              }
            },
            {
              slug: 'tutor-league',
              title: 'Tutor League unlocked sponsor-ready pods',
              summary: 'Noah brought tutor pods, live donations, and affiliate payouts under one dashboard to grow recurring revenue.',
              persona: 'Noah • Tutor Collective Lead',
              metric: '+42% sponsor revenue',
              cta: { href: 'https://stories.edulure.test/tutor-league', label: 'See Tutor League results' },
              media: {
                imageSources: [
                  { src: 'https://images.edulure.test/case-studies/tutor-league-960.webp', width: 960 },
                  { src: 'https://images.edulure.test/case-studies/tutor-league-720.webp', width: 720 },
                  { src: 'https://images.edulure.test/case-studies/tutor-league-480.webp', width: 480 }
                ],
                alt: 'Tutor League celebrating sponsor wins in Flow 5.'
              }
            }
          ]
        })
      },
      {
        slug: 'flow-five-monetisation-ribbon',
        block_type: 'monetization-ribbon',
        eyebrow: null,
        title: 'Monetise every surface with Flow 5',
        subtitle: 'Blend sponsorships, tutor pods, and affiliate revenue without leaving the dashboard.',
        status_label: null,
        chips: JSON.stringify(['Ads', 'Tutor pods', 'Affiliates']),
        media: JSON.stringify({}),
        primary_cta: JSON.stringify({ label: 'Activate monetisation', to: '/register' }),
        secondary_cta: JSON.stringify({ label: 'Review pricing', to: '/pricing' }),
        tertiary_cta: JSON.stringify({}),
        metadata: JSON.stringify({
          analyticsKey: 'flow5-monetisation-ribbon',
          highlights: [
            'Ad pods with pacing and sponsor controls',
            'Tutor pods synced with payouts and attendance',
            'Affiliate revenue reconciled nightly'
          ]
        })
      }
    ]);

    const [communityPlanId] = await trx('marketing_plan_offers').insert({
      public_id: 'plan-community-tutor',
      name: 'Community + Tutor Pods',
      headline: 'Community & tutor pods',
      tagline: 'Invite-only cohorts, live office hours, and sponsor-ready portals.',
      price_cents: 14900,
      currency: 'USD',
      billing_interval: 'monthly',
      is_featured: true,
      badge: JSON.stringify({ label: 'Most popular', tone: 'emerald' }),
      metadata: JSON.stringify({
        accent: {
          gradient: 'from-emerald-500/25 via-teal-500/30 to-cyan-500/30',
          border: 'border-emerald-300/40',
          shadow: 'shadow-[0_32px_84px_-42px_rgba(16,185,129,0.6)]'
        }
      }),
      upsell: JSON.stringify({ descriptor: 'Add sponsor marketplace for +$49', optional: true })
    });

    const [cataloguePlanId] = await trx('marketing_plan_offers').insert({
      public_id: 'plan-catalogue',
      name: 'Course Catalogue Pro',
      headline: 'Course catalogue pro',
      tagline: 'Ship evergreen catalogues with drip scheduling, bundles, and gated previews.',
      price_cents: 9900,
      currency: 'USD',
      billing_interval: 'monthly',
      is_featured: false,
      badge: JSON.stringify({ label: 'Great for academies', tone: 'indigo' }),
      metadata: JSON.stringify({
        accent: {
          gradient: 'from-indigo-500/25 via-sky-500/30 to-violet-500/30',
          border: 'border-indigo-300/40',
          shadow: 'shadow-[0_38px_92px_-40px_rgba(99,102,241,0.65)]'
        }
      }),
      upsell: JSON.stringify({ descriptor: 'Bundle ebooks and audio courses for +$19', optional: true })
    });

    const [livePlanId] = await trx('marketing_plan_offers').insert({
      public_id: 'plan-live-donations',
      name: 'Live Sessions & Donations',
      headline: 'Live sessions & donations',
      tagline: 'Run hybrid broadcasts, accept donations, and automate replay libraries.',
      price_cents: 12900,
      currency: 'USD',
      billing_interval: 'monthly',
      is_featured: false,
      badge: JSON.stringify({ label: 'Launch ready', tone: 'rose' }),
      metadata: JSON.stringify({
        accent: {
          gradient: 'from-rose-500/25 via-orange-500/30 to-amber-500/30',
          border: 'border-rose-300/40',
          shadow: 'shadow-[0_44px_98px_-38px_rgba(244,114,182,0.6)]'
        }
      }),
      upsell: JSON.stringify({ descriptor: 'Enable SMS reminders for +$15', optional: true })
    });

    await trx('marketing_plan_features').insert([
      {
        plan_id: communityPlanId,
        position: 0,
        label: 'Unlimited private communities',
        metadata: JSON.stringify({ icon: '🤝' })
      },
      {
        plan_id: communityPlanId,
        position: 1,
        label: 'Tutor pods with shared agendas & analytics',
        metadata: JSON.stringify({})
      },
      {
        plan_id: communityPlanId,
        position: 2,
        label: 'Sponsor hub & ready-to-run campaigns',
        metadata: JSON.stringify({})
      },
      {
        plan_id: cataloguePlanId,
        position: 0,
        label: 'Unlimited courses & dynamic bundles',
        metadata: JSON.stringify({ icon: '📚' })
      },
      {
        plan_id: cataloguePlanId,
        position: 1,
        label: 'Drip scheduling with progress automations',
        metadata: JSON.stringify({})
      },
      {
        plan_id: cataloguePlanId,
        position: 2,
        label: 'SEO-optimised catalogue landing pages',
        metadata: JSON.stringify({})
      },
      {
        plan_id: livePlanId,
        position: 0,
        label: 'Live studio with backstage chat & run of show',
        metadata: JSON.stringify({ icon: '🎤' })
      },
      {
        plan_id: livePlanId,
        position: 1,
        label: 'Donations, tipping, and sponsor slots',
        metadata: JSON.stringify({})
      },
      {
        plan_id: livePlanId,
        position: 2,
        label: 'Auto-generate replay library & transcripts',
        metadata: JSON.stringify({})
      }
    ]);

    const inviteExpiry = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
    await trx('learner_onboarding_invites').insert([
      {
        invite_code: 'FLOW5-OPS-GUILD',
        email: 'flow5-preview@edulure.test',
        community_id: opsCommunityId,
        status: 'pending',
        expires_at: inviteExpiry,
        metadata: JSON.stringify({ source: 'flow-five', cohort: 'ops-guild' })
      },
      {
        invite_code: 'FLOW5-GROWTH-LAB',
        email: 'flow5-preview@edulure.test',
        community_id: growthCommunityId,
        status: 'pending',
        expires_at: inviteExpiry,
        metadata: JSON.stringify({ source: 'flow-five', cohort: 'growth-lab' })
      }
    ]);

    await trx('learner_onboarding_responses').insert({
      email: 'flow5-preview@edulure.test',
      role: 'instructor',
      first_name: 'Jordan',
      last_name: 'Rivera',
      persona: 'Community architect',
      goals: JSON.stringify(['Launch Flow 5 beta', 'Automate sponsor onboarding']),
      invites: JSON.stringify([
        { code: 'FLOW5-OPS-GUILD', status: 'pending', communitySlug: 'learning-ops-guild' },
        { code: 'FLOW5-GROWTH-LAB', status: 'pending', communitySlug: 'creator-growth-lab' }
      ]),
      preferences: JSON.stringify({
        marketingOptIn: true,
        timeCommitment: '4h/week',
        interests: ['Community launches', 'Sponsor workflow']
      }),
      metadata: JSON.stringify({ source: 'flow-five', campaign: 'beta-seed' }),
      terms_accepted: 1,
      user_id: flowPreviewUserId,
      submitted_at: trx.fn.now(),
      created_at: trx.fn.now(),
      updated_at: trx.fn.now()
    });

    await trx('marketing_leads').insert({
      email: 'flow5-preview@edulure.test',
      full_name: 'Jordan Rivera',
      company: 'Flow 5 Collective',
      persona: 'Community architect',
      goal: 'Launch Flow 5 beta with sponsor pods',
      cta_source: 'home-inline',
      block_slug: 'flow-five-hero',
      status: 'new',
      metadata: JSON.stringify({
        invites: [
          { code: 'FLOW5-OPS-GUILD', community: { slug: 'learning-ops-guild' }, status: 'pending' },
          { code: 'FLOW5-GROWTH-LAB', community: { slug: 'creator-growth-lab' }, status: 'pending' }
        ],
        utmCampaign: 'flow-five-beta'
      }),
      created_at: trx.fn.now(),
      updated_at: trx.fn.now()
    });

    const opsAdminMemberMetadata = {
      title: 'Automation Guild Owner',
      roleLabel: 'Guild Owner',
      location: 'Austin, US',
      contactEmail: 'amina.diallo@edulure.test',
      tags: ['Automation', 'Playbooks', 'Escalations'],
      recommended: true,
      lastActiveAt: nowIso,
      avatarUrl: adminAvatar.url
    };
    const opsLearnerMemberMetadata = {
      title: 'Incident Analyst',
      roleLabel: 'Operator',
      location: 'Lisbon, PT',
      contactEmail: 'noemi.carvalho@edulure.test',
      tags: ['QA', 'Telemetry'],
      recommended: true,
      lastActiveAt: nowIso,
      avatarUrl: learnerAvatar.url
    };
    const growthModeratorMetadata = {
      title: 'Campaign Architect',
      roleLabel: 'Moderator',
      location: 'Tokyo, JP',
      contactEmail: 'kai.watanabe@edulure.test',
      tags: ['Attribution', 'Paid media'],
      recommended: true,
      lastActiveAt: nowIso,
      avatarUrl: instructorAvatar.url
    };
    const growthMemberMetadata = {
      title: 'Acquisition Strategist',
      roleLabel: 'Analyst',
      location: 'London, UK',
      contactEmail: 'noemi.carvalho@edulure.test',
      tags: ['Benchmarks', 'Affiliates'],
      recommended: false,
      lastActiveAt: nowIso,
      avatarUrl: learnerAvatar.url
    };

    await trx('community_members').insert([
      {
        community_id: opsCommunityId,
        user_id: adminId,
        role: 'admin',
        status: 'active',
        metadata: JSON.stringify(opsAdminMemberMetadata)
      },
      {
        community_id: opsCommunityId,
        user_id: learnerId,
        role: 'member',
        status: 'active',
        metadata: JSON.stringify(opsLearnerMemberMetadata)
      },
      {
        community_id: growthCommunityId,
        user_id: instructorId,
        role: 'moderator',
        status: 'active',
        metadata: JSON.stringify(growthModeratorMetadata)
      },
      {
        community_id: growthCommunityId,
        user_id: learnerId,
        role: 'member',
        status: 'pending',
        metadata: JSON.stringify(growthMemberMetadata)
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

    const [opsSecurityHoldMessageId] = await trx('community_messages').insert({
      community_id: opsCommunityId,
      channel_id: opsGeneralChannelId,
      author_id: instructorId,
      message_type: 'text',
      body: 'Security follow-up: rotate S3 credentials for the ingestion worker nodes.',
      attachments: JSON.stringify([]),
      metadata: JSON.stringify({ tags: ['security'], flagged: true }),
      status: 'hidden',
      thread_root_id: opsStandupMessageId,
      reply_to_message_id: opsStandupMessageId,
      delivered_at: trx.fn.now()
    });

    await trx('community_message_moderation_actions').insert({
      message_id: opsSecurityHoldMessageId,
      actor_id: adminId,
      action_type: 'hide',
      reason: 'Pending security approval before broadcast',
      metadata: JSON.stringify({ reviewer: 'ops-admin', severity: 'medium' })
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
      cluster_key: 'operations',
      metadata: JSON.stringify({
        communityId: opsCommunityId,
        deckVersion: 1,
        ingestionPipeline: 'cloudconvert-v2',
        custom: {
          title: 'Ops launch blueprint',
          description:
            'Board-ready blueprint for coordinating automations, risk reviews, and sign-offs across every launch milestone.',
          categories: ['Operations', 'Enablement'],
          tags: ['ops', 'launch', 'readiness'],
          media: {
            coverImage: {
              url: 'https://cdn.edulure.test/assets/ops-blueprint/cover.jpg',
              alt: 'Operations launch blueprint cover art'
            },
            gallery: [
              {
                url: 'https://cdn.edulure.test/assets/ops-blueprint/workflow.jpg',
                caption: 'Automation workflow map aligning GTM and ops teams.',
                kind: 'image'
              },
              {
                url: 'https://cdn.edulure.test/assets/ops-blueprint/checklists.jpg',
                caption: 'Checklists templated for annex sign-off rituals.',
                kind: 'image'
              },
              {
                url: 'https://cdn.edulure.test/assets/ops-blueprint/demo.mp4',
                caption: 'Incident rehearsal walkthrough highlighting approvals.',
                kind: 'video'
              }
            ]
          },
          showcase: {
            headline: 'Operational readiness in one shared workspace',
            subheadline: 'Coordinate runbooks, telemetry, and approvals across every go-live stage.',
            videoUrl: 'https://cdn.edulure.test/assets/ops-blueprint/showcase.mp4',
            videoPosterUrl: 'https://cdn.edulure.test/assets/ops-blueprint/showcase-poster.jpg',
            callToAction: {
              label: 'Preview runbook',
              url: 'https://marketing.edulure.test/ops-blueprint'
            },
            badge: 'Operations'
          },
          featureFlags: { showcasePinned: true }
        }
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
      cluster_key: 'growth',
      metadata: JSON.stringify({
        communityId: growthCommunityId,
        drmProfile: 'watermark-v1',
        ingestionPipeline: 'ebook-normaliser',
        custom: {
          title: 'Creator funnel intelligence playbook',
          description:
            'Campaign labs, benchmarks, and automation guardrails for growth teams shipping Annex A8 experiments.',
          categories: ['Growth', 'Marketing'],
          tags: ['ads', 'experiments', 'analytics'],
          media: {
            coverImage: {
              url: 'https://cdn.edulure.test/assets/growth-playbook/cover.jpg',
              alt: 'Creator funnel intelligence ebook cover art'
            },
            gallery: [
              {
                url: 'https://cdn.edulure.test/assets/growth-playbook/dashboard.jpg',
                caption: 'Acquisition telemetry dashboard from Annex A8 experiments.',
                kind: 'image'
              },
              {
                url: 'https://cdn.edulure.test/assets/growth-playbook/retention.jpg',
                caption: 'Retention cohort breakdown with CTA experiments.',
                kind: 'image'
              },
              {
                url: 'https://cdn.edulure.test/assets/growth-playbook/trailer.mp4',
                caption: 'Two-minute walkthrough of paid acquisition lab templates.',
                kind: 'video'
              }
            ]
          },
          showcase: {
            headline: 'Campaign intelligence that moves beyond CPM',
            subheadline: 'Instrument experiments, copy variants, and affiliate offers with Annex A8 guardrails.',
            videoUrl: 'https://cdn.edulure.test/assets/growth-playbook/showcase.mp4',
            videoPosterUrl: 'https://cdn.edulure.test/assets/growth-playbook/showcase-poster.jpg',
            callToAction: {
              label: 'Read sample chapter',
              url: 'https://marketing.edulure.test/creator-funnel-playbook'
            },
            badge: 'Growth'
          },
          featureFlags: { showcasePinned: false }
        }
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

    const integrationSeedNow = new Date('2025-02-18T10:15:00Z');

    const hubspotKey = {
      provider: 'hubspot',
      environment: 'production',
      alias: 'revops-prod',
      ownerEmail: 'revops@edulure.com',
      keyValue: 'hs_prod_key_37e9b64c0d12a5f8b6c4d2e1',
      rotationIntervalDays: 90,
      expiresAt: new Date('2025-12-31T23:59:59Z'),
      createdBy: 'system:seed',
      notes: 'CRM sync pipelines for revenue operations.'
    };

    const encryptedHubspot = DataEncryptionService.encryptStructured(
      { secret: hubspotKey.keyValue },
      {
        classificationTag: 'integration-secret',
        fingerprintValues: [
          hubspotKey.provider,
          hubspotKey.environment,
          hubspotKey.alias,
          hubspotKey.keyValue.slice(-8)
        ]
      }
    );

    const [hubspotKeyId] = await trx('integration_api_keys').insert({
      provider: hubspotKey.provider,
      environment: hubspotKey.environment,
      alias: hubspotKey.alias,
      owner_email: hubspotKey.ownerEmail,
      last_four: hubspotKey.keyValue.slice(-4),
      key_hash: DataEncryptionService.hash(hubspotKey.keyValue),
      encrypted_key: encryptedHubspot.ciphertext,
      encryption_key_id: encryptedHubspot.keyId,
      classification_tag: encryptedHubspot.classificationTag,
      rotation_interval_days: hubspotKey.rotationIntervalDays,
      last_rotated_at: integrationSeedNow,
      next_rotation_at: new Date(
        integrationSeedNow.getTime() + hubspotKey.rotationIntervalDays * 24 * 60 * 60 * 1000
      ),
      expires_at: hubspotKey.expiresAt,
      status: 'active',
      metadata: JSON.stringify({
        rotationHistory: [
          {
            rotatedAt: integrationSeedNow.toISOString(),
            rotatedBy: hubspotKey.createdBy,
            reason: 'initial-provision'
          }
        ],
        lastRotatedBy: hubspotKey.createdBy,
        notes: hubspotKey.notes,
        lastHealthCheckAt: integrationSeedNow.toISOString()
      }),
      created_by: hubspotKey.createdBy,
      updated_by: hubspotKey.createdBy,
      created_at: integrationSeedNow,
      updated_at: integrationSeedNow
    });

    const openAiKey = {
      provider: 'openai',
      environment: 'staging',
      alias: 'labs-staging',
      ownerEmail: 'labs@edulure.com',
      keyValue: 'openai_staging_key_04af92e3b65d7c18f0a2c4b6',
      rotationIntervalDays: 60,
      expiresAt: new Date('2025-11-01T00:00:00Z'),
      createdBy: 'system:seed',
      notes: 'Used for experimental content generation sandbox.'
    };

    const encryptedOpenAi = DataEncryptionService.encryptStructured(
      { secret: openAiKey.keyValue },
      {
        classificationTag: 'integration-secret',
        fingerprintValues: [
          openAiKey.provider,
          openAiKey.environment,
          openAiKey.alias,
          openAiKey.keyValue.slice(-8)
        ]
      }
    );

    const [openAiKeyId] = await trx('integration_api_keys').insert({
      provider: openAiKey.provider,
      environment: openAiKey.environment,
      alias: openAiKey.alias,
      owner_email: openAiKey.ownerEmail,
      last_four: openAiKey.keyValue.slice(-4),
      key_hash: DataEncryptionService.hash(openAiKey.keyValue),
      encrypted_key: encryptedOpenAi.ciphertext,
      encryption_key_id: encryptedOpenAi.keyId,
      classification_tag: encryptedOpenAi.classificationTag,
      rotation_interval_days: openAiKey.rotationIntervalDays,
      last_rotated_at: integrationSeedNow,
      next_rotation_at: new Date(
        integrationSeedNow.getTime() + openAiKey.rotationIntervalDays * 24 * 60 * 60 * 1000
      ),
      expires_at: openAiKey.expiresAt,
      status: 'active',
      metadata: JSON.stringify({
        rotationHistory: [
          {
            rotatedAt: integrationSeedNow.toISOString(),
            rotatedBy: openAiKey.createdBy,
            reason: 'initial-provision'
          }
        ],
        lastRotatedBy: openAiKey.createdBy,
        notes: openAiKey.notes,
        webhookStatus: 'pending-validation'
      }),
      created_by: openAiKey.createdBy,
      updated_by: openAiKey.createdBy,
      created_at: integrationSeedNow,
      updated_at: integrationSeedNow
    });

    const hubspotInviteToken = 'HUB-REVOPS-2025-ONBOARD';
    await trx('integration_api_key_invites').insert({
      id: crypto.randomUUID(),
      provider: 'hubspot',
      environment: 'production',
      alias: hubspotKey.alias,
      api_key_id: hubspotKeyId,
      owner_email: hubspotKey.ownerEmail,
      requested_by: 'admin@edulure.com',
      requested_at: new Date('2025-02-17T08:30:00Z'),
      expires_at: new Date('2025-02-20T08:30:00Z'),
      status: 'completed',
      token_hash: makeHash(hubspotInviteToken),
      rotation_interval_days: hubspotKey.rotationIntervalDays,
      key_expires_at: hubspotKey.expiresAt,
      completed_at: new Date('2025-02-17T09:05:00Z'),
      completed_by: 'partner.techlead@example.com',
      last_sent_at: new Date('2025-02-17T08:35:00Z'),
      send_count: 1,
      documentation_url: 'https://docs.edulure.com/integrations/hubspot/production-handbook',
      metadata: JSON.stringify({
        notes: 'Seed fulfilment for CRM onboarding',
        reason: 'initial-handoff',
        fulfilledBy: 'partner.techlead@example.com'
      })
    });

    const openAiInviteToken = 'OPENAI-LABS-2025-Q2';
    await trx('integration_api_key_invites').insert({
      id: crypto.randomUUID(),
      provider: 'openai',
      environment: 'staging',
      alias: openAiKey.alias,
      api_key_id: openAiKeyId,
      owner_email: openAiKey.ownerEmail,
      requested_by: 'integrations@edulure.com',
      requested_at: new Date('2025-02-18T07:15:00Z'),
      expires_at: new Date('2025-03-04T07:15:00Z'),
      status: 'pending',
      token_hash: makeHash(openAiInviteToken),
      rotation_interval_days: openAiKey.rotationIntervalDays,
      key_expires_at: openAiKey.expiresAt,
      last_sent_at: new Date('2025-02-18T07:20:00Z'),
      send_count: 1,
      documentation_url: 'https://docs.edulure.com/integrations/openai/staging-credential-handoff',
      metadata: JSON.stringify({
        notes: 'Awaiting partner confirmation',
        reason: 'staging-refresh',
        reminderPolicy: { cadenceDays: [3, 7], escalateAfterDays: 10 }
      })
    });

    const anthropicInviteToken = 'ANTHROPIC-PROTOTYPE-ROTATE';
    await trx('integration_api_key_invites').insert({
      id: crypto.randomUUID(),
      provider: 'anthropic',
      environment: 'production',
      alias: 'claude-live',
      api_key_id: null,
      owner_email: 'mlops@edulure.com',
      requested_by: 'integrations@edulure.com',
      requested_at: new Date('2025-01-12T11:00:00Z'),
      expires_at: new Date('2025-01-22T11:00:00Z'),
      status: 'cancelled',
      token_hash: makeHash(anthropicInviteToken),
      rotation_interval_days: 45,
      key_expires_at: null,
      cancelled_at: new Date('2025-01-15T09:45:00Z'),
      cancelled_by: 'system:auto-close',
      last_sent_at: new Date('2025-01-13T11:15:00Z'),
      send_count: 2,
      documentation_url: 'https://docs.edulure.com/integrations/anthropic/credential-rotation',
      metadata: JSON.stringify({
        autoClosed: true,
        autoClosedReason: 'key-rotated',
        autoClosedAt: '2025-01-15T09:45:00Z',
        autoClosedBy: 'system:auto-close',
        notes: 'Invite closed automatically after manual rotation.'
      })
    });

    await trx('environment_parity_snapshots').insert([
      {
        environment_name: 'production',
        environment_provider: 'aws',
        environment_tier: 'prod',
        release_channel: 'stable',
        git_sha: '3f2c9ab7',
        manifest_version: '2025.02.18',
        manifest_hash: makeHash('prod-manifest-2025-02-18'),
        status: 'healthy',
        mismatches_count: 0,
        mismatches: JSON.stringify([]),
        dependencies: JSON.stringify([
          { component: 'database', status: 'healthy' },
          { component: 'redis', status: 'healthy' }
        ]),
        metadata: JSON.stringify({ runtimeHost: 'seed-prod-1', runtimeRegion: 'us-east-1' }),
        generated_at: new Date('2025-02-18T09:00:00Z'),
        created_at: new Date('2025-02-18T09:00:00Z'),
        updated_at: new Date('2025-02-18T09:00:00Z')
      },
      {
        environment_name: 'staging',
        environment_provider: 'aws',
        environment_tier: 'staging',
        release_channel: 'candidate',
        git_sha: '7ad12f4c',
        manifest_version: '2025.02.15',
        manifest_hash: makeHash('staging-manifest-2025-02-17'),
        status: 'drifted',
        mismatches_count: 2,
        mismatches: JSON.stringify([
          {
            component: 'modules.integration-orchestrator',
            status: 'drifted',
            expected: { hash: '8f4b32a6', path: 'infrastructure/modules/integration-orchestrator' },
            observed: { hash: '9c1d0b77', path: 'infrastructure/modules/integration-orchestrator' }
          },
          {
            component: 'scripts.bootstrap',
            status: 'missing',
            expected: { path: 'scripts/bootstrap.sh' },
            observed: null
          }
        ]),
        dependencies: JSON.stringify([
          { component: 'database', status: 'healthy' },
          { component: 'redis', status: 'failed', message: 'AUTH failure' }
        ]),
        metadata: JSON.stringify({ runtimeHost: 'seed-staging-1', runtimeRegion: 'eu-west-1' }),
        generated_at: new Date('2025-02-17T16:45:00Z'),
        created_at: new Date('2025-02-17T16:45:00Z'),
        updated_at: new Date('2025-02-17T16:45:00Z')
      }
    ]);

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
      sample_download_url: 'https://cdn.edulure.test/ebooks/creator-funnel-sample.pdf',
      audiobook_url: 'https://cdn.edulure.test/ebooks/creator-funnel-audiobook.mp3',
      metadata: JSON.stringify({
        cohort: 'beta-ops',
        featureFlag: 'explorer-ads-insights',
        custom: {
          analytics: {
            funnelId: 'annex-a8-funnel',
            campaignKey: 'creator-lab-2025'
          },
          preview: {
            chapters: ['diagnostic-dashboards', 'forecasting-campaign-velocity'],
            releaseNotesUrl: 'https://marketing.edulure.test/creator-funnel-release'
          }
        }
      })
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

    const [productInsightsCategoryId] = await trx('blog_categories').insert({
      slug: 'product-insights',
      name: 'Product & Platform',
      description: 'Release retros, adoption metrics, and platform momentum.',
      display_order: 1,
      is_featured: true
    });

    const [growthCategoryId] = await trx('blog_categories').insert({
      slug: 'growth-experiments',
      name: 'Growth Experiments',
      description: 'Ads, funnels, and GTM learnings that inform Annex A8 plans.',
      display_order: 2,
      is_featured: true
    });

    const [governanceCategoryId] = await trx('blog_categories').insert({
      slug: 'governance-transparency',
      name: 'Governance & Transparency',
      description: 'Legal, compliance, and company updates supporting Annex C7.',
      display_order: 3,
      is_featured: false
    });

    const [operationsTagId] = await trx('blog_tags').insert({
      slug: 'operations',
      name: 'Operations'
    });
    const [adsTagId] = await trx('blog_tags').insert({ slug: 'ads', name: 'Ads & Acquisition' });
    const [complianceTagId] = await trx('blog_tags').insert({ slug: 'compliance', name: 'Compliance' });
    const [communityTagId] = await trx('blog_tags').insert({ slug: 'community', name: 'Community' });

    const [opsTrustPostId] = await trx('blog_posts').insert({
      slug: 'ops-trust-blueprint-feb-2025',
      title: 'Ops trust blueprint: shipping Annex C7 readiness in 30 days',
      excerpt:
        'How Blackwellen’s enablement and operations guild automated Annex C7 controls, evidence capture, and executive reporting.',
      content: [
        '# Ops trust blueprint',
        '',
        '## Highlights',
        '- Automated policy audits feed Annex C7 trackers and trust centre evidence.',
        '- Slack runbooks keep breach notifications, DPIAs, and risk reviews inside SLA.',
        '- Combined telemetry exposes review gaps in under an hour with audit-ready exports.'
      ].join('\\n'),
      author_id: adminId,
      category_id: productInsightsCategoryId,
      status: 'published',
      published_at: trx.fn.now(),
      metadata: JSON.stringify({
        hero: {
          image: 'https://cdn.edulure.test/blog/ops-trust-hero.jpg',
          alt: 'Operators reviewing compliance dashboards'
        },
        seo: {
          canonical: 'https://www.edulure.com/blog/ops-trust-blueprint-feb-2025',
          focusKeywords: ['Annex C7', 'trust centre']
        },
        summary: 'Detailed breakdown of the Annex C7 rollout with evidence capture tooling.'
      }),
      is_featured: true,
      reading_time_minutes: 8,
      view_count: 1280
    });

    const [growthLiftPostId] = await trx('blog_posts').insert({
      slug: 'annex-a8-campaign-lift',
      title: 'Annex A8 experiments that lifted paid acquisition 23%',
      excerpt:
        'A deep dive into creative rotations, CTA governance, and affiliate boosts that moved Annex A8 campaign metrics.',
      content: [
        '# Annex A8 campaign lift',
        '',
        '1. Hypothesis-driven ad rotations synced with CTA guardrails.',
        '2. Persona landing pages mirrored metadata from the marketing asset editor.',
        '3. Affiliate offers embedded compliance copy and dynamic caps to protect spend.'
      ].join('\\n'),
      author_id: instructorId,
      category_id: growthCategoryId,
      status: 'published',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        hero: {
          image: 'https://cdn.edulure.test/blog/annex-a8-campaigns.jpg',
          alt: 'Marketing team reviewing campaign performance charts'
        },
        seo: {
          canonical: 'https://www.edulure.com/blog/annex-a8-campaign-lift',
          focusKeywords: ['Annex A8', 'campaign analytics']
        },
        summary: 'Practical guardrails for growth squads balancing experimentation with Annex A8 compliance.'
      }),
      is_featured: true,
      reading_time_minutes: 6,
      view_count: 986
    });

    const [transparencyRoadmapPostId] = await trx('blog_posts').insert({
      slug: 'legal-transparency-roadmap-q2',
      title: 'Legal transparency roadmap: Q2 filings, audits, and hiring',
      excerpt:
        'Company, careers, and legal updates covering regulator engagement, transparency docs, and upcoming compliance hires.',
      content: [
        '# Legal transparency roadmap',
        '',
        '- Quarterly filings prepared for ICO and Companies House.',
        '- Privacy centre adds printable audit packs for enterprise councils.',
        '- New governance counsel and trust engineer roles opening in London and remote.'
      ].join('\\n'),
      author_id: adminId,
      category_id: governanceCategoryId,
      status: 'published',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({
        hero: {
          image: 'https://cdn.edulure.test/blog/legal-transparency.jpg',
          alt: 'Legal and compliance team reviewing transparency dashboards'
        },
        seo: {
          canonical: 'https://www.edulure.com/blog/legal-transparency-roadmap-q2',
          focusKeywords: ['Annex C7', 'legal transparency']
        },
        summary: 'Transparency updates spanning governance reports, talent plans, and policy evidence packs.'
      }),
      is_featured: false,
      reading_time_minutes: 7,
      view_count: 742
    });

    await trx('blog_post_tags').insert([
      { post_id: opsTrustPostId, tag_id: operationsTagId },
      { post_id: opsTrustPostId, tag_id: complianceTagId },
      { post_id: growthLiftPostId, tag_id: adsTagId },
      { post_id: growthLiftPostId, tag_id: operationsTagId },
      { post_id: transparencyRoadmapPostId, tag_id: complianceTagId },
      { post_id: transparencyRoadmapPostId, tag_id: communityTagId }
    ]);

    await trx('blog_media').insert([
      {
        post_id: opsTrustPostId,
        media_url: 'https://cdn.edulure.test/blog/ops-trust-hero.jpg',
        alt_text: 'Operations and compliance leads collaborating at a dashboard wall',
        media_type: 'image',
        display_order: 0,
        metadata: JSON.stringify({ variant: 'hero', width: 1600, height: 900 })
      },
      {
        post_id: growthLiftPostId,
        media_url: 'https://cdn.edulure.test/blog/annex-a8-campaigns.jpg',
        alt_text: 'Paid acquisition metrics showing conversion lift',
        media_type: 'image',
        display_order: 0,
        metadata: JSON.stringify({ variant: 'hero', width: 1600, height: 900 })
      },
      {
        post_id: transparencyRoadmapPostId,
        media_url: 'https://cdn.edulure.test/blog/legal-transparency.jpg',
        alt_text: 'Legal team reviewing quarterly transparency checklist',
        media_type: 'image',
        display_order: 0,
        metadata: JSON.stringify({ variant: 'hero', width: 1600, height: 900 })
      }
    ]);

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
        reaction_summary: JSON.stringify({ applause: 2, insights: 1, total: 3 }),
        metadata: JSON.stringify({ relatedResource: 'ops-blueprint-v1', analyticsKey: 'ops-hq-roadmap-drop' }),
        media_asset_id: opsPlaybookAssetId,
        preview_metadata: JSON.stringify({
          thumbnailUrl: 'https://cdn.edulure.test/assets/ops-roadmap-preview.jpg',
          width: 1280,
          height: 720,
          aspectRatio: '16:9',
          dominantColor: '#4338CA'
        }),
        pinned_at: trx.fn.now()
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
        reaction_summary: JSON.stringify({ insights: 2, celebrate: 1, total: 3 }),
        metadata: JSON.stringify({
          classroomReference: 'LC-AMA-001',
          registrationUrl: 'https://events.edulure.test/ama-multi-channel-funnels'
        }),
        media_asset_id: growthPlaybookEbookAssetId,
        preview_metadata: JSON.stringify({
          thumbnailUrl: 'https://cdn.edulure.test/assets/growth-lab-ama.jpg',
          width: 1200,
          height: 675,
          aspectRatio: '16:9',
          dominantColor: '#0EA5E9'
        })
      });

    await trx('community_post_reactions').insert([
      {
        post_id: opsRoadmapPostId,
        user_id: learnerId,
        reaction: 'applause',
        metadata: JSON.stringify({ source: 'seed:ops-roadmap' }),
        reacted_at: trx.fn.now(),
        updated_at: trx.fn.now()
      },
      {
        post_id: opsRoadmapPostId,
        user_id: instructorId,
        reaction: 'applause',
        metadata: JSON.stringify({ source: 'seed:ops-roadmap' }),
        reacted_at: trx.fn.now(),
        updated_at: trx.fn.now()
      },
      {
        post_id: opsRoadmapPostId,
        user_id: adminId,
        reaction: 'insights',
        metadata: JSON.stringify({ source: 'seed:ops-roadmap' }),
        reacted_at: trx.fn.now(),
        updated_at: trx.fn.now()
      },
      {
        post_id: growthCampaignPostId,
        user_id: learnerId,
        reaction: 'insights',
        metadata: JSON.stringify({ source: 'seed:growth-lab' }),
        reacted_at: trx.fn.now(),
        updated_at: trx.fn.now()
      },
      {
        post_id: growthCampaignPostId,
        user_id: adminId,
        reaction: 'celebrate',
        metadata: JSON.stringify({ source: 'seed:growth-lab' }),
        reacted_at: trx.fn.now(),
        updated_at: trx.fn.now()
      },
      {
        post_id: growthCampaignPostId,
        user_id: instructorId,
        reaction: 'insights',
        metadata: JSON.stringify({ source: 'seed:growth-lab' }),
        reacted_at: trx.fn.now(),
        updated_at: trx.fn.now()
      }
    ]);

    const moderationTimeline = new Date();
    const minutesAgo = (minutes) => new Date(moderationTimeline.getTime() - minutes * 60000).toISOString();
    const minutesFromNow = (minutes) => new Date(moderationTimeline.getTime() + minutes * 60000).toISOString();

    const opsCaseMetadata = {
      summary: 'Review automation roadmap update for release guardrails before broad publish.',
      flags: [
        {
          actorId: learnerId,
          reason: 'Missing disclosure around automation safety net.',
          riskScore: 58,
          flaggedAt: minutesAgo(95),
          tags: ['policy:safety', 'automation']
        }
      ],
      riskHistory: [
        { riskScore: 32, recordedAt: minutesAgo(240), source: 'automated_detection' },
        { riskScore: 58, recordedAt: minutesAgo(95), source: 'user_report' }
      ],
      notes: [
        {
          authorId: adminId,
          body: 'Ops pod gathering context from last automation retro.',
          createdAt: minutesAgo(60)
        }
      ]
    };

    const [opsModerationCaseId] = await trx('community_post_moderation_cases').insert({
      community_id: opsCommunityId,
      post_id: opsRoadmapPostId,
      reporter_id: learnerId,
      assigned_to: adminId,
      status: 'in_review',
      severity: 'medium',
      flagged_source: 'user_report',
      reason: 'Member asked for disclosure on automation guardrail changes before rollout.',
      risk_score: 58,
      metadata: JSON.stringify(opsCaseMetadata)
    });

    await trx('community_posts')
      .where({ id: opsRoadmapPostId })
      .update({
        moderation_state: 'under_review',
        moderation_metadata: JSON.stringify({
          lastCaseId: opsModerationCaseId,
          riskScore: 58,
          flags: opsCaseMetadata.flags,
          summary: opsCaseMetadata.summary
        }),
        last_moderated_at: trx.fn.now()
      });

    const [opsFlagActionId] = await trx('community_post_moderation_actions').insert({
      case_id: opsModerationCaseId,
      actor_id: learnerId,
      action: 'flagged',
      notes: 'Raised by automation beta participant requesting disclosure update.',
      metadata: JSON.stringify({
        evidence: [
          {
            type: 'screenshot',
            value: 'https://cdn.edulure.test/moderation/ops-roadmap-flag.png'
          }
        ],
        riskScore: 58,
        flaggedSource: 'user_report'
      })
    });

    const [opsAssignActionId] = await trx('community_post_moderation_actions').insert({
      case_id: opsModerationCaseId,
      actor_id: adminId,
      action: 'assigned',
      notes: 'Assigning to trust & safety lead to confirm messaging.',
      metadata: JSON.stringify({ assignedTo: adminId, previousActionId: opsFlagActionId })
    });

    await trx('moderation_follow_ups').insert({
      case_id: opsModerationCaseId,
      action_id: opsAssignActionId,
      assigned_to: adminId,
      status: 'pending',
      due_at: minutesFromNow(90),
      metadata: JSON.stringify({
        reason: 'Confirm automation guardrail disclosure note was added to the roadmap.',
        requestedBy: adminId,
        createdAt: minutesAgo(55)
      })
    });

    const growthCaseMetadata = {
      summary: 'Automated scan flagged AMA invite for aggressive ROI claim. Reviewing before reschedule.',
      flags: [
        {
          actorId: adminId,
          reason: 'ROI claim exceeds compliance threshold without citation.',
          riskScore: 72,
          flaggedAt: minutesAgo(180),
          tags: ['policy:ads', 'compliance']
        }
      ],
      riskHistory: [
        { riskScore: 48, recordedAt: minutesAgo(200), source: 'automated_detection' },
        { riskScore: 72, recordedAt: minutesAgo(150), source: 'manual_review' }
      ],
      notes: [
        {
          authorId: instructorId,
          body: 'Updated script to remove aggressive ROI language, pending approval to restore.',
          createdAt: minutesAgo(40)
        }
      ]
    };

    const [growthModerationCaseId] = await trx('community_post_moderation_cases').insert({
      community_id: growthCommunityId,
      post_id: growthCampaignPostId,
      reporter_id: adminId,
      assigned_to: instructorId,
      status: 'suppressed',
      severity: 'high',
      flagged_source: 'automated_detection',
      reason: 'Automated policy scan flagged ROI language requiring compliance review.',
      risk_score: 72,
      metadata: JSON.stringify(growthCaseMetadata),
      escalated_at: minutesAgo(150),
      resolved_at: minutesAgo(30),
      resolved_by: adminId
    });

    await trx('community_posts')
      .where({ id: growthCampaignPostId })
      .update({
        moderation_state: 'suppressed',
        moderation_metadata: JSON.stringify({
          lastCaseId: growthModerationCaseId,
          riskScore: 72,
          flags: growthCaseMetadata.flags,
          summary: growthCaseMetadata.summary,
          suppressedAt: minutesAgo(30)
        }),
        last_moderated_at: trx.fn.now()
      });

    const [growthFlagActionId] = await trx('community_post_moderation_actions').insert({
      case_id: growthModerationCaseId,
      actor_id: adminId,
      action: 'flagged',
      notes: 'Compliance automation escalated ROI claim for review.',
      metadata: JSON.stringify({
        riskScore: 72,
        flaggedSource: 'automated_detection',
        policyTags: ['ads', 'claims'],
        aiSummary:
          'ROI claim exceeds allowed threshold without supporting data. Suggest editing copy before republishing.'
      })
    });

    const [growthSuppressActionId] = await trx('community_post_moderation_actions').insert({
      case_id: growthModerationCaseId,
      actor_id: adminId,
      action: 'suppressed',
      notes: 'Temporarily suppressing AMA announcement until copy is updated.',
      metadata: JSON.stringify({
        previousActionId: growthFlagActionId,
        suppressedUntil: minutesFromNow(180),
        restoreHint: 'Confirm updated copy removes ROI claim and cite customer examples.'
      })
    });

    await trx('community_post_moderation_actions').insert({
      case_id: growthModerationCaseId,
      actor_id: instructorId,
      action: 'comment',
      notes: 'Drafted revised announcement copy removing ROI language.',
      metadata: JSON.stringify({ relatedResource: 'doc://campaign-lab-ama-rewrite' })
    });

    await trx('moderation_follow_ups').insert({
      case_id: growthModerationCaseId,
      action_id: growthSuppressActionId,
      assigned_to: instructorId,
      status: 'completed',
      due_at: minutesAgo(25),
      completed_at: minutesAgo(10),
      metadata: JSON.stringify({
        reason: 'Provide updated AMA copy for approval before restoring.',
        requestedBy: adminId,
        completedBy: instructorId,
        notes: 'Updated script shared with compliance in the moderation thread.'
      })
    });

    await trx('moderation_analytics_events').insert([
      {
        community_id: opsCommunityId,
        entity_type: 'community_post',
        entity_id: String(opsRoadmapPostId),
        event_type: 'moderation.case.opened',
        risk_score: 58,
        metrics: JSON.stringify({ pendingFollowUps: 1, severity: 'medium' }),
        source: 'manual',
        occurred_at: minutesAgo(90)
      },
      {
        community_id: growthCommunityId,
        entity_type: 'community_post',
        entity_id: String(growthCampaignPostId),
        event_type: 'moderation.case.suppressed',
        risk_score: 72,
        metrics: JSON.stringify({ followUpsCompleted: 1, severity: 'high' }),
        source: 'automated',
        occurred_at: minutesAgo(30)
      }
    ]);

    await trx('scam_reports').insert({
      reporter_id: learnerId,
      entity_type: 'community',
      entity_id: String(growthCommunityId),
      community_id: growthCommunityId,
      status: 'investigating',
      risk_score: 62,
      reason: 'Members received suspicious affiliate invitations referencing the AMA.',
      description:
        'Two members reported unsolicited DMs linking to off-platform checkout pages claiming guaranteed ROI.',
      metadata: JSON.stringify({
        relatedCaseId: growthModerationCaseId,
        evidence: [
          {
            type: 'url',
            value: 'https://malicious.edulure.test/rogue-affiliate-campaign'
          }
        ],
        tags: ['affiliate', 'spam']
      }),
      handled_by: adminId
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

    await trx('community_resources').insert({
      community_id: opsCommunityId,
      created_by: instructorId,
      title: 'Incident rehearsal replay',
      description: 'Recording with annotated runbooks and escalation checkpoints from the latest simulation.',
      resource_type: 'classroom_session',
      link_url: 'https://cdn.edulure.test/replays/incident-rehearsal',
      tags: JSON.stringify(['Recording', 'Incident response']),
      visibility: 'members',
      status: 'published',
      published_at: trx.fn.now(),
      metadata: JSON.stringify({
        facilitator: 'Learning Ops Guild',
        durationMinutes: 62,
        recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        watchUrl: 'https://cdn.edulure.test/replays/incident-rehearsal',
        sponsored: false
      })
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
        metadata: JSON.stringify({
          track: 'operations',
          tags: ['automation', 'qa'],
          durationMinutes: 75,
          seatsRemaining: 32,
          registrationUrl: 'https://events.edulure.test/ops-incident-command/register',
          location: 'Virtual'
        })
      },
      {
        community_id: opsCommunityId,
        created_by: instructorId,
        topic: 'Automation war room retrospective',
        host: 'Amina Diallo',
        start_at: followUpOpsWebinarStartAt,
        status: 'scheduled',
        registrant_count: 64,
        watch_url: 'https://events.edulure.test/ops-automation-retro',
        description:
          'Post-launch retrospective covering automation wins, failure points, and roadmap items queued for the next sprint.',
        metadata: JSON.stringify({
          track: 'operations',
          requiresPrep: true,
          durationMinutes: 60,
          seatsRemaining: 40,
          registrationUrl: 'https://events.edulure.test/ops-automation-retro/register',
          location: 'Virtual'
        })
      }
    ]);

    await trx('community_member_points').insert([
      {
        community_id: opsCommunityId,
        user_id: adminId,
        points: 1280,
        lifetime_points: 5120,
        tier: 'platinum',
        last_awarded_at: trx.fn.now(),
        last_activity_at: trx.fn.now(),
        metadata: JSON.stringify({ grade: 'A', role: 'ops-strategist', currentStreakDays: 14 })
      },
      {
        community_id: opsCommunityId,
        user_id: learnerId,
        points: 860,
        lifetime_points: 1640,
        tier: 'gold',
        last_awarded_at: trx.fn.now(),
        last_activity_at: trx.fn.now(),
        metadata: JSON.stringify({ grade: 'B', role: 'operator', currentStreakDays: 9 })
      },
      {
        community_id: growthCommunityId,
        user_id: instructorId,
        points: 1420,
        lifetime_points: 4180,
        tier: 'platinum',
        last_awarded_at: trx.fn.now(),
        last_activity_at: trx.fn.now(),
        metadata: JSON.stringify({ grade: 'A', role: 'moderator', currentStreakDays: 11 })
      },
      {
        community_id: growthCommunityId,
        user_id: learnerId,
        points: 930,
        lifetime_points: 2150,
        tier: 'gold',
        last_awarded_at: trx.fn.now(),
        last_activity_at: trx.fn.now(),
        metadata: JSON.stringify({ grade: 'B', role: 'analyst', currentStreakDays: 6 })
      }
    ]);

    const opsCommunitySummitStart = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const opsCommunitySummitEnd = new Date(opsCommunitySummitStart.getTime() + 90 * 60 * 1000);
    const growthSummitStart = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const growthSummitEnd = new Date(growthSummitStart.getTime() + 60 * 60 * 1000);

    await trx('community_events').insert([
      {
        community_id: opsCommunityId,
        created_by: instructorId,
        title: 'Automation Summit Workshop',
        slug: 'automation-summit-workshop',
        summary: 'Hands-on launch rehearsal across escalation pods.',
        description:
          'Operators collaborate on automation guardrails, classroom failover drills, and telemetry dashboards in a guided workshop.',
        start_at: opsCommunitySummitStart,
        end_at: opsCommunitySummitEnd,
        timezone: 'UTC',
        visibility: 'members',
        status: 'scheduled',
        attendance_limit: 180,
        attendance_count: 64,
        waitlist_count: 8,
        requires_rsvp: true,
        is_online: true,
        meeting_url: 'https://events.edulure.test/ops-summit',
        metadata: JSON.stringify({ registrationUrl: 'https://events.edulure.test/ops-summit/register', track: 'automation' })
      },
      {
        community_id: growthCommunityId,
        created_by: adminId,
        title: 'Creator Monetisation Roundtable',
        slug: 'creator-monetisation-roundtable',
        summary: 'Invite-only strategy session for growth operators.',
        description:
          'Deep dive into cross-channel monetisation funnels, pricing experiments, and affiliate optimisation with the Growth Lab moderators.',
        start_at: growthSummitStart,
        end_at: growthSummitEnd,
        timezone: 'UTC',
        visibility: 'members',
        status: 'scheduled',
        attendance_limit: 120,
        attendance_count: 54,
        waitlist_count: 5,
        requires_rsvp: true,
        is_online: true,
        meeting_url: 'https://events.edulure.test/growth-roundtable',
        metadata: JSON.stringify({ registrationUrl: 'https://events.edulure.test/growth-roundtable/register', track: 'growth' })
      }
    ]);

    const [opsSummitEvent] = await trx('community_events')
      .select('id')
      .where({ slug: 'automation-summit-workshop' })
      .limit(1);
    const [growthRoundtableEvent] = await trx('community_events')
      .select('id')
      .where({ slug: 'creator-monetisation-roundtable' })
      .limit(1);

    const participantStatusGoing = COMMUNITY_EVENT_PARTICIPANT_STATUSES.includes('going')
      ? 'going'
      : COMMUNITY_EVENT_PARTICIPANT_STATUSES[0];
    const participantStatusInterested = COMMUNITY_EVENT_PARTICIPANT_STATUSES.includes('interested')
      ? 'interested'
      : COMMUNITY_EVENT_PARTICIPANT_STATUSES[0];

    if (opsSummitEvent?.id) {
      await trx('community_event_participants').insert([
        {
          event_id: opsSummitEvent.id,
          user_id: instructorId,
          status: participantStatusGoing,
          rsvp_at: new Date(),
          reminder_scheduled_at: new Date(opsCommunitySummitStart.getTime() - 60 * 60 * 1000),
          metadata: JSON.stringify({ cohort: 'ops-leads', notes: 'Facilitator' })
        },
        {
          event_id: opsSummitEvent.id,
          user_id: adminId,
          status: participantStatusInterested,
          rsvp_at: new Date(),
          metadata: JSON.stringify({ cohort: 'exec', notes: 'Observing automation drills' })
        }
      ]);
    }

    if (growthRoundtableEvent?.id) {
      await trx('community_event_participants').insert([
        {
          event_id: growthRoundtableEvent.id,
          user_id: adminId,
          status: participantStatusGoing,
          rsvp_at: new Date(),
          metadata: JSON.stringify({ cohort: 'growth', notes: 'Host' })
        },
        {
          event_id: growthRoundtableEvent.id,
          user_id: learnerId,
          status: participantStatusInterested,
          rsvp_at: new Date(),
          metadata: JSON.stringify({ cohort: 'creators', notes: 'Invitee' })
        }
      ]);
    }

    const reminderStatusPending = COMMUNITY_EVENT_REMINDER_STATUSES.includes('pending')
      ? 'pending'
      : COMMUNITY_EVENT_REMINDER_STATUSES[0];
    const reminderStatusSent = COMMUNITY_EVENT_REMINDER_STATUSES.includes('sent')
      ? 'sent'
      : COMMUNITY_EVENT_REMINDER_STATUSES[0];

    const smsChannel = COMMUNITY_EVENT_REMINDER_CHANNELS.includes('sms')
      ? 'sms'
      : COMMUNITY_EVENT_REMINDER_CHANNELS[0];
    const emailChannel = COMMUNITY_EVENT_REMINDER_CHANNELS.includes('email')
      ? 'email'
      : COMMUNITY_EVENT_REMINDER_CHANNELS[0];
    const pushChannel = COMMUNITY_EVENT_REMINDER_CHANNELS.includes('push')
      ? 'push'
      : COMMUNITY_EVENT_REMINDER_CHANNELS[0];

    if (opsSummitEvent?.id) {
      const opsEmailReminderAt = new Date(opsCommunitySummitStart.getTime() - 30 * 60 * 1000);
      const opsSmsReminderAt = new Date(opsCommunitySummitStart.getTime() - 45 * 60 * 1000);
      const opsPushReminderAt = new Date(opsCommunitySummitStart.getTime() - 50 * 60 * 1000);
      await trx('community_event_reminders').insert([
        {
          event_id: opsSummitEvent.id,
          user_id: instructorId,
          status: reminderStatusPending,
          channel: emailChannel,
          remind_at: opsEmailReminderAt,
          metadata: JSON.stringify({ message: 'Automation Summit starts soon. Bring the incident workbook.' })
        },
        {
          event_id: opsSummitEvent.id,
          user_id: adminId,
          status: reminderStatusPending,
          channel: smsChannel,
          remind_at: opsSmsReminderAt,
          metadata: JSON.stringify({
            phoneNumber: '+15550001111',
            manageUrl: 'https://events.edulure.test/ops-summit/manage'
          })
        },
        {
          event_id: opsSummitEvent.id,
          user_id: adminId,
          status: reminderStatusPending,
          channel: pushChannel,
          remind_at: opsPushReminderAt,
          metadata: JSON.stringify({
            title: 'Summit kickoff reminder',
            persona: 'ops-leads',
            templateId: 'community-event-reminder'
          })
        }
      ]);
    }

    if (growthRoundtableEvent?.id) {
      const adminSentReminderAt = new Date(growthSummitStart.getTime() - 24 * 60 * 60 * 1000);
      await trx('community_event_reminders').insert([
        {
          event_id: growthRoundtableEvent.id,
          user_id: learnerId,
          status: reminderStatusPending,
          channel: emailChannel,
          remind_at: new Date(growthSummitStart.getTime() - 2 * 60 * 60 * 1000),
          metadata: JSON.stringify({
            message: 'Roundtable reminder: review the pricing experiments deck beforehand.'
          })
        },
        {
          event_id: growthRoundtableEvent.id,
          user_id: adminId,
          status: reminderStatusSent,
          channel: emailChannel,
          remind_at: adminSentReminderAt,
          sent_at: adminSentReminderAt,
          last_attempt_at: adminSentReminderAt,
          attempt_count: 1,
          metadata: JSON.stringify({ message: 'Roundtable reminder sent 24h ahead.' })
        }
      ]);
    }

    const seededReminderRows = await trx('community_event_reminders')
      .select(
        'id',
        'event_id as eventId',
        'user_id as userId',
        'channel',
        'remind_at as remindAt',
        'status',
        'metadata',
        'sent_at as sentAt'
      )
      .orderBy('id', 'asc');

    const notificationQueueInserts = [];
    const jobStateInserts = [];
    const nowIso = new Date().toISOString();

    for (const row of seededReminderRows) {
      let reminderMetadata = {};
      if (row.metadata) {
        try {
          if (typeof row.metadata === 'string') {
            reminderMetadata = JSON.parse(row.metadata);
          } else if (typeof row.metadata === 'object') {
            reminderMetadata = row.metadata;
          }
        } catch (_error) {
          reminderMetadata = {};
        }
      }

      if (row.status === reminderStatusSent) {
        const personaLabel = reminderMetadata.persona ?? reminderMetadata.audienceLabel ?? 'member';
        jobStateInserts.push({
          job_key: 'community_reminder',
          state_key: `reminder:${row.id}`,
          version: row.remindAt ? new Date(row.remindAt).toISOString() : nowIso,
          state_value: JSON.stringify({
            status: 'sent',
            channel: row.channel,
            persona: personaLabel,
            sentAt: row.sentAt ? new Date(row.sentAt).toISOString() : nowIso,
            delivery: { provider: 'seed', channel: row.channel }
          }),
          metadata: JSON.stringify({ seeded: true, source: '001_bootstrap' })
        });
      }

      if (row.channel === pushChannel || row.channel === 'in_app') {
        const personaLabel = reminderMetadata.persona ?? reminderMetadata.audienceLabel ?? 'member';
        const remindIso = row.remindAt ? new Date(row.remindAt).toISOString() : nowIso;
        notificationQueueInserts.push({
          user_id: row.userId,
          channel: row.channel,
          status: 'pending',
          dedupe_key: `community:${row.eventId}:user:${row.userId}:remind:${remindIso}:${row.channel}`,
          template_id: reminderMetadata.templateId ?? 'community-event-reminder',
          title: reminderMetadata.title ?? 'Community event reminder',
          body:
            reminderMetadata.message ??
            reminderMetadata.body ??
            `Reminder seeded for ${personaLabel}.`,
          payload: JSON.stringify({
            eventId: row.eventId,
            remindAt: remindIso,
            persona: personaLabel
          }),
          metadata: JSON.stringify({
            seeded: true,
            channel: row.channel,
            runId: 'seed-bootstrap'
          }),
          scheduled_at: new Date(),
          available_at: new Date()
        });
      }
    }

    if (seededReminderRows.length > 0) {
      const succeededCount = seededReminderRows.filter((row) => row.status !== 'failed').length;
      const failedCount = seededReminderRows.length - succeededCount;
      jobStateInserts.push({
        job_key: 'community_reminder',
        state_key: 'last_run',
        version: nowIso,
        state_value: JSON.stringify({
          runId: 'seed-bootstrap',
          processed: seededReminderRows.length,
          succeeded: succeededCount,
          failed: failedCount
        }),
        metadata: JSON.stringify({ seeded: true, source: '001_bootstrap' })
      });
    }

    jobStateInserts.push({
      job_key: 'data_partition',
      state_key: 'last_summary',
      version: nowIso,
      state_value: JSON.stringify({
        outcome: 'success',
        executedAt: nowIso,
        dryRun: false,
        results: [
          {
            tableName: 'domain_events',
            ensured: [{ status: 'ensured', partition: 'p202503' }],
            archived: []
          }
        ]
      }),
      metadata: JSON.stringify({ seeded: true, source: '001_bootstrap' })
    });

    if (notificationQueueInserts.length > 0) {
      await trx('notification_dispatch_queue').insert(notificationQueueInserts);
    }

    if (jobStateInserts.length > 0) {
      await trx('background_job_states').insert(jobStateInserts);
    }

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

    const experiments = await trx('community_growth_experiments')
      .select(['id', 'community_id as communityId']);
    const opsExperiment = experiments.find((experiment) => experiment.communityId === opsCommunityId);
    const growthExperiment = experiments.find((experiment) => experiment.communityId === growthCommunityId);

    const feedRangeEnd = new Date();
    const feedRangeStart = new Date(feedRangeEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    feedRangeStart.setUTCHours(0, 0, 0, 0);
    const feedRangeEndNormalized = new Date(feedRangeEnd.getTime());
    feedRangeEndNormalized.setUTCHours(23, 59, 59, 999);

    await trx('community_feed_impressions').insert([
      {
        community_id: opsCommunityId,
        experiment_id: opsExperiment?.id ?? null,
        actor_id: instructorId,
        momentum_score: 74,
        posts_sampled: 6,
        trending_tags: JSON.stringify(['automation', 'roadmap', 'playbooks']),
        range_start: feedRangeStart,
        range_end: feedRangeEndNormalized,
        recorded_at: feedRangeEnd
      },
      {
        community_id: growthCommunityId,
        experiment_id: growthExperiment?.id ?? null,
        actor_id: adminId,
        momentum_score: 68,
        posts_sampled: 5,
        trending_tags: JSON.stringify(['campaigns', 'live session', 'ads']),
        range_start: feedRangeStart,
        range_end: feedRangeEndNormalized,
        recorded_at: new Date(feedRangeEnd.getTime() - 2 * 60 * 60 * 1000)
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
    const automationCertificateArtwork = await ensureSeedImage('certificate-automation-masterclass', {
      title: 'Ops Launch Faculty',
      subtitle: 'Certificate of Completion',
      badge: 'Automation Masterclass',
      colors: ['#4338ca', '#6366f1']
    });
    const analyticsCourseArtwork = await ensureSeedImage('course-analytics-accelerator', {
      title: 'Data Storytelling Accelerator',
      subtitle: 'Transform dashboards into executive narratives',
      badge: 'Analytics studio',
      colors: ['#22d3ee', '#0ea5e9']
    });
    const communityCourseArtwork = await ensureSeedImage('course-community-builder', {
      title: 'Community Builder Bootcamp',
      subtitle: 'Design thriving member programming',
      badge: 'Community playbook',
      colors: ['#f97316', '#fb923c']
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
      hero_image_url: automationCourseArtwork.url,
      price_currency: 'USD',
      price_amount: 129900,
      rating_average: 4.8,
      rating_count: 187,
      enrolment_count: 421,
      is_published: true,
      release_at: trx.fn.now(),
      status: 'published',
      cluster_key: 'operations',
      metadata: JSON.stringify({
        brandColor: '#4338ca',
        certificateBackgroundUrl: automationCertificateArtwork.url,
        certificateIssuer: 'Ops Launch Faculty',
        certificateTemplate: {
          accentColor: '#4338ca',
          backgroundUrl: automationCertificateArtwork.url,
          issuedBy: 'Ops Launch Faculty',
          signature: 'Dean of Automation Programs'
        },
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
        upsellCatalogItems: [
          {
            productCode: 'ops-masterclass-tutor-support',
            label: 'Tutor concierge pods',
            tone: 'emerald',
            description: 'Weekly office hours and escalation rehearsal coaching.',
            features: ['Weekly office hours', 'Escalation rehearsal support']
          },
          {
            productCode: 'ops-masterclass-community-bundle',
            label: 'Ops Guild bundle',
            tone: 'primary',
            description: 'Private Ops Guild briefings and launch war room access.',
            features: ['Private briefings', 'Launch war room access']
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

    const [analyticsStoryCourseId] = await trx('courses').insert({
      public_id: crypto.randomUUID(),
      instructor_id: instructorId,
      title: 'Data Storytelling Accelerator',
      slug: 'data-storytelling-accelerator',
      summary: 'Build narrative-driven dashboards and executive-ready insight briefings.',
      description:
        'A six-week accelerator that coaches revenue and product analysts to package telemetry into concise stories. Learners practice narrative arcs, design punchy visuals, and rehearse stakeholder readouts across async and live channels.',
      level: 'intermediate',
      category: 'analytics',
      skills: JSON.stringify(['data storytelling', 'visualisation', 'executive communication']),
      tags: JSON.stringify(['Analytics', 'Narrative', 'Insights']),
      languages: JSON.stringify(['en', 'fr']),
      delivery_format: 'self_paced',
      thumbnail_url: analyticsCourseArtwork.url,
      hero_image_url: analyticsCourseArtwork.url,
      price_currency: 'USD',
      price_amount: 89000,
      rating_average: 4.6,
      rating_count: 142,
      enrolment_count: 512,
      is_published: true,
      release_at: trx.fn.now(),
      status: 'published',
      metadata: JSON.stringify({
        defaultCategory: 'analytics',
        defaultLevel: 'intermediate',
        defaultDeliveryFormat: 'self_paced',
        highlights: [
          'Executive-ready narrative frameworks',
          'Template gallery for dashboards and briefs',
          'Peer review loops with async critique'
        ],
        catalogueListings: [
          {
            id: 'marketplace-analytics',
            channel: 'Marketplace',
            status: 'Published',
            impressions: 12894,
            conversions: 214,
            conversionRate: 0.166,
            price: 89000,
            currency: 'USD',
            lastSyncedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        upsellCatalogItems: ['growth-insiders-annual'],
        personaNotes: {
          primary: 'Analytics managers',
          secondary: 'RevOps analysts'
        }
      })
    });

    const [communityBuilderCourseId] = await trx('courses').insert({
      public_id: crypto.randomUUID(),
      instructor_id: instructorId,
      title: 'Community Builder Bootcamp',
      slug: 'community-builder-bootcamp',
      summary: 'Live cohort mastering programming cadences and member journeys.',
      description:
        'Operators learn to design programming roadmaps, facilitate flagship events, and align monetisation tracks while keeping moderation and member health front-and-centre. The bootcamp mixes live studios with async drills.',
      level: 'beginner',
      category: 'community',
      skills: JSON.stringify(['community strategy', 'programming design', 'member engagement']),
      tags: JSON.stringify(['Community', 'Programming', 'Engagement']),
      languages: JSON.stringify(['en', 'es']),
      delivery_format: 'live',
      thumbnail_url: communityCourseArtwork.url,
      hero_image_url: communityCourseArtwork.url,
      price_currency: 'USD',
      price_amount: 74000,
      rating_average: 4.7,
      rating_count: 98,
      enrolment_count: 286,
      is_published: true,
      release_at: trx.fn.now(),
      status: 'published',
      metadata: JSON.stringify({
        defaultCategory: 'community',
        defaultLevel: 'beginner',
        defaultDeliveryFormat: 'live',
        highlights: [
          'Weekly live design studios',
          'Programming cadence templates',
          'Member health instrumentation checklists'
        ],
        catalogueListings: [
          {
            id: 'community-pro',
            channel: 'Enterprise network',
            status: 'Pilot',
            impressions: 6400,
            conversions: 76,
            conversionRate: 0.118,
            price: 74000,
            currency: 'USD',
            lastSyncedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
          }
        ],
        upsellCatalogItems: ['ops-masterclass-community-bundle'],
        programmingTracks: ['Welcome journeys', 'Flagship events', 'Member success rituals']
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
        releaseAt: new Date().toISOString(),
        releaseOffsetDays: 0,
        drip: {
          gating: 'Immediate access',
          prerequisites: [],
          releaseLabel: 'Available day 1',
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
        releaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        releaseOffsetDays: 7,
        drip: {
          gating: 'Requires Module 1 completion',
          prerequisites: ['Launch Command Center'],
          releaseLabel: 'Unlocks day 8',
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

    const [opsBlueprintId] = await trx('course_blueprints').insert({
      public_id: crypto.randomUUID(),
      course_id: opsAutomationCourseId,
      title: 'Automation launch production blueprint',
      stage: 'Production',
      summary: 'Readiness scaffolding for the automation launch masterclass across modules, QA gates, and marketing syncs.',
      target_learners: 'Operations leaders',
      price_label: '$1,299',
      module_count: 6,
      readiness_score: 78.5,
      readiness_label: 'In build',
      total_duration_minutes: 720,
      outstanding_tasks: JSON.stringify([
        'Integrate simulation QA outcomes into command center module',
        'Upload sponsor playbook addendum for enterprise cohort'
      ]),
      upcoming_milestones: JSON.stringify([
        {
          id: 'milestone-simulation-qa',
          type: 'QA review',
          dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Simulation QA sign-off with enablement'
        },
        {
          id: 'milestone-marketing-handoff',
          type: 'Marketing',
          dueAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          title: 'Launch marketing campaign hand-off'
        }
      ]),
      metadata: JSON.stringify({ cluster: 'Learning Delivery', annex: 'B2', blueprintCode: 'OPS-LAUNCH-2024' })
    });

    await trx('course_blueprint_modules').insert([
      {
        blueprint_id: opsBlueprintId,
        module_id: opsModuleKickoffId,
        title: 'Launch Command Center',
        release_label: 'Week 1 · Day 1',
        position: 1,
        lesson_count: 5,
        assignment_count: 1,
        duration_minutes: 240,
        outstanding_tasks: JSON.stringify(['Publish facilitator walkthrough recording']),
        metadata: JSON.stringify({ format: 'Hybrid cohort', qaGate: 'QA passed' })
      },
      {
        blueprint_id: opsBlueprintId,
        module_id: opsModuleIncidentId,
        title: 'Incident Simulation Drills',
        release_label: 'Week 2 · Day 1',
        position: 2,
        lesson_count: 4,
        assignment_count: 1,
        duration_minutes: 180,
        outstanding_tasks: JSON.stringify(['Upload simulation scoreboard template', 'Confirm escalation observers']),
        metadata: JSON.stringify({ format: 'Live cohort', qaGate: 'Needs simulation QA' })
      }
    ]);

    const [opsLaunchId] = await trx('course_launches').insert({
      public_id: crypto.randomUUID(),
      course_id: opsAutomationCourseId,
      target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      target_label: 'Target launch in 2 weeks',
      phase: 'QA',
      owner: 'Kai Watanabe',
      risk_level: 'On track',
      risk_tone: 'low',
      activation_coverage: '68% trained',
      confidence_score: 0.72,
      metadata: JSON.stringify({ cluster: 'Learning Delivery', annex: 'B2', workspace: 'Lifecycle planner' })
    });

    await trx('course_launch_checklist_items').insert([
      {
        public_id: crypto.randomUUID(),
        launch_id: opsLaunchId,
        label: 'QA playbooks reviewed',
        completed: true,
        owner: 'Amina Diallo',
        due_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ scope: 'Quality assurance' })
      },
      {
        public_id: crypto.randomUUID(),
        launch_id: opsLaunchId,
        label: 'Incident escalation tree refreshed',
        completed: true,
        owner: 'Kai Watanabe',
        due_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ scope: 'Operations' })
      },
      {
        public_id: crypto.randomUUID(),
        launch_id: opsLaunchId,
        label: 'Telemetry alerts tuned',
        completed: false,
        owner: 'Noemi Carvalho',
        due_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ scope: 'Observability' })
      }
    ]);

    await trx('course_launch_signals').insert([
      {
        public_id: crypto.randomUUID(),
        launch_id: opsLaunchId,
        label: 'Sponsor video awaiting approval',
        severity: 'medium',
        description: 'Brand team review pending for sponsor integration clip.',
        action_label: 'Ping brand review',
        action_href: 'https://ops.edulure.test/reviews/sponsor-video',
        metadata: JSON.stringify({ owner: 'Marketing', cluster: 'Annex B2' })
      },
      {
        public_id: crypto.randomUUID(),
        launch_id: opsLaunchId,
        label: 'Compliance evidence upload required',
        severity: 'high',
        description: 'SOC 2 attestation needs attaching before enterprise syndication.',
        action_label: 'Upload evidence',
        action_href: 'https://ops.edulure.test/compliance/evidence',
        metadata: JSON.stringify({ owner: 'Compliance', cluster: 'Annex B2' })
      }
    ]);

    await trx('course_reviews').insert([
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        reviewer_name: 'Lina Gomez',
        reviewer_role: 'Director of Operations',
        reviewer_company: 'LaunchHub',
        rating: 5,
        headline: 'Launch readiness transformed our go-live',
        feedback:
          'The drip sequencing and rehearsal cadences meant our entire ops guild showed up prepared. We saw a 38% reduction in launch escalations.',
        delivery_mode: 'Cohort',
        experience: 'Web and mobile parity',
        submitted_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ cohort: 'Autumn 2024' })
      },
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        reviewer_name: 'Ops Guild Collective',
        reviewer_role: 'Peer review board',
        reviewer_company: 'Ops Guild',
        rating: 4.6,
        headline: 'Enterprise-grade runbook system',
        feedback:
          'Module creation workflows and refresher loops were robust enough for our multi-market programme. Mobile execution matched the desktop experience.',
        delivery_mode: 'Hybrid cohort',
        experience: 'Mobile parity certified',
        submitted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ board: 'Ops Guild review council' })
      }
    ]);

    await trx('course_refresher_lessons').insert([
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        title: 'Quarterly incident rehearsal',
        format: 'Live simulation',
        cadence: 'Quarterly',
        owner: 'Kai Watanabe',
        status: 'Scheduled',
        next_session_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        channel: 'Zoom studio',
        enrollment_window: 'Opens 14 days prior',
        metadata: JSON.stringify({ facilitator: 'Ops guild', annex: 'B2' })
      },
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        title: 'Automation audit checklist',
        format: 'Async module',
        cadence: 'Bi-annual',
        owner: 'Kai Watanabe',
        status: 'Draft',
        next_session_at: null,
        channel: 'Learning hub',
        enrollment_window: 'Self-paced access',
        metadata: JSON.stringify({ facilitator: 'Automation faculty', annex: 'B2' })
      }
    ]);

    await trx('course_recorded_assets').insert([
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        title: 'Command center war room tour',
        format: 'Video',
        status: 'Encoded',
        duration_minutes: 18,
        size_mb: 942,
        quality: '1080p',
        language: 'English',
        aspect_ratio: '16:9',
        engagement_completion_rate: 86.4,
        tags: JSON.stringify(['command center', 'tour']),
        audience: 'Learners',
        updated_at_source: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ libraryShelf: 'Launch readiness', annex: 'A3' })
      },
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        title: 'Incident drill facilitation',
        format: 'Video',
        status: 'Quality review',
        duration_minutes: 27,
        size_mb: 1460,
        quality: '4K',
        language: 'English',
        aspect_ratio: '16:9',
        engagement_completion_rate: 72.1,
        tags: JSON.stringify(['incident', 'simulation']),
        audience: 'Facilitators',
        updated_at_source: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ libraryShelf: 'Facilitation', annex: 'A3' })
      }
    ]);

    await trx('course_catalogue_listings').insert([
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        channel: 'Marketplace',
        status: 'Published',
        impressions: 18452,
        conversions: 136,
        conversion_rate: 0.0737,
        price_amount: 129900,
        price_currency: 'USD',
        last_synced_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ listingId: 'catalog-marketplace', annex: 'A3' })
      },
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        channel: 'Enterprise network',
        status: 'Pilot',
        impressions: 42,
        conversions: 10,
        conversion_rate: 0.238,
        price_amount: 189900,
        price_currency: 'USD',
        last_synced_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        metadata: JSON.stringify({ listingId: 'catalog-enterprise', annex: 'A3' })
      }
    ]);

    const [opsDripSequenceId] = await trx('course_drip_sequences').insert({
      public_id: crypto.randomUUID(),
      course_id: opsAutomationCourseId,
      cadence: 'Weekly',
      anchor: 'enrollment-date',
      timezone: 'America/New_York',
      metadata: JSON.stringify({ orchestrator: 'Lifecycle automation', annex: 'B2' })
    });

    await trx('course_drip_segments').insert([
      {
        public_id: crypto.randomUUID(),
        sequence_id: opsDripSequenceId,
        label: 'Foundational cohort',
        audience: 'New operations leaders',
        metadata: JSON.stringify({ priority: 'primary' })
      },
      {
        public_id: crypto.randomUUID(),
        sequence_id: opsDripSequenceId,
        label: 'Advanced operators',
        audience: 'Returning ops guild members',
        metadata: JSON.stringify({ priority: 'secondary' })
      }
    ]);

    await trx('course_drip_schedules').insert([
      {
        public_id: crypto.randomUUID(),
        sequence_id: opsDripSequenceId,
        title: 'Launch Command Center',
        release_label: 'Day 0 · 09:00 ET',
        position: 1,
        offset_days: 0,
        gating: 'Immediate access',
        prerequisites: JSON.stringify([]),
        notifications: JSON.stringify(['Email 24h before release']),
        workspace: 'Ops Launch HQ',
        metadata: JSON.stringify({ moduleSlug: 'launch-command-center' })
      },
      {
        public_id: crypto.randomUUID(),
        sequence_id: opsDripSequenceId,
        title: 'Incident Simulation Drills',
        release_label: 'Day 8 · 09:00 ET',
        position: 2,
        offset_days: 7,
        gating: 'Requires Module 1 completion',
        prerequisites: JSON.stringify(['Launch Command Center']),
        notifications: JSON.stringify(['Email 24h before release', 'SMS 2h before release']),
        workspace: 'Ops Launch HQ',
        metadata: JSON.stringify({ moduleSlug: 'incident-simulation-drills' })
      }
    ]);

    await trx('course_mobile_experiences').insert([
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        experience_type: 'Drip modules',
        status: 'Aligned',
        description: 'Parity verified for all drip sequences on iOS and Android.',
        metadata: JSON.stringify({ annex: 'A3', coverage: 'Full' })
      },
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        experience_type: 'Refresher lessons',
        status: 'Aligned',
        description: 'Live refresher clinics available via mobile with reminders.',
        metadata: JSON.stringify({ annex: 'A3', coverage: 'Refresher' })
      },
      {
        public_id: crypto.randomUUID(),
        course_id: opsAutomationCourseId,
        experience_type: 'Recorded videos',
        status: 'Aligned',
        description: 'Evergreen recordings encoded for responsive playback.',
        metadata: JSON.stringify({ annex: 'A3', coverage: 'Library' })
      }
    ]);

    const [commandCenterLessonId] = await trx('course_lessons').insert({
      course_id: opsAutomationCourseId,
      module_id: opsModuleKickoffId,
      asset_id: opsPlaybookAssetId,
      title: 'Command Center Blueprint',
      slug: 'command-center-blueprint',
      position: 1,
      duration_minutes: 45,
      release_at: trx.fn.now(),
      metadata: JSON.stringify({
        format: 'presentation',
        keyTakeaway: 'Runbook readiness matrix',
        thumbnailUrl: 'https://cdn.edulure.com/lessons/command-center-blueprint.jpg',
        resources: [
          { label: 'Command center worksheet', href: 'https://cdn.edulure.com/resources/command-center-worksheet.pdf' }
        ]
      })
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
      metadata: JSON.stringify({
        format: 'reading',
        worksheet: 'forecast-checklist',
        thumbnailUrl: 'https://cdn.edulure.com/lessons/funnel-telemetry-preview.jpg',
        resources: [
          { label: 'Telemetry readiness checklist', href: 'https://cdn.edulure.com/resources/telemetry-readiness.xlsx' }
        ]
      })
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

    const opsCoursePublic = await trx('courses')
      .select('public_id')
      .where({ id: opsAutomationCourseId })
      .first();
    const opsModuleIncident = await trx('course_modules')
      .select('slug')
      .where({ id: opsModuleIncidentId })
      .first();
    const opsAsset = await trx('content_assets')
      .select('public_id')
      .where({ id: opsPlaybookAssetId })
      .first();

    const opsCoursePublicId = opsCoursePublic?.public_id ?? `course-${opsAutomationCourseId}`;
    const opsModuleIncidentSlug = opsModuleIncident?.slug ?? 'incident-simulation-drills';
    const opsAssetPublicId = opsAsset?.public_id ?? `asset-${opsPlaybookAssetId}`;

    await trx('learning_offline_downloads').insert({
      id: crypto.randomUUID(),
      user_id: learnerId,
      asset_public_id: opsAssetPublicId,
      asset_id: opsPlaybookAssetId,
      course_id: opsAutomationCourseId,
      module_id: opsModuleIncidentId,
      course_public_id: opsCoursePublicId,
      module_slug: opsModuleIncidentSlug,
      filename: 'learning-ops-blueprint.pptx',
      state: 'completed',
      progress_ratio: 1,
      file_path: '/offline/content/learning-ops-blueprint.pptx',
      queued_at: trx.fn.now(),
      completed_at: trx.fn.now(),
      metadata: JSON.stringify({ annex: 'A28', seeded: true })
    });

    const automationAssignment = await trx('course_assignments')
      .select('id')
      .where({ course_id: opsAutomationCourseId, title: 'Automation Readiness Audit' })
      .first();

    await trx('learning_offline_assessment_submissions').insert({
      id: crypto.randomUUID(),
      user_id: learnerId,
      client_submission_id: 'seed-automation-audit',
      assignment_id: automationAssignment?.id ?? null,
      assessment_key:
        automationAssignment?.id != null
          ? `assignment:${automationAssignment.id}`
          : 'automation-readiness-audit',
      state: 'queued',
      payload: JSON.stringify({ draftScore: null, attachments: [], rubricVersion: 1 }),
      queued_at: trx.fn.now(),
      metadata: JSON.stringify({ annex: 'B6', seeded: true })
    });

    await trx('learning_offline_module_snapshots').insert({
      id: crypto.randomUUID(),
      user_id: learnerId,
      course_id: opsAutomationCourseId,
      module_id: opsModuleIncidentId,
      course_public_id: opsCoursePublicId,
      module_slug: opsModuleIncidentSlug,
      completion_ratio: 0.42,
      notes: 'Seeded offline progress sync for Annex B6 audit.',
      metadata: JSON.stringify({ annex: 'B6', seeded: true }),
      captured_at: trx.fn.now()
    });

    await trx('instructor_action_queue').insert([
      {
        id: crypto.randomUUID(),
        user_id: instructorId,
        client_action_id: 'seed-announcement',
        action_type: 'announcement',
        state: 'processing',
        payload: JSON.stringify({
          audience: 'Ops Automation Cohort',
          subject: 'Offline sync announcement',
          priority: 'urgent'
        }),
        queued_at: trx.fn.now(),
        processed_at: trx.fn.now(),
        metadata: JSON.stringify({ annex: 'A29', seeded: true })
      },
      {
        id: crypto.randomUUID(),
        user_id: instructorId,
        client_action_id: 'seed-attendance',
        action_type: 'attendance',
        state: 'queued',
        payload: JSON.stringify({ sessionId: 'ops-live-101', attendees: 28, capturedOffline: true }),
        queued_at: trx.fn.now(),
        metadata: JSON.stringify({ annex: 'C4', seeded: true })
      }
    ]);

    const [analyticsStoryModuleId] = await trx('course_modules').insert({
      course_id: analyticsStoryCourseId,
      title: 'Narrative Foundations',
      slug: 'narrative-foundations',
      position: 1,
      release_offset_days: 0,
      metadata: JSON.stringify({
        templatePack: 'executive-briefs',
        recommendedDurationMinutes: 45,
        reviewChecklist: ['Narrative arc', 'Audience framing', 'Call-to-action']
      })
    });

    const [analyticsStoryLessonId] = await trx('course_lessons').insert({
      course_id: analyticsStoryCourseId,
      module_id: analyticsStoryModuleId,
      asset_id: growthPlaybookEbookAssetId,
      title: 'Storyboarding Executive Readouts',
      slug: 'storyboarding-executive-readouts',
      position: 1,
      duration_minutes: 35,
      release_at: trx.fn.now(),
      metadata: JSON.stringify({
        format: 'workshop',
        worksheet: 'storyboard-template',
        thumbnailUrl: 'https://cdn.edulure.test/lessons/storyboarding-executive-readouts.jpg',
        resources: [
          {
            label: 'Executive narrative storyboard',
            href: 'https://cdn.edulure.test/resources/executive-narrative-storyboard.pdf'
          }
        ]
      })
    });

    const [analyticsEnrollmentId] = await trx('course_enrollments').insert({
      public_id: crypto.randomUUID(),
      course_id: analyticsStoryCourseId,
      user_id: learnerId,
      status: 'active',
      progress_percent: 32.5,
      started_at: trx.fn.now(),
      metadata: JSON.stringify({ cohort: '2025-Q1', enrollmentSource: 'seed' })
    });

    await trx('course_progress').insert({
      enrollment_id: analyticsEnrollmentId,
      lesson_id: analyticsStoryLessonId,
      completed: false,
      progress_percent: 50,
      metadata: JSON.stringify({
        lastLocation: 'section-3',
        note: 'Tighten stakeholder framing',
        reviewer: 'Analytics mentor'
      })
    });

    const [communityProgrammingModuleId] = await trx('course_modules').insert({
      course_id: communityBuilderCourseId,
      title: 'Programming Blueprint Studio',
      slug: 'programming-blueprint-studio',
      position: 1,
      release_offset_days: 0,
      metadata: JSON.stringify({
        includesLiveLab: true,
        facilitator: 'Community Ops Guild',
        labResources: ['Cadence canvas', 'Member signal tracker']
      })
    });

    const [communityProgrammingLessonId] = await trx('course_lessons').insert({
      course_id: communityBuilderCourseId,
      module_id: communityProgrammingModuleId,
      asset_id: opsPlaybookAssetId,
      title: 'Designing Signature Programming',
      slug: 'designing-signature-programming',
      position: 1,
      duration_minutes: 55,
      release_at: trx.fn.now(),
      metadata: JSON.stringify({
        format: 'live-studio',
        sessionCode: 'CB-INTRO-LIVE',
        thumbnailUrl: 'https://cdn.edulure.test/lessons/designing-signature-programming.jpg',
        resources: [
          {
            label: 'Programming cadence canvas',
            href: 'https://cdn.edulure.test/resources/programming-cadence-canvas.pdf'
          }
        ]
      })
    });

    const [communityEnrollmentId] = await trx('course_enrollments').insert({
      public_id: crypto.randomUUID(),
      course_id: communityBuilderCourseId,
      user_id: learnerId,
      status: 'active',
      progress_percent: 18.75,
      started_at: trx.fn.now(),
      metadata: JSON.stringify({ cohort: '2025-Spring', enrollmentSource: 'seed' })
    });

    await trx('course_progress').insert({
      enrollment_id: communityEnrollmentId,
      lesson_id: communityProgrammingLessonId,
      completed: false,
      progress_percent: 20,
      metadata: JSON.stringify({
        lastLocation: 'segment-1',
        participation: 'Live session RSVP confirmed'
      })
    });

    const automationGoalDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await trx('learner_course_goals').insert({
      goal_uuid: crypto.randomUUID(),
      user_id: learnerId,
      course_id: opsAutomationCourseId,
      enrollment_id: opsEnrollmentId,
      title: 'Ship automation capstone',
      status: 'in-progress',
      is_active: true,
      priority: 2,
      target_lessons: 12,
      remaining_lessons: 5,
      focus_minutes_per_week: 180,
      progress_percent: 46.5,
      due_date: automationGoalDueDate,
      metadata: JSON.stringify({
        target: 'Complete automation toolkit',
        nextStep: 'Resume lesson 3',
        surface: 'seed'
      })
    });

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

    const paymentNow = new Date();
    const subscriptionPublicId = crypto.randomUUID();
    const providerIntentId = `pi_${crypto.randomBytes(8).toString('hex')}`;
    const providerChargeId = `ch_${crypto.randomBytes(6).toString('hex')}`;

    const [insidersCouponId] = await trx('payment_coupons').insert({
      code: 'INSIDER20',
      name: 'Growth Insiders launch',
      description: '20% off the first annual Growth Insiders subscription.',
      discount_type: 'percentage',
      discount_value: 2000,
      currency: 'USD',
      max_redemptions: 500,
      per_user_limit: 2,
      times_redeemed: 1,
      is_stackable: false,
      status: 'active',
      valid_from: new Date(paymentNow.getTime() - 7 * 24 * 60 * 60 * 1000),
      valid_until: new Date(paymentNow.getTime() + 60 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({ campaign: 'growth-insiders', createdBy: 'seed' })
    });

    await trx('payment_coupons').insert({
      code: 'BUNDLE50',
      name: 'Course + ebook bundle',
      description: 'Save $50 when bundling flagship course and companion ebook.',
      discount_type: 'fixed_amount',
      discount_value: 5000,
      currency: 'USD',
      max_redemptions: 250,
      per_user_limit: 1,
      times_redeemed: 0,
      is_stackable: false,
      status: 'active',
      valid_from: new Date(paymentNow.getTime() - 3 * 24 * 60 * 60 * 1000),
      valid_until: new Date(paymentNow.getTime() + 90 * 24 * 60 * 60 * 1000),
      metadata: JSON.stringify({ campaign: 'bundle-promo', createdBy: 'seed' })
    });

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
        amountDiscount: 37980,
        amountTax: 15192,
        amountTotal: 167112,
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
              discount: 37980,
              tax: 15192,
              total: 167112
            }
          ],
          taxableSubtotal: 189900,
          taxableAfterDiscount: 151920,
          couponCode: 'INSIDER20',
          couponId: insidersCouponId,
          referralCode: affiliateReferralCode
        },
        couponId: insidersCouponId,
        entityType: 'community_subscription',
        entityId: subscriptionPublicId,
        receiptEmail: 'noemi.carvalho@edulure.test',
        capturedAt: trx.fn.now()
      },
      trx
    );
    const subscriptionPaymentId = subscriptionPayment.id;

    await trx('payment_coupon_redemptions').insert({
      coupon_id: insidersCouponId,
      payment_intent_id: subscriptionPaymentId,
      user_id: learnerId,
      metadata: JSON.stringify({ source: 'seed', context: 'growth-insiders' })
    });

    await trx('payment_ledger_entries').insert({
      payment_intent_id: subscriptionPaymentId,
      entry_type: 'charge',
      amount: 167112,
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

    const [_tutorSupportCatalogId] = await trx('monetization_catalog_items').insert({
      public_id: crypto.randomUUID(),
      tenant_id: 'global',
      product_code: 'ops-masterclass-tutor-support',
      name: 'Ops tutor concierge pods',
      description: 'Pair the automation masterclass with weekly live tutor pods for escalation rehearsal support.',
      pricing_model: 'flat_fee',
      billing_interval: 'one_time',
      revenue_recognition_method: 'immediate',
      recognition_duration_days: 0,
      unit_amount_cents: 49900,
      currency: 'USD',
      usage_metric: 'seat',
      revenue_account: '4000-education-services',
      deferred_revenue_account: '2050-deferred-revenue',
      metadata: JSON.stringify({
        seed: true,
        owner: 'course-ops',
        badgeLabel: 'Tutor concierge',
        badgeTone: 'emerald',
        landingPageUrl: 'https://commerce.edulure.test/addons/ops-masterclass-tutor-support',
        features: ['Weekly office hours', 'Incident rehearsal coaching']
      }),
      status: 'active',
      effective_from: trx.fn.now()
    });

    const [_communityBundleCatalogId] = await trx('monetization_catalog_items').insert({
      public_id: crypto.randomUUID(),
      tenant_id: 'global',
      product_code: 'ops-masterclass-community-bundle',
      name: 'Ops Guild community access',
      description: 'Unlock private Ops Guild community channels and live briefings bundled with the masterclass.',
      pricing_model: 'flat_fee',
      billing_interval: 'one_time',
      revenue_recognition_method: 'immediate',
      recognition_duration_days: 0,
      unit_amount_cents: 29000,
      currency: 'USD',
      usage_metric: 'seat',
      revenue_account: '4000-education-services',
      deferred_revenue_account: '2050-deferred-revenue',
      metadata: JSON.stringify({
        seed: true,
        owner: 'community-ops',
        badgeLabel: 'Ops Guild bundle',
        badgeTone: 'primary',
        landingPageUrl: 'https://commerce.edulure.test/addons/ops-masterclass-community',
        features: ['Private briefings', 'Launch war room access']
      }),
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

    const reconciliationInvoicedCents = 205092;
    const reconciliationUsageCents = 189900;
    const reconciliationRecognizedCents = 0;
    const reconciliationDeferredCents = 205092;
    const reconciliationVarianceCents = reconciliationRecognizedCents - reconciliationInvoicedCents;
    const reconciliationVarianceRatio = reconciliationInvoicedCents
      ? Number((reconciliationVarianceCents / reconciliationInvoicedCents).toFixed(4))
      : 0;
    const reconciliationVarianceBps = reconciliationInvoicedCents
      ? Number(((reconciliationVarianceCents / reconciliationInvoicedCents) * 10000).toFixed(2))
      : 0;
    const reconciliationUsageVarianceCents = reconciliationRecognizedCents - reconciliationUsageCents;
    const reconciliationUsageVarianceBps = reconciliationUsageCents
      ? Number(((reconciliationUsageVarianceCents / reconciliationUsageCents) * 10000).toFixed(2))
      : 0;

    const reconciliationCurrencyBreakdown = [
      {
        currency: 'USD',
        invoicedCents: reconciliationInvoicedCents,
        usageCents: reconciliationUsageCents,
        recognizedCents: reconciliationRecognizedCents,
        deferredCents: reconciliationDeferredCents,
        varianceCents: reconciliationVarianceCents,
        varianceBps: reconciliationVarianceBps,
        usageVarianceCents: reconciliationUsageVarianceCents,
        usageVarianceBps: reconciliationUsageVarianceBps
      }
    ];

    const reconciliationAlerts = [
      {
        type: 'recognized.less_than_invoiced',
        severity: 'high',
        message: 'Recognised revenue trails invoices by $2,050.92 for Growth Insiders annual.',
        details: {
          currency: 'USD',
          invoicedCents: reconciliationInvoicedCents,
          recognizedCents: reconciliationRecognizedCents
        }
      },
      {
        type: 'usage.recognized_gap',
        severity: 'medium',
        message: 'Recognised revenue trails recorded usage by $1,899.00.',
        details: {
          currency: 'USD',
          usageCents: reconciliationUsageCents,
          recognizedCents: reconciliationRecognizedCents
        }
      }
    ];

    const acknowledgementTimestamp = new Date(subscriptionTimestamp.getTime() + 60 * 60 * 1000).toISOString();
    const reconciliationMetadata = {
      seed: true,
      scheduleId,
      usageRecordId,
      reconciliationMethod: 'automated',
      generatedAt: subscriptionTimestamp.toISOString(),
      varianceBps: reconciliationVarianceBps,
      usageVarianceCents: reconciliationUsageVarianceCents,
      usageVarianceBps: reconciliationUsageVarianceBps,
      severity: 'high',
      alerts: reconciliationAlerts,
      thresholds: {
        varianceAlertBps: 250,
        varianceCriticalBps: 500,
        usageVarianceAlertBps: 200,
        alertCooldownMinutes: 120
      },
      alertCooldownMinutes: 120,
      currencyBreakdown: reconciliationCurrencyBreakdown,
      acknowledgements: [
        {
          acknowledgedAt: acknowledgementTimestamp,
          channel: 'email',
          operator: {
            name: 'Rowan Ellis',
            email: 'finance.ops@edulure.com'
          },
          note: 'Seed acknowledgement confirming staging reconciliation sample.'
        }
      ],
      varianceHistory: [
        {
          recordedAt: subscriptionTimestamp.toISOString(),
          windowStart: subscriptionTimestamp.toISOString(),
          windowEnd: nextYear.toISOString(),
          varianceCents: reconciliationVarianceCents,
          varianceBps: reconciliationVarianceBps,
          severity: 'high',
          alertCount: reconciliationAlerts.length,
          acknowledgementCount: 1,
          currencyBreakdown: reconciliationCurrencyBreakdown
        }
      ]
    };

    await trx('monetization_reconciliation_runs').insert({
      tenant_id: 'global',
      window_start: subscriptionTimestamp,
      window_end: nextYear,
      status: 'completed',
      invoiced_cents: reconciliationInvoicedCents,
      usage_cents: reconciliationUsageCents,
      recognized_cents: reconciliationRecognizedCents,
      deferred_cents: reconciliationDeferredCents,
      variance_cents: reconciliationVarianceCents,
      variance_ratio: reconciliationVarianceRatio,
      metadata: JSON.stringify(reconciliationMetadata),
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
          ...growthMemberMetadata,
          statusNote: 'Activated via subscription',
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
        metadata: JSON.stringify({
          ...opsAdminMemberMetadata,
          playbookOwner: true,
          roleDefinitionId: opsStrategistRoleId
        }),
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

    const bookingSlaDue = new Date(tutorSlotStart.getTime() - 24 * 60 * 60 * 1000);

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
      metadata: JSON.stringify({
        availabilitySlotId: bookedAvailabilityId,
        communityId: opsCommunityId,
        topic: 'Automation rehearsal coaching',
        summary: 'Pre-flight run-through for the automation command simulation.',
        meetingUrl: 'https://meet.edulure.test/ops-masterclass-sync',
        joinUrl: 'https://meet.edulure.test/ops-masterclass-sync',
        ctaLabel: 'Join mentor room',
        location: 'Virtual ops lounge',
        timezone: 'Etc/UTC',
        durationMinutes: 60,
        segment: 'Operations guild pod',
        cohort: 'Automation rehearsal',
        preferredSlot: {
          label: 'Friday · 17:00 UTC',
          startAt: tutorSlotStart.toISOString(),
          timezone: 'Etc/UTC'
        },
        slaDueAt: bookingSlaDue.toISOString(),
        risk: 'high',
        routing: { score: 0.82, ruleset: 'ops-pod-routing-v1' },
        recordingUrl: 'https://live.edulure.test/ops/automation-command-simulation/recording',
        notes: [
          'Review escalation runbooks and donation messaging before the live stream.',
          'Share facilitator prep deck 12 hours ahead.'
        ],
        resources: {
          prep: [
            {
              label: 'Automation rehearsal checklist',
              url: 'https://docs.edulure.test/ops/automation-checklist'
            }
          ],
          materials: [
            {
              label: 'Mentor talking points',
              url: 'https://docs.edulure.test/ops/mentor-talking-points'
            }
          ]
        }
      })
    });

    const liveClassroomStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    liveClassroomStart.setUTCHours(17, 0, 0, 0);
    const liveClassroomEnd = new Date(liveClassroomStart.getTime() + 90 * 60 * 1000);
    const liveWhiteboardUpdated = new Date(liveClassroomStart.getTime() - 45 * 60 * 1000);
    const liveSnapshotOne = new Date(liveClassroomStart.getTime() - 30 * 60 * 1000);
    const liveSnapshotTwo = new Date(liveClassroomStart.getTime() - 10 * 60 * 1000);
    const livePrepCheckpoint = new Date(liveClassroomStart.getTime() - 2 * 60 * 60 * 1000);
    const liveLobbyCheckpoint = new Date(liveClassroomStart.getTime() - 20 * 60 * 1000);
    const liveJoinCheckpoint = new Date(liveClassroomStart.getTime() - 5 * 60 * 1000);

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
      cluster_key: 'operations',
      metadata: JSON.stringify({
        agoraChannel: 'OPS-LAUNCH-001',
        featureFlag: 'live-simulations',
        stage: 'Automation rehearsal',
        summary: 'Hands-on automation drill with live telemetry checks and donation workflows.',
        communityName: 'Ops Control Guild',
        currency: 'USD',
        joinUrl: 'https://live.edulure.test/ops/automation-command-simulation',
        checkInUrl: 'https://live.edulure.test/ops/automation-command-simulation/check-in',
        lobbyUrl: 'https://live.edulure.test/ops/automation-command-simulation/lobby',
        meetingUrl: 'https://live.edulure.test/ops/automation-command-simulation',
        hostUrl: 'https://ops.edulure.test/host/automation-command',
        timezone: 'Etc/UTC',
        facilitators: ['Kai Watanabe', 'Ops Control Desk'],
        security: { waitingRoom: true, passcodeRequired: true, owner: 'Ops Control Desk' },
        whiteboard: {
          template: 'Automation ops board',
          summary: 'Live runbook for escalation commands and readiness checks.',
          updatedAt: liveWhiteboardUpdated.toISOString(),
          ready: true,
          url: 'https://whiteboard.edulure.test/ops/automation-command',
          notes: [
            'Moderation toolkit pinned to the whiteboard sidebar.',
            'Confirm scoreboard overlay with streaming ops during dry run.'
          ],
          snapshots: [
            {
              template: 'Automation ops board',
              summary: 'Checklist finalised with automation leads.',
              updatedAt: liveSnapshotOne.toISOString()
            },
            {
              template: 'Escalation matrix',
              summary: 'Escalation routes rehearsed with facilitators.',
              updatedAt: liveSnapshotTwo.toISOString()
            }
          ]
        },
        attendanceCheckpoints: [
          {
            id: crypto.randomUUID(),
            type: 'prep',
            source: 'instructor',
            recordedAt: livePrepCheckpoint.toISOString(),
            metadata: { note: 'Ops prep sync' }
          },
          {
            id: crypto.randomUUID(),
            type: 'lobby',
            source: 'learner',
            userId: learnerId,
            recordedAt: liveLobbyCheckpoint.toISOString(),
            metadata: { channel: 'dashboard' }
          },
          {
            id: crypto.randomUUID(),
            type: 'join',
            source: 'learner',
            userId: learnerId,
            recordedAt: liveJoinCheckpoint.toISOString(),
            metadata: { acknowledgement: 'seed-checkpoint' }
          }
        ],
        attendanceAnalytics: {
          total: 3,
          lastRecordedAt: liveJoinCheckpoint.toISOString(),
          lastRecordedBy: learnerId
        },
        breakoutRooms: [
          { name: 'Automation pod A', capacity: 24 },
          { name: 'Escalation drills', capacity: 18 }
        ],
        resources: {
          hostUrl: 'https://ops.edulure.test/host/automation-command',
          prep: [
            {
              label: 'Facilitator standby checklist',
              url: 'https://docs.edulure.test/ops/facilitator-standby'
            },
            {
              label: 'Automation rehearsal briefing',
              url: 'https://docs.edulure.test/ops/automation-briefing'
            }
          ],
          materials: [
            {
              label: 'Automation command deck',
              url: 'https://cdn.edulure.test/slides/automation-command.pdf'
            },
            {
              label: 'Telemetry dashboard quickstart',
              url: 'https://docs.edulure.test/ops/telemetry-dashboard'
            }
          ],
          recordings: [
            {
              label: 'Prior cohort replay',
              url: 'https://cdn.edulure.test/video/ops/automation-command-replay.mp4'
            }
          ]
        },
        support: {
          moderator: 'Ops Control Desk',
          helpDesk: 'ops-support@edulure.test',
          escalation: 'https://ops.edulure.test/escalations'
        },
        alerts: [
          { id: 'ops-capacity', label: '64 of 120 seats reserved — queue waitlist updates.' },
          { id: 'ops-escalation', label: 'Escalation desk standby required 15 minutes prior.' }
        ],
        pricing: {
          collectedLabel: '64 tickets collected',
          payoutStatus: 'scheduled'
        },
        goLiveBy: livePrepCheckpoint.toISOString(),
        donations: { enabled: true, suggestedAmountCents: 2500 },
        eventId: 'OPS-LIVE-001'
      })
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

    const adsCompatibilityCheckedAt = new Date().toISOString();
    const seededPlacements = [
      {
        context: 'global_feed',
        slot: 'feed-inline',
        surface: 'Discovery Feed',
        label: 'Discovery feed card'
      },
      {
        context: 'community_feed',
        slot: 'feed-community',
        surface: 'Community Feed',
        label: 'Community feed highlight'
      },
      {
        context: 'search',
        slot: 'search-top',
        surface: 'Explorer Search',
        label: 'Search result feature'
      }
    ];

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
      metadata: JSON.stringify({
        promotedCommunityId: growthCommunityId,
        featureFlag: 'ads-explorer-placements',
        reviewChecklist: ['creative-approved', 'targeting-verified'],
        landingPage: 'https://edulure.test/ads/creator-funnel-boost',
        placements: seededPlacements,
        brandSafety: {
          categories: ['education', 'financial'],
          excludedTopics: ['crypto', 'speculative investing'],
          reviewNotes: 'Approved for explorer and live classroom placements'
        },
        creativeAsset: {
          url: 'https://cdn.edulure.test/assets/ads/creator-funnel-boost.png',
          type: 'image/png',
          width: 1200,
          height: 675,
          storageBucket: 'edulure-uploads'
        },
        preview: { theme: 'dark', accent: 'indigo' },
        lastFormSurface: 'dashboard_ads_seed',
        lastCompatibilityCheckAt: adsCompatibilityCheckedAt
      })
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

    const previewDigestUpdatedAt = nowIso;
    const previewDigestCourses = [
      {
        id: String(opsAutomationCourseId),
        entityType: 'courses',
        title: 'Automation Launch Masterclass',
        subtitle: 'Production blueprint for running live classroom automation squads.',
        thumbnailUrl: automationCourseArtwork.url,
        ratingAverage: 4.8,
        ratingCount: 187,
        priceCurrency: 'USD',
        priceAmountMinor: 129900,
        monetisationTag: 'Premium course',
        badges: [
          { label: 'Advanced', tone: 'indigo' },
          { label: 'Cohort', tone: 'amber' }
        ],
        updatedAt: previewDigestUpdatedAt
      }
    ];
    const previewDigestCommunities = [
      {
        id: String(opsCommunityId),
        entityType: 'communities',
        title: 'Learning Ops Guild',
        subtitle: 'Operations leaders share classroom launch playbooks and tooling recipes.',
        thumbnailUrl: learningOpsCover.url,
        ratingAverage: 4.88,
        ratingCount: 168,
        priceCurrency: null,
        priceAmountMinor: null,
        monetisationTag: 'Open community',
        badges: [
          { label: 'Public', tone: 'emerald' },
          { label: 'Operations', tone: 'slate' }
        ],
        updatedAt: previewDigestUpdatedAt
      }
    ];
    const previewDigestTutors = [
      {
        id: String(opsTutorProfileId),
        entityType: 'tutors',
        title: 'Kai Watanabe',
        subtitle: 'Automation launch strategist & Agora live operations lead',
        thumbnailUrl: instructorAvatar.url,
        ratingAverage: 4.9,
        ratingCount: 86,
        priceCurrency: 'USD',
        priceAmountMinor: 18000,
        monetisationTag: 'Verified tutor',
        badges: [
          { label: 'Verified', tone: 'emerald' },
          { label: 'Automation', tone: 'indigo' }
        ],
        updatedAt: previewDigestUpdatedAt
      }
    ];
    const previewDigestsAll = [
      ...previewDigestCourses.slice(0, 1),
      ...previewDigestCommunities.slice(0, 1),
      ...previewDigestTutors.slice(0, 1)
    ];
    const previewDigestsByEntity = {
      all: previewDigestsAll,
      courses: previewDigestCourses,
      communities: previewDigestCommunities,
      tutors: previewDigestTutors
    };

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
        metadata: JSON.stringify({ cohort: 'operations', previewDigests: previewDigestsByEntity.all })
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
        metadata: JSON.stringify({ category: 'operations', previewDigests: previewDigestsByEntity.communities })
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
        metadata: JSON.stringify({ track: 'automation', previewDigests: previewDigestsByEntity.courses })
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
        metadata: JSON.stringify({ locale: 'global', previewDigests: previewDigestsByEntity.tutors })
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
        metadata: JSON.stringify({ cohort: 'growth', previewDigests: previewDigestsByEntity.all })
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
        metadata: JSON.stringify({ category: 'growth', previewDigests: previewDigestsByEntity.communities })
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
        metadata: JSON.stringify({ track: 'commerce', previewDigests: previewDigestsByEntity.courses })
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
        metadata: JSON.stringify({ locale: 'emea', previewDigests: previewDigestsByEntity.tutors })
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
        metadata: JSON.stringify({ cohort: 'live-classroom', previewDigests: previewDigestsByEntity.all })
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
        metadata: JSON.stringify({ category: 'live', previewDigests: previewDigestsByEntity.communities })
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
        metadata: JSON.stringify({ track: 'delivery', previewDigests: previewDigestsByEntity.courses })
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
        metadata: JSON.stringify({ locale: 'amer', previewDigests: previewDigestsByEntity.tutors })
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

    await trx('support_articles').insert([
      {
        slug: 'live-classroom-reset',
        title: 'Stabilise a live classroom session',
        summary: 'Step-by-step recovery to restore frozen live classroom rooms and re-sync media.',
        category: 'Live classroom',
        keywords: JSON.stringify(['live classroom', 'troubleshooting', 'reset']),
        url: 'https://support.edulure.test/articles/live-classroom-reset',
        minutes: 5,
        helpfulness_score: 9.6
      },
      {
        slug: 'billing-reconcile-declines',
        title: 'Resolve recurring billing declines',
        summary: 'Checklist for reconciling recurring payment failures and communicating with learners.',
        category: 'Billing & payments',
        keywords: JSON.stringify(['billing', 'payments', 'declines']),
        url: 'https://support.edulure.test/articles/billing-reconcile-declines',
        minutes: 4,
        helpfulness_score: 8.8
      },
      {
        slug: 'course-content-refresh',
        title: 'Refresh stale course content for learners',
        summary: 'Guidance to regenerate course caches and notify enrolled learners when modules change.',
        category: 'Course access',
        keywords: JSON.stringify(['course', 'cache', 'refresh']),
        url: 'https://support.edulure.test/articles/course-content-refresh',
        minutes: 6,
        helpfulness_score: 8.1
      }
    ]);

    const supportCaseAlphaCreatedAt = new Date('2025-02-01T08:30:00Z');
    const supportCaseAlphaUpdatedAt = new Date('2025-02-01T09:10:00Z');
    const [supportCaseAlphaInsert] = await trx('learner_support_cases').insert(
      {
        user_id: learnerId,
        reference: 'SUP-1001',
        subject: 'Live classroom session frozen at 95%',
        category: 'Live classroom',
        priority: 'high',
        status: 'waiting',
        channel: 'Portal',
        owner: 'Mira Patel',
        last_agent: 'Mira Patel',
        escalation_breadcrumbs: JSON.stringify([
          {
            id: 'crumb-created',
            actor: 'learner',
            label: 'Ticket created',
            at: supportCaseAlphaCreatedAt.toISOString()
          },
          {
            id: 'crumb-escalated',
            actor: 'support',
            label: 'Escalated to live ops',
            note: 'Shift handed to live operations to recover frozen breakout rooms.',
            at: '2025-02-01T08:42:00Z'
          }
        ]),
        knowledge_suggestions: JSON.stringify([
          {
            id: 'live-classroom-reset',
            title: 'Stabilise a live classroom session',
            excerpt: 'Reset real-time channels and reissue instructor invites to unstick sessions at 95%.',
            url: 'https://support.edulure.test/articles/live-classroom-reset',
            category: 'Live classroom',
            minutes: 5
          }
        ]),
        ai_summary: 'Learner reported “Live classroom session frozen at 95%”. Priority: High.',
        follow_up_due_at: new Date('2025-02-01T12:30:00Z'),
        ai_summary_generated_at: new Date('2025-02-01T08:35:00Z'),
        metadata: JSON.stringify({
          intake: { channel: 'portal', attachments: 1 },
          firstResponseMinutes: 28
        }),
        created_at: supportCaseAlphaCreatedAt,
        updated_at: supportCaseAlphaUpdatedAt
      },
      ['id']
    );
    const supportCaseAlphaId =
      typeof supportCaseAlphaInsert === 'object' ? supportCaseAlphaInsert.id : supportCaseAlphaInsert;

    await trx('learner_support_messages').insert([
      {
        case_id: supportCaseAlphaId,
        author: 'learner',
        body: 'Learners report the live classroom stalls at 95% while joining. Restarted twice with same result.',
        attachments: JSON.stringify([
          { id: 'att-live-1', name: 'classroom-log.csv', size: 2048, url: null, type: 'text/csv' }
        ]),
        created_at: supportCaseAlphaCreatedAt
      },
      {
        case_id: supportCaseAlphaId,
        author: 'support',
        body: 'Reset realtime layer, escalated to operations for proactive monitoring.',
        attachments: JSON.stringify([]),
        created_at: new Date('2025-02-01T08:45:00Z')
      }
    ]);

    const supportCaseBetaCreatedAt = new Date('2025-02-04T14:10:00Z');
    const [supportCaseBetaInsert] = await trx('learner_support_cases').insert(
      {
        user_id: learnerId,
        reference: 'SUP-1002',
        subject: 'Recurring billing decline on premium plan',
        category: 'Billing & payments',
        priority: 'normal',
        status: 'open',
        channel: 'Portal',
        owner: 'Mira Patel',
        last_agent: 'Jordan Lee',
        escalation_breadcrumbs: JSON.stringify([
          {
            id: 'crumb-1002-created',
            actor: 'learner',
            label: 'Ticket created',
            at: supportCaseBetaCreatedAt.toISOString()
          }
        ]),
        knowledge_suggestions: JSON.stringify([
          {
            id: 'billing-reconcile-declines',
            title: 'Resolve recurring billing declines',
            excerpt: 'Run the retry playbook and notify learners when payment profiles need an update.',
            url: 'https://support.edulure.test/articles/billing-reconcile-declines',
            category: 'Billing & payments',
            minutes: 4
          },
          {
            id: 'course-content-refresh',
            title: 'Refresh stale course content for learners',
            excerpt: 'Rebuild cached modules after billing reinstatement to avoid access mismatch.',
            url: 'https://support.edulure.test/articles/course-content-refresh',
            category: 'Course access',
            minutes: 6
          }
        ]),
        ai_summary: 'Learner reported “Recurring billing decline on premium plan”. Priority: Normal.',
        follow_up_due_at: new Date('2025-02-05T14:10:00Z'),
        ai_summary_generated_at: new Date('2025-02-04T14:15:00Z'),
        metadata: JSON.stringify({
          intake: { channel: 'portal', attachments: 0 },
          renewalAmountCents: 12900
        }),
        created_at: supportCaseBetaCreatedAt,
        updated_at: supportCaseBetaCreatedAt
      },
      ['id']
    );
    const supportCaseBetaId = typeof supportCaseBetaInsert === 'object' ? supportCaseBetaInsert.id : supportCaseBetaInsert;

    await trx('learner_support_messages').insert([
      {
        case_id: supportCaseBetaId,
        author: 'learner',
        body: 'Card declined twice on renewal. Bank confirmed funds are available.',
        attachments: JSON.stringify([]),
        created_at: supportCaseBetaCreatedAt
      }
    ]);

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
      delivery_channels: JSON.stringify([]),
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

    const telemetryConsentScope = 'product.analytics';
    const telemetryConsentVersion = 'v1';
    const telemetryCorrelationId = 'governance-dashboard-seed';
    const telemetryBatchUuid = crypto.randomUUID();
    const telemetryBatchKey = 'warehouse/telemetry/seed-governance-dashboard.jsonl.gz';
    const telemetryOccurredAt = new Date('2025-04-05T10:15:00Z');
    const telemetryReceivedAt = new Date('2025-04-05T10:15:02Z');
    const telemetryPayload = {
      view: 'governance_overview',
      modulesLoaded: ['contracts', 'vendorAssessments', 'communications'],
      widgetTelemetry: {
        contractsRenewalCount: 3,
        highRiskVendors: 2,
        scheduledCommunications: 1
      }
    };
    const telemetryIpHash = makeHash('203.0.113.42');

    const [telemetryBatchId] = await trx(TELEMETRY_TABLES.EVENT_BATCHES).insert({
      batch_uuid: telemetryBatchUuid,
      status: 'exported',
      destination: 's3',
      events_count: 1,
      started_at: new Date('2025-04-05T10:20:00Z'),
      completed_at: new Date('2025-04-05T10:20:05Z'),
      file_key: telemetryBatchKey,
      checksum: makeHash('telemetry-seed-governance-dashboard'),
      metadata: JSON.stringify({ bucket: 'edulure-data-seeds', trigger: 'seed', previewCount: 1, byteLength: 4096 })
    });

    await trx(TELEMETRY_TABLES.CONSENT_LEDGER).insert({
      user_id: adminId,
      tenant_id: 'global',
      consent_scope: telemetryConsentScope,
      consent_version: telemetryConsentVersion,
      status: 'granted',
      is_active: true,
      recorded_at: telemetryReceivedAt,
      effective_at: telemetryReceivedAt,
      recorded_by: 'system',
      evidence: JSON.stringify({ method: 'seed-bootstrap', source: 'qa.fixture', ipHash: telemetryIpHash }),
      metadata: JSON.stringify({ seeded: true, notes: 'Bootstrap admin analytics consent' })
    });

    const telemetryDedupe = generateTelemetryDedupeHash({
      eventName: 'governance.dashboard.loaded',
      eventVersion: '2025.04',
      occurredAt: telemetryOccurredAt,
      userId: adminId,
      sessionId: 'seed-admin-session',
      correlationId: telemetryCorrelationId,
      payload: telemetryPayload
    });

    const [telemetryEventId] = await trx(TELEMETRY_TABLES.EVENTS).insert({
      tenant_id: 'global',
      schema_version: 'v1',
      event_name: 'governance.dashboard.loaded',
      event_version: '2025.04',
      event_source: 'web.admin',
      occurred_at: telemetryOccurredAt,
      received_at: telemetryReceivedAt,
      user_id: adminId,
      session_id: 'seed-admin-session',
      device_id: 'seed-device-mac',
      correlation_id: telemetryCorrelationId,
      consent_scope: telemetryConsentScope,
      consent_status: 'granted',
      ingestion_status: 'exported',
      ingestion_attempts: 1,
      last_ingestion_attempt: telemetryReceivedAt,
      export_batch_id: telemetryBatchId,
      dedupe_hash: telemetryDedupe,
      payload: JSON.stringify(telemetryPayload),
      context: JSON.stringify({
        actor: adminId,
        network: { ipHash: telemetryIpHash, userAgent: 'edulure-admin/seed' },
        location: { timezone: 'UTC' }
      }),
      metadata: JSON.stringify({
        consentVersion: telemetryConsentVersion,
        consentRecordedAt: telemetryReceivedAt,
        batchUuid: telemetryBatchUuid,
        seeded: true,
        exportHint: 'governance-dashboard'
      }),
      tags: JSON.stringify(['governance', 'dashboard', 'seed'])
    });

    const checkpointPreview = {
      lastEventId: telemetryEventId,
      lastEventOccurredAt: telemetryOccurredAt.toISOString(),
      exportedCount: 1,
      trigger: 'seed',
      batchUuid: telemetryBatchUuid
    };
    const checkpointHash = makeHash(JSON.stringify(checkpointPreview));
    const checkpointSealed = {
      ciphertext: null,
      keyId: 'seed-encryption',
      hash: checkpointHash
    };

    const batchMetadata = {
      bucket: 'edulure-data-seeds',
      trigger: 'seed',
      previewCount: 1,
      byteLength: 4096,
      checkpoint: checkpointSealed,
      checkpointPreview,
      hasBacklog: false
    };

    await trx(TELEMETRY_TABLES.EVENT_BATCHES)
      .where({ id: telemetryBatchId })
      .update({ metadata: JSON.stringify(batchMetadata) });

    await trx(TELEMETRY_TABLES.EVENTS)
      .where({ id: telemetryEventId })
      .update({
        metadata: JSON.stringify({
          consentVersion: telemetryConsentVersion,
          consentRecordedAt: telemetryReceivedAt,
          batchUuid: telemetryBatchUuid,
          seeded: true,
          exportHint: 'governance-dashboard',
          checkpointHash,
          destinationKey: telemetryBatchKey
        })
      });

    await trx(TELEMETRY_TABLES.FRESHNESS_MONITORS).insert([
      {
        pipeline_key: 'ingestion.raw',
        last_event_at: telemetryOccurredAt,
        status: 'healthy',
        threshold_minutes: 15,
        lag_seconds: 0,
        metadata: JSON.stringify({ lastEventId: telemetryEventId, source: 'seed' })
      },
      {
        pipeline_key: 'warehouse.export',
        last_event_at: telemetryOccurredAt,
        status: 'healthy',
        threshold_minutes: 30,
        lag_seconds: 45,
        metadata: JSON.stringify({
          batchUuid: telemetryBatchUuid,
          destinationKey: telemetryBatchKey,
          checkpoint: checkpointSealed,
          checkpointPreview,
          hasBacklog: false,
          eventsExported: 1,
          trigger: 'seed'
        })
      }
    ]);

    await trx(TELEMETRY_TABLES.LINEAGE_RUNS).insert({
      run_uuid: crypto.randomUUID(),
      tool: 'dbt',
      model_name: 'warehouse.telemetry_events',
      status: 'success',
      started_at: new Date('2025-04-05T10:20:00Z'),
      completed_at: new Date('2025-04-05T10:20:05Z'),
      input: JSON.stringify({ trigger: 'seed', eventIds: [telemetryEventId], batchUuid: telemetryBatchUuid }),
      output: JSON.stringify({ batchUuid: telemetryBatchUuid, destinationKey: telemetryBatchKey, rowCount: 1 }),
      metadata: JSON.stringify({
        trigger: 'seed',
        batchId: telemetryBatchId,
        destination: 's3',
        checkpointHash,
        hasBacklog: false
      })
    });

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

    const setupRunPublicId = crypto.randomUUID();
    const setupRunMetadata = {
      taskOrder: ['environment', 'database', 'search', 'backend', 'frontend'],
      preset: 'lite'
    };

    await trx('setup_runs').insert({
      public_id: setupRunPublicId,
      preset_id: 'lite',
      status: 'succeeded',
      started_at: new Date('2025-04-18T08:45:00Z'),
      completed_at: new Date('2025-04-18T08:53:45Z'),
      heartbeat_at: new Date('2025-04-18T08:53:45Z'),
      last_error: null,
      metadata: JSON.stringify(setupRunMetadata)
    });

    const setupRunRow = await trx('setup_runs')
      .select('id')
      .where({ public_id: setupRunPublicId })
      .first();

    await trx('setup_run_tasks').insert([
      {
        run_id: setupRunRow.id,
        task_id: 'environment',
        label: 'Write environment configuration',
        order_index: 0,
        status: 'succeeded',
        logs: JSON.stringify(['Wrote backend-nodejs/.env.local', 'Wrote frontend-reactjs/.env.local']),
        error: JSON.stringify({}),
        started_at: new Date('2025-04-18T08:45:00Z'),
        completed_at: new Date('2025-04-18T08:45:05Z')
      },
      {
        run_id: setupRunRow.id,
        task_id: 'database',
        label: 'Install database schema',
        order_index: 1,
        status: 'succeeded',
        logs: JSON.stringify(['Ran db:install and applied all migrations', 'Seeded baseline data set']),
        error: JSON.stringify({}),
        started_at: new Date('2025-04-18T08:45:05Z'),
        completed_at: new Date('2025-04-18T08:48:12Z')
      },
      {
        run_id: setupRunRow.id,
        task_id: 'search',
        label: 'Provision search cluster',
        order_index: 2,
        status: 'succeeded',
        logs: JSON.stringify(['Provisioned local Meilisearch instance with lite indexes']),
        error: JSON.stringify({}),
        started_at: new Date('2025-04-18T08:48:12Z'),
        completed_at: new Date('2025-04-18T08:49:30Z')
      },
      {
        run_id: setupRunRow.id,
        task_id: 'backend',
        label: 'Validate backend build',
        order_index: 3,
        status: 'succeeded',
        logs: JSON.stringify(['npm run lint --workspace backend-nodejs passed with 0 warnings']),
        error: JSON.stringify({}),
        started_at: new Date('2025-04-18T08:49:30Z'),
        completed_at: new Date('2025-04-18T08:51:10Z')
      },
      {
        run_id: setupRunRow.id,
        task_id: 'frontend',
        label: 'Build frontend assets',
        order_index: 4,
        status: 'succeeded',
        logs: JSON.stringify(['Built frontend-reactjs assets using Vite']),
        error: JSON.stringify({}),
        started_at: new Date('2025-04-18T08:51:10Z'),
        completed_at: new Date('2025-04-18T08:53:45Z')
      }
    ]);

    const telemetryNow = new Date();
    await trx(TELEMETRY_TABLES.FRESHNESS_MONITORS).insert([
      {
        pipeline_key: 'analytics.explorer.events',
        last_event_at: new Date(telemetryNow.getTime() - 5 * 60 * 1000),
        status: 'healthy',
        threshold_minutes: 15,
        lag_seconds: 5 * 60,
        metadata: JSON.stringify({ dataset: 'explorer_search', region: 'us-west-2' })
      },
      {
        pipeline_key: 'analytics.community.engagement',
        last_event_at: new Date(telemetryNow.getTime() - 32 * 60 * 1000),
        status: 'warning',
        threshold_minutes: 20,
        lag_seconds: 32 * 60,
        metadata: JSON.stringify({ dataset: 'community_posts', region: 'us-east-1' })
      },
      {
        pipeline_key: 'analytics.payments.revenue',
        last_event_at: new Date(telemetryNow.getTime() - 3 * 60 * 60 * 1000),
        status: 'critical',
        threshold_minutes: 30,
        lag_seconds: 3 * 60 * 60,
        metadata: JSON.stringify({ dataset: 'payment_intents', region: 'eu-central-1' })
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

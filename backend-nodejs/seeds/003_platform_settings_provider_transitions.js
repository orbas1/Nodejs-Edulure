import PlatformSettingModel from '../src/models/PlatformSettingModel.js';
import PlatformSettingsService from '../src/services/PlatformSettingsService.js';
import ProviderTransitionAnnouncementModel from '../src/models/ProviderTransitionAnnouncementModel.js';
import ProviderTransitionTimelineEntryModel from '../src/models/ProviderTransitionTimelineEntryModel.js';
import ProviderTransitionResourceModel from '../src/models/ProviderTransitionResourceModel.js';
import ProviderTransitionAcknowledgementModel from '../src/models/ProviderTransitionAcknowledgementModel.js';
import ProviderTransitionStatusUpdateModel from '../src/models/ProviderTransitionStatusUpdateModel.js';

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx('platform_settings').del();

    const [
      adminProfile,
      payment,
      email,
      security,
      finance,
      appearance,
      preferences,
      system,
      integrations,
      thirdParty,
      monetization
    ] = await Promise.all([
      PlatformSettingsService.getAdminProfileSettings(trx),
      PlatformSettingsService.getPaymentSettings(trx),
      PlatformSettingsService.getEmailSettings(trx),
      PlatformSettingsService.getSecuritySettings(trx),
      PlatformSettingsService.getFinanceSettings(trx),
      PlatformSettingsService.getAppearanceSettings(trx),
      PlatformSettingsService.getPreferenceSettings(trx),
      PlatformSettingsService.getSystemSettings(trx),
      PlatformSettingsService.getIntegrationSettings(trx),
      PlatformSettingsService.getThirdPartySettings(trx),
      PlatformSettingsService.getMonetizationSettings(trx)
    ]);

    await PlatformSettingModel.upsert('admin_profile', adminProfile, trx);
    await PlatformSettingModel.upsert('payment', payment, trx);
    await PlatformSettingModel.upsert('email', email, trx);
    await PlatformSettingModel.upsert('security', security, trx);
    await PlatformSettingModel.upsert('finance', finance, trx);
    await PlatformSettingModel.upsert('appearance', appearance, trx);
    await PlatformSettingModel.upsert('preferences', preferences, trx);
    await PlatformSettingModel.upsert('system', system, trx);
    await PlatformSettingModel.upsert('integrations', integrations, trx);
    await PlatformSettingModel.upsert('third_party', thirdParty, trx);
    await PlatformSettingModel.upsert('monetization', monetization, trx);

    await trx('provider_transition_status_updates').del();
    await trx('provider_transition_acknowledgements').del();
    await trx('provider_transition_timeline_entries').del();
    await trx('provider_transition_resources').del();
    await trx('provider_transition_announcements').del();

    const now = new Date();

    const paymentCutover = await ProviderTransitionAnnouncementModel.upsert(
      {
        slug: 'payment-service-cutover',
        title: 'Payment service cutover to Stripe Connect',
        summary: 'Transition merchant payment processing to the new Stripe Connect stack.',
        bodyMarkdown:
          '## Cutover overview\n\nWe are migrating all direct merchant payouts to Stripe Connect. Review the runbook, confirm sandbox tests, and acknowledge the change window. Operations will monitor transactions throughout the cutover.',
        status: 'active',
        effectiveFrom: new Date(now.getTime() - 60 * 60 * 1000),
        effectiveTo: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        ackRequired: true,
        ackDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        ownerEmail: 'ops@edulure.test',
        tenantScope: 'global',
        metadata: {
          provider: 'Stripe',
          phase: 'cutover',
          runbookUrl: 'https://support.edulure.test/runbooks/payment-connect-cutover'
        }
      },
      { connection: trx }
    );

    await ProviderTransitionTimelineEntryModel.bulkReplace(
      paymentCutover.id,
      [
        {
          occursOn: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          headline: 'Sandbox verification freeze',
          owner: 'Payments Guild',
          ctaLabel: 'View verification checklist',
          ctaUrl: 'https://support.edulure.test/payments/checklist',
          detailsMarkdown: 'Complete final sandbox transactions before the verification freeze begins.'
        },
        {
          occursOn: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          headline: 'Cutover command center opens',
          owner: 'Platform Operations',
          ctaLabel: 'Join command center',
          ctaUrl: 'https://meet.edulure.test/ops-command-center',
          detailsMarkdown: 'Operations and finance guilds join the command center for live monitoring.'
        }
      ],
      { connection: trx }
    );

    await ProviderTransitionResourceModel.bulkReplace(
      paymentCutover.id,
      [
        {
          label: 'Cutover runbook',
          url: 'https://support.edulure.test/payments/runbook',
          type: 'runbook',
          description: 'Detailed step-by-step runbook for the payment cutover.'
        },
        {
          label: 'Finance FAQ',
          url: 'https://support.edulure.test/payments/faq',
          type: 'faq',
          description: 'Frequently asked questions for finance approvers.'
        }
      ],
      { connection: trx }
    );

    await ProviderTransitionAcknowledgementModel.upsertForContact(
      paymentCutover.id,
      'finance-lead@alpha.school',
      {
        organisationName: 'Alpha School',
        contactName: 'Dina Flores',
        ackMethod: 'portal',
        followUpRequired: false,
        metadata: { region: 'EU' },
        acknowledgedAt: new Date(now.getTime() - 90 * 60 * 1000)
      },
      { connection: trx }
    );

    await ProviderTransitionAcknowledgementModel.upsertForContact(
      paymentCutover.id,
      'ops@beta.academy',
      {
        organisationName: 'Beta Academy',
        contactName: 'Noah Patel',
        ackMethod: 'webinar',
        followUpRequired: false,
        metadata: { region: 'US' },
        acknowledgedAt: new Date(now.getTime() - 45 * 60 * 1000)
      },
      { connection: trx }
    );

    await ProviderTransitionStatusUpdateModel.record(
      paymentCutover.id,
      {
        statusCode: 'testing',
        notes: 'Finance guild validated payout flows in sandbox.',
        recordedAt: new Date(now.getTime() - 30 * 60 * 1000)
      },
      { connection: trx }
    );

    await ProviderTransitionStatusUpdateModel.record(
      paymentCutover.id,
      {
        statusCode: 'migration-in-progress',
        notes: 'Cutover command center activated and monitoring transactions.',
        recordedAt: now
      },
      { connection: trx }
    );

    const videoMigration = await ProviderTransitionAnnouncementModel.upsert(
      {
        slug: 'video-delivery-network-migration',
        title: 'Video delivery network migration to global CDN',
        summary: 'Move all live classrooms and replays onto the new CDN footprint for lower latency.',
        bodyMarkdown:
          '## Migration summary\n\nThe media platform team is migrating video delivery to a new CDN. Regional providers must review the resource pack and signal readiness. Blocked accounts will stay on the legacy path until remediated.',
        status: 'scheduled',
        effectiveFrom: new Date(now.getTime() - 30 * 60 * 1000),
        effectiveTo: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        ackRequired: true,
        ackDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        ownerEmail: 'media@edulure.test',
        tenantScope: 'global',
        metadata: {
          provider: 'Edulure Media',
          phase: 'rollout',
          incidentContact: 'media-standby@edulure.test'
        }
      },
      { connection: trx }
    );

    await ProviderTransitionTimelineEntryModel.bulkReplace(
      videoMigration.id,
      [
        {
          occursOn: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          headline: 'CDN preflight checks',
          owner: 'Media Platform',
          ctaLabel: 'Download preflight script',
          ctaUrl: 'https://support.edulure.test/media/preflight',
          detailsMarkdown: 'Run the CDN preflight script across all origin regions and attach results.'
        },
        {
          occursOn: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          headline: 'Region rollout deadline',
          owner: 'Regional Operations',
          ctaLabel: 'Submit rollout confirmation',
          ctaUrl: 'https://support.edulure.test/media/rollout-confirm',
          detailsMarkdown: 'Confirm that your region has completed the migration playbook.'
        }
      ],
      { connection: trx }
    );

    await ProviderTransitionResourceModel.bulkReplace(
      videoMigration.id,
      [
        {
          label: 'Migration resource pack',
          url: 'https://support.edulure.test/media/migration-pack',
          type: 'guide',
          description: 'All assets required to complete the CDN migration.'
        },
        {
          label: 'Latency baseline dashboard',
          url: 'https://analytics.edulure.test/dashboards/media-latency',
          type: 'dashboard',
          description: 'Real-time monitoring for migration impact.'
        }
      ],
      { connection: trx }
    );

    await ProviderTransitionStatusUpdateModel.record(
      videoMigration.id,
      {
        statusCode: 'blocked',
        notes: 'APAC region awaiting security review before enabling new CDN path.',
        recordedAt: now
      },
      { connection: trx }
    );
  });
}

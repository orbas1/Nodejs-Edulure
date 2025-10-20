import { describe, expect, it } from 'vitest';

import {
  normaliseAppearance,
  normalisePreferences,
  normaliseSystem,
  normaliseIntegrations,
  normaliseThirdParty
} from '../src/services/PlatformSettingsService.js';

describe('PlatformSettingsService admin dashboards', () => {
  it('normalises appearance colours and media entries', () => {
    const result = normaliseAppearance({
      branding: {
        primaryColor: '#00ff00',
        secondaryColor: 'not-a-colour',
        accentColor: '#123',
        logoUrl: ' https://example.com/logo.svg '
      },
      mediaLibrary: [
        { id: 'asset-1', type: 'video', url: 'https://cdn.example.com/intro.mp4', featured: true },
        { id: 'asset-1', type: 'image', url: 'https://cdn.example.com/duplicate.png' },
        { type: 'image', url: '' }
      ]
    });

    expect(result.branding.primaryColor).toBe('#00FF00');
    expect(result.branding.secondaryColor).toBe('#9333EA');
    expect(result.branding.accentColor).toBe('#123');
    expect(result.branding.logoUrl).toBe('https://example.com/logo.svg');
    expect(result.mediaLibrary).toHaveLength(1);
    expect(result.mediaLibrary[0]).toMatchObject({
      id: 'asset-1',
      type: 'video',
      featured: true
    });
  });

  it('normalises localisation preferences', () => {
    const result = normalisePreferences({
      localisation: {
        defaultLanguage: 'FR',
        supportedLanguages: ['FR', ' fr ', 'EN'],
        currency: 'gbp',
        timezone: 'Europe/Paris'
      },
      communications: {
        supportEmail: 'support@domain.test',
        supportPhone: ' +44 1234 ',
        sendWeeklyDigest: false
      }
    });

    expect(result.localisation.defaultLanguage).toBe('fr');
    expect(result.localisation.supportedLanguages).toEqual(['fr', 'en']);
    expect(result.localisation.currency).toBe('GBP');
    expect(result.communications.supportPhone).toBe('+44 1234');
    expect(result.communications.sendWeeklyDigest).toBe(false);
  });

  it('normalises system retention and schedules', () => {
    const result = normaliseSystem({
      operations: {
        timezone: 'America/New_York',
        weeklyBackupDay: 'FRIDAY',
        dataRetentionDays: 9999
      },
      security: {
        sessionTimeoutMinutes: 2,
        allowSessionResume: false
      }
    });

    expect(result.operations.weeklyBackupDay).toBe('friday');
    expect(result.operations.dataRetentionDays).toBe(3650);
    expect(result.security.sessionTimeoutMinutes).toBe(5);
    expect(result.security.allowSessionResume).toBe(false);
  });

  it('normalises integrations arrays and de-duplicates IDs', () => {
    const result = normaliseIntegrations({
      webhooks: [
        { id: 'hook-1', name: 'CRM', url: 'https://hooks.example.com/crm', events: ['enrolment', 'ENROLMENT'], active: 1 },
        { id: 'hook-1', name: 'Duplicate', url: 'https://hooks.example.com/duplicate' }
      ],
      services: [
        { id: 'svc-1', provider: 'Stripe', status: 'paused', notes: 'Sync nightly' },
        { provider: 'Slack', status: 'invalid' }
      ]
    });

    expect(result.webhooks).toHaveLength(1);
    expect(result.webhooks[0].events).toEqual(['enrolment']);
    expect(result.webhooks[0].active).toBe(true);
    expect(result.services).toHaveLength(2);
    expect(result.services[1]).toMatchObject({ provider: 'Slack', status: 'active' });
  });

  it('normalises third-party credentials', () => {
    const result = normaliseThirdParty({
      credentials: [
        {
          provider: 'Salesforce',
          environment: 'Sandbox',
          status: 'DISABLED',
          maskedKey: '****6789 ',
          createdAt: '2024-10-01',
          lastRotatedAt: '2025-01-15'
        }
      ]
    });

    expect(result.credentials).toHaveLength(1);
    expect(result.credentials[0]).toMatchObject({
      provider: 'Salesforce',
      environment: 'sandbox',
      status: 'disabled',
      maskedKey: '****6789'
    });
  });
});

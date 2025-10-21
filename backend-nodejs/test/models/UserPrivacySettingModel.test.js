import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/models/UserPrivacySettingModel.js';

const {
  DEFAULT_SETTINGS,
  parseMetadata,
  serialiseMetadata,
  normaliseSettings,
  mapRecord
} = __testables;

describe('UserPrivacySettingModel helpers', () => {
  it('parses metadata from strings while merging defaults', () => {
    const fallback = { theme: 'light', locale: 'en' };
    expect(parseMetadata('{"theme":"dark"}', fallback)).toEqual({ theme: 'dark', locale: 'en' });
    expect(parseMetadata('   ', fallback)).toEqual(fallback);
    expect(parseMetadata({ timezone: 'UTC' }, fallback)).toEqual({ theme: 'light', locale: 'en', timezone: 'UTC' });
  });

  it('serialises metadata defensively', () => {
    expect(serialiseMetadata({ theme: 'dark' })).toBe('{"theme":"dark"}');
    expect(serialiseMetadata(' {"notifications":true} ')).toBe('{"notifications":true}');
    expect(serialiseMetadata('not-json')).toBe('{}');
    expect(serialiseMetadata(null)).toBe('{}');
  });

  it('normalises privacy settings using defaults', () => {
    const normalized = normaliseSettings({
      profileVisibility: 'followers',
      followApprovalRequired: 1,
      messagePermission: 'anyone',
      shareActivity: 0,
      metadata: { timezone: 'UTC' }
    });

    expect(normalized).toEqual({
      profileVisibility: 'followers',
      followApprovalRequired: true,
      messagePermission: 'anyone',
      shareActivity: false,
      metadata: { timezone: 'UTC' }
    });

    const fallback = normaliseSettings({ profileVisibility: 'invalid', messagePermission: 'nope' });
    expect(fallback.profileVisibility).toBe(DEFAULT_SETTINGS.profileVisibility);
    expect(fallback.messagePermission).toBe(DEFAULT_SETTINGS.messagePermission);
  });

  it('maps database records into safe domain objects', () => {
    const record = {
      id: 42,
      user_id: 'user-1',
      profile_visibility: 'private',
      follow_approval_required: 0,
      message_permission: 'none',
      share_activity: 1,
      metadata: '{"timezone":"UTC"}',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T01:00:00.000Z'
    };

    expect(mapRecord(record)).toEqual({
      id: 42,
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T01:00:00.000Z',
      profileVisibility: 'private',
      followApprovalRequired: false,
      messagePermission: 'none',
      shareActivity: true,
      metadata: { timezone: 'UTC' }
    });

    expect(mapRecord(null)).toBeNull();
  });
});

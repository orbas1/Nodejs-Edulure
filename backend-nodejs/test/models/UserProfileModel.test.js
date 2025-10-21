import { describe, expect, it } from 'vitest';

import { __testables } from '../../src/models/UserProfileModel.js';

const { mapUserProfileRecord, parseJsonColumn } = __testables;

describe('UserProfileModel helpers', () => {
  it('maps database records to domain objects with parsed json fields', () => {
    const record = {
      id: 1,
      userId: 'user-1',
      displayName: 'Test User',
      tagline: 'Learner advocate',
      location: 'Remote',
      avatarUrl: 'https://cdn.example/avatar.png',
      bannerUrl: 'https://cdn.example/banner.png',
      bio: 'Building the future of education.',
      socialLinks: '["twitter","github"]',
      metadata: '{"theme":"dark","timezone":"UTC"}',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    };

    const result = mapUserProfileRecord(record);

    expect(result).toMatchObject({
      id: 1,
      userId: 'user-1',
      displayName: 'Test User',
      tagline: 'Learner advocate',
      location: 'Remote',
      avatarUrl: 'https://cdn.example/avatar.png',
      bannerUrl: 'https://cdn.example/banner.png',
      bio: 'Building the future of education.',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    });
    expect(result.socialLinks).toEqual(['twitter', 'github']);
    expect(result.metadata).toEqual({ theme: 'dark', timezone: 'UTC' });
  });

  it('falls back to safe defaults when json data is invalid', () => {
    const record = {
      id: 2,
      user_id: 'user-2',
      display_name: 'Another User',
      social_links: 'not-json',
      metadata: 'invalid-json'
    };

    const result = mapUserProfileRecord(record);

    expect(result.socialLinks).toEqual([]);
    expect(result.metadata).toEqual({});
  });

  it('parseJsonColumn respects provided fallbacks', () => {
    expect(parseJsonColumn('[1,2,3]', [])).toEqual([1, 2, 3]);
    expect(parseJsonColumn('{"key":"value"}', {})).toEqual({ key: 'value' });
    expect(parseJsonColumn('', [])).toEqual([]);
    expect(parseJsonColumn('   ', {})).toEqual({});
    expect(parseJsonColumn(42, [])).toEqual([]);
  });
});

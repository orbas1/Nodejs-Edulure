import { describe, expect, it } from 'vitest';

import {
  buildRoleLabelFromUser,
  computeTrustIndicator,
  formatPersonDisplayName,
  mapFollowerItem,
  mapRecommendationItem,
  resolveRelationshipTagline,
  summariseNetworkMetrics
} from '../../src/utils/socialGraph.js';

describe('socialGraph utilities', () => {
  it('formats follower items with fallbacks', () => {
    const mapped = mapFollowerItem({
      user: { firstName: 'Eli', lastName: 'Stone', role: 'admin' },
      relationship: { metadata: { context: 'moderator invite' } }
    });

    expect(mapped.name).toBe('Eli Stone');
    expect(mapped.role).toBe('Admin');
    expect(mapped.tagline).toContain('Moderator invite');
    expect(mapped.trust).toBeGreaterThan(0);
  });

  it('maps recommendation entries with metadata cues', () => {
    const mapped = mapRecommendationItem({
      user: { email: 'user@example.com', role: 'learner' },
      recommendation: { metadata: { note: 'Top collaborator' }, mutualFollowersCount: 3, score: 82 }
    });

    expect(mapped.name).toBe('user@example.com');
    expect(mapped.tagline).toContain('Top collaborator');
    expect(mapped.mutualFollowers).toBe(3);
  });

  it('resolves helper utilities directly', () => {
    expect(buildRoleLabelFromUser({ role: 'mentor' })).toBe('Mentor');
    expect(formatPersonDisplayName({ email: 'fallback@example.com' })).toBe('fallback@example.com');
    expect(resolveRelationshipTagline({ reason: 'peer-review' })).toBe('Peer review');
    expect(computeTrustIndicator('seed')).toBeGreaterThan(0);
  });

  it('summarises network metrics safely', () => {
    const summary = summariseNetworkMetrics({
      followers: [
        { relationship: { status: 'active' } },
        { relationship: { status: 'pending' } }
      ],
      recommendations: [{}, {}]
    });

    expect(summary).toEqual({ followerCount: 2, recommendationCount: 2, pendingFollowers: 1 });
  });
});

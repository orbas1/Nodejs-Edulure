import { httpClient } from './httpClient.js';

function resolveFollowersPath(userId) {
  return userId ? `/social/users/${userId}/followers` : '/social/followers';
}

function resolveFollowingPath(userId) {
  return userId ? `/social/users/${userId}/following` : '/social/following';
}

function followersTag(userId, status = 'accepted') {
  return `social:followers:${userId ?? 'me'}:${status}`;
}

function followingTag(userId, status = 'accepted') {
  return `social:following:${userId ?? 'me'}:${status}`;
}

function recommendationsTag(userId) {
  return `social:recommendations:${userId ?? 'me'}`;
}

export async function fetchFollowers({
  token,
  userId,
  limit,
  offset,
  status,
  search,
  signal
} = {}) {
  const params = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  if (status) params.status = status;
  if (search) params.search = search;

  const path = resolveFollowersPath(userId);
  return httpClient.get(path, {
    token,
    params,
    signal,
    cache: { tags: [followersTag(userId, status ?? 'accepted')], ttl: 5_000 }
  });
}

export async function fetchFollowing({
  token,
  userId,
  limit,
  offset,
  status,
  search,
  signal
} = {}) {
  const params = {};
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  if (status) params.status = status;
  if (search) params.search = search;

  const path = resolveFollowingPath(userId);
  return httpClient.get(path, {
    token,
    params,
    signal,
    cache: { tags: [followingTag(userId, status ?? 'accepted')], ttl: 5_000 }
  });
}

export async function fetchFollowRecommendations({ token, limit, signal } = {}) {
  const params = {};
  if (limit !== undefined) params.limit = limit;

  return httpClient.get('/social/recommendations', {
    token,
    params,
    signal,
    cache: { tags: [recommendationsTag('me')], ttl: 10_000 }
  });
}

export async function followUser({ token, userId, payload = {}, signal } = {}) {
  if (!userId) {
    throw new Error('A target user identifier is required to follow');
  }

  const body = {
    source: payload.source ?? 'profile.follow',
    reason: payload.reason ?? null,
    metadata: payload.metadata ?? {}
  };

  return httpClient.post(`/social/follows/${userId}`, body, {
    token,
    signal,
    cache: { enabled: false },
    invalidateTags: [
      followersTag(userId, 'accepted'),
      followersTag(userId, 'pending'),
      followingTag('me', 'accepted'),
      recommendationsTag('me')
    ]
  });
}

export async function unfollowUser({ token, userId, signal } = {}) {
  if (!userId) {
    throw new Error('A target user identifier is required to unfollow');
  }

  return httpClient.delete(`/social/follows/${userId}`, {
    token,
    signal,
    cache: { enabled: false },
    invalidateTags: [
      followersTag(userId, 'accepted'),
      followingTag('me', 'accepted'),
      recommendationsTag('me')
    ]
  });
}

export async function approveFollowRequest({ token, userId, followerId, signal } = {}) {
  if (!userId || !followerId) {
    throw new Error('User and follower identifiers are required to approve a follow request');
  }

  return httpClient.post(`/social/users/${userId}/followers/${followerId}/approve`, {}, {
    token,
    signal,
    cache: { enabled: false },
    invalidateTags: [
      followersTag(userId, 'pending'),
      followersTag(userId, 'accepted')
    ]
  });
}

export async function declineFollowRequest({ token, userId, followerId, signal } = {}) {
  if (!userId || !followerId) {
    throw new Error('User and follower identifiers are required to decline a follow request');
  }

  return httpClient.post(`/social/users/${userId}/followers/${followerId}/decline`, {}, {
    token,
    signal,
    cache: { enabled: false },
    invalidateTags: [followersTag(userId, 'pending')]
  });
}

export const socialGraphCache = {
  followersTag,
  followingTag,
  recommendationsTag
};

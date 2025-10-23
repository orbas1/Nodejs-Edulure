import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig
} from './apiUtils.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

export async function fetchCommunities(token) {
  assertToken(token, 'list communities');
  const response = await httpClient.get('/communities', {
    token,
    cache: createListCacheConfig('communities:list', { ttl: 1000 * 60 * 5 })
  });
  return mapResponse(response);
}

export async function createCommunity({ token, payload }) {
  assertToken(token, 'create a community');
  const response = await httpClient.post('/communities', payload, {
    token,
    cache: createInvalidationConfig('communities:list')
  });
  return mapResponse(response);
}

export async function updateCommunity({ communityId, token, payload }) {
  assertToken(token, 'update a community');
  assertId(communityId, 'Community id');
  const response = await httpClient.patch(`/communities/${communityId}`, payload, {
    token,
    cache: createInvalidationConfig([
      'communities:list',
      `community:${communityId}:detail`,
      `community:${communityId}:feed`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export async function deleteCommunity({ communityId, token, reason }) {
  assertToken(token, 'delete a community');
  assertId(communityId, 'Community id');
  const response = await httpClient.delete(`/communities/${communityId}`, {
    token,
    body: reason ? { reason } : undefined,
    cache: createInvalidationConfig([
      'communities:list',
      `community:${communityId}:detail`,
      `community:${communityId}:feed`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export async function fetchCommunityDetail(communityId, token) {
  assertToken(token, 'load community details');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}`, {
    token,
    cache: createListCacheConfig(`community:${communityId}:detail`, { ttl: 1000 * 60 * 3 })
  });
  return mapResponse(response);
}

export async function fetchCommunityFeed({
  communityId,
  token,
  page = 1,
  perPage = 10,
  channelId,
  postType,
  visibility,
  query
}) {
  assertToken(token, 'load community feed');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}/posts`, {
    token,
    params: {
      page,
      perPage,
      channelId,
      postType,
      visibility,
      query
    },
    cache: createListCacheConfig(`community:${communityId}:feed`, { ttl: 1000 * 60 * 2 })
  });
  return mapResponse(response);
}

export async function fetchAggregatedFeed({ token, page = 1, perPage = 10, postType, visibility, query }) {
  assertToken(token, 'load aggregated community feed');
  const response = await httpClient.get('/communities/feed', {
    token,
    params: {
      page,
      perPage,
      postType,
      visibility,
      query
    },
    cache: createListCacheConfig('communities:aggregatedFeed', { ttl: 1000 * 60 * 2 })
  });
  return mapResponse(response);
}

export async function reactToCommunityPost({ communityId, postId, token, reaction = 'appreciate' }) {
  assertToken(token, 'react to a community post');
  assertId(communityId, 'Community id');
  assertId(postId, 'Post id');

  const response = await httpClient.post(
    `/communities/${communityId}/posts/${postId}/reactions`,
    { reaction },
    {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:feed`,
        `community:${communityId}:detail`,
        'communities:aggregatedFeed'
      ])
    }
  );

  return mapResponse(response);
}

export async function removeCommunityPostReaction({
  communityId,
  postId,
  token,
  reaction = 'appreciate'
}) {
  assertToken(token, 'remove a community post reaction');
  assertId(communityId, 'Community id');
  assertId(postId, 'Post id');

  const response = await httpClient.request(`/communities/${communityId}/posts/${postId}/reactions`, {
    method: 'DELETE',
    body: { reaction },
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:feed`,
      `community:${communityId}:detail`,
      'communities:aggregatedFeed'
    ])
  });

  return mapResponse(response);
}

export async function fetchCommunityResources({ communityId, token, limit = 6, offset = 0, resourceType }) {
  assertToken(token, 'load community resources');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}/resources`, {
    token,
    params: {
      limit,
      offset,
      resourceType
    },
    cache: createListCacheConfig(`community:${communityId}:resources`, { ttl: 1000 * 60 * 10 })
  });
  return mapResponse(response);
}

export async function createCommunityResource({ communityId, token, payload }) {
  assertToken(token, 'create community resources');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/resources`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:resources`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function updateCommunityResource({ communityId, resourceId, token, payload }) {
  assertToken(token, 'update community resources');
  assertId(communityId, 'Community id');
  assertId(resourceId, 'Resource id');
  const response = await httpClient.put(`/communities/${communityId}/resources/${resourceId}`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:resources`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function deleteCommunityResource({ communityId, resourceId, token }) {
  assertToken(token, 'delete community resources');
  assertId(communityId, 'Community id');
  assertId(resourceId, 'Resource id');
  const response = await httpClient.delete(`/communities/${communityId}/resources/${resourceId}`, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:resources`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function fetchCommunityMembers({ communityId, token, params = {}, signal } = {}) {
  assertToken(token, 'load community members');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}/members`, {
    token,
    signal,
    params,
    cache: createListCacheConfig(`community:${communityId}:members`, { ttl: 5000 })
  });
  return mapResponse(response);
}

export async function createCommunityMember({ communityId, token, payload }) {
  assertToken(token, 'add community members');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/members`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:members`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function updateCommunityMember({ communityId, userId, token, payload }) {
  assertToken(token, 'update community members');
  assertId(communityId, 'Community id');
  assertId(userId, 'User id');
  const response = await httpClient.patch(`/communities/${communityId}/members/${userId}`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:members`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function removeCommunityMember({ communityId, userId, token, payload }) {
  assertToken(token, 'remove community members');
  assertId(communityId, 'Community id');
  assertId(userId, 'User id');
  const response = await httpClient.delete(`/communities/${communityId}/members/${userId}`, {
    token,
    body: payload,
    cache: createInvalidationConfig([
      `community:${communityId}:members`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function createCommunityPost({ communityId, token, payload }) {
  assertToken(token, 'create community posts');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/posts`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:feed`,
      `community:${communityId}:resources`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export async function updateCommunityPost({ communityId, postId, token, payload }) {
  assertToken(token, 'update community posts');
  assertId(communityId, 'Community id');
  assertId(postId, 'Post id');
  const response = await httpClient.patch(`/communities/${communityId}/posts/${postId}`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:feed`,
      `community:${communityId}:detail`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export async function moderateCommunityPost({ communityId, postId, token, action, reason }) {
  assertToken(token, 'moderate community posts');
  assertId(communityId, 'Community id');
  assertId(postId, 'Post id');
  const response = await httpClient.post(
    `/communities/${communityId}/posts/${postId}/moderate`,
    { action, reason },
    {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:feed`,
        `community:${communityId}:detail`,
        'communities:aggregatedFeed'
      ])
    }
  );
  return mapResponse(response);
}

export async function removeCommunityPost({ communityId, postId, token, reason }) {
  assertToken(token, 'remove community posts');
  assertId(communityId, 'Community id');
  assertId(postId, 'Post id');
  const response = await httpClient.delete(`/communities/${communityId}/posts/${postId}`, {
    token,
    body: reason ? { reason } : undefined,
    cache: createInvalidationConfig([
      `community:${communityId}:feed`,
      `community:${communityId}:detail`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export function deleteCommunityPost(args) {
  return removeCommunityPost(args);
}

export async function joinCommunity({ communityId, token }) {
  assertToken(token, 'join a community');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/join`, {}, {
    token,
    cache: createInvalidationConfig([
      'communities:list',
      `community:${communityId}:detail`,
      `community:${communityId}:feed`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export async function leaveCommunity({ communityId, token, reason }) {
  assertToken(token, 'leave a community');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/leave`, { reason }, {
    token,
    cache: createInvalidationConfig([
      'communities:list',
      `community:${communityId}:detail`,
      `community:${communityId}:feed`,
      'communities:aggregatedFeed'
    ])
  });
  return mapResponse(response);
}

export async function publishCommunityRunbook({ communityId, token, payload }) {
  assertToken(token, 'publish community runbooks');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/operations/runbooks`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:detail`,
      `community:${communityId}:resources`
    ])
  });
  return mapResponse(response);
}

export async function fetchCommunityChatChannels({ communityId, token, signal } = {}) {
  assertToken(token, 'load community chat channels');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}/chat/channels`, {
    token,
    signal,
    cache: createListCacheConfig(`community:${communityId}:chat:channels`, { ttl: 5_000 })
  });
  return mapResponse(response);
}

export async function createCommunityChatChannel({ communityId, token, payload, signal } = {}) {
  assertToken(token, 'create community chat channels');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/chat/channels`, payload ?? {}, {
    token,
    signal,
    cache: createInvalidationConfig([
      `community:${communityId}:chat:channels`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function updateCommunityChatChannel({ communityId, channelId, token, payload, signal } = {}) {
  assertToken(token, 'update community chat channels');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.put(
    `/communities/${communityId}/chat/channels/${channelId}`,
    payload ?? {},
    {
      token,
      signal,
      cache: createInvalidationConfig([
        `community:${communityId}:chat:channels`,
        `community:${communityId}:detail`
      ])
    }
  );
  return mapResponse(response);
}

export async function deleteCommunityChatChannel({ communityId, channelId, token, signal } = {}) {
  assertToken(token, 'delete community chat channels');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.delete(`/communities/${communityId}/chat/channels/${channelId}`, {
    token,
    signal,
    cache: createInvalidationConfig([
      `community:${communityId}:chat:channels`,
      `community:${communityId}:detail`
    ])
  });
  return mapResponse(response);
}

export async function fetchCommunityChatMembers({ communityId, channelId, token, signal } = {}) {
  assertToken(token, 'load community chat members');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.get(`/communities/${communityId}/chat/channels/${channelId}/members`, {
    token,
    signal,
    cache: createListCacheConfig(`community:${communityId}:chat:members:${channelId}`, { ttl: 5_000 })
  });
  return mapResponse(response);
}

export async function upsertCommunityChatMember({ communityId, channelId, token, payload, signal } = {}) {
  assertToken(token, 'manage community chat members');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/members`,
    payload ?? {},
    {
      token,
      signal,
      cache: createInvalidationConfig([
        `community:${communityId}:chat:members:${channelId}`,
        `community:${communityId}:chat:channels`
      ])
    }
  );
  return mapResponse(response);
}

export async function removeCommunityChatMember({ communityId, channelId, userId, token, signal } = {}) {
  assertToken(token, 'remove community chat members');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  assertId(userId, 'User id');
  const response = await httpClient.delete(
    `/communities/${communityId}/chat/channels/${channelId}/members/${userId}`,
    {
      token,
      signal,
      cache: createInvalidationConfig([
        `community:${communityId}:chat:members:${channelId}`,
        `community:${communityId}:chat:channels`
      ])
    }
  );
  return mapResponse(response);
}

export async function fetchCommunityChatMessages({
  communityId,
  channelId,
  token,
  params,
  signal
} = {}) {
  const response = await httpClient.get(`/communities/${communityId}/chat/channels/${channelId}/messages`, {
    token,
    params,
    signal,
    cache: {
      ttl: 3_000,
      tags: [`community:${communityId}:chat:messages:${channelId}`]
    }
  });
  return mapResponse(response);
}

export async function postCommunityChatMessage({
  communityId,
  channelId,
  token,
  payload,
  signal
} = {}) {
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/messages`,
    payload ?? {},
    {
      token,
      signal,
      cache: {
        invalidateTags: [`community:${communityId}:chat:messages:${channelId}`, `community:${communityId}:chat:channels`]
      }
    }
  );
  return mapResponse(response);
}

export async function acknowledgeCommunityChat({ communityId, channelId, token, payload, signal } = {}) {
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/read`,
    payload ?? {},
    {
      token,
      signal,
      cache: {
        invalidateTags: [`community:${communityId}:chat:channels`]
      }
    }
  );
  return mapResponse(response);
}

export async function addCommunityChatReaction({
  communityId,
  channelId,
  messageId,
  token,
  payload,
  signal
} = {}) {
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/reactions`,
    payload ?? {},
    {
      token,
      signal,
      cache: {
        invalidateTags: [`community:${communityId}:chat:messages:${channelId}`]
      }
    }
  );
  return mapResponse(response);
}

export async function removeCommunityChatReaction({
  communityId,
  channelId,
  messageId,
  token,
  payload,
  signal
} = {}) {
  const response = await httpClient.delete(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/reactions`,
    {
      token,
      data: payload ?? {},
      signal,
      cache: {
        invalidateTags: [`community:${communityId}:chat:messages:${channelId}`]
      }
    }
  );
  return mapResponse(response);
}

export async function fetchCommunityChatPresence({ communityId, token, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/chat/presence`, {
    token,
    signal,
    cache: {
      ttl: 3_000,
      tags: [`community:${communityId}:chat:presence`]
    }
  });
  return mapResponse(response);
}

export async function updateCommunityChatPresence({ communityId, token, payload, signal } = {}) {
  const response = await httpClient.post(`/communities/${communityId}/chat/presence`, payload ?? {}, {
    token,
    signal,
    cache: {
      invalidateTags: [`community:${communityId}:chat:presence`]
    }
  });
  return mapResponse(response);
}

export async function acknowledgeCommunityEscalation({ communityId, escalationId, token, payload }) {
  const response = await httpClient.post(
    `/communities/${communityId}/operations/escalations/${escalationId}/acknowledge`,
    payload ?? {},
    {
      token
    }
  );
  return mapResponse(response);
}

export async function scheduleCommunityEvent({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/operations/events`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:events`, `community:${communityId}:feed`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityLiveDonation({ communityId, token, payload, signal } = {}) {
  const response = await httpClient.post(
    `/communities/${communityId}/live/donations`,
    payload ?? {},
    {
      token,
      signal,
      cache: {
        invalidateTags: [`community:${communityId}:funding`, `community:${communityId}:events`]
      }
    }
  );
  return mapResponse(response);
}

export async function listCommunityPaywallTiers({ communityId, token, includeInactive = false, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/paywall/tiers`, {
    token,
    signal,
    params: { includeInactive },
    cache: {
      ttl: 5_000,
      tags: [`community:${communityId}:paywall`]
    }
  });
  return mapResponse(response);
}

export async function startCommunitySubscriptionCheckout({ communityId, token, payload, signal } = {}) {
  const response = await httpClient.post(`/communities/${communityId}/paywall/checkout`, payload ?? {}, {
    token,
    signal,
    cache: {
      invalidateTags: [`community:${communityId}:subscriptions`, `community:${communityId}:revenue`]
    }
  });
  return mapResponse(response);
}

export async function listMyCommunitySubscriptions({ communityId, token, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/subscriptions/me`, {
    token,
    signal,
    cache: {
      ttl: 5_000,
      tags: [`community:${communityId}:subscriptions:me`]
    }
  });
  return mapResponse(response);
}

export async function cancelMyCommunitySubscription({ communityId, subscriptionId, token, payload, signal } = {}) {
  const response = await httpClient.post(
    `/communities/${communityId}/subscriptions/${subscriptionId}/cancel`,
    payload ?? {},
    {
      token,
      signal,
      cache: {
        invalidateTags: [`community:${communityId}:subscriptions`, `community:${communityId}:subscriptions:me`]
      }
    }
  );
  return mapResponse(response);
}

export async function fetchCommunitySponsorships({ communityId, token }) {
  const response = await httpClient.get(`/communities/${communityId}/sponsorships`, {
    token,
    cache: {
      ttl: 1000 * 60 * 5,
      tags: [`community:${communityId}:sponsorships`]
    }
  });
  return mapResponse(response);
}

export async function updateCommunitySponsorships({ communityId, token, blockedPlacementIds = [] }) {
  const response = await httpClient.put(
    `/communities/${communityId}/sponsorships`,
    { blockedPlacementIds },
    {
      token,
      cache: {
        invalidateTags: [
          `community:${communityId}:sponsorships`,
          `community:${communityId}:feed`,
          'communities:aggregatedFeed'
        ]
      }
    }
  );
  return mapResponse(response);
}

export async function updateCommunityTier({ communityId, tierId, token, payload }) {
  const response = await httpClient.patch(
    `/communities/${communityId}/operations/paywall/tiers/${tierId}`,
    payload,
    {
      token,
      cache: {
        invalidateTags: [`community:${communityId}:paywall`, `community:${communityId}:detail`]
      }
    }
  );
  return mapResponse(response);
}

export async function listCommunityTiers({ communityId, token, params = {}, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/paywall/tiers`, {
    token,
    signal,
    params,
    cache: {
      ttl: 5000,
      tags: [`community:${communityId}:paywall`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityTier({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/paywall/tiers`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:paywall`, `community:${communityId}:detail`]
    }
  });
  return mapResponse(response);
}

export async function deleteCommunityTier({ communityId, tierId, token }) {
  const response = await httpClient.delete(`/communities/${communityId}/paywall/tiers/${tierId}`, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:paywall`, `community:${communityId}:detail`]
    }
  });
  return mapResponse(response);
}

export async function fetchCommunityRevenueSummary({ communityId, token, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/monetization/summary`, {
    token,
    signal,
    cache: {
      ttl: 10_000,
      tags: [`community:${communityId}:revenue`]
    }
  });
  return mapResponse(response);
}

export async function listCommunitySubscriptions({ communityId, token, params = {}, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/subscriptions`, {
    token,
    signal,
    params,
    cache: {
      ttl: 5000,
      tags: [`community:${communityId}:subscriptions`]
    }
  });
  return mapResponse(response);
}

export async function updateCommunitySubscription({ communityId, subscriptionId, token, payload }) {
  const response = await httpClient.patch(`/communities/${communityId}/subscriptions/${subscriptionId}`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:subscriptions`, `community:${communityId}:revenue`]
    }
  });
  return mapResponse(response);
}

export async function resolveCommunityIncident({ communityId, incidentId, token, payload }) {
  const response = await httpClient.post(
    `/communities/${communityId}/operations/safety/${incidentId}/resolve`,
    payload ?? {},
    {
      token
    }
  );
  return mapResponse(response);
}

export async function fetchCommunityIncidents({ communityId, token, params = {}, signal } = {}) {
  const response = await httpClient.get(`/communities/${communityId}/operations/safety`, {
    token,
    signal,
    params,
    cache: {
      ttl: 5000,
      tags: [`community:${communityId}:incidents`]
    }
  });
  return mapResponse(response);
}

export async function listCommunityRoles({ communityId, token, signal }) {
  const response = await httpClient.get(`/communities/${communityId}/roles`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 30,
      tags: [`community:${communityId}:roles`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityRole({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/roles`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:roles`]
    }
  });
  return mapResponse(response);
}

export async function assignCommunityRole({ communityId, userId, token, payload }) {
  const response = await httpClient.patch(`/communities/${communityId}/members/${userId}/role`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:roles`]
    }
  });
  return mapResponse(response);
}

export async function listCommunityEvents({ communityId, token, params = {}, signal }) {
  const response = await httpClient.get(`/communities/${communityId}/events`, {
    token,
    signal,
    params: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      status: params.status ?? 'scheduled',
      order: params.order ?? 'asc'
    },
    cache: {
      ttl: 1000 * 30,
      tags: [`community:${communityId}:events`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityEvent({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/events`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:events`]
    }
  });
  return mapResponse(response);
}

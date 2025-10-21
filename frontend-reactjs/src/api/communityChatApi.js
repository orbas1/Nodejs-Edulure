import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig
} from './apiUtils.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null,
  message: response?.message ?? null
});

export async function listCommunityChannels({ communityId, token, signal }) {
  assertToken(token, 'list community chat channels');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}/chat/channels`, {
    token,
    signal,
    cache: createListCacheConfig(`community:${communityId}:chat:channels`, { ttl: 1000 * 30 })
  });
  return mapResponse(response);
}

export async function listCommunityMessages({
  communityId,
  channelId,
  token,
  signal,
  limit = 25,
  before,
  after,
  includeHidden = false
}) {
  assertToken(token, 'list community chat messages');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.get(`/communities/${communityId}/chat/channels/${channelId}/messages`, {
    token,
    signal,
    params: {
      limit,
      before: before ? new Date(before).toISOString() : undefined,
      after: after ? new Date(after).toISOString() : undefined,
      includeHidden
    },
    cache: createListCacheConfig(`community:${communityId}:chat:messages:${channelId}`, { ttl: 5_000 })
  });
  return mapResponse(response);
}

export async function postCommunityMessage({ communityId, channelId, token, payload }) {
  assertToken(token, 'post community chat messages');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.post(`/communities/${communityId}/chat/channels/${channelId}/messages`, payload, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:chat:channels`,
      `community:${communityId}:chat:messages:${channelId}`
    ])
  });
  return mapResponse(response);
}

export async function markCommunityChannelRead({ communityId, channelId, token, payload }) {
  assertToken(token, 'mark community channels as read');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  const response = await httpClient.post(`/communities/${communityId}/chat/channels/${channelId}/read`, payload ?? {}, {
    token,
    cache: createInvalidationConfig([
      `community:${communityId}:chat:channels`,
      `community:${communityId}:chat:messages:${channelId}`
    ])
  });
  return mapResponse(response);
}

export async function addCommunityMessageReaction({
  communityId,
  channelId,
  messageId,
  token,
  emoji
}) {
  assertToken(token, 'react to community messages');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  assertId(messageId, 'Message id');
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/reactions`,
    { emoji },
    {
      token,
      cache: createInvalidationConfig(`community:${communityId}:chat:messages:${channelId}`)
    }
  );
  return mapResponse(response);
}

export async function removeCommunityMessageReaction({
  communityId,
  channelId,
  messageId,
  token,
  emoji
}) {
  assertToken(token, 'remove community message reactions');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  assertId(messageId, 'Message id');
  const response = await httpClient.delete(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/reactions`,
    {
      token,
      body: { emoji },
      cache: createInvalidationConfig(`community:${communityId}:chat:messages:${channelId}`)
    }
  );
  return mapResponse(response);
}

export async function moderateCommunityMessage({
  communityId,
  channelId,
  messageId,
  token,
  payload
}) {
  assertToken(token, 'moderate community chat messages');
  assertId(communityId, 'Community id');
  assertId(channelId, 'Channel id');
  assertId(messageId, 'Message id');
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/moderate`,
    payload,
    {
      token,
      cache: createInvalidationConfig(`community:${communityId}:chat:messages:${channelId}`)
    }
  );
  return mapResponse(response);
}

export async function listCommunityPresence({ communityId, token, signal }) {
  assertToken(token, 'list community presence');
  assertId(communityId, 'Community id');
  const response = await httpClient.get(`/communities/${communityId}/chat/presence`, {
    token,
    signal,
    cache: createListCacheConfig(`community:${communityId}:chat:presence`, { ttl: 1000 * 15 })
  });
  return mapResponse(response);
}

export async function updateCommunityPresence({ communityId, token, payload }) {
  assertToken(token, 'update community presence');
  assertId(communityId, 'Community id');
  const response = await httpClient.post(`/communities/${communityId}/chat/presence`, payload, {
    token,
    cache: createInvalidationConfig(`community:${communityId}:chat:presence`)
  });
  return mapResponse(response);
}

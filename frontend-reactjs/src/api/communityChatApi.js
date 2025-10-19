import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null,
  message: response?.message ?? null
});

export async function listCommunityChannels({ communityId, token, signal }) {
  const response = await httpClient.get(`/communities/${communityId}/chat/channels`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 30,
      tags: [`community:${communityId}:chat:channels`]
    }
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
  const response = await httpClient.get(`/communities/${communityId}/chat/channels/${channelId}/messages`, {
    token,
    signal,
    params: {
      limit,
      before: before ? new Date(before).toISOString() : undefined,
      after: after ? new Date(after).toISOString() : undefined,
      includeHidden
    }
  });
  return mapResponse(response);
}

export async function postCommunityMessage({ communityId, channelId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/chat/channels/${channelId}/messages`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:chat:channels`, `community:${communityId}:chat:messages:${channelId}`]
    }
  });
  return mapResponse(response);
}

export async function markCommunityChannelRead({ communityId, channelId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/chat/channels/${channelId}/read`, payload ?? {}, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:chat:channels`, `community:${communityId}:chat:messages:${channelId}`]
    }
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
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/reactions`,
    { emoji },
    {
      token,
      cache: {
        invalidateTags: [`community:${communityId}:chat:messages:${channelId}`]
      }
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
  const response = await httpClient.delete(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/reactions`,
    {
      token,
      body: { emoji },
      cache: {
        invalidateTags: [`community:${communityId}:chat:messages:${channelId}`]
      }
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
  const response = await httpClient.post(
    `/communities/${communityId}/chat/channels/${channelId}/messages/${messageId}/moderate`,
    payload,
    {
      token,
      cache: {
        invalidateTags: [`community:${communityId}:chat:messages:${channelId}`]
      }
    }
  );
  return mapResponse(response);
}

export async function listCommunityPresence({ communityId, token, signal }) {
  const response = await httpClient.get(`/communities/${communityId}/chat/presence`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 15,
      tags: [`community:${communityId}:chat:presence`]
    }
  });
  return mapResponse(response);
}

export async function updateCommunityPresence({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/chat/presence`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:chat:presence`]
    }
  });
  return mapResponse(response);
}

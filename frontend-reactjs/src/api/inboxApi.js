import { httpClient } from './httpClient.js';

function ensureThreadId(threadId, action) {
  if (!threadId || (typeof threadId === 'string' && !threadId.trim())) {
    throw new Error(`A thread identifier is required to ${action}.`);
  }

  return encodeURIComponent(String(threadId).trim());
}

function ensurePayload(payload, action) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`A payload object is required to ${action}.`);
  }

  return payload;
}

function sanitiseParticipants(participants = []) {
  return Array.from(
    new Set(
      (Array.isArray(participants) ? participants : [participants])
        .filter(Boolean)
        .map((participant) => participant && participant.email ? participant : participant?.trim?.())
    )
  )
    .filter(Boolean)
    .map((participant) => {
      if (typeof participant === 'string') {
        return { email: participant.trim() };
      }

      const normalised = { ...participant };
      if (normalised.email) {
        normalised.email = normalised.email.trim();
      }
      return normalised;
    });
}

function normalisePagination(pagination = {}) {
  return {
    before: pagination.before ?? null,
    after: pagination.after ?? null,
    limit: Number.isFinite(Number(pagination.limit)) ? Number(pagination.limit) : null,
    hasMore: Boolean(pagination.hasMore ?? pagination.next ?? pagination.after)
  };
}

function normaliseThread(raw = {}) {
  return {
    id: raw.id ?? raw.threadId ?? null,
    subject: raw.subject ?? raw.title ?? null,
    lastMessageAt: raw.lastMessageAt ?? raw.updatedAt ?? null,
    unreadCount: Number.isFinite(Number(raw.unreadCount)) ? Number(raw.unreadCount) : 0,
    participants: sanitiseParticipants(raw.participants),
    isArchived: Boolean(raw.isArchived ?? raw.archived ?? false),
    isMuted: Boolean(raw.isMuted ?? raw.muted ?? false)
  };
}

export async function fetchThreads({ token, signal, search, tags } = {}) {
  const params = {};
  if (search) params.search = search;
  if (tags) params.tags = Array.isArray(tags) ? tags : [tags];

  const response = await httpClient.get('/chat/threads', {
    token,
    signal,
    params,
    cache: {
      ttl: 30_000,
      tags: ['chat:threads'],
      varyByToken: true
    }
  });

  const payload = response?.data ?? response;
  const threads = Array.isArray(payload) ? payload : Array.isArray(payload?.threads) ? payload.threads : [];

  return {
    threads: threads.map(normaliseThread),
    meta: response?.meta ?? payload?.meta ?? null
  };
}

export async function fetchThreadMessages(
  threadId,
  { token, signal, limit, before, after, direction } = {}
) {
  const safeThreadId = ensureThreadId(threadId, 'fetch thread messages');

  const params = {
    limit,
    before,
    after,
    direction
  };

  const response = await httpClient.get(`/chat/threads/${safeThreadId}/messages`, {
    token,
    signal,
    params
  });

  const payload = response?.data ?? response;
  const messages = Array.isArray(payload?.messages)
    ? payload.messages
    : Array.isArray(payload)
    ? payload
    : [];

  return {
    messages,
    pagination: normalisePagination(payload?.pagination ?? response?.meta?.pagination ?? {})
  };
}

export async function sendThreadMessage(threadId, payload, { token, signal, idempotencyKey } = {}) {
  const safeThreadId = ensureThreadId(threadId, 'send a message to the thread');
  const body = ensurePayload(payload, 'send a thread message');

  return httpClient.post(`/chat/threads/${safeThreadId}/messages`, body, {
    token,
    signal,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    invalidateTags: [`chat:thread:${safeThreadId}`, 'chat:threads']
  });
}

export async function markThreadRead(threadId, payload = {}, { token, signal } = {}) {
  const safeThreadId = ensureThreadId(threadId, 'mark the thread as read');

  return httpClient.post(`/chat/threads/${safeThreadId}/read`, payload, {
    token,
    signal,
    invalidateTags: [`chat:thread:${safeThreadId}`, 'chat:threads']
  });
}

export async function createThread({ token, subject, participants, initialMessage, signal } = {}) {
  if (!subject || !subject.trim()) {
    throw new Error('A subject is required to create a thread.');
  }

  const participantList = sanitiseParticipants(participants);
  if (!participantList.length) {
    throw new Error('At least one participant is required to create a thread.');
  }

  const payload = {
    subject: subject.trim(),
    participants: participantList,
    initialMessage: initialMessage ?? null
  };

  const response = await httpClient.post('/chat/threads', payload, {
    token,
    signal,
    invalidateTags: ['chat:threads']
  });

  const data = response?.data ?? response;
  return normaliseThread(data);
}

export async function updateThreadMetadata(threadId, { token, subject, participants, tags, signal } = {}) {
  const safeThreadId = ensureThreadId(threadId, 'update the thread');

  const payload = {};
  if (subject !== undefined) {
    if (!subject || !subject.trim()) {
      throw new Error('Subject cannot be empty when updating a thread.');
    }
    payload.subject = subject.trim();
  }
  if (participants !== undefined) {
    const participantList = sanitiseParticipants(participants);
    if (!participantList.length) {
      throw new Error('At least one participant must remain on the thread.');
    }
    payload.participants = participantList;
  }
  if (tags !== undefined) {
    payload.tags = Array.from(new Set((Array.isArray(tags) ? tags : [tags]).filter(Boolean)));
  }

  if (!Object.keys(payload).length) {
    throw new Error('At least one field must be provided to update the thread.');
  }

  const response = await httpClient.patch(`/chat/threads/${safeThreadId}`, payload, {
    token,
    signal,
    invalidateTags: [`chat:thread:${safeThreadId}`, 'chat:threads']
  });

  return normaliseThread(response?.data ?? response);
}

export async function archiveThread(threadId, { token, reason, signal } = {}) {
  const safeThreadId = ensureThreadId(threadId, 'archive the thread');

  const response = await httpClient.post(
    `/chat/threads/${safeThreadId}/archive`,
    reason ? { reason } : {},
    {
      token,
      signal,
      invalidateTags: [`chat:thread:${safeThreadId}`, 'chat:threads']
    }
  );

  return normaliseThread(response?.data ?? response);
}

export async function muteThread(threadId, { token, durationMinutes, signal } = {}) {
  const safeThreadId = ensureThreadId(threadId, 'mute the thread');

  const payload = {};
  if (durationMinutes !== undefined) {
    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Mute duration must be a positive number of minutes.');
    }
    payload.durationMinutes = duration;
  }

  const response = await httpClient.post(`/chat/threads/${safeThreadId}/mute`, payload, {
    token,
    signal,
    invalidateTags: [`chat:thread:${safeThreadId}`]
  });

  return normaliseThread(response?.data ?? response);
}

export async function fetchThreadParticipants(threadId, { token, signal } = {}) {
  const safeThreadId = ensureThreadId(threadId, 'fetch thread participants');

  const response = await httpClient.get(`/chat/threads/${safeThreadId}/participants`, {
    token,
    signal,
    cache: {
      ttl: 60_000,
      tags: [`chat:thread:${safeThreadId}:participants`],
      varyByToken: true
    }
  });

  const payload = response?.data ?? response;
  return sanitiseParticipants(payload);
}

export default {
  fetchThreads,
  fetchThreadMessages,
  sendThreadMessage,
  markThreadRead,
  createThread,
  updateThreadMetadata,
  archiveThread,
  muteThread,
  fetchThreadParticipants
};

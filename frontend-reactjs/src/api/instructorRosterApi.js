import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

const ensureSlotId = (slotId, action) => {
  if (!slotId || (typeof slotId === 'string' && !slotId.trim())) {
    throw new Error(`A roster slot identifier is required to ${action}.`);
  }

  return encodeURIComponent(String(slotId).trim());
};

export async function listInstructorRoster({ token, params, signal } = {}) {
  const response = await httpClient.get('/instructor/roster', {
    token,
    params,
    signal,
    cache: { invalidateTags: ['instructor:roster'] }
  });
  return mapResponse(response);
}

export async function fetchInstructorRosterSlot({ token, slotId, signal } = {}) {
  const safeId = ensureSlotId(slotId, 'fetch the roster slot');

  const response = await httpClient.get(`/instructor/roster/${safeId}`, {
    token,
    signal,
    cache: {
      ttl: 30_000,
      tags: [`instructor:roster:${safeId}`],
      varyByToken: true
    }
  });

  return mapResponse(response);
}

export async function createInstructorRosterEntry({ token, payload, signal } = {}) {
  const response = await httpClient.post('/instructor/roster', payload ?? {}, {
    token,
    signal,
    cache: { invalidateTags: ['instructor:roster'] }
  });
  return mapResponse(response);
}

export async function updateInstructorRosterEntry({ token, slotId, payload, signal } = {}) {
  const safeId = ensureSlotId(slotId, 'update the roster slot');

  const response = await httpClient.patch(`/instructor/roster/${safeId}`, payload ?? {}, {
    token,
    signal,
    cache: { invalidateTags: ['instructor:roster', `instructor:roster:${safeId}`] }
  });
  return mapResponse(response);
}

export async function deleteInstructorRosterEntry({ token, slotId, signal } = {}) {
  const safeId = ensureSlotId(slotId, 'remove the roster slot');

  const response = await httpClient.delete(`/instructor/roster/${safeId}`, {
    token,
    signal,
    cache: { invalidateTags: ['instructor:roster', `instructor:roster:${safeId}`] }
  });
  return mapResponse(response);
}

export async function bulkUpsertInstructorRoster({ token, entries, signal } = {}) {
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error('At least one roster entry is required to perform a bulk upsert.');
  }

  const response = await httpClient.put(
    '/instructor/roster/bulk',
    { entries },
    {
      token,
      signal,
      invalidateTags: ['instructor:roster']
    }
  );

  return mapResponse(response);
}

export async function swapInstructorRosterSlots({ token, sourceSlotId, targetSlotId, signal } = {}) {
  const sourceId = ensureSlotId(sourceSlotId, 'swap from the source slot');
  const targetId = ensureSlotId(targetSlotId, 'swap to the target slot');

  const response = await httpClient.post(
    `/instructor/roster/${sourceId}/swap`,
    { targetSlotId: targetId },
    {
      token,
      signal,
      invalidateTags: ['instructor:roster', `instructor:roster:${sourceId}`, `instructor:roster:${targetId}`]
    }
  );

  return mapResponse(response);
}

export const instructorRosterApi = {
  listInstructorRoster,
  fetchInstructorRosterSlot,
  createInstructorRosterEntry,
  updateInstructorRosterEntry,
  deleteInstructorRosterEntry,
  bulkUpsertInstructorRoster,
  swapInstructorRosterSlots
};

export default instructorRosterApi;

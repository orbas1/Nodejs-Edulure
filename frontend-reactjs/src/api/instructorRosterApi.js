import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

export async function listInstructorRoster({ token, params, signal } = {}) {
  const response = await httpClient.get('/instructor/roster', {
    token,
    params,
    signal,
    cache: { invalidateTags: ['instructor:roster'] }
  });
  return mapResponse(response);
}

export async function createInstructorRosterEntry({ token, payload }) {
  const response = await httpClient.post('/instructor/roster', payload, {
    token,
    cache: { invalidateTags: ['instructor:roster'] }
  });
  return mapResponse(response);
}

export async function updateInstructorRosterEntry({ token, slotId, payload }) {
  const response = await httpClient.patch(`/instructor/roster/${slotId}`, payload, {
    token,
    cache: { invalidateTags: ['instructor:roster'] }
  });
  return mapResponse(response);
}

export async function deleteInstructorRosterEntry({ token, slotId }) {
  const response = await httpClient.delete(`/instructor/roster/${slotId}`, {
    token,
    cache: { invalidateTags: ['instructor:roster'] }
  });
  return mapResponse(response);
}

export const instructorRosterApi = {
  listInstructorRoster,
  createInstructorRosterEntry,
  updateInstructorRosterEntry,
  deleteInstructorRosterEntry
};

export default instructorRosterApi;

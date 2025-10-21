import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

const ensureBookingId = (bookingId, action) => {
  if (!bookingId || (typeof bookingId === 'string' && !bookingId.trim())) {
    throw new Error(`A booking identifier is required to ${action}.`);
  }

  return encodeURIComponent(String(bookingId).trim());
};

const ensurePayload = (payload, action) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`A payload object is required to ${action}.`);
  }
  return payload;
};

export async function listInstructorBookings({ token, params, signal } = {}) {
  const response = await httpClient.get('/instructor/bookings', {
    token,
    params,
    signal,
    cache: { invalidateTags: ['instructor:bookings'] }
  });
  return mapResponse(response);
}

export async function getInstructorBooking({ token, bookingId, signal } = {}) {
  const safeId = ensureBookingId(bookingId, 'retrieve the booking');

  const response = await httpClient.get(`/instructor/bookings/${safeId}`, {
    token,
    signal,
    cache: {
      ttl: 15_000,
      tags: [`instructor:bookings:${safeId}`],
      varyByToken: true
    }
  });

  return mapResponse(response);
}

export async function createInstructorBooking({ token, payload, signal } = {}) {
  const body = ensurePayload(payload, 'create the booking');

  const response = await httpClient.post('/instructor/bookings', body, {
    token,
    signal,
    cache: { invalidateTags: ['instructor:bookings'] }
  });
  return mapResponse(response);
}

export async function updateInstructorBooking({ token, bookingId, payload, signal } = {}) {
  const safeId = ensureBookingId(bookingId, 'update the booking');
  const body = ensurePayload(payload, 'update the booking');

  const response = await httpClient.patch(`/instructor/bookings/${safeId}`, body, {
    token,
    signal,
    cache: { invalidateTags: ['instructor:bookings', `instructor:bookings:${safeId}`] }
  });
  return mapResponse(response);
}

export async function confirmInstructorBooking({ token, bookingId, payload, signal } = {}) {
  const safeId = ensureBookingId(bookingId, 'confirm the booking');

  const response = await httpClient.post(
    `/instructor/bookings/${safeId}/confirm`,
    payload ?? {},
    {
      token,
      signal,
      invalidateTags: ['instructor:bookings', `instructor:bookings:${safeId}`]
    }
  );

  return mapResponse(response);
}

export async function rescheduleInstructorBooking({ token, bookingId, payload, signal } = {}) {
  const safeId = ensureBookingId(bookingId, 'reschedule the booking');
  const body = ensurePayload(payload, 'reschedule the booking');

  if (!body.startsAt && !body.starts_at) {
    throw new Error('A new start time is required to reschedule a booking.');
  }

  const response = await httpClient.post(
    `/instructor/bookings/${safeId}/reschedule`,
    body,
    {
      token,
      signal,
      invalidateTags: ['instructor:bookings', `instructor:bookings:${safeId}`]
    }
  );

  return mapResponse(response);
}

export async function cancelInstructorBooking({ token, bookingId, payload, signal } = {}) {
  const safeId = ensureBookingId(bookingId, 'cancel the booking');

  const response = await httpClient.delete(`/instructor/bookings/${safeId}`, {
    token,
    signal,
    body: payload ?? {},
    cache: { invalidateTags: ['instructor:bookings', `instructor:bookings:${safeId}`] }
  });
  return mapResponse(response);
}

export async function bulkCancelInstructorBookings({ token, bookingIds, reason, signal } = {}) {
  const ids = Array.isArray(bookingIds) ? bookingIds : [bookingIds];
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (!uniqueIds.length) {
    throw new Error('At least one booking identifier is required to cancel bookings.');
  }

  const response = await httpClient.post(
    '/instructor/bookings/bulk-cancel',
    {
      bookingIds: uniqueIds,
      reason: reason ?? null
    },
    {
      token,
      signal,
      invalidateTags: ['instructor:bookings', ...uniqueIds.map((id) => `instructor:bookings:${encodeURIComponent(id)}`)]
    }
  );

  return mapResponse(response);
}

export const instructorBookingsApi = {
  listInstructorBookings,
  getInstructorBooking,
  createInstructorBooking,
  updateInstructorBooking,
  confirmInstructorBooking,
  rescheduleInstructorBooking,
  cancelInstructorBooking,
  bulkCancelInstructorBookings
};

export default instructorBookingsApi;

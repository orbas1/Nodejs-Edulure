import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

const ensureBookingId = (bookingId, action) => {
  if (!bookingId) {
    throw new Error(`A booking identifier is required to ${action}.`);
  }
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

export async function createInstructorBooking({ token, payload }) {
  const response = await httpClient.post('/instructor/bookings', payload, {
    token,
    cache: { invalidateTags: ['instructor:bookings'] }
  });
  return mapResponse(response);
}

export async function updateInstructorBooking({ token, bookingId, payload }) {
  ensureBookingId(bookingId, 'update the booking');

  const response = await httpClient.patch(`/instructor/bookings/${bookingId}`, payload, {
    token,
    cache: { invalidateTags: ['instructor:bookings'] }
  });
  return mapResponse(response);
}

export async function cancelInstructorBooking({ token, bookingId, payload }) {
  ensureBookingId(bookingId, 'cancel the booking');

  const response = await httpClient.delete(`/instructor/bookings/${bookingId}`, {
    token,
    body: payload ?? {},
    cache: { invalidateTags: ['instructor:bookings'] }
  });
  return mapResponse(response);
}

export const instructorBookingsApi = {
  listInstructorBookings,
  createInstructorBooking,
  updateInstructorBooking,
  cancelInstructorBooking
};

export default instructorBookingsApi;

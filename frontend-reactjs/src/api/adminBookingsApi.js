import { httpClient } from './httpClient.js';

function normaliseList(response) {
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? {},
    pagination: response?.pagination ?? response?.meta?.pagination ?? null
  };
}

export function listBookings({ token, params, signal } = {}) {
  return httpClient.get('/admin/control/bookings', { token, params, signal }).then(normaliseList);
}

export function createBooking({ token, payload }) {
  return httpClient.post('/admin/control/bookings', payload, { token }).then((response) => response?.data ?? null);
}

export function updateBooking({ token, id, payload }) {
  if (!id) {
    throw new Error('Booking id is required');
  }
  return httpClient
    .put(`/admin/control/bookings/${id}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteBooking({ token, id }) {
  if (!id) {
    throw new Error('Booking id is required');
  }
  return httpClient.delete(`/admin/control/bookings/${id}`, { token }).then((response) => response?.data ?? null);
}

const adminBookingsApi = {
  listBookings,
  createBooking,
  updateBooking,
  deleteBooking
};

export default adminBookingsApi;

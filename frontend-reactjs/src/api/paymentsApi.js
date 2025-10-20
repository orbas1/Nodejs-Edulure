import { httpClient } from './httpClient.js';

export function createPaymentIntent({ token, payload, signal } = {}) {
  return httpClient
    .post('/payments', payload ?? {}, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

export function capturePayPalOrder({ token, paymentId, signal } = {}) {
  if (!paymentId) {
    throw new Error('A payment identifier is required to capture PayPal orders');
  }
  return httpClient
    .post(`/payments/paypal/${paymentId}/capture`, {}, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

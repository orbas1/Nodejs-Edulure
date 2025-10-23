import { httpClient } from './httpClient.js';

function ensureToken(token) {
  if (!token) {
    throw new Error('Authentication token is required to process payments');
  }
}

function normalisePaymentPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payment details are required to create a payment intent');
  }

  const provider = payload.provider?.trim();
  if (!provider) {
    throw new Error('A payment provider is required to create a payment intent');
  }

  const currency = payload.currency?.trim();
  if (!currency) {
    throw new Error('A payment currency is required to create a payment intent');
  }

  const amount = payload.amount;
  const hasAmount = amount !== undefined && Number.isFinite(Number(amount));
  const hasItems = Array.isArray(payload.items) && payload.items.length > 0;

  if (!hasAmount && !hasItems) {
    throw new Error('A payment intent requires either a non-negative amount or at least one line item.');
  }

  if (hasAmount) {
    const numericAmount = Number(amount);
    if (numericAmount < 0) {
      throw new Error('Payment amounts must be zero or greater.');
    }
    return { ...payload, provider, currency, amount: numericAmount };
  }

  return { ...payload, provider, currency };
}

export function createPaymentIntent({ token, payload, signal } = {}) {
  ensureToken(token);
  const requestPayload = normalisePaymentPayload(payload);

  return httpClient
    .post('/payments', requestPayload, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

export function createCheckoutSession({ token, payload, signal } = {}) {
  ensureToken(token);
  if (!payload || typeof payload !== 'object') {
    throw new Error('Checkout details are required to start a session');
  }

  return httpClient
    .post('/payments/checkout-session', payload, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

export function capturePayPalOrder({ token, paymentId, signal } = {}) {
  ensureToken(token);
  if (!paymentId) {
    throw new Error('A payment identifier is required to capture PayPal orders');
  }

  const safePaymentId = encodeURIComponent(paymentId);

  return httpClient
    .post(`/payments/paypal/${safePaymentId}/capture`, {}, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

export async function refundPayment({ token, paymentId, payload, signal } = {}) {
  ensureToken(token);
  if (!paymentId) {
    throw new Error('A payment identifier is required to issue a refund');
  }

  const response = await httpClient.post(`/payments/${encodeURIComponent(paymentId)}/refunds`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`payments:${paymentId}`]
  });

  return response?.data ?? response;
}

export async function listPaymentIntents({ token, params, signal } = {}) {
  ensureToken(token);

  const response = await httpClient.get('/payments', {
    token,
    params,
    signal,
    cache: {
      ttl: 30_000,
      tags: ['payments:intents'],
      varyByToken: true
    }
  });

  return response?.data ?? response;
}

export const paymentsApi = {
  createPaymentIntent,
  createCheckoutSession,
  capturePayPalOrder,
  refundPayment,
  listPaymentIntents
};

export default paymentsApi;

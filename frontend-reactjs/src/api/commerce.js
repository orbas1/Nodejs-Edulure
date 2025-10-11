import { httpClient } from './httpClient.js';

export async function createOrder(payload, { token } = {}) {
  const response = await httpClient.post('/commerce/orders', payload, {
    token
  });
  return response.data;
}

export async function captureOrder(orderNumber, { token } = {}) {
  const response = await httpClient.post(`/commerce/orders/${orderNumber}/capture`, null, {
    token
  });
  return response.data;
}

export async function refundOrder(orderNumber, payload, { token } = {}) {
  const response = await httpClient.post(`/commerce/orders/${orderNumber}/refunds`, payload, {
    token
  });
  return response.data;
}

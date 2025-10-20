import { beforeEach, describe, expect, it, vi } from 'vitest';

import PayPalGateway from '../../src/integrations/PayPalGateway.js';

const createBreaker = () => ({
  allowRequest: vi.fn().mockResolvedValue({ allowed: true }),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn()
});

describe('PayPalGateway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('retries retryable errors with exponential backoff', async () => {
    const ordersController = {
      createOrder: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { statusCode: 429 }))
        .mockResolvedValueOnce({ id: 'order-123' }),
      captureOrder: vi.fn()
    };
    const paymentsController = { refundCapturedPayment: vi.fn() };
    const circuitBreaker = createBreaker();

    const gateway = new PayPalGateway({
      ordersController,
      paymentsController,
      circuitBreaker,
      retry: { maxAttempts: 1, baseDelayMs: 25 },
      logger: { warn: vi.fn(), error: vi.fn() }
    });

    const promise = gateway.createOrder({ body: { intent: 'CAPTURE' }, requestId: 'req-1' });
    await vi.advanceTimersByTimeAsync(25);
    const result = await promise;

    expect(result).toEqual({ id: 'order-123' });
    expect(ordersController.createOrder).toHaveBeenCalledTimes(2);
    expect(circuitBreaker.recordFailure).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.recordSuccess).toHaveBeenCalledTimes(1);
  });

  it('throws immediately when circuit breaker denies the request', async () => {
    const ordersController = { createOrder: vi.fn(), captureOrder: vi.fn() };
    const paymentsController = { refundCapturedPayment: vi.fn() };
    const circuitBreaker = {
      allowRequest: vi.fn().mockResolvedValue({ allowed: false }),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn()
    };

    const gateway = new PayPalGateway({
      ordersController,
      paymentsController,
      circuitBreaker,
      logger: { warn: vi.fn(), error: vi.fn() }
    });

    await expect(
      gateway.createOrder({ body: { intent: 'CAPTURE' }, requestId: 'req-2' })
    ).rejects.toThrow(/PayPal circuit breaker is open/);
    expect(ordersController.createOrder).not.toHaveBeenCalled();
  });
});

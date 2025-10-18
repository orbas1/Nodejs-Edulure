import { setTimeout as delay } from 'node:timers/promises';

export default class PayPalGateway {
  constructor({ ordersController, paymentsController, circuitBreaker, retry, logger }) {
    if (!ordersController || !paymentsController) {
      throw new Error('PayPalGateway requires both orders and payments controllers.');
    }

    this.ordersController = ordersController;
    this.paymentsController = paymentsController;
    this.circuitBreaker = circuitBreaker;
    this.retry = {
      maxAttempts: retry?.maxAttempts ?? 0,
      baseDelayMs: retry?.baseDelayMs ?? 400
    };
    this.logger = logger ?? console;
  }

  isRetryable(error) {
    const status = error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.code;
    if (status === 429) {
      return true;
    }
    if (typeof status === 'number' && status >= 500) {
      return true;
    }
    return false;
  }

  async execute(operation, handler) {
    const breaker = this.circuitBreaker;
    const { allowed } = breaker ? await breaker.allowRequest() : { allowed: true };
    if (!allowed) {
      const error = new Error(`PayPal circuit breaker is open for operation ${operation}.`);
      error.code = 'CIRCUIT_OPEN';
      throw error;
    }

    let attempt = 0;
    let lastError;
    const maxAttempts = this.retry.maxAttempts;

    while (attempt <= maxAttempts) {
      attempt += 1;
      try {
        const result = await handler();
        if (breaker) {
          await breaker.recordSuccess();
        }
        return result;
      } catch (error) {
        lastError = error;
        if (breaker) {
          await breaker.recordFailure();
        }

        const shouldRetry = attempt <= maxAttempts && this.isRetryable(error);
        this.logger.warn({ err: error, attempt, operation }, 'PayPal operation failed');
        if (!shouldRetry) {
          throw error;
        }

        const delayMs = this.retry.baseDelayMs * attempt;
        await delay(delayMs);
      }
    }

    throw lastError;
  }

  async createOrder({ body, requestId, prefer = 'return=representation' }) {
    return this.execute('orders.create', () =>
      this.ordersController.createOrder({ body, paypalRequestId: requestId, prefer })
    );
  }

  async captureOrder({ orderId, requestId }) {
    return this.execute('orders.capture', () =>
      this.ordersController.captureOrder({ orderId, paypalRequestId: requestId })
    );
  }

  async refundCapture({ captureId, body, requestId }) {
    return this.execute('payments.refund', () =>
      this.paymentsController.refundCapturedPayment({
        captureId,
        body,
        paypalRequestId: requestId
      })
    );
  }
}

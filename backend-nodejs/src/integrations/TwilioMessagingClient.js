import { setTimeout as delay } from 'node:timers/promises';
import twilio from 'twilio';

export default class TwilioMessagingClient {
  constructor({
    accountSid,
    authToken,
    messagingServiceSid,
    fromNumber,
    sandboxFromNumber,
    environment = 'sandbox',
    circuitBreaker,
    retry,
    logger
  } = {}) {
    this.accountSid = accountSid ?? null;
    this.authToken = authToken ?? null;
    this.messagingServiceSid = messagingServiceSid ?? null;
    this.fromNumber = fromNumber ?? null;
    this.sandboxFromNumber = sandboxFromNumber ?? null;
    this.environment = environment;
    this.circuitBreaker = circuitBreaker;
    this.retry = {
      maxAttempts: retry?.maxAttempts ?? 3,
      baseDelayMs: retry?.baseDelayMs ?? 500
    };
    this.logger = logger ?? console;
    this.client = this.accountSid && this.authToken ? twilio(this.accountSid, this.authToken) : null;
  }

  isConfigured() {
    return Boolean(this.client);
  }

  resolveFromNumber() {
    if (this.messagingServiceSid) {
      return null;
    }

    if (this.environment === 'production') {
      return this.fromNumber;
    }

    return this.sandboxFromNumber ?? this.fromNumber;
  }

  isRetryable(error) {
    const status = error?.status ?? error?.statusCode ?? error?.code;
    if (status === 429) {
      return true;
    }
    if (typeof status === 'number' && status >= 500) {
      return true;
    }
    return false;
  }

  async execute(operation, handler, context = {}) {
    const breaker = this.circuitBreaker;
    const { allowed } = breaker ? await breaker.allowRequest() : { allowed: true };
    if (!allowed) {
      const error = new Error(`Twilio circuit breaker open for ${operation}.`);
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
        this.logger.warn({ err: error, attempt, operation, ...context }, 'Twilio operation failed');
        if (!shouldRetry) {
          throw error;
        }

        const delayMs = this.retry.baseDelayMs * attempt;
        await delay(delayMs);
      }
    }

    throw lastError;
  }

  async sendMessage({ to, body, statusCallback }) {
    if (!this.isConfigured()) {
      throw new Error('Twilio messaging is not configured.');
    }

    const payload = { body, to };
    if (statusCallback) {
      payload.statusCallback = statusCallback;
    }

    if (this.messagingServiceSid) {
      payload.messagingServiceSid = this.messagingServiceSid;
    } else {
      const from = this.resolveFromNumber();
      if (!from) {
        throw new Error('Twilio messaging requires a configured from number.');
      }
      payload.from = from;
    }

    return this.execute('messages.create', () => this.client.messages.create(payload), {
      to,
      hasCallback: Boolean(statusCallback)
    });
  }
}

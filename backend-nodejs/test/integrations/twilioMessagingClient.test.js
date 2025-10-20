import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TwilioMessagingClient from '../../src/integrations/TwilioMessagingClient.js';

const createLogger = () => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  child: vi.fn().mockReturnThis()
});

const twilioFactory = vi.hoisted(() => {
  const messages = { create: vi.fn() };
  const factory = vi.fn(() => ({ messages }));
  return { factory, messages };
});

vi.mock('twilio', () => ({
  default: twilioFactory.factory
}));

describe('TwilioMessagingClient', () => {
  let logger;

  beforeEach(() => {
    logger = createLogger();
    twilioFactory.messages.create.mockReset();
    twilioFactory.factory.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends SMS via messaging service when configured', async () => {
    twilioFactory.messages.create.mockResolvedValue({ sid: 'SM123' });
    const client = new TwilioMessagingClient({
      accountSid: 'AC123',
      authToken: 'token',
      messagingServiceSid: 'MG123',
      circuitBreaker: {
        allowRequest: vi.fn().mockResolvedValue({ allowed: true }),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn()
      },
      retry: { maxAttempts: 0 },
      logger
    });

    const result = await client.sendMessage({ to: '+15555550100', body: 'Hello' });

    expect(result).toEqual({ sid: 'SM123' });
    expect(twilioFactory.messages.create).toHaveBeenCalledWith({
      body: 'Hello',
      to: '+15555550100',
      messagingServiceSid: 'MG123'
    });
  });

  it('retries transient failures when sending messages', async () => {
    const breaker = {
      allowRequest: vi.fn().mockResolvedValue({ allowed: true }),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn()
    };
    const retryableError = Object.assign(new Error('Twilio timeout'), { status: 500 });
    twilioFactory.messages.create
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce({ sid: 'SM999' });

    const client = new TwilioMessagingClient({
      accountSid: 'AC123',
      authToken: 'token',
      fromNumber: '+15555550100',
      environment: 'production',
      circuitBreaker: breaker,
      retry: { maxAttempts: 1, baseDelayMs: 10 },
      logger
    });

    const sendPromise = client.sendMessage({ to: '+15555550123', body: 'Retry me' });
    await vi.advanceTimersByTimeAsync(10);
    const response = await sendPromise;

    expect(response).toEqual({ sid: 'SM999' });
    expect(twilioFactory.messages.create).toHaveBeenCalledTimes(2);
    expect(breaker.recordFailure).toHaveBeenCalledTimes(1);
    expect(breaker.recordSuccess).toHaveBeenCalledTimes(1);
  });
});

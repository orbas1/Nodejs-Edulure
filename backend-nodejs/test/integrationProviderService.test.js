import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    isProduction: false,
    redis: { enabled: false, lockPrefix: 'edulure:test' },
    payments: {
      stripe: {
        mode: 'live',
        secretKey: 'sk_live',
        sandboxSecretKey: 'sk_sandbox',
        webhookSecret: 'wh_live',
        sandboxWebhookSecret: 'wh_sandbox',
        retry: { attempts: 3 },
        webhook: { endpoint: '/webhook/stripe' },
        circuitBreaker: { failureThreshold: 5, cooldownSeconds: 60 }
      },
      paypal: {
        environment: 'sandbox',
        clientId: 'paypal-live',
        clientSecret: 'paypal-live-secret',
        sandboxClientId: 'paypal-sandbox',
        sandboxClientSecret: 'paypal-sandbox-secret',
        retry: { attempts: 2 },
        circuitBreaker: { failureThreshold: 3, cooldownSeconds: 45 }
      }
    },
    integrations: {
      cloudConvert: {
        apiKey: 'cloud-live',
        sandboxApiKey: 'cloud-sandbox',
        sandboxMode: true,
        baseUrl: 'https://api.cloudconvert.com',
        timeoutMs: 5000,
        retry: { attempts: 2 },
        circuitBreaker: { failureThreshold: 4, cooldownSeconds: 30 }
      }
    },
    messaging: {
      twilio: {
        accountSid: 'AC_TEST',
        authToken: 'AUTH',
        messagingServiceSid: 'MG_TEST',
        fromNumber: '+15550001111',
        sandboxFromNumber: '+15550002222',
        environment: 'sandbox',
        retry: { attempts: 2 },
        circuitBreaker: { failureThreshold: 2, cooldownSeconds: 10 }
      }
    }
  }
}));

const circuitBreakerInstances = [];
vi.mock('../src/integrations/IntegrationCircuitBreaker.js', () => ({
  default: vi.fn().mockImplementation((options) => {
    circuitBreakerInstances.push(options);
    return { ...options, name: options.key };
  })
}));

const stripeInstances = [];
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation((secret, options) => {
    stripeInstances.push({ secret, options });
    return { secret, options };
  })
}));

const paypalClients = [];
vi.mock('@paypal/paypal-server-sdk', () => ({
  Client: class {
    constructor(config) {
      paypalClients.push({ client: this, config });
    }
  },
  Environment: {
    Production: class {
      constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.mode = 'production';
      }
    },
    Sandbox: class {
      constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.mode = 'sandbox';
      }
    }
  },
  OrdersController: class {
    constructor(client) {
      this.client = client;
    }
  },
  PaymentsController: class {
    constructor(client) {
      this.client = client;
    }
  }
}));

const stripeGatewayInstances = [];
vi.mock('../src/integrations/StripeGateway.js', () => ({
  default: vi.fn().mockImplementation((config) => {
    stripeGatewayInstances.push(config);
    return { type: 'stripe', config };
  })
}));

const paypalGatewayInstances = [];
vi.mock('../src/integrations/PayPalGateway.js', () => ({
  default: vi.fn().mockImplementation((config) => {
    paypalGatewayInstances.push(config);
    return { type: 'paypal', config };
  })
}));

const cloudConvertInstances = [];
vi.mock('../src/integrations/CloudConvertClient.js', () => ({
  default: vi.fn().mockImplementation((config) => {
    cloudConvertInstances.push(config);
    return { type: 'cloudconvert', config };
  })
}));

const twilioInstances = [];
vi.mock('../src/integrations/TwilioMessagingClient.js', () => ({
  default: vi.fn().mockImplementation((config) => {
    twilioInstances.push(config);
    return { type: 'twilio', config };
  })
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: vi.fn(() => ({ child: vi.fn(() => ({})), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../src/services/IntegrationWebhookReceiptService.js', () => ({
  default: {}
}));

import IntegrationProviderService from '../src/services/IntegrationProviderService.js';

describe('IntegrationProviderService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-25T12:00:00.000Z'));
    IntegrationProviderService.resetCache();
    stripeGatewayInstances.length = 0;
    paypalGatewayInstances.length = 0;
    cloudConvertInstances.length = 0;
    twilioInstances.length = 0;
    circuitBreakerInstances.length = 0;
    stripeInstances.length = 0;
    paypalClients.length = 0;
  });

  it('caches the Stripe gateway within the TTL and refreshes after expiration', () => {
    const first = IntegrationProviderService.getStripeGateway();
    const second = IntegrationProviderService.getStripeGateway();

    expect(first).toBe(second);
    expect(stripeGatewayInstances).toHaveLength(1);
    expect(stripeInstances).toHaveLength(1);

    vi.advanceTimersByTime(5 * 60 * 1000 + 10);

    const third = IntegrationProviderService.getStripeGateway();
    expect(third).not.toBe(first);
    expect(stripeGatewayInstances).toHaveLength(2);
    expect(stripeInstances).toHaveLength(2);
  });

  it('builds a PayPal gateway using sandbox credentials when configured', () => {
    const gateway = IntegrationProviderService.getPayPalGateway();

    expect(gateway).toEqual(expect.objectContaining({ type: 'paypal' }));
    expect(paypalGatewayInstances).toHaveLength(1);
    expect(paypalClients).toHaveLength(1);
    expect(paypalGatewayInstances[0]).toMatchObject({ retry: { attempts: 2 } });
    expect(circuitBreakerInstances.some((instance) => instance.key.includes('paypal'))).toBe(true);
  });

  it('returns null when CloudConvert credentials are missing and resets cached client', async () => {
    const first = IntegrationProviderService.getCloudConvertClient();
    expect(first).toEqual(expect.objectContaining({ type: 'cloudconvert' }));

    // simulate configuration change with missing keys
    const { env } = await import('../src/config/env.js');
    env.integrations.cloudConvert.apiKey = '';
    env.integrations.cloudConvert.sandboxApiKey = '';

    IntegrationProviderService.resetCache('cloudconvert');

    const second = IntegrationProviderService.getCloudConvertClient();
    expect(second).toBeNull();
    expect(cloudConvertInstances).toHaveLength(1);

    env.integrations.cloudConvert.apiKey = 'cloud-live';
    env.integrations.cloudConvert.sandboxApiKey = 'cloud-sandbox';
  });

  it('describes providers that have been initialised', () => {
    IntegrationProviderService.getStripeGateway();
    IntegrationProviderService.getTwilioClient();
    const description = IntegrationProviderService.describeProviders();

    expect(description).toEqual({
      stripe: true,
      paypal: false,
      cloudConvert: false,
      twilio: true
    });
  });
});

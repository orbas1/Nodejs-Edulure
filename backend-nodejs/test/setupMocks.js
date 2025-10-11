import { vi } from 'vitest';

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: vi.fn(async () => ({ messageId: 'mock-message-id' }))
      }))
    }
  };
});

vi.mock('prom-client', () => {
  class Counter {
    constructor() {
      this.value = 0;
    }

    inc() {
      this.value += 1;
    }
  }

  class Histogram {
    constructor() {
      this.samples = [];
    }

    startTimer() {
      return (labels) => {
        this.samples.push({ labels, duration: 0 });
      };
    }

    observe(labels, value) {
      this.samples.push({ labels, value });
    }
  }

  class Gauge {
    constructor() {
      this.value = 0;
    }

    inc() {
      this.value += 1;
    }

    dec() {
      this.value -= 1;
    }
  }

  class Registry {
    constructor() {
      this.metrics = new Map();
    }

    setDefaultLabels() {}

    registerMetric(metric) {
      this.metrics.set(metric.name, metric);
    }

    getSingleMetric(name) {
      return this.metrics.get(name);
    }

    resetMetrics() {
      this.metrics.clear();
    }
  }

  return {
    Registry,
    Counter,
    Histogram,
    Gauge,
    collectDefaultMetrics: () => {}
  };
});

const stripeMockInstance = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
    capture: vi.fn()
  },
  refunds: {
    create: vi.fn()
  },
  webhooks: {
    constructEvent: vi.fn()
  }
};

const StripeConstructor = vi.fn(() => stripeMockInstance);
StripeConstructor.__mock = stripeMockInstance;

vi.mock('stripe', () => ({
  __esModule: true,
  default: StripeConstructor
}));

const paypalExecuteMock = vi.fn();

class MockEnvironment {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
}

class MockSandboxEnvironment extends MockEnvironment {
  constructor() {
    super('https://api-m.sandbox.paypal.com');
  }
}

class MockLiveEnvironment extends MockEnvironment {
  constructor() {
    super('https://api-m.paypal.com');
  }
}

class MockPayPalClient {
  constructor(environment) {
    this.environment = environment;
    this.execute = paypalExecuteMock;
  }
}

class BaseRequest {
  constructor(path, verb) {
    this.path = path;
    this.verb = verb;
    this.headers = {};
  }

  prefer(value) {
    this.headers.Prefer = value;
  }

  requestBody(body) {
    this.body = body;
  }
}

class OrdersCreateRequest extends BaseRequest {
  constructor() {
    super('/v2/checkout/orders', 'POST');
  }
}

class OrdersCaptureRequest extends BaseRequest {
  constructor(orderId) {
    super(`/v2/checkout/orders/${orderId}/capture`, 'POST');
  }
}

class CapturesRefundRequest extends BaseRequest {
  constructor(captureId) {
    super(`/v2/payments/captures/${captureId}/refund`, 'POST');
  }
}

const paypalMock = {
  core: {
    PayPalHttpClient: MockPayPalClient,
    LiveEnvironment: MockLiveEnvironment,
    SandboxEnvironment: MockSandboxEnvironment
  },
  orders: {
    OrdersCreateRequest,
    OrdersCaptureRequest
  },
  payments: {
    CapturesRefundRequest
  },
  __mock: {
    execute: paypalExecuteMock
  }
};

vi.mock('@paypal/checkout-server-sdk', () => ({
  __esModule: true,
  default: paypalMock,
  ...paypalMock
}));

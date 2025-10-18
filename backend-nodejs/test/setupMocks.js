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

    set(_labels, value) {
      this.value = value;
    }

    labels() {
      return {
        set: (value) => {
          this.value = value;
        }
      };
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

vi.mock('../src/models/FeatureFlagModel.js', () => ({
  default: {
    all: vi.fn(async () => []),
    allWithOverrides: vi.fn(async () => []),
    findByKey: vi.fn(async () => null),
    insert: vi.fn(async (definition) => ({ ...definition, id: 1, tenantOverrides: [] })),
    update: vi.fn(async (id, definition) => ({ ...definition, id, tenantOverrides: [] }))
  },
  FeatureFlagAuditModel: {
    record: vi.fn(async () => undefined),
    listForFlag: vi.fn(async () => [])
  },
  FeatureFlagTenantStateModel: {
    upsert: vi.fn(async () => ({})),
    remove: vi.fn(async () => 0),
    listForTenant: vi.fn(async () => []),
    listForFlag: vi.fn(async () => [])
  }
}));

vi.mock('../src/models/ConfigurationEntryModel.js', () => ({
  default: {
    all: vi.fn(async () => [])
  }
}));

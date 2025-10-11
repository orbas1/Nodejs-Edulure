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
    inc() {}
  }

  class Histogram {
    startTimer() {
      return () => {};
    }

    observe() {}
  }

  class Gauge {
    inc() {}
    dec() {}
  }

  class Registry {
    setDefaultLabels() {}
    registerMetric() {}
  }

  return {
    Registry,
    Counter,
    Histogram,
    Gauge,
    collectDefaultMetrics: () => {}
  };
});

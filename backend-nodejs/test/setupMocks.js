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

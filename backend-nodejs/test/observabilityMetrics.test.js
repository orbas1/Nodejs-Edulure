import { afterEach, describe, expect, it, vi } from 'vitest';

const baseEnv = {
  nodeEnv: 'test',
  logging: { serviceName: 'edulure-test' },
  payments: { defaultCurrency: 'usd' },
  environment: { name: 'test' },
  observability: {
    metrics: {
      enabled: true,
      username: null,
      password: null,
      bearerToken: null,
      allowedIps: []
    },
    slo: {
      defaults: {
        targetAvailability: 0.995,
        windowMinutes: 60,
        warningBurnRate: 2,
        criticalBurnRate: 4,
        minRequests: 10
      },
      bucketMinutes: 1,
      latencySampleSize: 64,
      definitions: []
    }
  }
};

function mergeDeep(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      mergeDeep(target[key], value);
    } else {
      target[key] = Array.isArray(value) ? [...value] : value;
    }
  }
  return target;
}

function createPromClientStub() {
  const store = {
    counters: new Map(),
    gauges: new Map(),
    histograms: new Map()
  };

  class Counter {
    constructor(config) {
      this.name = config.name;
      this.help = config.help;
      this.records = [];
      store.counters.set(this.name, this);
    }

    inc(arg1 = {}, arg2) {
      let labels = {};
      let value = 1;
      if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
        labels = arg1;
        if (typeof arg2 === 'number') {
          value = arg2;
        }
      } else if (typeof arg1 === 'number') {
        value = arg1;
      }
      this.records.push({ labels, value });
    }

    reset() {
      this.records = [];
    }

    toJSON() {
      return {
        name: this.name,
        help: this.help,
        type: 'counter',
        values: this.records.map((record) => ({
          metricName: this.name,
          labels: record.labels,
          value: record.value
        })),
        aggregator: 'sum'
      };
    }
  }

  class Gauge {
    constructor(config) {
      this.name = config.name;
      this.help = config.help;
      this.records = [];
      store.gauges.set(this.name, this);
    }

    inc(labels = {}, value = 1) {
      this.records.push({ type: 'inc', labels, value });
    }

    dec(labels = {}, value = 1) {
      this.records.push({ type: 'dec', labels, value });
    }

    set(labels = {}, value = 0) {
      this.records.push({ type: 'set', labels, value });
    }

    reset() {
      this.records = [];
    }

    toJSON() {
      return {
        name: this.name,
        help: this.help,
        type: 'gauge',
        values: this.records.map((record) => ({
          metricName: this.name,
          labels: record.labels,
          value: record.value,
          operation: record.type
        })),
        aggregator: 'sum'
      };
    }
  }

  class Histogram {
    constructor(config) {
      this.name = config.name;
      this.help = config.help;
      this.records = [];
      store.histograms.set(this.name, this);
    }

    observe(arg1 = {}, arg2) {
      let labels = {};
      let value = 0;
      if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
        labels = arg1;
        if (typeof arg2 === 'number') {
          value = arg2;
        }
      } else if (typeof arg1 === 'number') {
        value = arg1;
      }
      this.records.push({ labels, value });
    }

    startTimer(initialLabels = {}) {
      return (finalLabels = {}) => {
        this.observe({ ...initialLabels, ...finalLabels }, 0);
      };
    }

    reset() {
      this.records = [];
    }

    toJSON() {
      return {
        name: this.name,
        help: this.help,
        type: 'histogram',
        values: this.records.map((record) => ({
          metricName: this.name,
          labels: record.labels,
          value: record.value
        })),
        aggregator: 'sum'
      };
    }
  }

  class Registry {
    constructor() {
      this._metrics = new Map();
      this.defaultLabels = {};
      this.contentType = 'text/plain; version=0.0.4; charset=utf-8';
    }

    setDefaultLabels(labels) {
      this.defaultLabels = labels;
    }

    registerMetric(metric) {
      this._metrics.set(metric.name, metric);
    }

    metrics() {
      return '# HELP stub_metrics\n';
    }

    getMetricsAsJSON() {
      return Array.from(this._metrics.values()).map((metric) => metric.toJSON());
    }

    getSingleMetric(name) {
      return this._metrics.get(name);
    }

    resetMetrics() {
      this._metrics.forEach((metric) => {
        if (typeof metric.reset === 'function') {
          metric.reset();
        }
      });
    }
  }

  return {
    Counter,
    Gauge,
    Histogram,
    Registry,
    collectDefaultMetrics: () => ({ stop: () => {} }),
    __store: store
  };
}

async function importMetrics(overrides = {}) {
  vi.resetModules();
  const sloMock = { recordHttpSloObservation: vi.fn() };
  let promClientStore;
  vi.doMock('prom-client', () => {
    const stub = createPromClientStub();
    promClientStore = stub.__store;
    return stub;
  });
  vi.doMock('../src/config/env.js', () => ({
    env: mergeDeep(structuredClone(baseEnv), overrides)
  }));
  vi.doMock('../src/observability/sloRegistry.js', () => sloMock);
  const mod = await import('../src/observability/metrics.js');
  return { mod, sloMock, promClientStore };
}

function createMockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(payload) {
      this.body = payload;
    }
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('metrics handler security', () => {
  it('serves metrics with anti-caching headers when authorised', async () => {
    const { mod } = await importMetrics({ observability: { metrics: { allowedIps: ['127.0.0.1'] } } });
    const { metricsHandler } = mod;
    const res = createMockResponse();
    const next = vi.fn();

    await metricsHandler({ ip: '127.0.0.1', headers: {} }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.headers['content-type']).toBe('text/plain; version=0.0.4; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-store, max-age=0, must-revalidate');
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.body).toBe('# HELP stub_metrics\n');
  });

  it('rejects requests when metrics are disabled', async () => {
    const { mod } = await importMetrics({ observability: { metrics: { enabled: false } } });
    const { metricsHandler } = mod;
    const res = createMockResponse();
    const next = vi.fn();

    await metricsHandler({ ip: '127.0.0.1', headers: {} }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]?.status).toBe(503);
  });

  it('enforces bearer token authentication when configured', async () => {
    const { mod } = await importMetrics({
      observability: { metrics: { allowedIps: ['127.0.0.1'], bearerToken: 'secret-token' } }
    });
    const { metricsHandler } = mod;

    const resMissing = createMockResponse();
    const nextMissing = vi.fn();
    await metricsHandler({ ip: '127.0.0.1', headers: {} }, resMissing, nextMissing);
    expect(nextMissing).toHaveBeenCalledTimes(1);
    expect(nextMissing.mock.calls[0][0]?.status).toBe(401);
    expect(resMissing.headers['www-authenticate']).toBe('Bearer realm="metrics"');

    const resValid = createMockResponse();
    const nextValid = vi.fn();
    await metricsHandler(
      { ip: '127.0.0.1', headers: { authorization: 'Bearer secret-token' } },
      resValid,
      nextValid
    );
    expect(nextValid).not.toHaveBeenCalled();
    expect(resValid.body).toBe('# HELP stub_metrics\n');
  });

  it('blocks disallowed client IPs', async () => {
    const { mod } = await importMetrics({ observability: { metrics: { allowedIps: ['10.0.0.0/8'] } } });
    const { metricsHandler } = mod;

    const forbiddenRes = createMockResponse();
    const forbiddenNext = vi.fn();
    await metricsHandler({ ip: '203.0.113.5', headers: {} }, forbiddenRes, forbiddenNext);
    expect(forbiddenNext).toHaveBeenCalledTimes(1);
    expect(forbiddenNext.mock.calls[0][0]?.status).toBe(403);

    const allowedRes = createMockResponse();
    const allowedNext = vi.fn();
    await metricsHandler({ ip: '10.12.0.8', headers: {} }, allowedRes, allowedNext);
    expect(allowedNext).not.toHaveBeenCalled();
  });
});

describe('metrics instrumentation toggles', () => {
  it('records feature gate decisions only when metrics are enabled', async () => {
    const { mod: enabledMod, promClientStore: enabledStore } = await importMetrics();
    const { recordFeatureGateDecision, metricsRegistry } = enabledMod;
    metricsRegistry.resetMetrics();

    recordFeatureGateDecision({ flagKey: 'beta', result: 'allow', route: '/test', audience: 'staff' });

    const featureCounter = enabledStore.counters.get('edulure_feature_flag_gate_decisions_total');
    expect(featureCounter.records).toHaveLength(1);
    expect(featureCounter.records[0].labels.flag_key).toBe('beta');
    expect(featureCounter.records[0].value).toBe(1);

    const { mod: disabledMod, promClientStore: disabledStore } = await importMetrics({
      observability: { metrics: { enabled: false } }
    });
    const { recordFeatureGateDecision: disabledRecord, metricsRegistry: disabledRegistry } = disabledMod;
    disabledRegistry.resetMetrics();

    disabledRecord({ flagKey: 'beta', result: 'allow', route: '/test', audience: 'staff' });

    const disabledCounter = disabledStore.counters.get('edulure_feature_flag_gate_decisions_total');
    expect(disabledCounter.records).toHaveLength(0);
  });

  it('captures storage operation metrics only when enabled', async () => {
    const { mod: enabledMod, promClientStore: enabledStore } = await importMetrics();
    const { recordStorageOperation, metricsRegistry } = enabledMod;
    metricsRegistry.resetMetrics();

    await recordStorageOperation('upload', 'public', async () => ({ size: 2048 }));

    const durationHistogram = enabledStore.histograms.get('edulure_storage_operation_duration_seconds');
    expect(durationHistogram.records).toHaveLength(1);
    expect(durationHistogram.records[0].labels).toMatchObject({
      operation: 'upload',
      visibility: 'public',
      status: 'success'
    });

    const bytesHistogram = enabledStore.histograms.get('edulure_storage_transferred_bytes');
    expect(bytesHistogram.records).toHaveLength(1);
    expect(bytesHistogram.records[0].labels).toMatchObject({
      operation: 'upload',
      visibility: 'public',
      status: 'success'
    });
    expect(bytesHistogram.records[0].value).toBe(2048);

    const { mod: disabledMod, promClientStore: disabledStore } = await importMetrics({
      observability: { metrics: { enabled: false } }
    });
    const { recordStorageOperation: disabledOperation, metricsRegistry: disabledRegistry } = disabledMod;
    disabledRegistry.resetMetrics();

    await disabledOperation('upload', 'public', async () => ({ size: 4096 }));

    const disabledDuration = disabledStore.histograms.get('edulure_storage_operation_duration_seconds');
    expect(disabledDuration.records).toHaveLength(0);

    const disabledBytes = disabledStore.histograms.get('edulure_storage_transferred_bytes');
    expect(disabledBytes.records).toHaveLength(0);
  });
});

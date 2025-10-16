import crypto from 'node:crypto';

import * as promClient from 'prom-client';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { metricsRegistry } from '../observability/metrics.js';
import IntegrationWebhookSubscriptionModel from '../models/IntegrationWebhookSubscriptionModel.js';
import IntegrationWebhookEventModel from '../models/IntegrationWebhookEventModel.js';
import IntegrationWebhookDeliveryModel from '../models/IntegrationWebhookDeliveryModel.js';

const PUBLISHED_METRIC = 'edulure_webhook_events_published_total';
const DELIVERY_DURATION_METRIC = 'edulure_webhook_delivery_duration_seconds';
const DELIVERY_FAILURE_METRIC = 'edulure_webhook_delivery_failures_total';
const DELIVERY_SUCCESS_METRIC = 'edulure_webhook_delivery_success_total';
const DELIVERY_BATCH_METRIC = 'edulure_webhook_delivery_batch_size';

let publishedCounter = metricsRegistry.getSingleMetric(PUBLISHED_METRIC);
if (!publishedCounter) {
  publishedCounter = new promClient.Counter({
    name: PUBLISHED_METRIC,
    help: 'Webhook events published to the integration bus grouped by event type and source',
    labelNames: ['event_type', 'source']
  });
  metricsRegistry.registerMetric(publishedCounter);
}

let deliveryDurationHistogram = metricsRegistry.getSingleMetric(DELIVERY_DURATION_METRIC);
if (!deliveryDurationHistogram) {
  deliveryDurationHistogram = new promClient.Histogram({
    name: DELIVERY_DURATION_METRIC,
    help: 'Duration of webhook delivery attempts in seconds',
    labelNames: ['event_type', 'result'],
    buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30]
  });
  metricsRegistry.registerMetric(deliveryDurationHistogram);
}

let deliveryFailureCounter = metricsRegistry.getSingleMetric(DELIVERY_FAILURE_METRIC);
if (!deliveryFailureCounter) {
  deliveryFailureCounter = new promClient.Counter({
    name: DELIVERY_FAILURE_METRIC,
    help: 'Count of webhook delivery failures grouped by event type, target, and terminal status',
    labelNames: ['event_type', 'target', 'terminal']
  });
  metricsRegistry.registerMetric(deliveryFailureCounter);
}

let deliverySuccessCounter = metricsRegistry.getSingleMetric(DELIVERY_SUCCESS_METRIC);
if (!deliverySuccessCounter) {
  deliverySuccessCounter = new promClient.Counter({
    name: DELIVERY_SUCCESS_METRIC,
    help: 'Count of webhook deliveries completed successfully grouped by event type and target',
    labelNames: ['event_type', 'target']
  });
  metricsRegistry.registerMetric(deliverySuccessCounter);
}

let deliveryBatchGauge = metricsRegistry.getSingleMetric(DELIVERY_BATCH_METRIC);
if (!deliveryBatchGauge) {
  deliveryBatchGauge = new promClient.Gauge({
    name: DELIVERY_BATCH_METRIC,
    help: 'Number of deliveries processed per dispatcher iteration',
    labelNames: ['result']
  });
  metricsRegistry.registerMetric(deliveryBatchGauge);
}

function buildDefaultEnvConfig() {
  const config = env.integrations?.webhooks ?? {};
  return {
    enabled: config.enabled !== false,
    pollIntervalMs: Number(config.pollIntervalMs ?? 2000),
    batchSize: Number(config.batchSize ?? 25),
    maxAttempts: Number(config.maxAttempts ?? 6),
    initialBackoffSeconds: Number(config.initialBackoffSeconds ?? 60),
    maxBackoffSeconds: Number(config.maxBackoffSeconds ?? 1800),
    deliveryTimeoutMs: Number(config.deliveryTimeoutMs ?? 5000),
    recoverAfterMs: Number(config.recoverAfterMs ?? 5 * 60 * 1000)
  };
}

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class WebhookEventBusService {
  constructor({
    subscriptionModel = IntegrationWebhookSubscriptionModel,
    eventModel = IntegrationWebhookEventModel,
    deliveryModel = IntegrationWebhookDeliveryModel,
    connection = db,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    loggerInstance = logger.child({ service: 'webhook-event-bus' }),
    envConfig = buildDefaultEnvConfig(),
    randomImpl = Math.random
  } = {}) {
    this.subscriptionModel = subscriptionModel;
    this.eventModel = eventModel;
    this.deliveryModel = deliveryModel;
    this.connection = connection;
    this.fetch = fetchImpl;
    this.logger = loggerInstance;
    this.random = randomImpl;

    this.enabled = envConfig.enabled;
    this.pollIntervalMs = safeNumber(envConfig.pollIntervalMs, 2000);
    this.batchSize = Math.max(1, safeNumber(envConfig.batchSize, 25));
    this.maxAttemptsDefault = Math.max(1, safeNumber(envConfig.maxAttempts, 6));
    this.initialBackoffSeconds = Math.max(5, safeNumber(envConfig.initialBackoffSeconds, 60));
    this.maxBackoffSeconds = Math.max(
      this.initialBackoffSeconds,
      safeNumber(envConfig.maxBackoffSeconds, 1800)
    );
    this.deliveryTimeoutMs = Math.max(1000, safeNumber(envConfig.deliveryTimeoutMs, 5000));
    this.recoverAfterMs = Math.max(60_000, safeNumber(envConfig.recoverAfterMs, 5 * 60 * 1000));

    this.publishedCounter = publishedCounter;
    this.deliveryDurationHistogram = deliveryDurationHistogram;
    this.deliveryFailureCounter = deliveryFailureCounter;
    this.deliverySuccessCounter = deliverySuccessCounter;
    this.deliveryBatchGauge = deliveryBatchGauge;

    this.started = false;
    this.timer = null;
  }

  start() {
    if (!this.enabled) {
      this.logger.warn('Webhook event bus disabled by configuration');
      return;
    }

    if (this.started) {
      return;
    }

    if (!this.fetch) {
      throw new Error('WebhookEventBusService requires fetch implementation');
    }

    this.started = true;
    this.logger.info(
      { intervalMs: this.pollIntervalMs, batchSize: this.batchSize },
      'Webhook event bus started'
    );

    const loop = async () => {
      if (!this.started) {
        return;
      }

      try {
        await this.tick();
      } catch (error) {
        this.logger.error({ err: error }, 'Webhook event bus iteration failed');
      } finally {
        if (this.started) {
          this.timer = setTimeout(loop, this.pollIntervalMs);
          if (typeof this.timer.unref === 'function') {
            this.timer.unref();
          }
        }
      }
    };

    this.timer = setTimeout(loop, this.pollIntervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  stop() {
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async publish(eventType, payload, options = {}) {
    if (!this.enabled) {
      this.logger.debug({ eventType }, 'Skipping webhook publish – service disabled');
      return null;
    }

    if (!eventType) {
      throw new Error('WebhookEventBusService.publish requires an event type');
    }

    const {
      source = 'unknown',
      correlationId = crypto.randomUUID(),
      metadata,
      deliverAfter,
      connection
    } = options;

    const dbConnection = connection ?? this.connection;
    const subscriptions = await this.subscriptionModel.findForEvent(eventType, dbConnection);

    if (!subscriptions.length) {
      this.logger.debug({ eventType }, 'No webhook subscriptions registered for event');
      return null;
    }

    const event = await this.eventModel.create(
      { eventType, source, correlationId, payload, metadata },
      dbConnection
    );

    const deliveries = subscriptions.map((subscription) => {
      const nextAttemptBase = deliverAfter ? new Date(deliverAfter) : new Date();
      let nextAttemptAt = nextAttemptBase;

      if (subscription.circuitOpenUntil && subscription.circuitOpenUntil > nextAttemptAt) {
        nextAttemptAt = subscription.circuitOpenUntil;
      }

      return {
        eventId: event.id,
        subscriptionId: subscription.id,
        status: 'pending',
        maxAttempts: subscription.maxAttempts || this.maxAttemptsDefault,
        nextAttemptAt,
        deliveryHeaders: null
      };
    });

    await this.deliveryModel.enqueueMany(deliveries, dbConnection);

    this.publishedCounter.inc({ event_type: eventType, source }, 1);

    return event;
  }

  async tick() {
    await this.deliveryModel.recoverStuck({ olderThanMs: this.recoverAfterMs }, this.connection);

    const deliveries = await this.deliveryModel.claimPending(
      { limit: this.batchSize },
      this.connection
    );

    if (!deliveries.length) {
      this.deliveryBatchGauge.set({ result: 'empty' }, 0);
      return;
    }

    this.deliveryBatchGauge.set({ result: 'claimed' }, deliveries.length);

    const start = Date.now();

    await Promise.all(deliveries.map((delivery) => this.dispatchDelivery(delivery)));

    const durationSeconds = (Date.now() - start) / 1000;
    this.deliveryDurationHistogram.observe({ event_type: 'batch', result: 'complete' }, durationSeconds);
  }

  async dispatchDelivery(delivery) {
    const { event, subscription } = delivery;
    const attemptStartedAt = Date.now();

    if (!event || !subscription) {
      this.logger.warn({ deliveryId: delivery.id }, 'Skipping delivery missing event or subscription');
      return;
    }

    await this.eventModel.updateStatus(event.id, 'processing', this.connection);
    await this.eventModel.touchAttempt(event.id, new Date(), this.connection);

    const headers = this.buildHeaders({ delivery, event, subscription });
    const body = JSON.stringify({
      eventId: event.eventUuid,
      eventType: event.eventType,
      source: event.source,
      correlationId: event.correlationId,
      payload: event.payload,
      metadata: event.metadata ?? {},
      queuedAt: event.firstQueuedAt ? event.firstQueuedAt.toISOString() : null,
      attempt: delivery.attemptCount + 1
    });

    const controller = new AbortController();
    const timeout = subscription.deliveryTimeoutMs || this.deliveryTimeoutMs;
    const timeoutHandle = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await this.fetch(subscription.targetUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      });
      clearTimeout(timeoutHandle);

      const text = await response.text().catch(() => '');
      const durationSeconds = (Date.now() - attemptStartedAt) / 1000;

      if (response.ok) {
        await this.deliveryModel.markDelivered(
          delivery.id,
          {
            responseCode: response.status,
            responseBody: text.slice(0, 4000),
            headers,
            deliveredAt: new Date()
          },
          this.connection
        );

        await this.subscriptionModel.recordSuccess(subscription.id, this.connection);
        this.deliverySuccessCounter.inc(
          { event_type: event.eventType, target: subscription.targetUrl },
          1
        );
        this.deliveryDurationHistogram.observe(
          { event_type: event.eventType, result: 'success' },
          durationSeconds
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
    } catch (error) {
      clearTimeout(timeoutHandle);

      const attemptNumber = delivery.attemptCount + 1;
      const terminal = attemptNumber >= (delivery.maxAttempts || this.maxAttemptsDefault);
      const backoffSeconds = this.computeBackoffSeconds(attemptNumber, subscription);
      const nextAttemptAt = terminal ? null : new Date(Date.now() + backoffSeconds * 1000);

      await this.deliveryModel.markFailed(
        delivery.id,
        {
          errorCode: error.name ?? 'DeliveryError',
          errorMessage: error.message ?? 'Webhook delivery failed',
          nextAttemptAt,
          headers,
          terminal
        },
        this.connection
      );

      const nextFailureCount = subscription.consecutiveFailures + 1;
      let circuitOpenUntil;
      if (this.shouldOpenCircuit(nextFailureCount, subscription)) {
        circuitOpenUntil = new Date(
          Date.now() + (subscription.circuitBreakerDurationSeconds || 900) * 1000
        );
      }

      await this.subscriptionModel.recordFailure(
        subscription.id,
        {
          failureAt: new Date(),
          circuitOpenUntil,
          errorCode: error.name ?? 'DeliveryError'
        },
        this.connection
      );

      this.deliveryFailureCounter.inc(
        {
          event_type: event.eventType,
          target: subscription.targetUrl,
          terminal: String(terminal)
        },
        1
      );

      this.deliveryDurationHistogram.observe(
        { event_type: event.eventType, result: 'failure' },
        (Date.now() - attemptStartedAt) / 1000
      );

      this.logger.warn(
        {
          err: error,
          deliveryId: delivery.id,
          eventId: event.eventUuid,
          subscription: subscription.publicId,
          terminal,
          nextAttemptAt
        },
        'Webhook delivery attempt failed'
      );
    }

    await this.updateEventStatus(event.id);
  }

  async updateEventStatus(eventId) {
    const summary = await this.deliveryModel.summariseStatuses(eventId, this.connection);
    const pending = Number(summary.pending ?? 0) + Number(summary.delivering ?? 0);
    const succeeded = Number(summary.delivered ?? 0);
    const failed = Number(summary.failed ?? 0);

    if (pending > 0) {
      return;
    }

    if (failed > 0 && succeeded === 0) {
      await this.eventModel.markFailed(eventId, new Date(), this.connection);
    } else if (failed > 0 && succeeded > 0) {
      await this.eventModel.markPartial(eventId, new Date(), this.connection);
    } else {
      await this.eventModel.markDelivered(eventId, new Date(), this.connection);
    }
  }

  computeBackoffSeconds(attempt, subscription) {
    const base = Math.max(subscription.retryBackoffSeconds || this.initialBackoffSeconds, 5);
    const exponent = Math.min(attempt - 1, 5);
    const raw = base * 2 ** exponent;
    const capped = Math.min(raw, this.maxBackoffSeconds);
    const jitter = 0.75 + this.random() * 0.5; // between 0.75 and 1.25
    return Math.round(capped * jitter);
  }

  shouldOpenCircuit(nextFailureCount, subscription) {
    const threshold = subscription.circuitBreakerThreshold || 5;
    return nextFailureCount >= threshold;
  }

  buildHeaders({ delivery, event, subscription }) {
    const timestamp = new Date().toISOString();
    const attempt = delivery.attemptCount + 1;

    const headers = {
      'content-type': 'application/json',
      'user-agent': 'Edulure-WebhookDispatcher/1.0',
      'x-edulure-event': event.eventType,
      'x-edulure-delivery': delivery.deliveryUuid,
      'x-edulure-correlation': event.correlationId,
      'x-edulure-sent-at': timestamp,
      'x-edulure-attempt': String(attempt)
    };

    if (subscription.staticHeaders && typeof subscription.staticHeaders === 'object') {
      Object.entries(subscription.staticHeaders).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        headers[key.toLowerCase()] = String(value);
      });
    }

    const signature = this.buildSignature({
      body: JSON.stringify({
        eventId: event.eventUuid,
        eventType: event.eventType,
        source: event.source,
        correlationId: event.correlationId,
        payload: event.payload,
        metadata: event.metadata ?? {},
        queuedAt: event.firstQueuedAt ? event.firstQueuedAt.toISOString() : null,
        attempt
      }),
      timestamp,
      deliveryUuid: delivery.deliveryUuid,
      signingSecret: subscription.signingSecret
    });

    headers['x-edulure-signature'] = signature;

    return headers;
  }

  buildSignature({ body, timestamp, deliveryUuid, signingSecret }) {
    const secret = signingSecret ?? '';
    const payload = `${timestamp}.${deliveryUuid}.${body}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}

const webhookEventBusService = new WebhookEventBusService();

export default webhookEventBusService;

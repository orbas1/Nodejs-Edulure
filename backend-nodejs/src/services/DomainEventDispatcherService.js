import crypto from 'node:crypto';

import * as promClient from 'prom-client';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { metricsRegistry } from '../observability/metrics.js';
import DomainEventDispatchModel from '../models/DomainEventDispatchModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import DomainEventDeadLetterModel from '../models/DomainEventDeadLetterModel.js';
import webhookEventBusService from './WebhookEventBusService.js';

const ATTEMPTS_METRIC = 'edulure_domain_event_dispatch_attempts_total';
const DURATION_METRIC = 'edulure_domain_event_dispatch_duration_seconds';
const FAILURE_METRIC = 'edulure_domain_event_dispatch_failures_total';
const QUEUE_GAUGE_METRIC = 'edulure_domain_event_dispatch_queue_depth';
const DEAD_LETTER_GAUGE_METRIC = 'edulure_domain_event_dead_letters_total';

let attemptCounter = metricsRegistry.getSingleMetric(ATTEMPTS_METRIC);
if (!attemptCounter) {
  attemptCounter = new promClient.Counter({
    name: ATTEMPTS_METRIC,
    help: 'Number of domain event dispatch attempts grouped by event type and outcome',
    labelNames: ['event_type', 'outcome']
  });
  metricsRegistry.registerMetric(attemptCounter);
}

let durationHistogram = metricsRegistry.getSingleMetric(DURATION_METRIC);
if (!durationHistogram) {
  durationHistogram = new promClient.Histogram({
    name: DURATION_METRIC,
    help: 'Duration of domain event dispatch processing in seconds',
    labelNames: ['event_type', 'outcome'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30]
  });
  metricsRegistry.registerMetric(durationHistogram);
}

let failureCounter = metricsRegistry.getSingleMetric(FAILURE_METRIC);
if (!failureCounter) {
  failureCounter = new promClient.Counter({
    name: FAILURE_METRIC,
    help: 'Count of domain event dispatch failures grouped by event type and terminal status',
    labelNames: ['event_type', 'terminal']
  });
  metricsRegistry.registerMetric(failureCounter);
}

let queueGauge = metricsRegistry.getSingleMetric(QUEUE_GAUGE_METRIC);
if (!queueGauge) {
  queueGauge = new promClient.Gauge({
    name: QUEUE_GAUGE_METRIC,
    help: 'Number of domain events waiting for dispatch',
    labelNames: ['status']
  });
  metricsRegistry.registerMetric(queueGauge);
}

let deadLetterGauge = metricsRegistry.getSingleMetric(DEAD_LETTER_GAUGE_METRIC);
if (!deadLetterGauge) {
  deadLetterGauge = new promClient.Gauge({
    name: DEAD_LETTER_GAUGE_METRIC,
    help: 'Number of domain events stored in the dead-letter queue',
    labelNames: ['status']
  });
  metricsRegistry.registerMetric(deadLetterGauge);
}

function resolveConfig(source = {}) {
  return {
    enabled: source.enabled !== false,
    pollIntervalMs: Number(source.pollIntervalMs ?? 2000),
    batchSize: Number(source.batchSize ?? 50),
    maxAttempts: Number(source.maxAttempts ?? 8),
    initialBackoffSeconds: Number(source.initialBackoffSeconds ?? 30),
    maxBackoffSeconds: Number(source.maxBackoffSeconds ?? 900),
    backoffMultiplier: Number(source.backoffMultiplier ?? 2),
    jitterRatio: Number(source.jitterRatio ?? 0.15),
    recoverIntervalMs: Number(source.recoverIntervalMs ?? 60000),
    recoverTimeoutMinutes: Number(source.recoverTimeoutMinutes ?? 10),
    workerId:
      source.workerId ?? `domain-dispatcher-${process.pid}-${crypto.randomUUID().slice(0, 8)}`
  };
}

function computeBackoffSeconds({
  attemptNumber,
  initialBackoffSeconds,
  backoffMultiplier,
  maxBackoffSeconds,
  jitterRatio
}) {
  const exponential = initialBackoffSeconds * backoffMultiplier ** Math.max(attemptNumber - 1, 0);
  const capped = Math.min(exponential, maxBackoffSeconds);
  const jitter = capped * Math.min(Math.max(jitterRatio, 0), 0.5) * Math.random();
  return Math.max(initialBackoffSeconds, capped + jitter);
}

export class DomainEventDispatcherService {
  constructor({
    config = env.domainEvents?.dispatch ?? {},
    dispatchModel = DomainEventDispatchModel,
    eventModel = DomainEventModel,
    deadLetterModel = DomainEventDeadLetterModel,
    webhookBus = webhookEventBusService,
    loggerInstance = logger.child({ service: 'domain-event-dispatcher' })
  } = {}) {
    this.config = resolveConfig(config);
    this.dispatchModel = dispatchModel;
    this.eventModel = eventModel;
    this.deadLetterModel = deadLetterModel;
    this.webhookBus = webhookBus;
    this.logger = loggerInstance;

    this.enabled = Boolean(this.config.enabled);
    this.pollIntervalMs = Math.max(200, this.config.pollIntervalMs);
    this.batchSize = Math.max(1, this.config.batchSize);
    this.maxAttempts = Math.max(1, this.config.maxAttempts);
    this.initialBackoffSeconds = Math.max(5, this.config.initialBackoffSeconds);
    this.maxBackoffSeconds = Math.max(this.initialBackoffSeconds, this.config.maxBackoffSeconds);
    this.backoffMultiplier = Math.max(1, this.config.backoffMultiplier);
    this.jitterRatio = Math.max(0, this.config.jitterRatio);
    this.recoverIntervalMs = Math.max(5000, this.config.recoverIntervalMs);
    this.recoverTimeoutMinutes = Math.max(1, this.config.recoverTimeoutMinutes);
    this.workerId = this.config.workerId;

    this.started = false;
    this.timer = null;
    this.recoverTimer = null;
  }

  start() {
    if (!this.enabled) {
      this.logger.info('Domain event dispatcher disabled by configuration');
      return;
    }

    if (this.started) {
      return;
    }

    this.started = true;
    this.logger.info(
      {
        pollIntervalMs: this.pollIntervalMs,
        batchSize: this.batchSize,
        maxAttempts: this.maxAttempts,
        workerId: this.workerId
      },
      'Domain event dispatcher started'
    );

    this.scheduleTick();
    this.scheduleRecovery();
  }

  stop() {
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.recoverTimer) {
      clearTimeout(this.recoverTimer);
      this.recoverTimer = null;
    }
  }

  scheduleTick() {
    if (!this.started) {
      return;
    }

    this.timer = setTimeout(() => {
      this.tick()
        .catch((error) => {
          this.logger.error({ err: error }, 'Domain event dispatch tick failed');
        })
        .finally(() => {
          this.scheduleTick();
        });
    }, this.pollIntervalMs);

    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  scheduleRecovery() {
    if (!this.started) {
      return;
    }

    this.recoverTimer = setTimeout(() => {
      this.recover()
        .catch((error) => {
          this.logger.error({ err: error }, 'Domain event dispatcher recovery failed');
        })
        .finally(() => {
          this.scheduleRecovery();
        });
    }, this.recoverIntervalMs);

    if (typeof this.recoverTimer.unref === 'function') {
      this.recoverTimer.unref();
    }
  }

  async tick() {
    if (!this.started) {
      return;
    }

    const queueDepth = await this.dispatchModel.countPending();
    queueGauge.set({ status: 'pending' }, queueDepth);

    if (this.deadLetterModel?.count) {
      try {
        const deadLetters = await this.deadLetterModel.count();
        deadLetterGauge.set({ status: 'dead_letter' }, deadLetters);
      } catch (error) {
        this.logger.error({ err: error }, 'Failed to record domain event dead-letter gauge');
      }
    }

    const claimed = await this.dispatchModel.takeBatch(
      { limit: this.batchSize, workerId: this.workerId },
      undefined
    );

    if (!claimed.length) {
      return;
    }

    for (const dispatch of claimed) {
      // eslint-disable-next-line no-await-in-loop
      await this.processDispatch(dispatch);
    }
  }

  async recover() {
    if (!this.started) {
      return;
    }

    const recovered = await this.dispatchModel.recoverStuck({
      timeoutMinutes: this.recoverTimeoutMinutes
    });

    if (recovered.length) {
      this.logger.warn({ recovered: recovered.length }, 'Recovered stuck domain event dispatches');
    }
  }

  async processDispatch(dispatch) {
    const attemptNumber = dispatch.attemptCount + 1;
    let event;

    try {
      event = await this.eventModel.findById(dispatch.eventId);
    } catch (error) {
      this.logger.error({ err: error, dispatchId: dispatch.id }, 'Failed to load domain event');
      await this.dispatchModel.markFailed(dispatch.id, {
        error,
        nextAvailableAt: new Date(Date.now() + 60 * 1000)
      });
      return;
    }

    if (!event) {
      this.logger.warn({ dispatchId: dispatch.id, eventId: dispatch.eventId }, 'Domain event missing; acknowledging');
      await this.dispatchModel.markDelivered(dispatch.id, {
        deliveredAt: new Date(),
        metadata: { reason: 'missing_event' }
      });
      attemptCounter.inc({ event_type: 'unknown', outcome: 'acknowledged' }, 1);
      return;
    }

    const labels = { event_type: event.eventType || 'unknown' };
    const startedAt = Date.now();
    attemptCounter.inc({ ...labels, outcome: 'started' }, 1);

    try {
      const publishResult = await this.webhookBus.publish(event.eventType, event.payload, {
        source: 'domain-events',
        correlationId: `domain-event-${event.id}`,
        metadata: {
          entityType: event.entityType,
          entityId: event.entityId,
          performedBy: event.performedBy
        }
      });

      await this.dispatchModel.markDelivered(dispatch.id, {
        deliveredAt: new Date(),
        metadata: {
          attempts: attemptNumber,
          webhookEventId: publishResult?.id ?? null
        }
      });

      const durationSeconds = (Date.now() - startedAt) / 1000;
      durationHistogram.observe({ ...labels, outcome: 'success' }, durationSeconds);
      attemptCounter.inc({ ...labels, outcome: 'succeeded' }, 1);
    } catch (error) {
      const durationSeconds = (Date.now() - startedAt) / 1000;
      durationHistogram.observe({ ...labels, outcome: 'error' }, durationSeconds);

      const terminal = attemptNumber >= this.maxAttempts;
      const backoffSeconds = computeBackoffSeconds({
        attemptNumber,
        initialBackoffSeconds: this.initialBackoffSeconds,
        backoffMultiplier: this.backoffMultiplier,
        maxBackoffSeconds: this.maxBackoffSeconds,
        jitterRatio: this.jitterRatio
      });
      const nextAvailableAt = terminal ? null : new Date(Date.now() + backoffSeconds * 1000);

      await this.dispatchModel.markFailed(dispatch.id, {
        error,
        nextAvailableAt,
        terminal,
        metadata: {
          attempts: attemptNumber,
          backoffSeconds
        }
      });

      if (terminal && this.deadLetterModel?.record) {
        const failureReason = error?.code || error?.name || 'dispatch_failed';
        const failureMessage = error?.message || String(error);
        const stack = typeof error?.stack === 'string' ? error.stack.slice(0, 4000) : null;
        const deadLetterMetadata = {
          entityType: event.entityType ?? null,
          entityId: event.entityId ?? null,
          performedBy: event.performedBy ?? null,
          stack
        };
        try {
          await this.deadLetterModel.record({
            dispatchId: dispatch.id,
            eventId: event.id,
            eventType: event.eventType ?? 'unknown',
            attemptCount: attemptNumber,
            failureReason,
            failureMessage,
            eventPayload: event.payload ?? {},
            metadata: deadLetterMetadata
          });
        } catch (deadLetterError) {
          this.logger.error({ err: deadLetterError, dispatchId: dispatch.id }, 'Failed to persist domain event dead-letter entry');
        }
      }

      failureCounter.inc({ ...labels, terminal: terminal ? 'yes' : 'no' }, 1);
      attemptCounter.inc({ ...labels, outcome: terminal ? 'failed' : 'retry' }, 1);
    }
  }
}

const domainEventDispatcherService = new DomainEventDispatcherService();

export default domainEventDispatcherService;

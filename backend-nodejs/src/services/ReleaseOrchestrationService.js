import ReleaseChecklistItemModel from '../models/ReleaseChecklistItemModel.js';
import ReleaseRunModel from '../models/ReleaseRunModel.js';
import ReleaseGateResultModel from '../models/ReleaseGateResultModel.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import {
  recordReleaseGateEvaluation,
  recordReleaseRunStatus
} from '../observability/metrics.js';

const serviceLogger = logger.child({ module: 'release-orchestration-service' });

function normaliseVersionTag(versionTag) {
  return String(versionTag ?? '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function sanitiseEnvironment(environment) {
  return String(environment ?? 'production')
    .trim()
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
}

function serialiseChecklistSnapshot(items) {
  return items.map((item) => ({
    id: item.id,
    publicId: item.publicId,
    slug: item.slug,
    category: item.category,
    title: item.title,
    description: item.description,
    autoEvaluated: Boolean(item.autoEvaluated),
    weight: Number.parseInt(item.weight ?? 1, 10) || 1,
    defaultOwnerEmail: item.defaultOwnerEmail ?? null,
    successCriteria: item.successCriteria ?? {}
  }));
}

function calculateReadinessScore(gatesWithSnapshot) {
  let accumulated = 0;
  let totalWeight = 0;

  for (const gate of gatesWithSnapshot) {
    const weight = Number.parseInt(gate.snapshot?.weight ?? 1, 10) || 1;
    totalWeight += weight;

    switch (gate.status) {
      case 'pass':
      case 'waived':
        accumulated += weight;
        break;
      case 'in_progress':
        accumulated += weight * 0.5;
        break;
      default:
        break;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((accumulated / totalWeight) * 100);
}

function evaluateAgainstCriteria(metrics = {}, successCriteria = {}, runContext = {}) {
  const reasons = [];
  let derivedStatus = 'pass';

  if (successCriteria.minCoverage !== undefined) {
    const coverage = Number(metrics.coverage ?? metrics.testCoverage ?? 0);
    if (!Number.isFinite(coverage) || coverage <= 0) {
      derivedStatus = 'in_progress';
      reasons.push('Awaiting coverage metrics from CI.');
    } else if (coverage < Number(successCriteria.minCoverage)) {
      derivedStatus = 'fail';
      reasons.push(
        `Test coverage ${coverage.toFixed(2)} is below the required ${(successCriteria.minCoverage * 100).toFixed(1)}%.`
      );
    }
  }

  if (successCriteria.maxFailureRate !== undefined) {
    const failureRate = Number(metrics.testFailureRate ?? metrics.failureRate ?? 0);
    if (!Number.isFinite(failureRate)) {
      derivedStatus = derivedStatus === 'pass' ? 'in_progress' : derivedStatus;
      reasons.push('Test failure rate has not been reported.');
    } else if (failureRate > Number(successCriteria.maxFailureRate)) {
      derivedStatus = 'fail';
      reasons.push(
        `Test failure rate ${(failureRate * 100).toFixed(2)}% exceeds ${(successCriteria.maxFailureRate * 100).toFixed(2)}%.`
      );
    }
  }

  if (successCriteria.maxCriticalVulnerabilities !== undefined) {
    const critical = Number(metrics.criticalVulnerabilities ?? metrics.vulnerabilities?.critical ?? 0);
    if (!Number.isFinite(critical)) {
      derivedStatus = derivedStatus === 'pass' ? 'in_progress' : derivedStatus;
      reasons.push('Security scan results have not been ingested.');
    } else if (critical > Number(successCriteria.maxCriticalVulnerabilities)) {
      derivedStatus = 'fail';
      reasons.push(`Critical vulnerabilities (${critical}) must be ${successCriteria.maxCriticalVulnerabilities} or lower.`);
    }
  }

  if (successCriteria.maxHighVulnerabilities !== undefined) {
    const high = Number(metrics.highVulnerabilities ?? metrics.vulnerabilities?.high ?? 0);
    if (Number.isFinite(high) && high > Number(successCriteria.maxHighVulnerabilities)) {
      derivedStatus = 'fail';
      reasons.push(`High vulnerabilities (${high}) exceed the limit of ${successCriteria.maxHighVulnerabilities}.`);
    }
  }

  if (successCriteria.maxOpenIncidents !== undefined) {
    const openIncidents = Number(metrics.openIncidents ?? metrics.activeIncidents ?? 0);
    if (!Number.isFinite(openIncidents)) {
      derivedStatus = derivedStatus === 'pass' ? 'in_progress' : derivedStatus;
      reasons.push('Incident status metrics are still processing.');
    } else if (openIncidents > Number(successCriteria.maxOpenIncidents)) {
      derivedStatus = 'fail';
      reasons.push(`There are ${openIncidents} open incidents. Resolve incidents before proceeding.`);
    }
  }

  if (successCriteria.maxErrorRate !== undefined) {
    const errorRate = Number(metrics.errorRate ?? metrics.apmErrorRate ?? 0);
    if (Number.isFinite(errorRate) && errorRate > Number(successCriteria.maxErrorRate)) {
      derivedStatus = 'fail';
      reasons.push(
        `APM error rate ${(errorRate * 100).toFixed(2)}% is above ${(successCriteria.maxErrorRate * 100).toFixed(2)}%.`
      );
    }
  }

  if (successCriteria.changeReviewRequired) {
    if (!metrics.changeReviewCompleted) {
      derivedStatus = 'fail';
      reasons.push('Change review has not been approved by the release manager.');
    }
  }

  if (successCriteria.freezeWindowCheck) {
    const freezeBypassed = metrics.freezeWindowBypassed ?? false;
    if (freezeBypassed) {
      derivedStatus = 'fail';
      reasons.push('Deployment attempts to bypass an active freeze window.');
    } else if (runContext.changeWindowStart && runContext.changeWindowEnd) {
      const start = new Date(runContext.changeWindowStart).getTime();
      const end = new Date(runContext.changeWindowEnd).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
        derivedStatus = 'fail';
        reasons.push('Change window start must be before the end time.');
      }
    }
  }

  if (Array.isArray(successCriteria.requiredEvidence) && successCriteria.requiredEvidence.length > 0) {
    const provided = Array.isArray(metrics.evidence) ? metrics.evidence : [];
    const missing = successCriteria.requiredEvidence.filter((item) => !provided.includes(item));
    if (missing.length > 0) {
      derivedStatus = derivedStatus === 'pass' ? 'in_progress' : derivedStatus;
      reasons.push(`Evidence missing: ${missing.join(', ')}.`);
    }
  }

  return { status: derivedStatus, reasons };
}

class ReleaseOrchestrationService {
  constructor() {
    this.requiredGates = new Set(env.release?.requiredGates ?? []);
    this.defaultThresholds = env.release?.thresholds ?? {};
  }

  async listChecklist(filters = {}, pagination = {}) {
    const result = await ReleaseChecklistItemModel.list(filters, pagination);
    return {
      ...result,
      thresholds: this.defaultThresholds,
      requiredGates: Array.from(this.requiredGates)
    };
  }

  async scheduleReleaseRun(input) {
    const versionTag = normaliseVersionTag(input.versionTag);
    const environment = sanitiseEnvironment(input.environment);
    const initiatedByEmail = input.initiatedByEmail?.toLowerCase();
    if (!versionTag) {
      throw new Error('versionTag is required to schedule a release run.');
    }
    if (!initiatedByEmail) {
      throw new Error('initiatedByEmail is required to schedule a release run.');
    }

    const checklist = await ReleaseChecklistItemModel.list({}, { limit: 200 });
    const snapshot = serialiseChecklistSnapshot(checklist.items);
    const metadata = {
      ...input.metadata,
      requiredGates: Array.from(this.requiredGates.size ? this.requiredGates : new Set(snapshot.map((item) => item.slug))),
      thresholds: this.defaultThresholds,
      createdBy: initiatedByEmail,
      createdAt: new Date().toISOString(),
      changeTicket: input.changeTicket ?? null
    };

    const run = await ReleaseRunModel.create({
      versionTag,
      environment,
      status: 'scheduled',
      initiatedByEmail,
      initiatedByName: input.initiatedByName ?? null,
      scheduledAt: input.scheduledAt ?? new Date().toISOString(),
      changeWindowStart: input.changeWindowStart ?? null,
      changeWindowEnd: input.changeWindowEnd ?? null,
      summaryNotes: input.summaryNotes ?? null,
      checklistSnapshot: snapshot,
      metadata
    });

    serviceLogger.info(
      {
        runId: run.publicId,
        versionTag,
        environment,
        initiatedByEmail
      },
      'Scheduled release readiness run'
    );

    const gateSeed = input.initialGates ?? {};
    const createdGates = [];
    for (const item of snapshot) {
      const seed = gateSeed[item.slug] ?? {};
      const gate = await ReleaseGateResultModel.create({
        runId: run.id,
        checklistItemId: item.id,
        gateKey: item.slug,
        status: seed.status ?? 'pending',
        ownerEmail: seed.ownerEmail ?? item.defaultOwnerEmail ?? initiatedByEmail,
        metrics: seed.metrics ?? {},
        notes: seed.notes ?? null,
        lastEvaluatedAt: seed.lastEvaluatedAt ?? null
      });
      createdGates.push(gate);
      recordReleaseGateEvaluation({
        gateKey: gate.gateKey,
        status: gate.status,
        environment,
        versionTag
      });
    }

    recordReleaseRunStatus({
      status: run.status,
      environment,
      versionTag,
      readinessScore: 0
    });

    return {
      run,
      gates: createdGates
    };
  }

  async listRuns(filters = {}, pagination = {}) {
    return ReleaseRunModel.list(filters, pagination);
  }

  async getRun(publicId) {
    const run = await ReleaseRunModel.findByPublicId(publicId);
    if (!run) {
      return null;
    }

    const gates = await ReleaseGateResultModel.listByRunId(run.id);
    const snapshot = Array.isArray(run.checklistSnapshot) ? run.checklistSnapshot : [];
    const mapped = gates.map((gate) => ({
      ...gate,
      snapshot: snapshot.find((item) => item.slug === gate.gateKey) ?? null
    }));

    return {
      run,
      gates: mapped
    };
  }

  async recordGateEvaluation(publicId, gateKey, payload) {
    const run = await ReleaseRunModel.findByPublicId(publicId);
    if (!run) {
      return null;
    }

    const normalizedKey = String(gateKey).trim();
    const now = new Date().toISOString();
    const gate = await ReleaseGateResultModel.upsertByRunAndGate(run.id, normalizedKey, {
      status: payload.status,
      ownerEmail: payload.ownerEmail,
      metrics: payload.metrics,
      notes: payload.notes,
      evidenceUrl: payload.evidenceUrl,
      lastEvaluatedAt: payload.lastEvaluatedAt ?? now
    });

    serviceLogger.info(
      {
        runId: run.publicId,
        gateKey: gate.gateKey,
        status: gate.status
      },
      'Recorded release gate evaluation'
    );

    recordReleaseGateEvaluation({
      gateKey: gate.gateKey,
      status: gate.status,
      environment: run.environment,
      versionTag: run.versionTag
    });

    return gate;
  }

  async evaluateRun(publicId) {
    const run = await ReleaseRunModel.findByPublicId(publicId);
    if (!run) {
      return null;
    }

    const gates = await ReleaseGateResultModel.listByRunId(run.id);
    const snapshot = Array.isArray(run.checklistSnapshot) ? run.checklistSnapshot : [];
    const requiredGates = new Set(run.metadata?.requiredGates ?? Array.from(this.requiredGates));

    const gatesWithSnapshot = gates.map((gate) => ({
      ...gate,
      snapshot: snapshot.find((item) => item.slug === gate.gateKey) ?? null
    }));

    const updatedGateResults = [];

    for (const gate of gatesWithSnapshot) {
      if (!gate.snapshot) {
        continue;
      }

      if (gate.snapshot.autoEvaluated && (gate.status === 'pending' || gate.status === 'in_progress')) {
        const evaluation = evaluateAgainstCriteria(gate.metrics, gate.snapshot.successCriteria, run);
        if (evaluation.status !== gate.status) {
          const updated = await ReleaseGateResultModel.upsertByRunAndGate(run.id, gate.gateKey, {
            status: evaluation.status,
            notes:
              gate.notes && evaluation.reasons.length
                ? `${gate.notes}\n${evaluation.reasons.join('\n')}`
                : evaluation.reasons.join('\n'),
            lastEvaluatedAt: new Date().toISOString()
          });
          gate.status = updated.status;
          gate.notes = updated.notes;
          gate.lastEvaluatedAt = updated.lastEvaluatedAt;
        }
      }

      updatedGateResults.push(gate);
    }

    const readinessScore = calculateReadinessScore(updatedGateResults);

    const blockingGates = updatedGateResults
      .filter((gate) => requiredGates.has(gate.gateKey) && (gate.status === 'fail' || gate.status === 'pending'))
      .map((gate) => ({
        gateKey: gate.gateKey,
        status: gate.status,
        ownerEmail: gate.ownerEmail,
        notes: gate.notes
      }));

    let recommendedStatus = 'ready';
    if (blockingGates.length > 0) {
      recommendedStatus = 'blocked';
    } else if (updatedGateResults.some((gate) => gate.status === 'in_progress')) {
      recommendedStatus = 'in_progress';
    }

    const updatedRun = await ReleaseRunModel.updateByPublicId(run.publicId, {
      status: recommendedStatus,
      metadata: {
        ...run.metadata,
        readinessScore,
        evaluatedAt: new Date().toISOString()
      }
    });

    serviceLogger.info(
      {
        runId: updatedRun.publicId,
        recommendedStatus,
        readinessScore,
        blockingGates: blockingGates.length
      },
      'Evaluated release readiness run'
    );

    recordReleaseRunStatus({
      status: recommendedStatus,
      environment: updatedRun.environment,
      versionTag: updatedRun.versionTag,
      readinessScore
    });

    return {
      run: updatedRun,
      readinessScore,
      blockingGates,
      gates: updatedGateResults,
      requiredGates: Array.from(requiredGates),
      recommendedStatus
    };
  }

  async getDashboard(filters = {}) {
    const environment = filters.environment ? sanitiseEnvironment(filters.environment) : null;
    const runFilters = environment ? { environment } : {};
    const [runs, breakdown] = await Promise.all([
      ReleaseRunModel.list({ ...runFilters }, { limit: 10 }),
      ReleaseRunModel.getStatusBreakdown()
    ]);

    const upcoming = runs.items
      .filter((run) => run.status === 'scheduled' || run.status === 'in_progress')
      .slice(0, 5)
      .map((run) => ({
        publicId: run.publicId,
        versionTag: run.versionTag,
        environment: run.environment,
        status: run.status,
        changeWindowStart: run.changeWindowStart,
        changeWindowEnd: run.changeWindowEnd,
        readinessScore: run.metadata?.readinessScore ?? null
      }));

    return {
      breakdown,
      upcoming,
      recent: runs.items,
      requiredGates: Array.from(this.requiredGates)
    };
  }
}

const releaseOrchestrationService = new ReleaseOrchestrationService();

export default releaseOrchestrationService;

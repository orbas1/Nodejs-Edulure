import GovernanceContractModel from '../models/GovernanceContractModel.js';
import ReleaseChecklistItemModel from '../models/ReleaseChecklistItemModel.js';
import releaseOrchestrationService from './ReleaseOrchestrationService.js';
import { AdminAuditLogService } from './AdminAuditLogService.js';

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };
const STATUS_PRIORITY = { escalated: 3, pending_renewal: 2, active: 1 };

function clampLimit(value, { min = 1, max = 50, fallback = 5 } = {}) {
  const numeric = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, numeric));
}

function humaniseLabel(value, fallback = '') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function calculateRenewalDeltaDays(renewalDate) {
  if (!renewalDate) {
    return null;
  }
  const target = new Date(renewalDate);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const millisPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - today.getTime()) / millisPerDay);
}

export class AdminOperationsOverviewService {
  constructor({
    governanceContractModel = GovernanceContractModel,
    releaseChecklistItemModel = ReleaseChecklistItemModel,
    releaseService = releaseOrchestrationService,
    auditLogService = new AdminAuditLogService()
  } = {}) {
    this.governanceContractModel = governanceContractModel;
    this.releaseChecklistItemModel = releaseChecklistItemModel;
    this.releaseService = releaseService;
    this.auditLogService = auditLogService;
  }

  async getOverview({ limit, auditLimit, since } = {}) {
    const alertLimit = clampLimit(limit, { max: 15 });
    const auditEntryLimit = clampLimit(auditLimit, { max: 100, fallback: 40 });

    const [alerts, complianceSummary, readiness, checklist, audit] = await Promise.all([
      this.#buildComplianceAlerts(alertLimit),
      this.governanceContractModel.getLifecycleSummary({ windowDays: 60 }),
      this.releaseService.summariseReadiness(),
      this.#loadChecklistSummary(),
      this.auditLogService.listRecent({ limit: auditEntryLimit, since })
    ]);

    const totalsBySource = { ...audit.totals };
    const totalsBySeverity = this.#groupEntriesBy(audit.entries, (entry) =>
      String(entry.severity ?? 'info').toLowerCase()
    );

    return {
      compliance: {
        alerts,
        summary: complianceSummary
      },
      release: {
        readiness,
        checklist
      },
      audit: {
        totalsBySource,
        totalsBySeverity,
        generatedAt: audit.generatedAt ?? new Date().toISOString()
      }
    };
  }

  async #buildComplianceAlerts(limit) {
    const [overdue, highRisk] = await Promise.all([
      this.governanceContractModel.list({ overdue: true }, { limit: limit * 2 }),
      this.governanceContractModel.list(
        { riskTier: ['high'], status: ['active', 'pending_renewal', 'escalated'] },
        { limit: limit * 2 }
      )
    ]);

    const candidates = [...(overdue?.items ?? []), ...(highRisk?.items ?? [])];
    const uniqueAlerts = new Map();

    candidates.forEach((contract) => {
      if (!contract || !contract.publicId) {
        return;
      }
      const existing = uniqueAlerts.get(contract.publicId);
      const renewalDeltaDays = calculateRenewalDeltaDays(contract.renewalDate);
      const severity = this.#determineAlertSeverity(contract, renewalDeltaDays);
      const summary = this.#buildAlertSummary(contract, renewalDeltaDays);

      const alertPayload = {
        id: contract.publicId,
        vendor: contract.vendorName,
        status: contract.status,
        riskTier: contract.riskTier,
        renewalDate: contract.renewalDate,
        renewalDeltaDays,
        ownerEmail: contract.ownerEmail,
        severity,
        summary,
        href: `/dashboard/admin/policies?contract=${contract.publicId}`
      };

      if (!existing || SEVERITY_RANK[severity] > SEVERITY_RANK[existing.severity]) {
        uniqueAlerts.set(contract.publicId, alertPayload);
      }
    });

    return Array.from(uniqueAlerts.values())
      .sort((a, b) => {
        const severityDelta = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
        if (severityDelta !== 0) {
          return severityDelta;
        }
        const statusDelta = this.#rankStatus(b.status) - this.#rankStatus(a.status);
        if (statusDelta !== 0) {
          return statusDelta;
        }
        const aDays = a.renewalDeltaDays ?? Number.POSITIVE_INFINITY;
        const bDays = b.renewalDeltaDays ?? Number.POSITIVE_INFINITY;
        return aDays - bDays;
      })
      .slice(0, limit);
  }

  #rankStatus(status) {
    const key = String(status ?? '').toLowerCase();
    return STATUS_PRIORITY[key] ?? 0;
  }

  #determineAlertSeverity(contract, renewalDeltaDays) {
    if (contract.status === 'escalated') {
      return 'critical';
    }
    if (typeof renewalDeltaDays === 'number' && renewalDeltaDays < 0) {
      return 'critical';
    }
    if (String(contract.riskTier ?? '').toLowerCase() === 'high') {
      return 'warning';
    }
    return 'info';
  }

  #buildAlertSummary(contract, renewalDeltaDays) {
    const parts = [];
    if (typeof renewalDeltaDays === 'number') {
      if (renewalDeltaDays < 0) {
        parts.push(`Renewal overdue by ${Math.abs(renewalDeltaDays)} day${Math.abs(renewalDeltaDays) === 1 ? '' : 's'}`);
      } else if (renewalDeltaDays === 0) {
        parts.push('Renewal due today');
      } else {
        parts.push(`Renewal due in ${renewalDeltaDays} day${renewalDeltaDays === 1 ? '' : 's'}`);
      }
    }
    if (contract.ownerEmail) {
      parts.push(`Owner ${contract.ownerEmail}`);
    }
    if (contract.contractValueCents) {
      const amount = Number.parseInt(contract.contractValueCents, 10) || 0;
      if (amount > 0) {
        const currency = contract.currency ?? 'USD';
        parts.push(`Value ${(amount / 100).toLocaleString(undefined, { style: 'currency', currency })}`);
      }
    }
    return parts.join(' · ') || 'Monitor contract obligations and renewal requirements.';
  }

  async #loadChecklistSummary() {
    const { items = [] } = await this.releaseChecklistItemModel.list({}, { limit: 200 });
    const autoEvaluated = items.filter((item) => item.autoEvaluated).length;
    const categories = new Map();

    items.forEach((item) => {
      const key = item.category ?? 'general';
      if (!categories.has(key)) {
        categories.set(key, {
          id: key,
          label: humaniseLabel(key, 'General'),
          total: 0,
          autoEvaluated: 0,
          owners: new Set()
        });
      }
      const bucket = categories.get(key);
      bucket.total += 1;
      if (item.autoEvaluated) {
        bucket.autoEvaluated += 1;
      }
      if (item.defaultOwnerEmail) {
        bucket.owners.add(item.defaultOwnerEmail.toLowerCase());
      }
    });

    const categorySummaries = Array.from(categories.values())
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        total: entry.total,
        autoEvaluated: entry.autoEvaluated,
        manual: entry.total - entry.autoEvaluated,
        defaultOwners: Array.from(entry.owners).sort()
      }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

    return {
      totalItems: items.length,
      autoEvaluated,
      manual: items.length - autoEvaluated,
      categories: categorySummaries
    };
  }

  #groupEntriesBy(entries, selector) {
    const groups = {};
    entries.forEach((entry) => {
      const key = selector(entry) || 'unknown';
      groups[key] = (groups[key] ?? 0) + 1;
    });
    return groups;
  }
}

const adminOperationsOverviewService = new AdminOperationsOverviewService();

export default adminOperationsOverviewService;

import logger from '../config/logger.js';
import CapabilityManifestService from './CapabilityManifestService.js';
import SecurityIncidentModel from '../models/SecurityIncidentModel.js';

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

function minutesBetween(start, end) {
  if (!start || !end) {
    return null;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function hoursBetween(start, end) {
  const minutes = minutesBetween(start, end);
  return typeof minutes === 'number' ? Number((minutes / 60).toFixed(1)) : null;
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function sum(array, accessor) {
  return array.reduce((total, item) => total + (Number(accessor(item)) || 0), 0);
}

export function summariseIncidentQueue(incidents, { now = new Date() } = {}) {
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const ackMinutes = [];
  const detectionChannels = new Map();
  let breachedAcks = 0;
  let resolutionBreaches = 0;
  let watchers = 0;

  incidents.forEach((incident) => {
    const severity = (incident.severity ?? 'medium').toLowerCase();
    if (severityCounts[severity] !== undefined) {
      severityCounts[severity] += 1;
    }

    const acknowledgement = incident.acknowledgement ?? {};
    if (acknowledgement.acknowledgedAt) {
      const minutesToAck = minutesBetween(incident.reportedAt, acknowledgement.acknowledgedAt);
      if (typeof minutesToAck === 'number') {
        ackMinutes.push(minutesToAck);
      }
    }

    if (acknowledgement.ackBreached) {
      breachedAcks += 1;
    }

    const resolution = incident.resolution ?? {};
    if (resolution.resolutionBreached) {
      resolutionBreaches += 1;
    }

    const channel = incident.metadata?.detectionChannel ?? incident.source ?? 'unknown';
    detectionChannels.set(channel, (detectionChannels.get(channel) ?? 0) + 1);

    watchers += Number(incident.metadata?.watchers ?? 0);
  });

  const totalOpen = incidents.length;
  const oldest = incidents.reduce((old, incident) => {
    const reported = incident.reportedAt ? new Date(incident.reportedAt) : null;
    if (!reported) return old;
    if (!old) return reported;
    return reported < old ? reported : old;
  }, null);

  const averageOpenHours = totalOpen
    ? Number(
        (
          incidents.reduce((total, incident) => {
            const reported = incident.reportedAt ? new Date(incident.reportedAt) : null;
            if (!reported) return total;
            return total + hoursBetween(reported, now);
          }, 0) / totalOpen
        ).toFixed(1)
      )
    : 0;

  return {
    totalOpen,
    severityCounts,
    medianAckMinutes: median(ackMinutes),
    ackBreaches: breachedAcks,
    resolutionBreaches,
    detectionChannels: Array.from(detectionChannels.entries()).map(([channel, count]) => ({ channel, count })),
    watchers,
    oldestOpenAt: oldest ? oldest.toISOString() : null,
    averageOpenHours
  };
}

export function buildScamSummary(incidents, { now = new Date() } = {}) {
  const scamIncidents = incidents.filter((incident) => incident.category === 'scam' || incident.metadata?.tags?.includes('scam'));
  if (!scamIncidents.length) {
    return {
      activeCases: 0,
      criticalCases: 0,
      impactedLearners: 0,
      blockedPaymentsCents: 0,
      blockedPaymentsFormatted: '$0.00',
      lastDetectedAt: null,
      alerts: []
    };
  }

  const blockedPaymentsCents = sum(scamIncidents, (incident) => incident.metadata?.metrics?.blockedPayments);
  const impactedLearners = sum(scamIncidents, (incident) => incident.metadata?.metrics?.flaggedLearners);
  const lastDetected = scamIncidents.reduce((latest, incident) => {
    const reported = incident.reportedAt ? new Date(incident.reportedAt) : null;
    if (!reported) return latest;
    if (!latest) return reported;
    return reported > latest ? reported : latest;
  }, null);

  return {
    activeCases: scamIncidents.length,
    criticalCases: scamIncidents.filter((incident) => (incident.severity ?? '').toLowerCase() === 'critical').length,
    impactedLearners,
    blockedPaymentsCents,
    blockedPaymentsFormatted: `$${(blockedPaymentsCents / 100).toFixed(2)}`,
    lastDetectedAt: lastDetected ? lastDetected.toISOString() : null,
    alerts: scamIncidents.map((incident) => ({
      id: incident.incidentUuid,
      reference: incident.metadata?.reference ?? incident.incidentUuid,
      severity: incident.severity,
      summary: incident.metadata?.summary ?? incident.description,
      reportedAt: incident.reportedAt,
      watchers: incident.metadata?.watchers ?? 0,
      recommendedActions: incident.metadata?.recommendedActions ?? [],
      detectionChannel: incident.metadata?.detectionChannel ?? incident.source
    }))
  };
}

function normaliseServiceHealth(manifest, incidents) {
  const services = Array.isArray(manifest?.services) ? manifest.services : [];
  const capabilities = Array.isArray(manifest?.capabilities) ? manifest.capabilities : [];
  const summary = manifest?.summary ?? { services: {}, capabilities: {} };

  const impactedCapabilities = capabilities
    .filter((capability) => capability.status && capability.status !== 'operational')
    .map((capability) => ({
      key: capability.capability,
      name: capability.name ?? capability.capability,
      status: capability.status,
      summary: capability.summary,
      dependencies: capability.dependencies ?? [],
      evaluation: capability.evaluation ?? null
    }));

  const serviceDetails = services
    .map((service) => ({
      key: service.key,
      name: service.name,
      status: service.status,
      summary: service.summary,
      checkedAt: service.checkedAt,
      components: Array.isArray(service.components)
        ? service.components.map((component) => ({
            name: component.name,
            status: component.status,
            message: component.message,
            updatedAt: component.updatedAt
          }))
        : []
    }))
    .sort((a, b) => {
      const rankA = SEVERITY_RANK[a.status] ?? 0;
      const rankB = SEVERITY_RANK[b.status] ?? 0;
      if (rankA === rankB) {
        return a.name.localeCompare(b.name);
      }
      return rankB - rankA;
    });

  const detectionChannels = incidents.reduce((acc, incident) => {
    const channel = incident.metadata?.detectionChannel ?? incident.source ?? 'unknown';
    acc.set(channel, (acc.get(channel) ?? 0) + 1);
    return acc;
  }, new Map());

  const contactPoints = incidents
    .flatMap((incident) => {
      const contacts = incident.metadata?.contactPoints;
      if (!contacts || typeof contacts !== 'object') {
        return [];
      }
      return Object.entries(contacts);
    })
    .reduce((acc, [key, value]) => {
      if (!value) {
        return acc;
      }
      if (!acc.some((entry) => entry.key === key && entry.value === value)) {
        acc.push({ key, value });
      }
      return acc;
    }, []);

  return {
    summary: {
      manifestGeneratedAt: manifest?.generatedAt ?? null,
      totalServices: services.length,
      impactedServices: (summary.services?.degraded ?? 0) + (summary.services?.outage ?? 0) + (summary.services?.unknown ?? 0),
      totalCapabilities: capabilities.length,
      impactedCapabilities: impactedCapabilities.length,
      statusCounts: summary.services ?? {},
      capabilityStatusCounts: summary.capabilities ?? {},
      watchers: sum(incidents, (incident) => incident.metadata?.watchers),
      detectionChannels: Array.from(detectionChannels.entries()).map(([channel, count]) => ({ channel, count }))
    },
    services: serviceDetails,
    impactedCapabilities,
    contactPoints
  };
}

function formatIncidentForPresentation(incident, { now = new Date() } = {}) {
  const acknowledgement = incident.acknowledgement ?? {};
  const resolution = incident.resolution ?? {};
  const metrics = incident.metadata?.metrics ?? {};

  return {
    id: incident.id,
    incidentUuid: incident.incidentUuid,
    reference: incident.metadata?.reference ?? incident.incidentUuid,
    category: incident.category,
    severity: incident.severity,
    status: incident.status,
    source: incident.source,
    detectionChannel: incident.metadata?.detectionChannel ?? incident.source,
    summary: incident.metadata?.summary ?? null,
    reportedAt: incident.reportedAt,
    acknowledgedAt: acknowledgement.acknowledgedAt ?? null,
    resolutionTargetAt: resolution.targetAt ?? null,
    resolvedAt: resolution.resolvedAt ?? null,
    ackSlaMinutes: acknowledgement.ackSlaMinutes ?? null,
    ackBreached: acknowledgement.ackBreached ?? false,
    resolutionSlaMinutes: resolution.resolutionSlaMinutes ?? null,
    resolutionBreached: resolution.resolutionBreached ?? false,
    recommendedActions: incident.metadata?.recommendedActions ?? [],
    playbook: incident.metadata?.playbook ?? null,
    watchers: incident.metadata?.watchers ?? 0,
    relatedCapabilities: incident.metadata?.relatedCapabilities ?? [],
    metrics: {
      impactedLearners: metrics.flaggedLearners ?? 0,
      blockedPaymentsCents: metrics.blockedPayments ?? 0,
      elevatedSessions: metrics.elevatedSessions ?? 0
    },
    contactPoints: incident.metadata?.contactPoints ?? {},
    timeOpenMinutes: minutesBetween(incident.reportedAt, now),
    attachments: incident.metadata?.attachments ?? []
  };
}

function formatResolvedIncident(incident) {
  const resolution = incident.resolution ?? {};
  const durationMinutes = minutesBetween(incident.reportedAt, resolution.resolvedAt ?? incident.resolvedAt);
  return {
    id: incident.id,
    incidentUuid: incident.incidentUuid,
    reference: incident.metadata?.reference ?? incident.incidentUuid,
    category: incident.category,
    severity: incident.severity,
    resolvedAt: resolution.resolvedAt ?? incident.resolvedAt,
    durationMinutes,
    followUp: resolution.followUp ?? null,
    detectionChannel: incident.metadata?.detectionChannel ?? incident.source
  };
}

function buildRunbookShortcuts(activeIncidents, resolvedIncidents) {
  const runbooks = new Map();
  const allIncidents = [...activeIncidents, ...resolvedIncidents];
  allIncidents.forEach((incident) => {
    const playbook = incident.metadata?.playbook;
    if (!playbook || !playbook.id) {
      return;
    }
    const existing = runbooks.get(playbook.id);
    const severityRank = SEVERITY_RANK[(incident.severity ?? 'low').toLowerCase()] ?? 0;
    if (!existing) {
      runbooks.set(playbook.id, {
        id: playbook.id,
        title: playbook.title ?? playbook.id,
        description: incident.metadata?.summary ?? 'Operational response playbook',
        url: playbook.url ?? null,
        highestSeverity: severityRank,
        references: new Set([incident.metadata?.reference ?? incident.incidentUuid]),
        categories: new Set([incident.category])
      });
    } else {
      existing.highestSeverity = Math.max(existing.highestSeverity, severityRank);
      existing.references.add(incident.metadata?.reference ?? incident.incidentUuid);
      existing.categories.add(incident.category);
    }
  });

  return Array.from(runbooks.values())
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      url: entry.url,
      severity: entry.highestSeverity,
      references: Array.from(entry.references),
      categories: Array.from(entry.categories)
    }))
    .sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title));
}

function buildTimeline(activeIncidents, resolvedIncidents) {
  const items = [];
  activeIncidents.forEach((incident) => {
    const reference = incident.metadata?.reference ?? incident.incidentUuid;
    const severity = incident.severity ?? 'medium';
    if (incident.reportedAt) {
      items.push({
        id: `${reference}-reported`,
        timestamp: incident.reportedAt,
        label: `${reference} reported`,
        description: incident.metadata?.summary ?? 'Incident reported',
        severity,
        category: incident.category
      });
    }
    if (incident.acknowledgement?.acknowledgedAt) {
      items.push({
        id: `${reference}-acknowledged`,
        timestamp: incident.acknowledgement.acknowledgedAt,
        label: `${reference} acknowledged`,
        description: `Responder ${incident.acknowledgement.responder ?? 'Ops'} engaged.`,
        severity,
        category: incident.category
      });
    }
    const timelineEntries = Array.isArray(incident.metadata?.timeline) ? incident.metadata.timeline : [];
    timelineEntries.forEach((entry, index) => {
      if (!entry?.timestamp) {
        return;
      }
      items.push({
        id: `${reference}-timeline-${index}`,
        timestamp: entry.timestamp,
        label: `${reference} ${entry.event ?? 'update'}`,
        description: entry.detail ?? null,
        severity,
        category: incident.category
      });
    });
  });

  resolvedIncidents.forEach((incident) => {
    const reference = incident.metadata?.reference ?? incident.incidentUuid;
    const severity = incident.severity ?? 'medium';
    if (incident.resolution?.resolvedAt ?? incident.resolvedAt) {
      items.push({
        id: `${reference}-resolved`,
        timestamp: incident.resolution?.resolvedAt ?? incident.resolvedAt,
        label: `${reference} resolved`,
        description: incident.resolution?.followUp ?? 'Resolution confirmed.',
        severity,
        category: incident.category
      });
    }
  });

  return items
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 25);
}

function buildSearchIndex(activeIncidents, runbooks) {
  const incidentEntries = activeIncidents.map((incident) => ({
    id: `incident-${incident.incidentUuid}`,
    role: 'admin',
    type: 'Incident',
    title: `${incident.metadata?.reference ?? incident.incidentUuid} (${incident.severity})`,
    url: '/dashboard/admin/operator',
    category: incident.category
  }));

  const runbookEntries = runbooks.map((runbook) => ({
    id: `runbook-${runbook.id}`,
    role: 'admin',
    type: 'Runbook',
    title: runbook.title,
    url: runbook.url ?? '/dashboard/admin/operator',
    category: runbook.categories[0] ?? 'operations'
  }));

  return [
    {
      id: 'operator-overview',
      role: 'admin',
      type: 'Dashboard',
      title: 'Operator command centre',
      url: '/dashboard/admin/operator',
      category: 'operations'
    },
    ...incidentEntries,
    ...runbookEntries
  ];
}

function buildProfileStats(queueSummary, scamSummary) {
  return [
    {
      label: 'Open incidents',
      value: `${queueSummary.totalOpen} active`
    },
    {
      label: 'Critical alerts',
      value: `${queueSummary.severityCounts.critical} critical`
    },
    {
      label: 'Scam cases',
      value: `${scamSummary.activeCases} monitoring`
    }
  ];
}

function buildProfileBio(queueSummary, scamSummary, healthSummary) {
  const impacted = healthSummary.impactedServices;
  const watchers = healthSummary.watchers;
  return `Monitoring ${queueSummary.totalOpen} live incidents (${queueSummary.severityCounts.critical} critical) with ${
    watchers ?? 0
  } watchers engaged across ${impacted} impacted services.`;
}

export default class OperatorDashboardService {
  constructor({
    manifestService = new CapabilityManifestService(),
    incidentsModel = SecurityIncidentModel,
    nowProvider = () => new Date(),
    loggerInstance = logger.child({ service: 'OperatorDashboardService' })
  } = {}) {
    this.manifestService = manifestService;
    this.incidentsModel = incidentsModel;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
  }

  async build({ user, tenantId = 'global', now = this.nowProvider() } = {}) {
    const userContext = {
      userId: user?.id ?? null,
      role: user?.role ?? null,
      tenantId
    };

    const [manifest, activeIncidents, resolvedIncidents] = await Promise.all([
      this.manifestService
        .buildManifest({
          audience: 'ops',
          userContext
        })
        .catch((error) => {
          this.logger.warn({ err: error }, 'Failed to build capability manifest for operator dashboard');
          return null;
        }),
      this.incidentsModel.listActive({ tenantId, limit: 25 }).catch((error) => {
        this.logger.error({ err: error }, 'Failed to load active security incidents');
        return [];
      }),
      this.incidentsModel.listRecentlyResolved({ tenantId, limit: 15 }).catch((error) => {
        this.logger.error({ err: error }, 'Failed to load resolved security incidents');
        return [];
      })
    ]);

    const queueSummary = summariseIncidentQueue(activeIncidents, { now });
    const scamSummary = buildScamSummary(activeIncidents, { now });
    const serviceHealth = normaliseServiceHealth(manifest, activeIncidents);
    const runbooks = buildRunbookShortcuts(activeIncidents, resolvedIncidents);
    const timeline = buildTimeline(activeIncidents, resolvedIncidents);

    return {
      dashboard: {
        meta: {
          generatedAt: now.toISOString(),
          tenantId,
          manifestGeneratedAt: serviceHealth.summary.manifestGeneratedAt
        },
        metrics: {
          serviceHealth: serviceHealth.summary,
          incidents: queueSummary,
          scams: scamSummary
        },
        serviceHealth,
        incidents: {
          active: activeIncidents.map((incident) => formatIncidentForPresentation(incident, { now })),
          recentResolved: resolvedIncidents.map(formatResolvedIncident)
        },
        runbooks,
        timeline
      },
      searchIndex: buildSearchIndex(activeIncidents, runbooks),
      profileStats: buildProfileStats(queueSummary, scamSummary),
      profileTitleSegment: 'Platform operations overview',
      profileBio: buildProfileBio(queueSummary, scamSummary, serviceHealth.summary)
    };
  }
}

export const SEVERITY_RANK = Object.freeze({ critical: 4, high: 3, medium: 2, low: 1 });
export const INCIDENT_SEVERITIES = Object.freeze(['critical', 'high', 'medium', 'low']);
export const INCIDENT_CATEGORY_LABELS = Object.freeze({
  scam: 'Marketplace scams',
  fraud: 'Payments & fraud',
  account_takeover: 'Account takeover',
  abuse: 'Platform abuse',
  data_breach: 'Data breach',
  other: 'Other incidents'
});

export function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const sized = bytes / 1024 ** exponent;
  return `${sized.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function buildComplianceRiskHeatmap(incidents = []) {
  const categoryBuckets = new Map();

  incidents.forEach((incident) => {
    const category = incident.category ?? 'other';
    const severity = (incident.severity ?? 'medium').toLowerCase();

    if (!categoryBuckets.has(category)) {
      categoryBuckets.set(
        category,
        INCIDENT_SEVERITIES.reduce((acc, key) => acc.set(key, 0), new Map())
      );
    }

    const severityCounts = categoryBuckets.get(category);
    const severityKey = INCIDENT_SEVERITIES.includes(severity) ? severity : 'medium';
    severityCounts.set(severityKey, (severityCounts.get(severityKey) ?? 0) + 1);
  });

  return Array.from(categoryBuckets.entries())
    .map(([category, severityCounts]) => ({
      category,
      label: INCIDENT_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' '),
      total: INCIDENT_SEVERITIES.reduce(
        (acc, severity) => acc + (severityCounts.get(severity) ?? 0),
        0
      ),
      breakdown: INCIDENT_SEVERITIES.reduce(
        (acc, severity) => ({ ...acc, [severity]: severityCounts.get(severity) ?? 0 }),
        {}
      )
    }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
}

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

export function deriveOperationalScore({ incidents, integrations, storageUsage }) {
  const incidentPenalty = Math.min(incidents.active * 12 + incidents.critical * 20, 60);
  const integrationBonus = Math.min(integrations.operational * 5, 25);
  const storagePenalty = storageUsage.usedPercentage > 85 ? 10 : storageUsage.usedPercentage > 70 ? 5 : 0;

  const baseline = 100 - incidentPenalty - storagePenalty + integrationBonus;
  return Math.max(0, Math.min(100, Math.round(baseline)));
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

export function buildScamSummary(incidents, { now: _now = new Date() } = {}) {
  const scamIncidents = incidents.filter(
    (incident) => incident.category === 'scam' || incident.metadata?.tags?.includes('scam')
  );
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
    blockedPaymentsFormatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(blockedPaymentsCents / 100),
    lastDetectedAt: lastDetected ? lastDetected.toISOString() : null,
    alerts: scamIncidents
      .slice(0, 5)
      .map((incident) => ({
        id: incident.id ?? incident.incidentUuid,
        reference: incident.metadata?.reference ?? incident.incidentUuid,
        detectedAt: incident.reportedAt ?? null,
        severity: (incident.severity ?? 'medium').toLowerCase()
      }))
  };
}

function formatPriorityList(items) {
  if (items.length === 0) {
    return '';
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items[0]}, ${items[1]}, and ${items[2]}`;
}

function formatQuantity(value, singular, plural = `${singular}s`) {
  const count = Number(value ?? 0);
  const label = count === 1 ? singular : plural;
  return `${count} ${label}`;
}

export function buildOverviewHelperText({
  queueSummary = {},
  complianceSnapshot = {},
  integrationStats = {},
  serviceHealth = {},
  storageUsage = {}
} = {}) {
  const tasks = [];

  const severityCounts = queueSummary?.severityCounts ?? {};
  const criticalIncidents = Number(severityCounts.critical ?? 0);
  const totalOpenIncidents = Number(queueSummary?.totalOpen ?? 0);

  if (criticalIncidents > 0) {
    tasks.push({
      text: `clearing ${formatQuantity(criticalIncidents, 'critical incident')}`,
      weight: 100
    });
  } else if (totalOpenIncidents > 0) {
    tasks.push({
      text: `working ${formatQuantity(totalOpenIncidents, 'open incident')}`,
      weight: 80
    });
  }

  const criticalIntegrations = Number(integrationStats?.critical ?? 0);
  const degradedIntegrations = Number(integrationStats?.degraded ?? 0);

  if (criticalIntegrations > 0) {
    tasks.push({
      text: `stabilising ${formatQuantity(criticalIntegrations, 'critical integration')}`,
      weight: 90
    });
  } else if (degradedIntegrations > 0) {
    tasks.push({
      text: `checking ${formatQuantity(degradedIntegrations, 'degraded integration')}`,
      weight: 70
    });
  }

  const impactedServices = Number(serviceHealth?.summary?.impactedServices ?? 0);
  if (impactedServices > 0) {
    tasks.push({
      text: `investigating ${formatQuantity(impactedServices, 'impacted service')}`,
      weight: 80
    });
  }

  const outstandingAttestations = Number(
    complianceSnapshot?.attestations?.totals?.outstanding ?? 0
  );
  const manualReviewQueue = Array.isArray(complianceSnapshot?.queue)
    ? complianceSnapshot.queue.length
    : Number(complianceSnapshot?.manualReviewQueue ?? 0);

  if (outstandingAttestations > 0) {
    tasks.push({
      text: `collecting ${formatQuantity(outstandingAttestations, 'policy attestation')}`,
      weight: 92
    });
  }

  if (manualReviewQueue > 0) {
    tasks.push({
      text: `reviewing ${formatQuantity(manualReviewQueue, 'KYC case')}`,
      weight: 88
    });
  }

  const storageUsagePercentage = Number(storageUsage?.usedPercentage ?? 0);
  if (storageUsagePercentage >= 85) {
    tasks.push({ text: 'freeing evidence storage capacity', weight: 40 });
  }

  const uniqueTasks = [];
  tasks
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .forEach(({ text }) => {
      if (!text || uniqueTasks.includes(text)) {
        return;
      }
      uniqueTasks.push(text);
    });

  const priorities = uniqueTasks.slice(0, 3);
  if (priorities.length === 0) {
    return 'All systems operational — export saved revenue views for finance checks and use the operations handbook links when incidents arise.';
  }

  const prioritiesText = formatPriorityList(priorities);

  return `Prioritise ${prioritiesText}. Use saved revenue views for finance spot-checks and follow the operations handbook links for detailed runbooks.`;
}

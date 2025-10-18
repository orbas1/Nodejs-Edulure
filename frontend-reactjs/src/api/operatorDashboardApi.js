import { httpClient } from './httpClient.js';

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  return [value].filter(Boolean);
}

function normaliseKpi(metric, index) {
  const id = metric?.id ?? metric?.metric ?? `kpi-${index}`;
  const direction = metric?.direction ?? (metric?.change ?? 0) >= 0 ? 'up' : 'down';
  const change = Number.isFinite(metric?.change) ? metric.change : null;
  return {
    id,
    label: metric?.label ?? metric?.name ?? 'Metric',
    value: metric?.value ?? 0,
    unit: metric?.unit ?? null,
    change,
    direction,
    target: metric?.target ?? null,
    formatter: metric?.formatter ?? metric?.format ?? null,
    trend: ensureArray(metric?.trend ?? metric?.sparkline)
  };
}

function normaliseTimelineEntry(entry, index) {
  return {
    id: entry?.id ?? entry?.eventId ?? `timeline-${index}`,
    incidentId: entry?.incidentId ?? entry?.incidentUuid ?? null,
    timestamp: entry?.timestamp ?? entry?.occurredAt ?? entry?.createdAt ?? null,
    severity: entry?.severity ?? entry?.level ?? 'info',
    label: entry?.label ?? entry?.title ?? 'Timeline update',
    description: entry?.description ?? entry?.summary ?? entry?.message ?? null,
    actor: entry?.actor ?? entry?.author ?? null
  };
}

function normaliseIncident(incident, index) {
  return {
    id: incident?.id ?? incident?.incidentUuid ?? `incident-${index}`,
    reference: incident?.reference ?? incident?.ticket ?? `INC-${index}`,
    severity: incident?.severity ?? incident?.level ?? 'medium',
    summary: incident?.summary ?? incident?.description ?? null,
    owner: incident?.owner ?? incident?.assignee ?? null,
    status: incident?.status ?? 'investigating',
    openedAt: incident?.openedAt ?? incident?.createdAt ?? null,
    acknowledgedAt: incident?.acknowledgedAt ?? null,
    watchers: incident?.watchers ?? incident?.subscriberCount ?? 0,
    resolutionTargetAt: incident?.resolutionTargetAt ?? null,
    resolutionBreached: Boolean(incident?.resolutionBreached),
    recommendedActions: ensureArray(incident?.recommendedActions)
  };
}

function normaliseRelease(release, index) {
  return {
    id: release?.id ?? release?.releaseId ?? `release-${index}`,
    name: release?.name ?? release?.train ?? 'Release',
    version: release?.version ?? release?.tag ?? null,
    windowStart: release?.windowStart ?? release?.startAt ?? null,
    windowEnd: release?.windowEnd ?? release?.endAt ?? null,
    owner: release?.owner ?? release?.manager ?? null,
    status: release?.status ?? 'scheduled',
    risk: release?.risk ?? release?.riskLevel ?? 'medium',
    approvalsPending: release?.approvalsPending ?? 0,
    healthScore: release?.healthScore ?? null,
    checklist: ensureArray(release?.checklist ?? release?.gates)
  };
}

function normaliseAlert(alert, index) {
  return {
    id: alert?.id ?? alert?.alertId ?? `alert-${index}`,
    level: alert?.level ?? alert?.severity ?? 'info',
    title: alert?.title ?? alert?.name ?? 'Alert',
    description: alert?.description ?? alert?.message ?? null,
    link: alert?.link ?? alert?.url ?? null,
    createdAt: alert?.createdAt ?? alert?.timestamp ?? null
  };
}

function normaliseDependency(dep, index) {
  return {
    id: dep?.id ?? dep?.service ?? `dependency-${index}`,
    name: dep?.name ?? dep?.service ?? 'Dependency',
    status: dep?.status ?? 'operational',
    summary: dep?.summary ?? dep?.description ?? null,
    lastCheckedAt: dep?.lastCheckedAt ?? dep?.checkedAt ?? null
  };
}

function normaliseOperations(operations = {}) {
  return {
    backlog: operations.backlog ?? 0,
    ackMinutes: operations.ackMinutes ?? operations.meanTimeToAcknowledge ?? null,
    resolutionMinutes: operations.resolutionMinutes ?? operations.meanTimeToResolve ?? null,
    mttrMinutes: operations.mttrMinutes ?? operations.meanTimeToRestore ?? null,
    automationCoverage: operations.automationCoverage ?? null,
    onCall: operations.onCall ?? operations.oncall ?? null,
    readiness: operations.readiness ?? null,
    dependencies: ensureArray(operations.dependencies).map(normaliseDependency)
  };
}

function normaliseExecutiveOverview(payload = {}) {
  const kpis = ensureArray(payload.kpis).map(normaliseKpi);
  const incidentsRaw = payload.incidents ?? {};
  const releasesRaw = payload.releases ?? {};

  return {
    generatedAt: payload.generatedAt ?? payload.updatedAt ?? null,
    kpis,
    alerts: ensureArray(payload.alerts).map(normaliseAlert),
    incidents: {
      stats: incidentsRaw.stats ?? incidentsRaw.summary ?? {},
      active: ensureArray(incidentsRaw.active).map(normaliseIncident),
      timeline: ensureArray(incidentsRaw.timeline).map(normaliseTimelineEntry)
    },
    releases: {
      upcoming: ensureArray(releasesRaw.upcoming).map(normaliseRelease),
      history: ensureArray(releasesRaw.history).map(normaliseRelease),
      readiness: releasesRaw.readiness ?? releasesRaw.summary ?? {}
    },
    operations: normaliseOperations(payload.operations),
    sustainability: payload.sustainability ?? null
  };
}

function normaliseTenants(payload = {}) {
  const tenants = ensureArray(payload.items ?? payload.tenants).map((tenant, index) => ({
    id: tenant?.id ?? tenant?.tenantId ?? `tenant-${index}`,
    name: tenant?.name ?? tenant?.label ?? tenant?.slug ?? 'Tenant',
    status: tenant?.status ?? tenant?.state ?? 'active',
    region: tenant?.region ?? tenant?.timezone ?? null
  }));

  return {
    items: tenants,
    defaultTenantId: payload.defaultTenantId ?? payload.default ?? tenants[0]?.id ?? null
  };
}

export async function fetchExecutiveOverview({ token, tenantId, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch the executive overview');
  }

  const response = await httpClient.get('/operator/executive/overview', {
    token,
    signal,
    params: tenantId ? { tenantId } : undefined,
    cache: {
      ttl: 60_000,
      tags: [`operator:executive:${tenantId ?? 'default'}`],
      varyByToken: true,
      varyByHeaders: ['Accept-Language']
    }
  });

  return normaliseExecutiveOverview(response);
}

export async function fetchExecutiveTenants({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch executive tenants');
  }

  const response = await httpClient.get('/operator/executive/tenants', {
    token,
    signal,
    cache: {
      ttl: 10 * 60_000,
      tags: ['operator:executive:tenants'],
      varyByToken: true
    }
  });

  return normaliseTenants(response);
}

export const operatorDashboardApi = {
  fetchExecutiveOverview,
  fetchExecutiveTenants
};

export default operatorDashboardApi;

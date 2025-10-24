import { httpClient } from './httpClient.js';

function ensureArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item !== undefined && item !== null);
}

function normaliseCapabilitySignals(raw = []) {
  return ensureArray(raw).map((item) => ({
    area: item.area ?? item.title ?? '',
    signals: item.signals ?? item.summary ?? '',
    impact: item.impact ?? ''
  }));
}

function normaliseRiskAdjustments(raw = []) {
  return ensureArray(raw).map((item) => ({
    label: item.label ?? '',
    impact: item.impact ?? '',
    narrative: item.narrative ?? item.description ?? ''
  }));
}

function normaliseRecommendations(raw = []) {
  return ensureArray(raw).map((item) => String(item));
}

function normaliseDesignDependencies(raw = {}) {
  const tokens = new Set();
  const references = new Set();
  const qa = [];

  ensureArray(raw.tokens).forEach((token) => {
    if (typeof token === 'string' && token.trim()) {
      tokens.add(token.trim());
    }
  });

  ensureArray(raw.references).forEach((reference) => {
    if (typeof reference === 'string' && reference.trim()) {
      references.add(reference.trim());
    }
  });

  ensureArray(raw.qa).forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      qa.push({ id: item, label: item });
      return;
    }
    const id = item.id ?? item.key ?? item.label ?? null;
    const label = item.label ?? item.description ?? null;
    if (id && label) {
      qa.push({ id: String(id), label: String(label) });
    } else if (label) {
      qa.push({ id: label, label: String(label) });
    }
  });

  return {
    tokens: Array.from(tokens),
    references: Array.from(references),
    qa
  };
}

function normaliseStrategyNarratives(raw = []) {
  return ensureArray(raw).map((pillar) => ({
    pillar: pillar.pillar ?? pillar.id ?? 'Strategy',
    narratives: ensureArray(pillar.narratives).map((item) => String(item)),
    metrics: ensureArray(pillar.metrics).map((metric) => ({
      id: metric.id ?? metric.key ?? metric.label ?? 'metric',
      label: metric.label ?? metric.name ?? '',
      baseline: metric.baseline ?? null,
      target: metric.target ?? null,
      unit: metric.unit ?? ''
    }))
  }));
}

function normaliseProductBacklog(raw = []) {
  const seen = new Set();
  const backlog = [];
  ensureArray(raw).forEach((epic) => {
    if (!epic?.id) return;
    const key = String(epic.id).trim();
    if (seen.has(key)) return;
    seen.add(key);
    backlog.push({
      id: key,
      summary: epic.summary ?? '',
      backlogRef: epic.backlogRef ?? null,
      impactedFiles: ensureArray(epic.impactedFiles).map((file) => String(file))
    });
  });
  return backlog;
}

function normaliseOperationsChecklist(raw = []) {
  return ensureArray(raw).map((task) => ({
    id: task.id ?? task.key ?? task.label ?? 'task',
    label: task.label ?? '',
    cadence: task.cadence ?? '',
    href: task.href ?? null,
    navItemId: task.navItemId ?? null,
    navItemLabel: task.navItemLabel ?? null
  }));
}

function normaliseAnnex(raw = {}) {
  return {
    strategyNarratives: normaliseStrategyNarratives(raw.strategyNarratives),
    productBacklog: normaliseProductBacklog(raw.productBacklog),
    designDependencies: normaliseDesignDependencies(raw.designDependencies),
    operationsChecklist: normaliseOperationsChecklist(raw.operationsChecklist),
    refreshedAt: raw.refreshedAt ?? null
  };
}

function normaliseSummary(raw = {}) {
  return {
    midpoint: raw.midpoint ?? null,
    range: raw.range ?? null,
    valuationDate: raw.valuationDate ?? null
  };
}

function normaliseBriefingResponse(payload = {}) {
  const data = payload?.data ?? payload;
  return {
    generatedAt: data.generatedAt ?? null,
    summary: normaliseSummary(data.summary),
    capabilitySignals: normaliseCapabilitySignals(data.capabilitySignals),
    riskAdjustments: normaliseRiskAdjustments(data.riskAdjustments),
    recommendations: normaliseRecommendations(data.recommendations),
    annex: normaliseAnnex(data.annex ?? {})
  };
}

export async function fetchStrategyBriefing({ role, token, signal } = {}) {
  const params = {};
  if (role && typeof role === 'string' && role.trim()) {
    params.role = role.trim().toLowerCase();
  }
  const response = await httpClient.get('/strategy/briefing', {
    params,
    token,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: ['strategy:briefing']
    }
  });
  return normaliseBriefingResponse(response);
}

export const strategyBriefingApi = {
  fetch: fetchStrategyBriefing
};

export default strategyBriefingApi;

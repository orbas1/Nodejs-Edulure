import { httpClient } from './httpClient.js';

function ensureArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item !== undefined && item !== null);
}

function normaliseDesignDependencies(raw = {}) {
  const tokens = new Set();
  const qa = [];
  const references = new Set();

  ensureArray(raw.tokens).forEach((token) => {
    if (typeof token === 'string' && token.trim()) {
      tokens.add(token.trim());
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

  ensureArray(raw.references).forEach((reference) => {
    if (typeof reference === 'string' && reference.trim()) {
      references.add(reference.trim());
    }
  });

  return {
    tokens: Array.from(tokens),
    qa,
    references: Array.from(references)
  };
}

function normaliseInitiativeBucket(items = []) {
  return ensureArray(items).map((item, index) => ({
    id: item.id,
    label: item.label ?? item.name ?? null,
    to: item.to ?? null,
    category: item.category ?? null,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
    initiative: {
      product: item.initiative?.product ?? null,
      operations: item.initiative?.operations ?? { tasks: [] },
      design: item.initiative?.design ?? { tokens: [], qa: [], references: [] },
      strategy: item.initiative?.strategy ?? { pillar: null, narrative: null, metrics: [] }
    }
  }));
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
    id: task.id ?? task.key ?? task.label,
    label: task.label ?? '',
    cadence: task.cadence ?? '',
    href: task.href ?? null,
    navItemId: task.navItemId ?? null,
    navItemLabel: task.navItemLabel ?? null
  }));
}

function normaliseDocumentationIndex(raw = []) {
  return ensureArray(raw).map((entry) => {
    const href = typeof entry.href === 'string' ? entry.href : '';
    return {
      href,
      usageCount:
        typeof entry.usageCount === 'number'
          ? entry.usageCount
          : ensureArray(entry.navItems).length || 0,
      categories: ensureArray(entry.categories).map((value) => String(value)),
      navItems: ensureArray(entry.navItems).map((value) => String(value)),
      navItemLabels: ensureArray(entry.navItemLabels).map((value) => String(value))
    };
  });
}

function normaliseAnnexResponse(payload = {}) {
  const data = payload?.data ?? payload;
  const initiatives = data?.initiatives ?? {};

  return {
    initiatives: {
      primary: normaliseInitiativeBucket(initiatives.primary),
      quickActions: normaliseInitiativeBucket(initiatives.quickActions),
      dashboard: normaliseInitiativeBucket(initiatives.dashboard)
    },
    operationsChecklist: normaliseOperationsChecklist(data?.operationsChecklist),
    designDependencies: normaliseDesignDependencies(data?.designDependencies),
    strategyNarratives: normaliseStrategyNarratives(data?.strategyNarratives),
    productBacklog: normaliseProductBacklog(data?.productBacklog),
    documentationIndex: normaliseDocumentationIndex(data?.documentationIndex),
    refreshedAt: data?.refreshedAt ?? null
  };
}

export async function fetchNavigationAnnex({ role, token, signal } = {}) {
  const params = {};
  if (role && typeof role === 'string' && role.trim()) {
    params.role = role.trim().toLowerCase();
  }
  const cacheTags = ['navigation:annex'];
  if (params.role) {
    cacheTags.push(`navigation:annex:${params.role}`);
  }

  const response = await httpClient.get('/navigation/annex', {
    params,
    token,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: cacheTags
    }
  });
  return normaliseAnnexResponse(response);
}

export const navigationAnnexApi = {
  fetch: fetchNavigationAnnex
};

export default navigationAnnexApi;

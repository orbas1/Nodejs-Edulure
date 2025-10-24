import db from '../config/database.js';
import NavigationAnnexBacklogItemModel from '../models/NavigationAnnexBacklogItemModel.js';
import NavigationAnnexDesignDependencyModel from '../models/NavigationAnnexDesignDependencyModel.js';
import NavigationAnnexOperationTaskModel from '../models/NavigationAnnexOperationTaskModel.js';
import NavigationAnnexStrategyMetricModel from '../models/NavigationAnnexStrategyMetricModel.js';
import NavigationAnnexStrategyNarrativeModel from '../models/NavigationAnnexStrategyNarrativeModel.js';
import { safeJsonParse } from '../utils/modelUtils.js';

const ROLE_SYNONYMS = {
  user: ['user', 'learner', 'student'],
  learner: ['learner', 'user', 'student'],
  instructor: ['instructor', 'teacher'],
  admin: ['admin', 'staff'],
  ops: ['ops', 'operations', 'admin'],
  support: ['support', 'staff'],
  guest: ['guest'],
  service: ['service']
};

function normaliseRole(role) {
  if (!role || typeof role !== 'string') {
    return null;
  }
  const trimmed = role.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed === 'guest') {
    return 'user';
  }
  if (trimmed === 'learner') {
    return 'user';
  }
  return trimmed;
}

function parseRoleScope(raw) {
  if (Array.isArray(raw)) {
    return raw.map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : null)).filter(Boolean);
  }
  const parsed = safeJsonParse(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : null))
    .filter(Boolean);
}

function matchesRole(scope, role) {
  if (!role) {
    return true;
  }
  const normalisedScope = scope.length ? scope : [];
  if (normalisedScope.length === 0) {
    return true;
  }
  if (normalisedScope.includes('all') || normalisedScope.includes('any')) {
    return true;
  }
  const synonyms = ROLE_SYNONYMS[role] ?? [role];
  return normalisedScope.some((entry) => synonyms.includes(entry));
}

function parseStringArray(value) {
  const parsed = safeJsonParse(value, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((item) => (typeof item === 'string' ? item.trim() : null))
    .filter(Boolean);
}

function formatPillar(value) {
  if (!value) {
    return 'Strategy';
  }
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) {
    return 'Strategy';
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function ensureNode(nodes, row) {
  const id = row.navItemId;
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      label: row.navItemLabel,
      category: row.navItemCategory ?? 'primary',
      route: row.navItemRoute,
      sortOrder: row.displayOrder ?? 0,
      product: null,
      operations: {
        runbookSection: null,
        owner: null,
        tasks: []
      },
      design: {
        tokens: new Set(),
        qa: new Map(),
        references: new Set()
      },
      strategy: {
        pillar: null,
        narrative: null,
        metrics: new Map(),
        sortOrder: row.displayOrder ?? 0
      }
    });
  } else if (row.displayOrder !== undefined && row.displayOrder !== null) {
    const node = nodes.get(id);
    node.sortOrder = Math.min(node.sortOrder ?? row.displayOrder, row.displayOrder);
  }
  return nodes.get(id);
}

function ensureStrategyPillar(pillars, pillarName, displayOrder = 0) {
  if (!pillars.has(pillarName)) {
    pillars.set(pillarName, {
      pillar: pillarName,
      narratives: new Set(),
      metrics: new Map(),
      order: displayOrder
    });
  } else {
    const entry = pillars.get(pillarName);
    entry.order = Math.min(entry.order ?? displayOrder, displayOrder);
  }
  return pillars.get(pillarName);
}

function sortByPriority(a, b) {
  const priorityDiff = (a.priority ?? 99) - (b.priority ?? 99);
  if (priorityDiff !== 0) return priorityDiff;
  const displayDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  if (displayDiff !== 0) return displayDiff;
  return String(a.label ?? a.id ?? '').localeCompare(String(b.label ?? b.id ?? ''));
}

function normaliseDocumentationHref(href) {
  if (!href) {
    return null;
  }
  const trimmed = String(href).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function registerDocumentationReference(map, href, { navItemId, navItemLabel, category }) {
  const normalised = normaliseDocumentationHref(href);
  if (!normalised) {
    return;
  }

  const entry = map.get(normalised) ?? {
    href: normalised,
    usageCount: 0,
    categories: new Set(),
    navItemIds: new Set(),
    navItemLabels: new Set()
  };

  entry.usageCount += 1;
  if (category) {
    entry.categories.add(category);
  }
  if (navItemId) {
    entry.navItemIds.add(navItemId);
  }
  if (navItemLabel) {
    entry.navItemLabels.add(navItemLabel);
  }

  map.set(normalised, entry);
}

export default class NavigationAnnexRepository {
  static async describe({ role } = {}, connection = db) {
    const nodes = new Map();
    const productBacklogIndex = new Map();
    const aggregatedDesign = {
      tokens: new Set(),
      qa: new Map(),
      references: new Set()
    };
    const checklistTasks = [];
    const strategyByPillar = new Map();
    const narrativeIndex = new Map();
    const documentationIndex = new Map();
    const resolvedRole = normaliseRole(role);

    const backlogRows = await NavigationAnnexBacklogItemModel.listAll(connection);

    for (const row of backlogRows) {
      const scope = parseRoleScope(row.roleScope);
      if (!matchesRole(scope, resolvedRole)) {
        continue;
      }
      const node = ensureNode(nodes, row);
      node.product = {
        epicId: row.epicId,
        summary: row.summary,
        backlogRef: row.backlogRef ?? null,
        impactedFiles: parseStringArray(row.impactedFiles)
      };
      productBacklogIndex.set(row.epicId, {
        id: row.epicId,
        summary: row.summary,
        backlogRef: row.backlogRef ?? null,
        impactedFiles: parseStringArray(row.impactedFiles),
        priority: row.priority ?? 99,
        displayOrder: row.displayOrder ?? 0
      });
      if (row.backlogRef) {
        registerDocumentationReference(documentationIndex, row.backlogRef, {
          navItemId: row.navItemId,
          navItemLabel: row.navItemLabel,
          category: 'product'
        });
      }
    }

    const operationsRows = await NavigationAnnexOperationTaskModel.listAll(connection);

    for (const row of operationsRows) {
      const scope = parseRoleScope(row.roleScope);
      if (!matchesRole(scope, resolvedRole)) {
        continue;
      }
      const node = ensureNode(nodes, row);
      if (row.runbookSection && !node.operations.runbookSection) {
        node.operations.runbookSection = row.runbookSection;
      }
      if (row.owner && !node.operations.owner) {
        node.operations.owner = row.owner;
      }
      const task = {
        id: row.taskKey,
        label: row.label,
        cadence: row.cadence,
        href: row.href ?? null,
        runbookSection: row.runbookSection ?? null,
        owner: row.owner ?? null,
        priority: row.priority ?? 99,
        displayOrder: row.displayOrder ?? 0,
        navItemId: row.navItemId,
        navItemLabel: row.navItemLabel
      };
      node.operations.tasks.push(task);
      if (row.includeInChecklist) {
        checklistTasks.push(task);
      }
      if (row.href) {
        registerDocumentationReference(documentationIndex, row.href, {
          navItemId: row.navItemId,
          navItemLabel: row.navItemLabel,
          category: 'operations'
        });
      }
    }

    const designRows = await NavigationAnnexDesignDependencyModel.listAll(connection);

    for (const row of designRows) {
      const scope = parseRoleScope(row.roleScope);
      if (!matchesRole(scope, resolvedRole)) {
        continue;
      }
      const node = ensureNode(nodes, row);
      const key = row.dependencyKey;
      switch (row.dependencyType) {
        case 'token': {
          if (row.value) {
            node.design.tokens.add(row.value);
            aggregatedDesign.tokens.add(row.value);
          }
          break;
        }
        case 'qa': {
          if (row.value) {
            node.design.qa.set(key, {
              id: key,
              label: row.value,
              displayOrder: row.displayOrder ?? 0
            });
            aggregatedDesign.qa.set(key, {
              id: key,
              label: row.value,
              displayOrder: row.displayOrder ?? 0
            });
          }
          break;
        }
        case 'reference': {
          if (row.value) {
            node.design.references.add(row.value);
            aggregatedDesign.references.add(row.value);
            if (row.value.includes('/docs/')) {
              registerDocumentationReference(documentationIndex, row.value, {
                navItemId: row.navItemId,
                navItemLabel: row.navItemLabel,
                category: 'design'
              });
            }
          }
          break;
        }
        default:
          break;
      }
    }

    const narrativeRows = await NavigationAnnexStrategyNarrativeModel.listAll(connection);

    for (const row of narrativeRows) {
      const scope = parseRoleScope(row.roleScope);
      if (!matchesRole(scope, resolvedRole)) {
        continue;
      }
      const formattedPillar = formatPillar(row.pillar);
      const node = ensureNode(nodes, row);
      node.strategy.pillar = formattedPillar;
      node.strategy.narrative = row.narrative;
      node.strategy.sortOrder = Math.min(node.strategy.sortOrder ?? row.displayOrder ?? 0, row.displayOrder ?? 0);
      narrativeIndex.set(row.id, {
        pillar: formattedPillar,
        navItemId: row.navItemId,
        navItemLabel: row.navItemLabel,
        displayOrder: row.displayOrder ?? 0
      });
      const pillarEntry = ensureStrategyPillar(strategyByPillar, formattedPillar, row.displayOrder ?? 0);
      pillarEntry.narratives.add(row.narrative);
    }

    const metricsRows = await NavigationAnnexStrategyMetricModel.listAll(connection);

    for (const row of metricsRows) {
      const info = narrativeIndex.get(row.narrativeId);
      if (!info) {
        continue;
      }
      const metric = {
        id: row.metricKey,
        label: row.label,
        baseline: row.baseline ?? null,
        target: row.target ?? null,
        unit: row.unit ?? '',
        priority: row.displayOrder ?? 0,
        displayOrder: row.displayOrder ?? 0
      };
      const node = nodes.get(info.navItemId);
      if (node) {
        node.strategy.metrics.set(row.metricKey, metric);
      }
      const pillarEntry = ensureStrategyPillar(strategyByPillar, info.pillar, info.displayOrder);
      pillarEntry.metrics.set(row.metricKey, metric);
    }

    const initiatives = {
      primary: [],
      quickActions: [],
      dashboard: []
    };

    nodes.forEach((node) => {
      const operationsTasks = node.operations.tasks
        .slice()
        .sort(sortByPriority)
        .map(({ priority, displayOrder, ...rest }) => rest);

      const design = {
        tokens: Array.from(node.design.tokens).sort(),
        qa: Array.from(node.design.qa.values())
          .sort(sortByPriority)
          .map(({ id, label }) => ({ id, label })),
        references: Array.from(node.design.references).sort()
      };

      const strategyMetrics = Array.from(node.strategy.metrics.values())
        .sort(sortByPriority)
        .map(({ id, label, baseline, target, unit }) => ({ id, label, baseline, target, unit }));

      const initiative = {
        id: node.id,
        label: node.label,
        to: node.route,
        category: node.category,
        initiative: {
          product: node.product,
          operations: {
            runbookSection: node.operations.runbookSection,
            owner: node.operations.owner,
            tasks: operationsTasks
          },
          design,
          strategy: {
            pillar: node.strategy.pillar,
            narrative: node.strategy.narrative,
            metrics: strategyMetrics
          }
        }
      };

      const bucket =
        node.category === 'quick_action'
          ? initiatives.quickActions
          : node.category === 'dashboard'
            ? initiatives.dashboard
            : initiatives.primary;

      bucket.push({ ...initiative, sortOrder: node.sortOrder ?? 0 });
    });

    const normaliseBucket = (bucket) =>
      bucket
        .sort((a, b) => {
          const diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          if (diff !== 0) return diff;
          return String(a.label ?? '').localeCompare(String(b.label ?? ''));
        })
        .map(({ sortOrder, ...rest }) => rest);

    initiatives.primary = normaliseBucket(initiatives.primary);
    initiatives.quickActions = normaliseBucket(initiatives.quickActions);
    initiatives.dashboard = normaliseBucket(initiatives.dashboard);

    const operationsChecklist = checklistTasks
      .sort(sortByPriority)
      .map(({ priority, displayOrder, ...rest }) => rest);

    const designDependencies = {
      tokens: Array.from(aggregatedDesign.tokens).sort(),
      qa: Array.from(aggregatedDesign.qa.values())
        .sort(sortByPriority)
        .map(({ id, label }) => ({ id, label })),
      references: Array.from(aggregatedDesign.references).sort()
    };

    const productBacklog = Array.from(productBacklogIndex.values())
      .sort((a, b) => {
        const diff = (a.priority ?? 99) - (b.priority ?? 99);
        if (diff !== 0) return diff;
        const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      })
      .map(({ priority, displayOrder, ...rest }) => rest);

    const strategyNarratives = Array.from(strategyByPillar.values())
      .sort((a, b) => {
        const diff = (a.order ?? 0) - (b.order ?? 0);
        if (diff !== 0) return diff;
        return String(a.pillar).localeCompare(String(b.pillar));
      })
      .map((entry) => ({
        pillar: entry.pillar,
        narratives: Array.from(entry.narratives),
        metrics: Array.from(entry.metrics.values())
          .sort(sortByPriority)
          .map(({ id, label, baseline, target, unit }) => ({ id, label, baseline, target, unit }))
      }));

    const documentationReferences = Array.from(documentationIndex.values())
      .sort((a, b) => String(a.href).localeCompare(String(b.href)))
      .map((entry) => ({
        href: entry.href,
        usageCount: entry.usageCount,
        categories: Array.from(entry.categories),
        navItems: Array.from(entry.navItemIds),
        navItemLabels: Array.from(entry.navItemLabels)
      }));

    return {
      initiatives,
      operationsChecklist,
      designDependencies,
      strategyNarratives,
      productBacklog,
      documentationIndex: documentationReferences,
      refreshedAt: new Date().toISOString()
    };
  }
}

const CLUSTER_DEFINITIONS = [
  {
    key: 'operations',
    label: 'Operations & Automation',
    description: 'Incident response, telemetry and workflow automation resources for ops teams.',
    keywords: [
      'ops',
      'operation',
      'operations',
      'automation',
      'incident',
      'telemetry',
      'workflow',
      'runbook',
      'quality',
      'governance',
      'sre'
    ],
    aliases: ['ops', 'operations', 'automation'],
    accentClass: 'text-sky-600',
    backgroundClass: 'bg-sky-50 border-sky-200/70',
    badgeLabel: 'Ops'
  },
  {
    key: 'growth',
    label: 'Growth & Monetisation',
    description: 'Funnels, monetisation experiments and retention playbooks for revenue teams.',
    keywords: [
      'growth',
      'monetisation',
      'monetization',
      'revenue',
      'pricing',
      'retention',
      'campaign',
      'marketing',
      'acquisition',
      'funnel',
      'commerce',
      'sales'
    ],
    aliases: ['growth', 'monetisation', 'monetization', 'revenue'],
    accentClass: 'text-emerald-600',
    backgroundClass: 'bg-emerald-50 border-emerald-200/70',
    badgeLabel: 'Growth'
  },
  {
    key: 'enablement',
    label: 'Enablement & Onboarding',
    description: 'Training assets, onboarding kits and playbooks for enablement leaders.',
    keywords: [
      'enablement',
      'onboarding',
      'training',
      'academy',
      'curriculum',
      'knowledge',
      'documentation',
      'playbook',
      'coaching',
      'skills',
      'learning'
    ],
    aliases: ['enablement', 'onboarding', 'training', 'academy'],
    accentClass: 'text-indigo-600',
    backgroundClass: 'bg-indigo-50 border-indigo-200/70',
    badgeLabel: 'Enable'
  },
  {
    key: 'community',
    label: 'Community & Events',
    description: 'Live classrooms, community rituals and collaborative programming.',
    keywords: [
      'community',
      'cohort',
      'cohorts',
      'live',
      'classroom',
      'classrooms',
      'event',
      'events',
      'workshop',
      'webinar',
      'broadcast',
      'session',
      'guild',
      'club'
    ],
    aliases: ['community', 'cohort', 'live', 'events'],
    accentClass: 'text-rose-600',
    backgroundClass: 'bg-rose-50 border-rose-200/70',
    badgeLabel: 'Community'
  },
  {
    key: 'general',
    label: 'General & Cross-functional',
    description: 'Cross-functional resources spanning multiple clusters.',
    keywords: [],
    aliases: ['general', 'mixed', 'shared'],
    accentClass: 'text-slate-600',
    backgroundClass: 'bg-slate-50 border-slate-200/70',
    badgeLabel: 'General'
  }
];

export const LEARNING_CLUSTER_TYPES = ['assets', 'courses', 'liveClassrooms', 'searchSections'];

function normaliseClusterKey(value) {
  if (!value && value !== 0) {
    return null;
  }
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  for (const definition of CLUSTER_DEFINITIONS) {
    if (definition.key === trimmed) {
      return definition.key;
    }
    if (definition.aliases?.includes(trimmed)) {
      return definition.key;
    }
  }
  return null;
}

function describeCluster(key) {
  const definition = CLUSTER_DEFINITIONS.find((item) => item.key === key) ?? CLUSTER_DEFINITIONS.at(-1);
  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    accentClass: definition.accentClass,
    backgroundClass: definition.backgroundClass,
    badgeLabel: definition.badgeLabel
  };
}

function pushTokensFromString(tokens, value) {
  if (!value && value !== 0) {
    return;
  }
  const text = String(value).toLowerCase();
  const matches = text.match(/[a-z0-9]+/g);
  if (!matches) {
    return;
  }
  matches.forEach((token) => {
    if (token.length >= 2) {
      tokens.add(token);
    }
  });
}

function extractTokens(...inputs) {
  const tokens = new Set();
  inputs.forEach((input) => {
    if (!input && input !== 0) {
      return;
    }
    if (Array.isArray(input)) {
      input.forEach((entry) => {
        if (typeof entry === 'string' || typeof entry === 'number') {
          pushTokensFromString(tokens, entry);
        }
      });
      return;
    }
    if (typeof input === 'string' || typeof input === 'number') {
      pushTokensFromString(tokens, input);
      return;
    }
    if (typeof input === 'object') {
      Object.values(input).forEach((value) => {
        if (typeof value === 'string' || typeof value === 'number') {
          pushTokensFromString(tokens, value);
        } else if (Array.isArray(value)) {
          value.forEach((entry) => pushTokensFromString(tokens, entry));
        }
      });
    }
  });
  return Array.from(tokens);
}

function scoreDefinition(tokens, definition) {
  if (!tokens.length) {
    return 0;
  }
  let score = 0;
  for (const keyword of definition.keywords) {
    const term = keyword.toLowerCase();
    for (const token of tokens) {
      if (token === term) {
        score += 3;
      } else if (token.startsWith(term) || term.startsWith(token)) {
        score += 2;
      } else if (token.includes(term)) {
        score += 1;
      }
    }
  }
  return score;
}

function detectCluster(tokens, explicitKey) {
  if (explicitKey) {
    const normalised = normaliseClusterKey(explicitKey);
    if (normalised) {
      return normalised;
    }
  }

  let bestKey = 'general';
  let bestScore = 0;
  for (const definition of CLUSTER_DEFINITIONS) {
    if (definition.key === 'general') {
      continue;
    }
    if (definition.aliases?.some((alias) => tokens.includes(alias))) {
      return definition.key;
    }
    const score = scoreDefinition(tokens, definition);
    if (score > bestScore) {
      bestScore = score;
      bestKey = definition.key;
    }
  }
  return bestScore > 0 ? bestKey : 'general';
}

function createEmptyCounts() {
  return LEARNING_CLUSTER_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});
}

function createEmptyExamples() {
  return LEARNING_CLUSTER_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {});
}

function registerItem(summaryMap, { key, type, name }) {
  const entry = summaryMap.get(key) ?? {
    meta: describeCluster(key),
    counts: createEmptyCounts(),
    examples: createEmptyExamples()
  };
  entry.counts[type] = (entry.counts[type] ?? 0) + 1;
  if (name) {
    const existing = entry.examples[type];
    if (!existing.includes(name) && existing.length < 3) {
      existing.push(name);
    }
  }
  summaryMap.set(key, entry);
}

function buildItemIdentifier(item, fallback) {
  if (!item || typeof item !== 'object') {
    return fallback;
  }
  return (
    item.id ??
    item.publicId ??
    item.slug ??
    (typeof item.title === 'string' ? item.title.toLowerCase() : null) ??
    (typeof item.name === 'string' ? item.name.toLowerCase() : null) ??
    fallback
  );
}

export function getAssetCluster(asset) {
  const explicit = asset?.metadata?.custom?.clusterKey ?? asset?.metadata?.clusterKey ?? asset?.clusterKey;
  const tokens = extractTokens(
    asset?.type,
    asset?.originalFilename,
    asset?.metadata?.custom?.title,
    asset?.metadata?.custom?.description,
    asset?.metadata?.custom?.categories,
    asset?.metadata?.custom?.tags,
    asset?.metadata?.custom?.personas,
    asset?.metadata?.custom?.showcase?.headline
  );
  const key = detectCluster(tokens, explicit);
  return { ...describeCluster(key), key };
}

export function getCourseCluster(course) {
  const rawMetadata = course?.metadata;
  const explicit =
    (rawMetadata && typeof rawMetadata === 'object' ? rawMetadata.clusterKey : null) ??
    course?.clusterKey;
  const tokens = extractTokens(
    course?.title,
    course?.summary,
    course?.description,
    course?.category,
    course?.tags,
    course?.skills,
    course?.level,
    course?.deliveryFormat
  );
  const key = detectCluster(tokens, explicit);
  return { ...describeCluster(key), key };
}

export function getLiveClassroomCluster(session) {
  const tokens = extractTokens(
    session?.title,
    session?.summary,
    session?.description,
    session?.type,
    session?.topics,
    session?.tags,
    session?.communityName
  );
  const key = detectCluster(tokens, session?.clusterKey);
  return { ...describeCluster(key), key };
}

export function getSearchSectionCluster(section) {
  const tokens = extractTokens(
    section?.title,
    section?.description,
    section?.entityType,
    section?.placeholder,
    section?.filterDefinitions?.map((filter) => filter.label)
  );
  const key = detectCluster(tokens, section?.clusterKey);
  return { ...describeCluster(key), key };
}

export function summariseLearningClusters({
  assets = [],
  courses = [],
  liveClassrooms = [],
  searchSections = []
} = {}) {
  const summaryMap = new Map();
  const seen = new Set();

  assets.forEach((asset) => {
    const identifier = `asset:${buildItemIdentifier(asset, asset?.originalFilename ?? asset?.fileName ?? '')}`;
    if (identifier && seen.has(identifier)) {
      return;
    }
    if (identifier) {
      seen.add(identifier);
    }
    const cluster = getAssetCluster(asset);
    registerItem(summaryMap, {
      key: cluster.key,
      type: 'assets',
      name:
        asset?.metadata?.custom?.title ??
        asset?.originalFilename ??
        asset?.fileName ??
        (cluster.label === 'General & Cross-functional' ? 'Library asset' : null)
    });
  });

  courses.forEach((course) => {
    const identifier = `course:${buildItemIdentifier(course, course?.title ?? '')}`;
    if (identifier && seen.has(identifier)) {
      return;
    }
    if (identifier) {
      seen.add(identifier);
    }
    const cluster = getCourseCluster(course);
    registerItem(summaryMap, {
      key: cluster.key,
      type: 'courses',
      name: course?.title ?? course?.slug ?? null
    });
  });

  liveClassrooms.forEach((session) => {
    const identifier = `live:${buildItemIdentifier(session, session?.title ?? '')}`;
    if (identifier && seen.has(identifier)) {
      return;
    }
    if (identifier) {
      seen.add(identifier);
    }
    const cluster = getLiveClassroomCluster(session);
    registerItem(summaryMap, {
      key: cluster.key,
      type: 'liveClassrooms',
      name: session?.title ?? session?.slug ?? null
    });
  });

  searchSections.forEach((section) => {
    const identifier = `search:${buildItemIdentifier(section, section?.title ?? section?.entityType ?? '')}`;
    if (identifier && seen.has(identifier)) {
      return;
    }
    if (identifier) {
      seen.add(identifier);
    }
    const cluster = getSearchSectionCluster(section);
    registerItem(summaryMap, {
      key: cluster.key,
      type: 'searchSections',
      name: section?.title ?? section?.entityType ?? null
    });
  });

  const totalsByType = createEmptyCounts();
  const clusters = CLUSTER_DEFINITIONS.map((definition) => {
    const entry = summaryMap.get(definition.key) ?? {
      meta: describeCluster(definition.key),
      counts: createEmptyCounts(),
      examples: createEmptyExamples()
    };
    const counts = { ...entry.counts };
    const examples = { ...entry.examples };
    LEARNING_CLUSTER_TYPES.forEach((type) => {
      totalsByType[type] += counts[type] ?? 0;
      if (!examples[type]) {
        examples[type] = [];
      }
    });
    const total = LEARNING_CLUSTER_TYPES.reduce((acc, type) => acc + (counts[type] ?? 0), 0);
    return {
      key: definition.key,
      label: entry.meta.label,
      description: entry.meta.description,
      accentClass: entry.meta.accentClass,
      backgroundClass: entry.meta.backgroundClass,
      badgeLabel: entry.meta.badgeLabel,
      counts,
      examples,
      total
    };
  });

  return {
    clusters,
    totalsByType,
    total: LEARNING_CLUSTER_TYPES.reduce((acc, type) => acc + totalsByType[type], 0)
  };
}

export function formatLearningClusterCounts(counts) {
  const entries = [];
  const labels = {
    assets: 'asset',
    courses: 'course',
    liveClassrooms: 'live session',
    searchSections: 'search surface'
  };
  Object.entries(counts ?? {}).forEach(([type, value]) => {
    if (!value) {
      return;
    }
    const label = labels[type] ?? type;
    entries.push(`${value} ${label}${value === 1 ? '' : 's'}`);
  });
  return entries.length ? entries.join(' • ') : 'No inventory yet';
}

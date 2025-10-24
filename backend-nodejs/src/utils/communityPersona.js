const PERSONA_LABELS = {
  operators: 'Operators',
  instructors: 'Instructors',
  learners: 'Learners',
  partners: 'Partners',
  sponsors: 'Sponsors'
};

const PERSONA_KEYWORDS = {
  operators: [/operator/i, /ops/i, /operations/i, /revenue/i, /growth/i],
  instructors: [/instructor/i, /teacher/i, /tutor/i, /coach/i, /faculty/i],
  learners: [/learner/i, /student/i, /participant/i, /cohort/i],
  partners: [/partner/i, /ecosystem/i, /advisor/i, /consultant/i],
  sponsors: [/sponsor/i, /brand/i, /advertiser/i, /partnership/i]
};

function normalisePersonaToken(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const token = String(value).trim().toLowerCase();
  if (!token) {
    return null;
  }

  if (PERSONA_LABELS[token]) {
    return token;
  }

  if (token.startsWith('operator')) return 'operators';
  if (token.startsWith('instructor') || token.startsWith('faculty')) return 'instructors';
  if (token.startsWith('learner') || token.startsWith('student')) return 'learners';
  if (token.startsWith('partner') || token.includes('advisor')) return 'partners';
  if (token.startsWith('sponsor') || token.includes('brand')) return 'sponsors';

  return null;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function applyKeywordExtraction(input, personas) {
  if (!input) {
    return;
  }

  const candidate = Array.isArray(input) ? input : [input];
  candidate.forEach((entry) => {
    if (!entry) {
      return;
    }

    const value = typeof entry === 'string' ? entry : entry?.name ?? entry?.label;
    if (!value) {
      return;
    }

    Object.entries(PERSONA_KEYWORDS).forEach(([persona, patterns]) => {
      if (patterns.some((pattern) => pattern.test(value))) {
        personas.add(persona);
      }
    });
  });
}

function collectTags(community) {
  if (Array.isArray(community?.tags)) {
    return community.tags;
  }

  const metadataTags = community?.metadata?.tags;
  if (Array.isArray(metadataTags)) {
    return metadataTags;
  }

  return [];
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function gatherActivityTimestamps(stats = {}, community = {}, metadata = {}) {
  const timestamps = [];

  [stats.lastActivityAt, community.lastActivityAt, community.updatedAt, metadata.lastActivityAt].forEach((value) => {
    const parsed = parseTimestamp(value);
    if (parsed !== null) {
      timestamps.push(parsed);
    }
  });

  if (metadata?.momentum?.lastActivityAt) {
    const parsed = parseTimestamp(metadata.momentum.lastActivityAt);
    if (parsed !== null) {
      timestamps.push(parsed);
    }
  }

  const metadataEvents = Array.isArray(metadata?.events) ? metadata.events : [];
  metadataEvents.forEach((event) => {
    const parsed = parseTimestamp(event?.startsAt ?? event?.startAt ?? event?.date ?? event?.publishedAt);
    if (parsed !== null) {
      timestamps.push(parsed);
    }
  });

  const communityEvents = Array.isArray(community?.events) ? community.events : [];
  communityEvents.forEach((event) => {
    const parsed = parseTimestamp(event?.startsAt ?? event?.startAt ?? event?.createdAt);
    if (parsed !== null) {
      timestamps.push(parsed);
    }
  });

  return timestamps;
}

export function resolveLastActivity(stats = {}, community = {}, metadata = {}) {
  const timestamps = gatherActivityTimestamps(stats, community, metadata);
  if (!timestamps.length) {
    return null;
  }
  const latest = Math.max(...timestamps);
  return new Date(latest).toISOString();
}

export function computeCommunityEngagementScore(stats = {}, options = {}) {
  const members = toFiniteNumber(stats.members) ?? 0;
  const posts = toFiniteNumber(stats.posts) ?? 0;
  const resources = toFiniteNumber(stats.resources) ?? 0;
  const events = toFiniteNumber(options.events ?? stats.events ?? stats.eventCount) ?? 0;
  const lastActivity = options.lastActivity ?? stats.lastActivityAt ?? null;
  const booster = toFiniteNumber(options.booster) ?? 0;
  const recencyWindowDays = Number.isFinite(options.recencyWindowDays) ? options.recencyWindowDays : 30;

  let recencyBoost = 0;
  if (lastActivity) {
    const timestamp = parseTimestamp(lastActivity);
    if (timestamp !== null) {
      const daysSince = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
      recencyBoost = Math.max(0, recencyWindowDays - daysSince) * 2;
    }
  }

  const baseScore = members * 0.4 + posts * 3 + resources * 2 + events * 5;
  return Math.round(baseScore + recencyBoost + booster);
}

function buildPersonaSignal(persona, metadataSignals = {}) {
  const signal = metadataSignals?.[persona] ?? {};
  const membershipShare = toFiniteNumber(signal.membershipShare);
  return {
    label: PERSONA_LABELS[persona] ?? persona,
    focus: signal.focus ?? null,
    membershipShare: membershipShare !== null ? membershipShare : null,
    trending: Boolean(signal.trending ?? signal.isTrending ?? false),
    highlights: Array.isArray(signal.highlights) ? signal.highlights.slice(0, 6) : [],
    sampleMembers: Array.isArray(signal.sampleMembers) ? signal.sampleMembers.slice(0, 6) : []
  };
}

export function extractCommunityPersonas(community = {}) {
  const personas = new Set();
  const metadata = community.metadata ?? {};

  [community.personas, metadata.personas, metadata.personaProfiles, metadata.audience].forEach((collection) => {
    ensureArray(collection).forEach((entry) => {
      const persona = normalisePersonaToken(entry);
      if (persona) {
        personas.add(persona);
      }
    });
  });

  if (typeof metadata.primaryPersona === 'string') {
    const persona = normalisePersonaToken(metadata.primaryPersona);
    if (persona) {
      personas.add(persona);
    }
  }

  const tags = collectTags(community);
  tags.forEach((tag) => {
    const persona = normalisePersonaToken(tag);
    if (persona) {
      personas.add(persona);
      return;
    }
  });

  applyKeywordExtraction(metadata.focus, personas);
  applyKeywordExtraction(metadata.tagline, personas);
  applyKeywordExtraction(metadata.category, personas);
  applyKeywordExtraction(tags, personas);
  applyKeywordExtraction(community.description, personas);

  if (!personas.size) {
    personas.add('operators');
  }

  return Array.from(personas);
}

export function buildCommunityPersonaSummary(community = {}, stats = {}) {
  const metadata = community.metadata ?? {};
  const personas = extractCommunityPersonas(community);
  const personaSignals = metadata.personaSignals ?? {};

  const orderedPersonas = personas
    .map((persona) => ({
      id: persona,
      weight: toFiniteNumber(personaSignals?.[persona]?.membershipShare) ?? 0
    }))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .map((entry) => entry.id);

  const primaryPersonaCandidate = typeof metadata.primaryPersona === 'string' ? normalisePersonaToken(metadata.primaryPersona) : null;
  const primaryPersona = primaryPersonaCandidate ?? orderedPersonas[0] ?? null;

  const accessModel = metadata.access?.model ?? metadata.accessModel ?? community.visibility ?? 'public';
  const ndaRequired = Boolean(
    metadata.ndaRequired ??
      metadata.access?.ndaRequired ??
      metadata.requirements?.nda ??
      metadata.requirements?.ndaRequired
  );

  const lastActivityAt = resolveLastActivity(
    {
      ...stats,
      lastActivityAt: stats.lastActivityAt
    },
    community,
    metadata
  );

  const engagementScore = computeCommunityEngagementScore(
    {
      members: stats.members,
      posts: stats.posts,
      resources: stats.resources,
      events: stats.events ?? stats.eventCount
    },
    {
      events: stats.events ?? stats.eventCount,
      lastActivity: lastActivityAt,
      booster: metadata.momentum?.boost ?? metadata.momentum?.bonus ?? 0,
      recencyWindowDays: metadata.momentum?.recencyWindowDays
    }
  );

  const signals = orderedPersonas.reduce((acc, persona) => {
    acc[persona] = buildPersonaSignal(persona, personaSignals);
    return acc;
  }, {});

  return {
    personas: orderedPersonas,
    summary: {
      primaryPersona,
      coverage: orderedPersonas.length,
      ndaRequired,
      accessModel,
      engagementScore,
      lastActivityAt,
      signals
    }
  };
}

export const PERSONA_LABEL_ENTRIES = Object.entries(PERSONA_LABELS).map(([id, label]) => ({
  id,
  label
}));

export { PERSONA_LABELS };


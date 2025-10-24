const PERSONA_LABELS = {
  operators: 'Operators',
  instructors: 'Instructors',
  learners: 'Learners',
  partners: 'Partners',
  sponsors: 'Sponsors'
};

const PERSONA_KEYWORDS = {
  operators: [/operator/i, /ops/i, /revenue/i, /growth/i],
  instructors: [/instructor/i, /teacher/i, /tutor/i, /coach/i],
  learners: [/learner/i, /student/i, /participant/i, /cohort/i],
  partners: [/partner/i, /ecosystem/i, /advisor/i],
  sponsors: [/sponsor/i, /brand/i, /advertiser/i]
};

function normalisePersonaToken(value) {
  if (!value) return null;
  const token = String(value).trim().toLowerCase();
  if (!token) return null;

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

export function extractCommunityPersonas(community) {
  const personas = new Set();
  const metadata = community?.metadata ?? {};
  const tags = Array.isArray(community?.tags) ? community.tags : [];

  const candidateArrays = [metadata.personas, metadata.personaProfiles, metadata.audience];
  candidateArrays.forEach((collection) => {
    if (!collection) return;
    const list = Array.isArray(collection) ? collection : [collection];
    list.forEach((item) => {
      const persona = normalisePersonaToken(item);
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

  if (typeof metadata.focus === 'string') {
    const focus = metadata.focus;
    Object.entries(PERSONA_KEYWORDS).forEach(([persona, patterns]) => {
      if (patterns.some((pattern) => pattern.test(focus))) {
        personas.add(persona);
      }
    });
  }

  tags.forEach((tag) => {
    if (!tag) return;
    const persona = normalisePersonaToken(tag);
    if (persona) {
      personas.add(persona);
      return;
    }
    const tagValue = typeof tag === 'string' ? tag : tag?.name;
    if (!tagValue) return;
    Object.entries(PERSONA_KEYWORDS).forEach(([persona, patterns]) => {
      if (patterns.some((pattern) => pattern.test(tagValue))) {
        personas.add(persona);
      }
    });
  });

  if (personas.size === 0) {
    personas.add('operators');
  }

  return Array.from(personas);
}

export function getPersonaLabel(persona) {
  return PERSONA_LABELS[persona] ?? PERSONA_LABELS.operators;
}

export function summarisePersonaCounts(communities) {
  const summary = new Map();
  if (!Array.isArray(communities)) {
    return [];
  }

  communities.forEach((community) => {
    if (!community || String(community.id) === 'all') return;
    extractCommunityPersonas(community).forEach((persona) => {
      summary.set(persona, (summary.get(persona) ?? 0) + 1);
    });
  });

  return Array.from(summary.entries())
    .map(([persona, count]) => ({ id: persona, label: getPersonaLabel(persona), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function computeCommunityEngagementScore(community) {
  const stats = community?.stats ?? {};
  const members = Number(stats.members ?? 0);
  const posts = Number(stats.posts ?? 0);
  const resources = Number(stats.resources ?? 0);
  const events = Number(stats.events ?? community?.events?.length ?? 0);
  const lastActivity = stats.lastActivityAt ?? community?.lastActivityAt ?? community?.updatedAt;

  let recencyBoost = 0;
  if (lastActivity) {
    const timestamp = new Date(lastActivity).getTime();
    if (!Number.isNaN(timestamp)) {
      const daysSince = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
      recencyBoost = Math.max(0, 30 - daysSince) * 2;
    }
  }

  const score = members * 0.4 + posts * 3 + resources * 2 + events * 5 + recencyBoost;
  return Math.round(score);
}

export function resolveLastActivity(community) {
  const stats = community?.stats ?? {};
  return (
    stats.lastActivityAt ??
    community?.lastActivityAt ??
    community?.updatedAt ??
    community?.metadata?.lastActivityAt ??
    null
  );
}

export const PERSONA_LABEL_ENTRIES = Object.entries(PERSONA_LABELS).map(([id, label]) => ({
  id,
  label
}));

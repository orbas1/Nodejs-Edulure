const STATUS_ORDER = ['draft', 'ready_for_review', 'in_review', 'changes_requested', 'approved', 'published', 'archived'];

export const CREATION_TYPE_LABELS = {
  all: 'All types',
  course: 'Courses',
  ebook: 'E-books',
  community: 'Communities',
  ads_asset: 'Ad assets'
};

export const CREATION_TYPE_ORDER = ['course', 'ebook', 'community', 'ads_asset'];

function flattenOutline(outline = []) {
  const result = [];
  outline.forEach((item) => {
    if (!item) return;
    result.push(item);
    if (Array.isArray(item.children)) {
      result.push(...flattenOutline(item.children));
    }
  });
  return result;
}

function scoreStep(values = [], options = {}) {
  const dataset = Array.isArray(values) ? values : [values];
  const minimumRequired = Math.max(1, Math.min(dataset.length, options.minRequired ?? dataset.length));
  const filled = dataset.filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    return Boolean(value);
  }).length;
  if (filled >= dataset.length && dataset.length > 0) return 'complete';
  if (filled >= minimumRequired) return 'complete';
  if (filled > 0) return 'in-progress';
  return 'todo';
}

export function calculateProjectSummary(projects = []) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  return safeProjects.reduce(
    (acc, project) => {
      const status = project?.status ?? 'draft';
      if (status === 'draft') acc.drafts += 1;
      if (['ready_for_review', 'in_review', 'changes_requested'].includes(status)) acc.awaitingReview += 1;
      if (['approved', 'published'].includes(status)) acc.launchReady += 1;
      acc.collaborators += Number.isFinite(Number(project?.collaboratorCount))
        ? Number(project.collaboratorCount)
        : 0;
      if (Array.isArray(project?.activeSessions)) {
        acc.liveSessions += project.activeSessions.filter((session) => !session.leftAt).length;
      }
      const type = project?.type ?? 'unknown';
      acc.typeBreakdown[type] = (acc.typeBreakdown[type] ?? 0) + 1;
      return acc;
    },
    {
      drafts: 0,
      awaitingReview: 0,
      launchReady: 0,
      collaborators: 0,
      liveSessions: 0,
      total: safeProjects.length,
      typeBreakdown: {}
    }
  );
}

export function determineStepStates(project = {}) {
  const builder = STEP_BUILDERS[project.type] ?? buildLearningSteps;
  return builder(project);
}

function buildLearningSteps(project = {}) {
  const metadata = project.metadata ?? {};
  const outline = flattenOutline(project.contentOutline ?? []);
  const complianceNotes = Array.isArray(project.complianceNotes) ? project.complianceNotes : [];
  const pricing = metadata.pricing ?? metadata.pricePlan ?? metadata.monetisation ?? null;
  const mediaAssets = [metadata.assets, metadata.media, metadata.library?.items, metadata.publishingAssets]
    .flat()
    .filter(Boolean);
  const publishState = derivePublishState(project);
  const complianceCount = complianceNotes.length;

  const basicsState = scoreStep(
    [project.title, project.summary, metadata.objectives, metadata.audience ?? metadata.targetAudience],
    { minRequired: 3 }
  );

  const curriculumState = scoreStep([
    outline.length,
    metadata.modules ?? metadata.curriculum,
    metadata.schedule
  ]);

  const pricingState = scoreStep(
    [pricing?.plans ?? pricing?.amount ?? pricing, metadata.offers, metadata.promoCodes],
    { minRequired: 1 }
  );

  const mediaState = scoreStep(
    [mediaAssets, metadata.publishingChannels ?? project.publishingChannels, metadata.branding],
    { minRequired: 2 }
  );

  return [
    {
      id: 'basics',
      label: 'Basics',
      description: 'Define positioning, summary, and target audience.',
      state: basicsState,
      metrics: {
        summaryLength: project.summary?.length ?? 0,
        objectives: Array.isArray(metadata.objectives) ? metadata.objectives.length : 0
      }
    },
    {
      id: 'curriculum',
      label: 'Curriculum',
      description: 'Structure modules, lessons, and prerequisite flow.',
      state: curriculumState,
      metrics: {
        moduleCount: Array.isArray(metadata.modules) ? metadata.modules.length : outline.length,
        outlineEntries: outline.length
      }
    },
    {
      id: 'pricing',
      label: 'Pricing & offers',
      description: 'Configure plans, bundles, and commercial settings.',
      state: pricingState,
      metrics: {
        planCount: Array.isArray(pricing?.plans) ? pricing.plans.length : pricing ? 1 : 0,
        coupons: Array.isArray(metadata.promoCodes) ? metadata.promoCodes.length : 0
      }
    },
    {
      id: 'media',
      label: 'Media & assets',
      description: 'Attach recordings, workbooks, and distribution assets.',
      state: mediaState,
      metrics: {
        assetCount: mediaAssets.length,
        channels: Array.isArray(metadata.publishingChannels ?? project.publishingChannels)
          ? (metadata.publishingChannels ?? project.publishingChannels).length
          : 0
      }
    },
    buildPublishStep(project, publishState, complianceCount)
  ];
}

function buildCommunitySteps(project = {}) {
  const metadata = project.metadata ?? {};
  const programming = metadata.engagementPrograms ?? metadata.programming ?? [];
  const moderation = metadata.moderation ?? {};
  const spaces = metadata.spaces ?? metadata.channels ?? [];

  const identityState = scoreStep([
    project.title,
    metadata.audience,
    metadata.positioning ?? metadata.mission
  ]);
  const programmingState = scoreStep([programming, metadata.events, metadata.resources], { minRequired: 1 });
  const moderationState = scoreStep([
    moderation.guidelines,
    moderation.escalationContacts,
    moderation.tools
  ]);
  const enablementState = scoreStep([spaces, metadata.welcomeFlows, metadata.badges], { minRequired: 1 });

  const publishStep = buildPublishStep(project, derivePublishState(project), (project.complianceNotes ?? []).length);

  return [
    {
      id: 'identity',
      label: 'Community identity',
      description: 'Clarify mission, positioning, and audience value.',
      state: identityState,
      metrics: {
        missionLength: (metadata.mission ?? '').length,
        audience: Array.isArray(metadata.audience) ? metadata.audience.length : Number(Boolean(metadata.audience))
      }
    },
    {
      id: 'programming',
      label: 'Programming',
      description: 'Plan events, rituals, and content cadence.',
      state: programmingState,
      metrics: {
        programmes: Array.isArray(programming) ? programming.length : 0,
        events: Array.isArray(metadata.events) ? metadata.events.length : 0
      }
    },
    {
      id: 'moderation',
      label: 'Moderation & safety',
      description: 'Document guidelines, escalation contacts, and tooling.',
      state: moderationState,
      metrics: {
        guidelines: Array.isArray(moderation.guidelines) ? moderation.guidelines.length : 0,
        escalationContacts: Array.isArray(moderation.escalationContacts) ? moderation.escalationContacts.length : 0
      }
    },
    {
      id: 'enablement',
      label: 'Member enablement',
      description: 'Structure spaces, onboarding, and recognition.',
      state: enablementState,
      metrics: {
        spaces: Array.isArray(spaces) ? spaces.length : 0,
        welcomeFlows: Array.isArray(metadata.welcomeFlows) ? metadata.welcomeFlows.length : Number(Boolean(metadata.welcomeFlows))
      }
    },
    publishStep
  ];
}

function buildAdsAssetSteps(project = {}) {
  const metadata = project.metadata ?? {};
  const analytics = project.analyticsTargets ?? metadata.analyticsTargets ?? {};
  const complianceNotes = Array.isArray(project.complianceNotes) ? project.complianceNotes : [];
  const hooksState = scoreStep([metadata.campaignHooks, metadata.valueProps, metadata.offer]);
  const creativesState = scoreStep([metadata.assets, metadata.variants, metadata.storyboards], { minRequired: 1 });
  const approvalsState = scoreStep([
    metadata.compliance?.approvals,
    metadata.compliance?.expiry,
    metadata.compliance?.regions
  ]);
  const targetingState = scoreStep([analytics.audiences, analytics.keywords, analytics.markets]);
  const publishStep = buildPublishStep(project, derivePublishState(project), complianceNotes.length);

  return [
    {
      id: 'hooks',
      label: 'Campaign hooks',
      description: 'Codify positioning, offer, and messaging pillars.',
      state: hooksState,
      metrics: {
        hooks: Array.isArray(metadata.campaignHooks) ? metadata.campaignHooks.length : 0,
        offers: Number(Boolean(metadata.offer))
      }
    },
    {
      id: 'creatives',
      label: 'Creatives',
      description: 'Attach approved assets, variants, and storyboards.',
      state: creativesState,
      metrics: {
        assets: Array.isArray(metadata.assets) ? metadata.assets.length : 0,
        variants: Array.isArray(metadata.variants) ? metadata.variants.length : 0
      }
    },
    {
      id: 'targeting',
      label: 'Targeting',
      description: 'Define audiences, keywords, and geographies.',
      state: targetingState,
      metrics: {
        audiences: Array.isArray(analytics.audiences) ? analytics.audiences.length : 0,
        markets: Array.isArray(analytics.markets) ? analytics.markets.length : 0
      }
    },
    {
      id: 'approvals',
      label: 'Approvals',
      description: 'Track compliance sign-off and expiry windows.',
      state: approvalsState,
      metrics: {
        approvals: Array.isArray(metadata.compliance?.approvals) ? metadata.compliance.approvals.length : 0,
        expiry: metadata.compliance?.expiry ?? 'pending'
      }
    },
    publishStep
  ];
}

const STEP_BUILDERS = {
  course: buildLearningSteps,
  ebook: buildLearningSteps,
  community: buildCommunitySteps,
  ads_asset: buildAdsAssetSteps
};

function derivePublishState(project = {}) {
  const publishStatus = project.status ?? 'draft';
  const publishIndex = STATUS_ORDER.indexOf(publishStatus);
  const reviewWindow = publishIndex >= STATUS_ORDER.indexOf('ready_for_review');
  const publishComplete = publishIndex >= STATUS_ORDER.indexOf('approved');

  if (publishComplete) {
    return 'complete';
  }
  if (reviewWindow) {
    return 'in-progress';
  }
  return 'todo';
}

function buildPublishStep(project, publishState, complianceCount) {
  let state = publishState;
  if (complianceCount > 0) {
    state = publishState === 'complete' ? 'warning' : publishState === 'in-progress' ? 'blocked' : 'blocked';
  }
  return {
    id: 'publish',
    label: 'Publish readiness',
    description: 'Compliance checks, approvals, and scheduling.',
    state,
    metrics: {
      status: project.status ?? 'draft',
      complianceNotes: complianceCount
    }
  };
}

export function groupTemplatesByType(templates = []) {
  const grouped = new Map();
  templates.forEach((template) => {
    if (!template) return;
    const bucket = template.type ?? 'other';
    if (!grouped.has(bucket)) {
      grouped.set(bucket, []);
    }
    grouped.get(bucket).push(template);
  });
  return grouped;
}

export function describeTemplateSchema(template = {}) {
  const schema = template.schema ?? {};
  const outlineLength = Array.isArray(schema.outline) ? schema.outline.length : 0;
  const assetCount = Array.isArray(schema.assets) ? schema.assets.length : 0;
  const bestPractices = Array.isArray(schema.bestPractices) ? schema.bestPractices.length : 0;
  return {
    outlineLength,
    assetCount,
    bestPractices
  };
}

export function findActiveSessionForUser(sessions = [], userId) {
  if (!userId) return null;
  return (sessions || []).find((session) => session && session.participantId === userId && !session.leftAt) ?? null;
}

export function sessionRecency(session, now = new Date()) {
  if (!session || !session.lastHeartbeatAt) return Infinity;
  const heartbeat = new Date(session.lastHeartbeatAt);
  if (Number.isNaN(heartbeat.getTime())) return Infinity;
  return Math.abs(now.getTime() - heartbeat.getTime());
}

export default {
  calculateProjectSummary,
  determineStepStates,
  groupTemplatesByType,
  describeTemplateSchema,
  findActiveSessionForUser,
  sessionRecency
};

const STATUS_ORDER = ['draft', 'ready_for_review', 'in_review', 'changes_requested', 'approved', 'published', 'archived'];

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
      return acc;
    },
    { drafts: 0, awaitingReview: 0, launchReady: 0, collaborators: 0, liveSessions: 0, total: safeProjects.length }
  );
}

export function determineStepStates(project = {}) {
  const metadata = project.metadata ?? {};
  const outline = flattenOutline(project.contentOutline ?? []);
  const complianceNotes = Array.isArray(project.complianceNotes) ? project.complianceNotes : [];
  const pricing = metadata.pricing ?? metadata.pricePlan ?? metadata.monetisation ?? null;
  const mediaAssets = [metadata.assets, metadata.media, metadata.library?.items, metadata.publishingAssets]
    .flat()
    .filter(Boolean);
  const publishStatus = project.status ?? 'draft';
  const publishIndex = STATUS_ORDER.indexOf(publishStatus);
  const reviewWindow = publishIndex >= STATUS_ORDER.indexOf('ready_for_review');
  const publishComplete = publishIndex >= STATUS_ORDER.indexOf('approved');

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

  let publishState = 'todo';
  if (publishComplete) {
    publishState = complianceNotes.length ? 'warning' : 'complete';
  } else if (reviewWindow) {
    publishState = complianceNotes.length ? 'blocked' : 'in-progress';
  }

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
    {
      id: 'publish',
      label: 'Publish readiness',
      description: 'Compliance checks, review approvals, and launch scheduling.',
      state: publishState,
      metrics: {
        status: publishStatus,
        complianceNotes: complianceNotes.length
      }
    }
  ];
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

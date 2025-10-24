const baseTimestamp = '2025-01-15T00:00:00.000Z';

const backlog = [
  {
    id: 1,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user', 'instructor'],
    epicId: 'UX-401',
    summary: 'Tighten registry alignment for the feed.',
    backlogRef: '/handbook/navigation-annex#feed-registry',
    impactedFiles: ['frontend-reactjs/src/navigation/routes.js'],
    priority: 1,
    displayOrder: 1
  },
  {
    id: 2,
    navItemId: 'admin-only',
    navItemLabel: 'Admin only',
    navItemCategory: 'primary',
    navItemRoute: '/admin',
    roleScope: ['admin'],
    epicId: 'OPS-999',
    summary: 'Should be hidden for users.',
    backlogRef: null,
    impactedFiles: ['backend-nodejs/src/services/AdminService.js'],
    priority: 5,
    displayOrder: 5
  }
];

const operations = [
  {
    id: 10,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user', 'instructor'],
    taskKey: 'ops-feed-runbook',
    label: 'Verify feed registry export.',
    cadence: 'pre-release',
    runbookSection: 'navigation-registry-validation',
    href: '/docs/operations/navigation-readiness#registry-validation',
    owner: 'Operations',
    priority: 1,
    displayOrder: 1,
    includeInChecklist: 1
  },
  {
    id: 12,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    taskKey: 'ops-feed-shared-reference',
    label: 'Cross-check shared annex overview.',
    cadence: 'weekly',
    runbookSection: 'navigation-registry-validation',
    href: '/docs/operations/shared-annex#overview',
    owner: 'Operations',
    priority: 3,
    displayOrder: 3,
    includeInChecklist: 1
  },
  {
    id: 11,
    navItemId: 'admin-only',
    navItemLabel: 'Admin only',
    navItemCategory: 'primary',
    navItemRoute: '/admin',
    roleScope: ['admin'],
    taskKey: 'ops-admin-secret',
    label: 'Admin secret task',
    cadence: 'release',
    runbookSection: 'admin',
    href: null,
    owner: 'Admin',
    priority: 1,
    displayOrder: 1,
    includeInChecklist: 1
  }
];

const design = [
  {
    id: 21,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-token',
    dependencyType: 'token',
    value: '--space-4',
    notes: 'Shared spacing token',
    displayOrder: 1
  },
  {
    id: 22,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-token-duplicate',
    dependencyType: 'token',
    value: '--space-4',
    notes: null,
    displayOrder: 2
  },
  {
    id: 24,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-shared-reference',
    dependencyType: 'reference',
    value: '/docs/operations/shared-annex#overview',
    notes: null,
    displayOrder: 4
  },
  {
    id: 25,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-qa',
    dependencyType: 'qa',
    value: 'Ensure focus ring is visible.',
    notes: null,
    displayOrder: 1
  }
];

const strategyNarratives = [
  {
    id: 31,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    narrativeKey: 'retention-feed-depth',
    pillar: 'retention',
    narrative: 'Reduce clicks to reach the feed after sign-in.',
    displayOrder: 1
  },
  {
    id: 33,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    narrativeKey: 'retention-feed-latency',
    pillar: 'retention',
    narrative: 'Improve feed load time for returning learners.',
    displayOrder: 2
  },
  {
    id: 32,
    navItemId: 'admin-only',
    navItemLabel: 'Admin only',
    navItemCategory: 'primary',
    navItemRoute: '/admin',
    roleScope: ['admin'],
    narrativeKey: 'admin-secret',
    pillar: 'efficiency',
    narrative: 'Hidden admin objective.',
    displayOrder: 1
  }
];

const strategyMetrics = [
  {
    id: 41,
    narrativeId: 31,
    metricKey: 'nav-click-depth',
    label: 'Average click depth to feed',
    baseline: '3.2',
    target: '2.1',
    unit: 'clicks',
    displayOrder: 1
  },
  {
    id: 43,
    narrativeId: 33,
    metricKey: 'feed-render-latency',
    label: 'Feed render time on warm cache',
    baseline: '1.8s',
    target: '1.2s',
    unit: 'duration',
    displayOrder: 2
  },
  {
    id: 42,
    narrativeId: 32,
    metricKey: 'admin-metric',
    label: 'Hidden admin metric',
    baseline: null,
    target: null,
    unit: '',
    displayOrder: 1
  }
];

const quickActions = [
  {
    id: 'create-post',
    label: 'New post',
    description: 'Publish an announcement or share a win with your community.',
    to: '/dashboard/learner/communities',
    analyticsId: 'quick-action-create-post'
  },
  {
    id: 'launch-session',
    label: 'Schedule live session',
    description: 'Spin up a live classroom with chat, recordings, and attendance.',
    to: '/dashboard/instructor/live-classes',
    analyticsId: 'quick-action-launch-session'
  }
];

const annexQuickActions = [
  {
    id: 'launch-session',
    label: 'Coordinate launch readiness',
    to: '/dashboard/instructor/live-classes?annex=ops-221',
    sortOrder: 0,
    initiative: {
      product: {
        epicId: 'OPS-221',
        backlogRef: '/handbook/navigation-annex#quick-live-session',
        summary: 'Route the live-session quick action through the updated scheduler with readiness gating.'
      },
      operations: {
        runbookSection: 'navigation-registry-validation',
        tasks: [
          {
            id: 'ops-live-session-verify',
            label: 'Verify scheduler readiness before launch',
            href: '/docs/operations/navigation-readiness#live-session-readiness'
          }
        ]
      },
      design: { tokens: [], qa: [], references: [] },
      strategy: { pillar: 'Activation', narrative: 'Live session readiness', metrics: [] }
    }
  }
];

export function instantiateNavigationAnnexScenario({ timestamp = baseTimestamp } = {}) {
  const createdAt = new Date(timestamp).toISOString();
  const stamp = (row) => ({ ...row, createdAt, updatedAt: createdAt });
  return {
    createdAt,
    backlogRows: backlog.map(stamp),
    operationTaskRows: operations.map(stamp),
    designDependencyRows: design.map(stamp),
    strategyNarrativeRows: strategyNarratives.map(stamp),
    strategyMetricRows: strategyMetrics.map(stamp),
    quickActions,
    annexQuickActions
  };
}

export const navigationAnnexScenario = {
  baseTimestamp,
  backlog,
  operations,
  design,
  strategyNarratives,
  strategyMetrics,
  quickActions,
  annexQuickActions
};

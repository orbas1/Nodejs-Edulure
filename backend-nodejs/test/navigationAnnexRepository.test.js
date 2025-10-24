import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NavigationAnnexRepository from '../src/repositories/NavigationAnnexRepository.js';
import NavigationAnnexBacklogItemModel from '../src/models/NavigationAnnexBacklogItemModel.js';
import NavigationAnnexDesignDependencyModel from '../src/models/NavigationAnnexDesignDependencyModel.js';
import NavigationAnnexOperationTaskModel from '../src/models/NavigationAnnexOperationTaskModel.js';
import NavigationAnnexStrategyMetricModel from '../src/models/NavigationAnnexStrategyMetricModel.js';
import NavigationAnnexStrategyNarrativeModel from '../src/models/NavigationAnnexStrategyNarrativeModel.js';
import DesignSystemTokenModel from '../src/models/DesignSystemTokenModel.js';
import UxResearchInsightModel from '../src/models/UxResearchInsightModel.js';

const now = new Date().toISOString();

const backlogRows = [
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
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
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
    displayOrder: 5,
    createdAt: now,
    updatedAt: now
  }
];

const operationTasks = [
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
    includeInChecklist: 1,
    createdAt: now,
    updatedAt: now
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
    includeInChecklist: 1,
    createdAt: now,
    updatedAt: now
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
    includeInChecklist: 1,
    createdAt: now,
    updatedAt: now
  }
];

const designDependencies = [
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
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
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
    displayOrder: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 24,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-reference-doc',
    dependencyType: 'reference',
    value: '/docs/design-system/navigation-annex#feed-topbar',
    notes: null,
    displayOrder: 3,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 25,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-shared-reference',
    dependencyType: 'reference',
    value: '/docs/operations/shared-annex#overview',
    notes: null,
    displayOrder: 4,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 23,
    navItemId: 'feed',
    navItemLabel: 'Feed',
    navItemCategory: 'primary',
    navItemRoute: '/feed',
    roleScope: ['user'],
    dependencyKey: 'feed-qa',
    dependencyType: 'qa',
    value: 'Ensure focus ring is visible.',
    notes: null,
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
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
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
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
    displayOrder: 2,
    createdAt: now,
    updatedAt: now
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
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
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
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 43,
    narrativeId: 33,
    metricKey: 'feed-render-latency',
    label: 'Feed render time on warm cache',
    baseline: '1.8s',
    target: '1.2s',
    unit: 'duration',
    displayOrder: 2,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 42,
    narrativeId: 32,
    metricKey: 'admin-metric',
    label: 'Hidden admin metric',
    baseline: null,
    target: null,
    unit: '',
    displayOrder: 1,
    createdAt: now,
    updatedAt: now
  }
];

const designSystemTokens = [
  {
    id: 101,
    tokenKey: '--space-4',
    tokenValue: '1rem',
    source: 'base',
    context: null,
    selector: ':root',
    tokenCategory: 'space',
    displayOrder: 10,
    metadata: { version: '2025-05-26', source: 'base' }
  },
  {
    id: 102,
    tokenKey: '--space-4',
    tokenValue: '1.1rem',
    source: 'data',
    context: null,
    selector: "[data-theme='dark']",
    tokenCategory: 'space',
    displayOrder: 110,
    metadata: { version: '2025-05-26', source: 'data' }
  },
  {
    id: 103,
    tokenKey: '--grid-gap',
    tokenValue: 'var(--space-6)',
    source: 'base',
    context: null,
    selector: ':root',
    tokenCategory: 'grid',
    displayOrder: 64,
    metadata: { version: '2025-05-26', source: 'base' }
  }
];

const researchInsights = [
  {
    id: 201,
    slug: 'design-system-parity',
    title: 'Design system parity verification',
    status: 'completed',
    recordedAt: '2025-05-20',
    owner: 'Design Systems',
    summary: 'Verified generated tokens across platforms.',
    tokensImpacted: ['--space-4', '--grid-gap'],
    documents: ['docs/design-system/design_tokens.json'],
    participants: ['Design Systems triad'],
    evidenceUrl: 'vault://design-system-parity',
    metadata: { version: '2025-05-26' }
  },
  {
    id: 202,
    slug: 'multi-surface-onboarding-intercepts',
    title: 'Multi-surface onboarding intercepts',
    status: 'scheduled',
    recordedAt: '2025-06-05',
    owner: 'Product Research',
    summary: 'Diary-guided intercepts for activation flows.',
    tokensImpacted: ['--space-4'],
    documents: ['user experience.md'],
    participants: ['Ops research partner panel'],
    evidenceUrl: 'notion://research/activation',
    metadata: { version: '2025-05-26' }
  }
];

describe('NavigationAnnexRepository', () => {
  beforeEach(() => {
    vi.spyOn(NavigationAnnexBacklogItemModel, 'listAll').mockResolvedValue(backlogRows);
    vi.spyOn(NavigationAnnexOperationTaskModel, 'listAll').mockResolvedValue(operationTasks);
    vi.spyOn(NavigationAnnexDesignDependencyModel, 'listAll').mockResolvedValue(designDependencies);
    vi.spyOn(NavigationAnnexStrategyNarrativeModel, 'listAll').mockResolvedValue(strategyNarratives);
    vi.spyOn(NavigationAnnexStrategyMetricModel, 'listAll').mockResolvedValue(strategyMetrics);
    vi.spyOn(DesignSystemTokenModel, 'listAll').mockResolvedValue(designSystemTokens);
    vi.spyOn(UxResearchInsightModel, 'listAll').mockResolvedValue(researchInsights);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates annex data and filters scope by role', async () => {
    const annex = await NavigationAnnexRepository.describe({ role: 'user' });

    expect(NavigationAnnexBacklogItemModel.listAll).toHaveBeenCalledTimes(1);

    expect(annex.initiatives.primary).toHaveLength(1);
    const feed = annex.initiatives.primary[0];
    expect(feed.id).toBe('feed');
    expect(feed.initiative.product).toMatchObject({ epicId: 'UX-401', summary: expect.any(String) });
    expect(feed.initiative.operations.tasks).toHaveLength(1);
    expect(feed.initiative.design.tokens).toEqual(['--space-4']);
    expect(feed.initiative.design.qa).toEqual([{ id: 'feed-qa', label: 'Ensure focus ring is visible.' }]);
    expect(feed.initiative.strategy).toMatchObject({
      pillar: 'Retention',
      narrative: 'Reduce clicks to reach the feed after sign-in.'
    });
    expect(feed.initiative.strategy.narratives).toEqual([
      'Reduce clicks to reach the feed after sign-in.',
      'Improve feed load time for returning learners.'
    ]);

    expect(annex.productBacklog).toEqual([
      {
        id: 'UX-401',
        summary: 'Tighten registry alignment for the feed.',
        backlogRef: '/handbook/navigation-annex#feed-registry',
        impactedFiles: ['frontend-reactjs/src/navigation/routes.js']
      }
    ]);

    expect(annex.operationsChecklist).toEqual([
      expect.objectContaining({ id: 'ops-feed-runbook', label: 'Verify feed registry export.' })
    ]);
    expect(annex.designDependencies.tokens).toEqual(['--space-4']);
    expect(annex.designDependencies.qa).toEqual([
      { id: 'feed-qa', label: 'Ensure focus ring is visible.' }
    ]);
    expect(annex.designDependencies.tokenDetails).toEqual([
      {
        key: '--space-4',
        category: 'space',
        contexts: [
          {
            source: 'base',
            context: null,
            selector: ':root',
            value: '1rem',
            displayOrder: 10,
            metadata: { version: '2025-05-26', source: 'base' }
          },
          {
            source: 'data',
            context: null,
            selector: "[data-theme='dark']",
            value: '1.1rem',
            displayOrder: 110,
            metadata: { version: '2025-05-26', source: 'data' }
          }
        ]
      }
    ]);

    expect(annex.strategyNarratives).toEqual([
      {
        pillar: 'Retention',
        narratives: [
          'Reduce clicks to reach the feed after sign-in.',
          'Improve feed load time for returning learners.'
        ],
        metrics: [
          {
            id: 'nav-click-depth',
            label: 'Average click depth to feed',
            baseline: '3.2',
            target: '2.1',
            unit: 'clicks'
          },
          {
            id: 'feed-render-latency',
            label: 'Feed render time on warm cache',
            baseline: '1.8s',
            target: '1.2s',
            unit: 'duration'
          }
        ]
      }
    ]);

    expect(annex.documentationIndex).toEqual([
      {
        href: '/docs/design-system/navigation-annex#feed-topbar',
        usageCount: 1,
        categories: ['design'],
        navItems: ['feed'],
        navItemLabels: ['Feed']
      },
      {
        href: '/docs/operations/navigation-readiness#registry-validation',
        usageCount: 1,
        categories: ['operations'],
        navItems: ['feed'],
        navItemLabels: ['Feed']
      },
      {
        href: '/docs/operations/shared-annex#overview',
        usageCount: 2,
        categories: ['design', 'operations'],
        navItems: ['feed'],
        navItemLabels: ['Feed']
      },
      {
        href: '/handbook/navigation-annex#feed-registry',
        usageCount: 1,
        categories: ['product'],
        navItems: ['feed'],
        navItemLabels: ['Feed']
      }
    ]);

    expect(annex.designSystem).toMatchObject({
      version: '2025-05-26',
      research: {
        version: '2025-05-26',
        totals: { completed: 1, scheduled: 1 }
      }
    });

    expect(annex.designSystem.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: '--space-4', value: '1rem', source: 'base' }),
        expect.objectContaining({ key: '--grid-gap', value: 'var(--space-6)' })
      ])
    );

    expect(annex.designSystem.catalogue).toEqual([
      {
        category: 'space',
        tokens: [
          {
            key: '--space-4',
            contexts: [
              {
                source: 'base',
                context: null,
                selector: ':root',
                value: '1rem',
                displayOrder: 10,
                metadata: { version: '2025-05-26', source: 'base' }
              },
              {
                source: 'data',
                context: null,
                selector: "[data-theme='dark']",
                value: '1.1rem',
                displayOrder: 110,
                metadata: { version: '2025-05-26', source: 'data' }
              }
            ]
          }
        ]
      },
      {
        category: 'grid',
        tokens: [
          {
            key: '--grid-gap',
            contexts: [
              {
                source: 'base',
                context: null,
                selector: ':root',
                value: 'var(--space-6)',
                displayOrder: 64,
                metadata: { version: '2025-05-26', source: 'base' }
              }
            ]
          }
        ]
      }
    ]);

    expect(annex.designSystem.research.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'design-system-parity', status: 'completed' }),
        expect.objectContaining({ slug: 'multi-surface-onboarding-intercepts', status: 'scheduled' })
      ])
    );

    expect(annex.refreshedAt).toMatch(/Z$/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NavigationAnnexRepository from '../src/repositories/NavigationAnnexRepository.js';
import NavigationAnnexBacklogItemModel from '../src/models/NavigationAnnexBacklogItemModel.js';
import NavigationAnnexDesignDependencyModel from '../src/models/NavigationAnnexDesignDependencyModel.js';
import NavigationAnnexOperationTaskModel from '../src/models/NavigationAnnexOperationTaskModel.js';
import NavigationAnnexStrategyMetricModel from '../src/models/NavigationAnnexStrategyMetricModel.js';
import NavigationAnnexStrategyNarrativeModel from '../src/models/NavigationAnnexStrategyNarrativeModel.js';

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

describe('NavigationAnnexRepository', () => {
  beforeEach(() => {
    vi.spyOn(NavigationAnnexBacklogItemModel, 'listAll').mockResolvedValue(backlogRows);
    vi.spyOn(NavigationAnnexOperationTaskModel, 'listAll').mockResolvedValue(operationTasks);
    vi.spyOn(NavigationAnnexDesignDependencyModel, 'listAll').mockResolvedValue(designDependencies);
    vi.spyOn(NavigationAnnexStrategyNarrativeModel, 'listAll').mockResolvedValue(strategyNarratives);
    vi.spyOn(NavigationAnnexStrategyMetricModel, 'listAll').mockResolvedValue(strategyMetrics);
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
    expect(feed.initiative.strategy).toMatchObject({ pillar: 'Retention', narrative: expect.any(String) });

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

    expect(annex.strategyNarratives).toEqual([
      {
        pillar: 'Retention',
        narratives: ['Reduce clicks to reach the feed after sign-in.'],
        metrics: [
          {
            id: 'nav-click-depth',
            label: 'Average click depth to feed',
            baseline: '3.2',
            target: '2.1',
            unit: 'clicks'
          }
        ]
      }
    ]);

    expect(annex.refreshedAt).toMatch(/Z$/);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import NavigationAnnexRepository from '../src/repositories/NavigationAnnexRepository.js';
import NavigationAnnexBacklogItemModel from '../src/models/NavigationAnnexBacklogItemModel.js';
import NavigationAnnexDesignDependencyModel from '../src/models/NavigationAnnexDesignDependencyModel.js';
import NavigationAnnexOperationTaskModel from '../src/models/NavigationAnnexOperationTaskModel.js';
import NavigationAnnexStrategyMetricModel from '../src/models/NavigationAnnexStrategyMetricModel.js';
import NavigationAnnexStrategyNarrativeModel from '../src/models/NavigationAnnexStrategyNarrativeModel.js';

import { instantiateNavigationAnnexScenario } from '../../qa/test-data/navigationAnnex.js';

const {
  backlogRows,
  operationTaskRows,
  designDependencyRows,
  strategyNarrativeRows,
  strategyMetricRows
} = instantiateNavigationAnnexScenario();

const feedBacklog = backlogRows.find((row) => row.navItemId === 'feed');
const feedNarratives = strategyNarrativeRows.filter((row) => row.navItemId === 'feed');
const feedMetrics = strategyMetricRows.filter((row) => feedNarratives.some((narrative) => narrative.id === row.narrativeId));
const feedOperations = operationTaskRows.filter((row) => row.navItemId === 'feed');
const feedTokens = designDependencyRows.filter((row) => row.dependencyType === 'token' && row.navItemId === 'feed');
const feedQaDependencies = designDependencyRows.filter((row) => row.dependencyType === 'qa' && row.navItemId === 'feed');
const sharedReferences = designDependencyRows.filter((row) => row.dependencyType === 'reference');

const adminBacklog = backlogRows.find((row) => row.navItemId === 'admin-only');
const adminTasks = operationTaskRows.filter((row) => row.navItemId === 'admin-only');
const adminNarratives = strategyNarrativeRows.filter((row) => row.navItemId === 'admin-only');
const adminMetrics = strategyMetricRows.filter((row) => adminNarratives.some((narrative) => narrative.id === row.narrativeId));

function expectOnlyFeedSurface(annex) {
  expect(annex.initiatives.primary).toHaveLength(1);
  const feed = annex.initiatives.primary[0];
  expect(feed.id).toBe(feedBacklog.navItemId);
  expect(feed.initiative.product).toMatchObject({ epicId: feedBacklog.epicId, summary: feedBacklog.summary });
  expect(feed.initiative.operations.tasks).toHaveLength(feedOperations.filter((task) => task.roleScope.includes('user')).length);
  expect(feed.initiative.design.tokens).toEqual(feedTokens.map((token) => token.value));
  expect(feed.initiative.design.qa).toEqual(feedQaDependencies.map((qa) => ({ id: qa.dependencyKey, label: qa.value })));
  expect(feed.initiative.strategy.narratives).toEqual(feedNarratives.map((narrative) => narrative.narrative));
  expect(feed.initiative.strategy.metrics.map((metric) => metric.id)).toEqual(feedMetrics.map((metric) => metric.metricKey));
}

describe('NavigationAnnexRepository', () => {
  beforeEach(() => {
    vi.spyOn(NavigationAnnexBacklogItemModel, 'listAll').mockResolvedValue(backlogRows);
    vi.spyOn(NavigationAnnexOperationTaskModel, 'listAll').mockResolvedValue(operationTaskRows);
    vi.spyOn(NavigationAnnexDesignDependencyModel, 'listAll').mockResolvedValue(designDependencyRows);
    vi.spyOn(NavigationAnnexStrategyNarrativeModel, 'listAll').mockResolvedValue(strategyNarrativeRows);
    vi.spyOn(NavigationAnnexStrategyMetricModel, 'listAll').mockResolvedValue(strategyMetricRows);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates annex data and filters scope by role', async () => {
    const annex = await NavigationAnnexRepository.describe({ role: 'user' });

    expect(NavigationAnnexBacklogItemModel.listAll).toHaveBeenCalledTimes(1);

    expectOnlyFeedSurface(annex);

    expect(annex.productBacklog).toEqual([
      {
        id: feedBacklog.epicId,
        summary: feedBacklog.summary,
        backlogRef: feedBacklog.backlogRef,
        impactedFiles: feedBacklog.impactedFiles
      }
    ]);

    expect(annex.operationsChecklist).toEqual(
      feedOperations
        .filter((task) => task.roleScope.includes('user'))
        .map((task) => expect.objectContaining({ id: task.taskKey, label: task.label }))
    );

    expect(annex.designDependencies.tokens).toEqual(feedTokens.map((token) => token.value));
    expect(annex.designDependencies.qa).toEqual(feedQaDependencies.map((qa) => ({ id: qa.dependencyKey, label: qa.value })));

    expect(annex.strategyNarratives).toEqual([
      {
        pillar: 'Retention',
        narratives: feedNarratives.map((narrative) => narrative.narrative),
        metrics: feedMetrics.map((metric) => ({
          id: metric.metricKey,
          label: metric.label,
          baseline: metric.baseline,
          target: metric.target,
          unit: metric.unit
        }))
      }
    ]);

    expect(annex.documentationIndex).toEqual(
      expect.arrayContaining(
        sharedReferences.map((dependency) => ({
          href: dependency.value,
          usageCount: expect.any(Number),
          categories: expect.arrayContaining([expect.any(String)]),
          navItems: expect.arrayContaining(['feed'])
        }))
      )
    );

    expect(annex.refreshedAt).toMatch(/Z$/);
  });

  it('omits admin surfaces for learner roles', async () => {
    const annex = await NavigationAnnexRepository.describe({ role: 'user' });

    expect(annex.initiatives.primary.map((item) => item.id)).not.toContain(adminBacklog.navItemId);
    expect(annex.productBacklog.map((item) => item.id)).not.toContain(adminBacklog.epicId);
    expect(annex.operationsChecklist.map((item) => item.id)).not.toContain(adminTasks[0].taskKey);
    expect(annex.strategyNarratives.flatMap((entry) => entry.metrics.map((metric) => metric.id))).not.toContain(
      adminMetrics[0].metricKey
    );
  });

  it('exposes admin surfaces for admin role', async () => {
    const annex = await NavigationAnnexRepository.describe({ role: 'admin' });

    const adminSurface = annex.initiatives.primary.find((surface) => surface.id === adminBacklog.navItemId);
    expect(adminSurface).toBeDefined();
    expect(adminSurface.initiative.product.epicId).toBe(adminBacklog.epicId);

    expect(annex.operationsChecklist.map((item) => item.id)).toContain(adminTasks[0].taskKey);
    expect(annex.strategyNarratives.flatMap((entry) => entry.metrics.map((metric) => metric.id))).toContain(
      adminMetrics[0].metricKey
    );
  });
});

import { describe, expect, it } from 'vitest';

import CommunityGrowthExperimentModel from '../src/models/CommunityGrowthExperimentModel.js';
import { createMockConnection } from './support/mockDb.js';

describe('CommunityGrowthExperimentModel', () => {
  it('creates experiments with numeric normalisation and metadata safety', async () => {
    const connection = createMockConnection({ community_growth_experiments: [] });

    const experiment = await CommunityGrowthExperimentModel.create(
      {
        communityId: 10,
        createdBy: 6,
        title: 'Improve onboarding completion',
        status: 'ACTIVE',
        baselineValue: '12.5',
        targetValue: 18,
        impactScore: '25',
        metadata: { ownerSlack: '@growth' }
      },
      connection
    );

    expect(experiment.status).toBe('active');
    expect(experiment.baselineValue).toBe(12.5);
    expect(experiment.metadata).toEqual({ ownerSlack: '@growth' });

    const rows = connection.__getRows('community_growth_experiments');
    expect(rows[0].metadata).toBe('{"ownerSlack":"@growth"}');
  });

  it('lists experiments by status and search criteria', async () => {
    const connection = createMockConnection({
      community_growth_experiments: [
        {
          id: 1,
          community_id: 4,
          title: 'Improve activation',
          owner_name: 'Pat',
          status: 'active',
          updated_at: '2024-05-01',
          metadata: '{}'
        },
        {
          id: 2,
          community_id: 4,
          title: 'Reduce churn',
          owner_name: 'Sam',
          status: 'paused',
          updated_at: '2024-05-02',
          metadata: '{}'
        }
      ]
    });

    const { items, total } = await CommunityGrowthExperimentModel.listForCommunity(
      4,
      { status: ['ACTIVE'], search: 'activation', order: 'ASC', limit: 200 },
      connection
    );

    expect(total).toBe(1);
    expect(items[0].title).toBe('Improve activation');
  });

  it('updates experiments while validating fields', async () => {
    const connection = createMockConnection({
      community_growth_experiments: [
        {
          id: 3,
          community_id: 5,
          title: 'Baseline',
          owner_name: null,
          status: 'ideation',
          metadata: '{}'
        }
      ]
    });

    const updated = await CommunityGrowthExperimentModel.update(
      3,
      { status: 'Completed', metadata: { summary: 'Success' }, notes: 'Delivered 15% uplift' },
      connection
    );

    expect(updated.status).toBe('completed');
    expect(updated.metadata).toEqual({ summary: 'Success' });
    expect(updated.notes).toBe('Delivered 15% uplift');
  });
});


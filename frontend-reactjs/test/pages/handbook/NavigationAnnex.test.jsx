import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NavigationAnnex from '../../../src/pages/handbook/NavigationAnnex.jsx';
import NavigationMetadataContext from '../../../src/context/NavigationMetadataContext.jsx';

describe('NavigationAnnex handbook page', () => {
  const contextValue = {
    initiatives: {
      primary: [
        {
          id: 'feed',
          label: 'Feed',
          to: '/feed',
          initiative: {
            product: {
              epicId: 'UX-401',
              summary: 'Align feed registry entries with seeded annex metadata.',
              impactedFiles: ['frontend-reactjs/src/navigation/routes.js'],
              backlogRef: '/handbook/navigation-annex#feed-registry'
            },
            operations: {
              tasks: [
                {
                  id: 'ops-feed-registry',
                  label: 'Verify feed registry export.',
                  cadence: 'pre-release',
                  href: '/docs/operations/navigation-readiness.md#registry-validation'
                }
              ]
            },
            design: {
              tokens: ['--space-4'],
              qa: [
                {
                  id: 'feed-qa',
                  label: 'Ensure focus ring is visible.'
                }
              ],
              references: [
                '/docs/product/navigation-backlog.md#feed-registry',
                'frontend-reactjs/src/components/navigation/AppTopBar.jsx'
              ]
            },
            strategy: {
              narrative: 'Reduce clicks to reach the feed after sign-in.',
              metrics: [
                {
                  id: 'nav-click-depth',
                  label: 'Average click depth to reach feed updates',
                  baseline: '3.2',
                  target: '2.1',
                  unit: 'clicks'
                }
              ]
            }
          }
        }
      ],
      quickActions: [],
      dashboard: []
    },
    operationsChecklist: [
      {
        id: 'ops-feed-registry',
        label: 'Verify feed registry export.',
        cadence: 'pre-release',
        href: '/docs/operations/navigation-readiness.md#registry-validation',
        navItemLabel: 'Feed'
      }
    ],
    designDependencies: { tokens: [], qa: [], references: [] },
    strategyNarratives: [],
    productBacklog: [
      {
        id: 'UX-401',
        summary: 'Align feed registry entries with seeded annex metadata.',
        impactedFiles: ['frontend-reactjs/src/navigation/routes.js'],
        backlogRef: '/handbook/navigation-annex#feed-registry'
      }
    ],
    documentationIndex: [
      {
        href: '/docs/product/navigation-backlog.md#feed-registry',
        categories: ['product'],
        navItems: ['feed'],
        navItemLabels: ['Feed'],
        usageCount: 1
      }
    ],
    refreshedAt: '2024-04-01T10:00:00.000Z',
    status: 'loaded',
    error: null,
    refresh: vi.fn()
  };

  const renderPage = (value = contextValue) =>
    render(
      <NavigationMetadataContext.Provider value={value}>
        <NavigationAnnex />
      </NavigationMetadataContext.Provider>
    );

  it('surfaces seeded annex tasks, backlog, and documentation summaries', () => {
    renderPage();

    expect(screen.getByText('Ensure focus ring is visible.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cross-surface summary/i })).toBeInTheDocument();
    expect(screen.getByText('Operational readiness (Annex A54)')).toBeInTheDocument();
    expect(screen.getAllByText('Verify feed registry export.')).toHaveLength(2);
    expect(screen.getByText('Navigation Backlog • Feed Registry')).toBeInTheDocument();
  });
});

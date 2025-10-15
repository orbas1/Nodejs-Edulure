import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import CreationAnalyticsDashboard from '../CreationAnalyticsDashboard.jsx';
import { creationStudioApi } from '../../../../../api/creationStudioApi.js';

vi.mock('../../../../../api/creationStudioApi.js', () => ({
  creationStudioApi: {
    fetchAnalyticsSummary: vi.fn()
  }
}));

const originalAnchorClick = HTMLAnchorElement.prototype.click;

describe('CreationAnalyticsDashboard', () => {
  const baseResponse = {
    timeframe: { range: '30d', start: '2025-01-01T00:00:00.000Z', end: '2025-01-30T23:59:59.000Z' },
    projectMetrics: {
      totals: { total: 6, published: 3, awaitingReview: 1 },
      reviewBacklog: { total: 2, awaitingReview: 1, inReview: 1, changesRequested: 0 },
      velocity: { averageReviewHours: 42.5, averageLaunchHours: 96.2, fastestLaunchHours: 12.4, lastPublishedAt: '2025-01-28T18:01:00.000Z' },
      collaboration: { collaborators: 9, averageCollaboratorsPerProject: 1.5, activeSessions: 2, totalSessions: 6, averageSessionMinutes: 38.2 }
    },
    engagement: {
      totals: { views: 12045, completions: 6200, conversions: 1320, watchTimeMinutes: 4920, revenueCents: 985000, subscribers: 240 },
      rates: { completionRate: 51.5, conversionRate: 10.9 },
      perProjectAverages: { watchTimeMinutes: 820, revenueCents: 164166 },
      audienceTargets: { audiences: ['Founders', 'Teachers'], markets: ['US', 'UK'], goals: ['Revenue'] }
    },
    adsPerformance: {
      totals: {
        campaigns: 4,
        activeCampaigns: 2,
        pausedCampaigns: 1,
        spendCents: 220000,
        budgetDailyCents: 48000,
        averageCtr: 0.032,
        averageCpcCents: 220,
        averageCpaCents: 1250
      },
      topCampaigns: [
        {
          id: 'cmp-1',
          name: 'Launch webinar',
          status: 'active',
          performanceScore: 0.812,
          ctr: 0.042,
          cpcCents: 180,
          cpaCents: 990
        }
      ]
    },
    rankingInsights: [
      {
        rank: 1,
        entityId: 'proj-1',
        entityName: 'AI Playbook',
        context: 'course',
        score: 0.874,
        completionRate: 65.4,
        conversionRate: 18.2,
        driver: 'Learners are completing the catalogue at a very high rate – expand the syllabus.',
        revenueCents: 500000,
        collaboratorCount: 3,
        updatedAt: '2025-01-25T10:00:00.000Z'
      }
    ],
    scamAlert: {
      state: 'elevated',
      openReports: 3,
      highRiskCount: 1,
      lastReportAt: '2025-01-26T12:00:00.000Z',
      topReasons: [
        { reason: 'Suspicious payout', count: 2 },
        { reason: 'Phishing copy', count: 1 }
      ],
      guidance: 'Investigations are in progress. Review flagged assets and confirm mitigation owners.'
    },
    exportMeta: { generatedAt: '2025-01-30T23:59:59.000Z' }
  };

  beforeEach(() => {
    creationStudioApi.fetchAnalyticsSummary.mockResolvedValue(baseResponse);
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    HTMLAnchorElement.prototype.click = originalAnchorClick;
  });

  it('renders analytics metrics and ranking insights', async () => {
    render(<CreationAnalyticsDashboard token="test-token" />);

    expect(await screen.findByText(/Creation performance overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Total projects/i)).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/AI Playbook/i)).toBeInTheDocument();
    expect(screen.getByText(/Launch webinar/i)).toBeInTheDocument();

    expect(creationStudioApi.fetchAnalyticsSummary).toHaveBeenCalledWith({ token: 'test-token', range: '30d', signal: expect.any(Object) });
  });

  it('allows changing the range and refetches analytics', async () => {
    render(<CreationAnalyticsDashboard token="token" />);
    await screen.findByText(/Creation performance overview/i);

    creationStudioApi.fetchAnalyticsSummary.mockResolvedValueOnce({ ...baseResponse, timeframe: { ...baseResponse.timeframe, range: '7d' } });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Last 7 days/i }));
    });

    await waitFor(() => {
      expect(creationStudioApi.fetchAnalyticsSummary).toHaveBeenLastCalledWith({ token: 'token', range: '7d', signal: expect.any(Object) });
    });
  });

  it('exports analytics summary as CSV', async () => {
    render(<CreationAnalyticsDashboard token="token" />);
    await screen.findByText(/Creation performance overview/i);

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});

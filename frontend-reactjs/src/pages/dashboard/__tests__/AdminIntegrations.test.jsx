import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminIntegrations from '../AdminIntegrations.jsx';

const fetchIntegrationDashboardMock = vi.hoisted(() => vi.fn());
const triggerIntegrationRunMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../api/integrationAdminApi.js', () => ({
  fetchIntegrationDashboard: fetchIntegrationDashboardMock,
  triggerIntegrationRun: triggerIntegrationRunMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

const snapshotFixture = {
  generatedAt: '2025-02-25T12:00:00.000Z',
  concurrency: { activeJobs: 1, maxConcurrentJobs: 2 },
  integrations: [
    {
      id: 'hubspot',
      label: 'HubSpot CRM',
      health: 'warning',
      enabled: true,
      summary: {
        lastRunAt: '2025-02-25T11:00:00.000Z',
        successRate: 92,
        recordsPushed: 120,
        recordsFailed: 3,
        openFailures: 2
      },
      recentRuns: [
        {
          id: 10,
          correlationId: 'sync-10',
          triggeredBy: 'manual-dashboard',
          status: 'succeeded',
          durationSeconds: 45,
          records: { pushed: 120, failed: 3 },
          finishedAt: '2025-02-25T11:05:00.000Z',
          lastError: null
        }
      ],
      failureLog: [
        {
          id: 1,
          entityId: 'contact-123',
          message: 'Email rejected',
          operation: 'upsert',
          direction: 'outbound',
          retryCount: 1,
          occurredAt: '2025-02-25T11:04:00.000Z'
        }
      ],
      reconciliation: {
        reports: [
          {
            id: 5,
            status: 'completed',
            mismatchCount: 2,
            generatedAt: '2025-02-24T23:45:00.000Z',
            missingInPlatform: [{ id: 'hub-1', name: 'Missing Contact', email: 'mi***@example.com' }],
            missingInIntegration: []
          }
        ]
      }
    }
  ]
};

describe('<AdminIntegrations />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-xyz' } } });
    fetchIntegrationDashboardMock.mockResolvedValue(snapshotFixture);
    triggerIntegrationRunMock.mockResolvedValue({ message: 'Integration sync accepted' });
  });

  const renderComponent = async () => {
    await act(async () => {
      render(<AdminIntegrations />);
    });
  };

  it('loads snapshot and renders integration metrics', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(fetchIntegrationDashboardMock).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'token-xyz' })
      );
    });

    expect(await screen.findByText('Integration control centre')).toBeInTheDocument();
    expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();
    expect(screen.getByText('Success rate')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();

    const runsTable = screen.getByRole('table');
    const row = within(runsTable).getByText('sync-10').closest('tr');
    expect(row).not.toBeNull();
    if (row) {
      expect(within(row).getByText('succeeded')).toBeInTheDocument();
    }

    expect(screen.getByText('Failures detected')).toBeInTheDocument();
  });

  it('triggers manual sync and surfaces success message', async () => {
    await renderComponent();

    await screen.findByText('HubSpot CRM');

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Trigger manual sync' }));
    });

    await waitFor(() => {
      expect(triggerIntegrationRunMock).toHaveBeenCalledWith({ token: 'token-xyz', integration: 'hubspot' });
    });

    expect(await screen.findByText('Sync triggered successfully')).toBeInTheDocument();
  });

  it('displays API errors', async () => {
    const error = new Error('Sync bus unavailable');
    fetchIntegrationDashboardMock.mockRejectedValueOnce(error);

    await renderComponent();

    expect(await screen.findByText('Sync bus unavailable')).toBeInTheDocument();
  });

  it('surfaces manual sync failures and clears the alert after timeout', async () => {
    triggerIntegrationRunMock.mockRejectedValueOnce(new Error('HubSpot API unavailable'));
    await renderComponent();

    await screen.findByText('HubSpot CRM');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Trigger manual sync' }));
    });

    expect(triggerIntegrationRunMock).toHaveBeenCalledWith({ token: 'token-xyz', integration: 'hubspot' });
    expect(await screen.findByText('HubSpot API unavailable')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4100));
    });

    expect(screen.queryByText('HubSpot API unavailable')).not.toBeInTheDocument();
  });
});


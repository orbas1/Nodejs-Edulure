import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminIntegrations from '../AdminIntegrations.jsx';

const fetchIntegrationDashboardMock = vi.hoisted(() => vi.fn());
const triggerIntegrationRunMock = vi.hoisted(() => vi.fn());
const listIntegrationApiKeysMock = vi.hoisted(() => vi.fn());
const createIntegrationApiKeyMock = vi.hoisted(() => vi.fn());
const rotateIntegrationApiKeyMock = vi.hoisted(() => vi.fn());
const disableIntegrationApiKeyMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../api/integrationAdminApi.js', () => ({
  fetchIntegrationDashboard: fetchIntegrationDashboardMock,
  triggerIntegrationRun: triggerIntegrationRunMock,
  listIntegrationApiKeys: listIntegrationApiKeysMock,
  createIntegrationApiKey: createIntegrationApiKeyMock,
  rotateIntegrationApiKey: rotateIntegrationApiKeyMock,
  disableIntegrationApiKey: disableIntegrationApiKeyMock
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

const apiKeysFixture = [
  {
    id: 1,
    provider: 'openai',
    providerLabel: 'OpenAI',
    environment: 'production',
    alias: 'Content Studio Bot',
    ownerEmail: 'ops@example.com',
    lastFour: '9xyz',
    rotationIntervalDays: 90,
    lastRotatedAt: '2025-02-01T12:00:00.000Z',
    nextRotationAt: '2025-05-02T12:00:00.000Z',
    rotationStatus: 'ok',
    status: 'active',
    daysUntilRotation: 66,
    rotationHistory: [
      { rotatedAt: '2025-02-01T12:00:00.000Z', rotatedBy: 'ops@example.com', reason: 'initial-provision' }
    ],
    metadata: { lastRotatedBy: 'ops@example.com' }
  },
  {
    id: 2,
    provider: 'anthropic',
    providerLabel: 'Anthropic Claude',
    environment: 'staging',
    alias: 'Claude Drafting',
    ownerEmail: 'integrations@example.com',
    lastFour: 'abcd',
    rotationIntervalDays: 45,
    lastRotatedAt: '2024-12-01T12:00:00.000Z',
    nextRotationAt: '2025-01-15T12:00:00.000Z',
    rotationStatus: 'overdue',
    status: 'active',
    daysUntilRotation: -41,
    rotationHistory: [],
    metadata: { lastRotatedBy: 'integrations@example.com' }
  }
];

describe('<AdminIntegrations />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-xyz' } } });
    fetchIntegrationDashboardMock.mockResolvedValue(snapshotFixture);
    triggerIntegrationRunMock.mockResolvedValue({ message: 'Integration sync accepted' });
    listIntegrationApiKeysMock.mockResolvedValue(apiKeysFixture);
    createIntegrationApiKeyMock.mockResolvedValue({ id: 3 });
    rotateIntegrationApiKeyMock.mockResolvedValue({ id: 2 });
    disableIntegrationApiKeyMock.mockResolvedValue({ id: 2, status: 'disabled' });
    if (typeof window !== 'undefined') {
      window.confirm = vi.fn(() => true);
    }
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

    await waitFor(() => {
      expect(listIntegrationApiKeysMock).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'token-xyz' })
      );
    });

    expect(await screen.findByText('Integration control centre')).toBeInTheDocument();
    expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();
    expect(screen.getByText('Success rate')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    const runsTable = tables.find((table) => within(table).queryByText('sync-10'));
    expect(runsTable).toBeTruthy();
    if (runsTable) {
      const row = within(runsTable).getByText('sync-10').closest('tr');
      expect(row).not.toBeNull();
      if (row) {
        expect(within(row).getByText('succeeded')).toBeInTheDocument();
      }
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

  it('renders BYO API key catalogue with rotation insights', async () => {
    await renderComponent();

    expect(await screen.findByText('Bring-your-own API keys')).toBeInTheDocument();
    expect(screen.getByText('Content Studio Bot')).toBeInTheDocument();
    expect(screen.getByText('Rotation overdue')).toBeInTheDocument();
    expect(screen.getByText('Managed keys')).toBeInTheDocument();
  });

  it('validates and submits new API key form', async () => {
    await renderComponent();

    await screen.findByText('Store a new key');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Store API key' }));
    });

    await waitFor(() => {
      expect(screen.getAllByText('Please resolve the highlighted validation issues').length).toBeGreaterThan(0);
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Alias'), 'New Partner');
      await user.type(screen.getByLabelText('Owner email'), 'owner@example.com');
      await user.clear(screen.getByLabelText('Rotation cadence (days)'));
      await user.type(screen.getByLabelText('Rotation cadence (days)'), '120');
      await user.type(screen.getByLabelText('API key'), 'sk-live-example-credential-xyz123');
      await user.click(screen.getByRole('button', { name: 'Store API key' }));
    });

    await waitFor(() => {
      expect(createIntegrationApiKeyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          alias: 'New Partner',
          rotationIntervalDays: 120
        })
      );
    });

    expect(await screen.findByText('API key stored securely. Rotation reminders scheduled.')).toBeInTheDocument();
  });

  it('rotates an API key with inline form', async () => {
    await renderComponent();
    await screen.findByText('Content Studio Bot');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: 'Rotate key' })[1]);
    });

    await act(async () => {
      const rotationKeyArea = screen.getByLabelText('New API key');
      await user.type(rotationKeyArea, 'sk-new-credential-abc123456789');
      const rotationCadenceInputs = screen.getAllByLabelText('Rotation cadence (days)');
      const rotationCadence = rotationCadenceInputs[rotationCadenceInputs.length - 1];
      await user.clear(rotationCadence);
      await user.type(rotationCadence, '60');
      await user.click(screen.getByRole('button', { name: 'Confirm rotation' }));
    });

    await waitFor(() => {
      expect(rotateIntegrationApiKeyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, rotationIntervalDays: 60 })
      );
    });
    expect(await screen.findByText('API key rotated successfully')).toBeInTheDocument();
  });

  it('disables an API key with confirmation', async () => {
    await renderComponent();
    await screen.findByText('Claude Drafting');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getAllByRole('button', { name: 'Disable' })[1]);
    });

    await waitFor(() => {
      expect(disableIntegrationApiKeyMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2 })
      );
    });
  });
});


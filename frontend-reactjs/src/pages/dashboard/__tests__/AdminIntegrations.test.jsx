import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminIntegrations from '../AdminIntegrations.jsx';

const fetchIntegrationDashboardMock = vi.hoisted(() => vi.fn());
const triggerIntegrationRunMock = vi.hoisted(() => vi.fn());
const listIntegrationApiKeysMock = vi.hoisted(() => vi.fn());
const disableIntegrationApiKeyMock = vi.hoisted(() => vi.fn());
const listIntegrationApiKeyInvitationsMock = vi.hoisted(() => vi.fn());
const createIntegrationApiKeyInvitationMock = vi.hoisted(() => vi.fn());
const resendIntegrationApiKeyInvitationMock = vi.hoisted(() => vi.fn());
const cancelIntegrationApiKeyInvitationMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../api/integrationAdminApi.js', () => ({
  fetchIntegrationDashboard: fetchIntegrationDashboardMock,
  triggerIntegrationRun: triggerIntegrationRunMock,
  listIntegrationApiKeys: listIntegrationApiKeysMock,
  disableIntegrationApiKey: disableIntegrationApiKeyMock,
  listIntegrationApiKeyInvitations: listIntegrationApiKeyInvitationsMock,
  createIntegrationApiKeyInvitation: createIntegrationApiKeyInvitationMock,
  resendIntegrationApiKeyInvitation: resendIntegrationApiKeyInvitationMock,
  cancelIntegrationApiKeyInvitation: cancelIntegrationApiKeyInvitationMock
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

const invitationsFixture = [
  {
    id: 'invite-1',
    provider: 'openai',
    providerLabel: 'OpenAI',
    environment: 'production',
    alias: 'Content Studio Bot',
    ownerEmail: 'ops@example.com',
    status: 'pending',
    expiresAt: '2025-02-27T12:00:00.000Z',
    lastSentAt: '2025-02-25T12:30:00.000Z',
    rotationIntervalDays: 90,
    apiKeyId: 1
  }
];

describe('<AdminIntegrations />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      session: {
        tokens: { accessToken: 'token-xyz' },
        user: { email: 'admin@example.com', name: 'Ops Admin' }
      }
    });
    fetchIntegrationDashboardMock.mockResolvedValue(snapshotFixture);
    triggerIntegrationRunMock.mockResolvedValue({ message: 'Integration sync accepted' });
    listIntegrationApiKeysMock.mockResolvedValue(apiKeysFixture);
    listIntegrationApiKeyInvitationsMock.mockResolvedValue(invitationsFixture);
    createIntegrationApiKeyInvitationMock.mockResolvedValue({
      invite: {
        id: 'invite-2',
        provider: 'anthropic',
        providerLabel: 'Anthropic Claude',
        environment: 'staging',
        alias: 'Claude Drafting',
        ownerEmail: 'integrations@example.com',
        status: 'pending',
        rotationIntervalDays: 60,
        apiKeyId: 2
      },
      claimUrl: 'https://ops.edulure.com/integrations/credential-invite/token'
    });
    resendIntegrationApiKeyInvitationMock.mockResolvedValue({
      invite: { ...invitationsFixture[0], lastSentAt: '2025-02-25T13:00:00.000Z' },
      claimUrl: 'https://ops.edulure.com/integrations/credential-invite/resend'
    });
    cancelIntegrationApiKeyInvitationMock.mockResolvedValue({
      ...invitationsFixture[0],
      status: 'cancelled',
      cancelledAt: '2025-02-25T13:30:00.000Z'
    });
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

  it('loads dashboard snapshot, API keys, and invitation catalogue', async () => {
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

    await waitFor(() => {
      expect(listIntegrationApiKeyInvitationsMock).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'token-xyz' })
      );
    });

    expect(await screen.findByText('Integration control centre')).toBeInTheDocument();
    expect(screen.getByText('HubSpot CRM')).toBeInTheDocument();

    const rotationButton = await screen.findByRole('button', { name: 'Invite pending' });
    expect(rotationButton).toBeDisabled();
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

  it('validates and sends a credential invitation for a new alias', async () => {
    await renderComponent();

    await screen.findByText('Bring-your-own API keys');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Send invite' }));
    });

    const validationAlerts = await screen.findAllByText('Please resolve the highlighted validation issues');
    expect(validationAlerts[0]).toBeInTheDocument();

    await act(async () => {
      await user.type(screen.getByLabelText('Alias'), 'New Partner');
      await user.type(screen.getByLabelText('Owner email'), 'owner@example.com');
      await user.clear(screen.getByLabelText('Rotation cadence (days)'));
      await user.type(screen.getByLabelText('Rotation cadence (days)'), '120');
      await user.type(screen.getByLabelText('Business justification'), 'Marketing attribution refresh');
      await user.click(screen.getByRole('button', { name: 'Send invite' }));
    });

    await waitFor(() => {
      expect(createIntegrationApiKeyInvitationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          alias: 'New Partner',
          ownerEmail: 'owner@example.com',
          rotationIntervalDays: 120,
          requestedByName: 'Ops Admin'
        })
      );
    });

    const successAlerts = await screen.findAllByText('Invitation sent to owner@example.com.');
    expect(successAlerts[0]).toBeInTheDocument();
    expect(screen.getByText('Secure invite ready for owner@example.com.')).toBeInTheDocument();
  });

  it('requests a rotation invite for an existing key', async () => {
    await renderComponent();
    await screen.findByText('Claude Drafting');

    createIntegrationApiKeyInvitationMock.mockResolvedValueOnce({
      invite: {
        id: 'invite-rotate',
        provider: 'anthropic',
        providerLabel: 'Anthropic Claude',
        environment: 'staging',
        alias: 'Claude Drafting',
        ownerEmail: 'integrations@example.com',
        status: 'pending',
        rotationIntervalDays: 60,
        apiKeyId: 2
      },
      claimUrl: 'https://ops.edulure.com/integrations/credential-invite/rotate'
    });

    const user = userEvent.setup();
    await act(async () => {
      const rotationButton = screen.getByRole('button', { name: 'Request rotation' });
      await user.click(rotationButton);
    });

    await act(async () => {
      await user.type(screen.getByLabelText('Rotation reason'), 'Scheduled refresh');
      const cadenceInputs = screen.getAllByLabelText('Rotation cadence (days)');
      const rotationCadenceInput = cadenceInputs[cadenceInputs.length - 1];
      await user.clear(rotationCadenceInput);
      await user.type(rotationCadenceInput, '75');
      await user.click(screen.getByRole('button', { name: 'Send rotation invite' }));
    });

    await waitFor(() => {
      expect(createIntegrationApiKeyInvitationMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          apiKeyId: 2,
          ownerEmail: 'integrations@example.com',
          rotationIntervalDays: 75,
          requestedByName: 'Ops Admin'
        })
      );
    });

    const rotationSuccess = await screen.findAllByText('Rotation invitation sent successfully');
    expect(rotationSuccess[0]).toBeInTheDocument();
    expect(screen.getByText('Rotation invite ready for integrations@example.com.')).toBeInTheDocument();
  });

  it('resends and cancels invitations from the catalogue', async () => {
    await renderComponent();

    await screen.findByText('Credential invitations');

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Resend' }));
    });

    await waitFor(() => {
      expect(resendIntegrationApiKeyInvitationMock).toHaveBeenCalledWith({
        token: 'token-xyz',
        id: 'invite-1',
        requestedByName: 'Ops Admin'
      });
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    await waitFor(() => {
      expect(cancelIntegrationApiKeyInvitationMock).toHaveBeenCalledWith({ token: 'token-xyz', id: 'invite-1' });
    });
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
        expect.objectContaining({ id: 2, reason: 'Manually revoked from integrations dashboard' })
      );
    });
  });
});

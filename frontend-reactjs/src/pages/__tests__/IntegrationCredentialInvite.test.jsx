import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import IntegrationCredentialInvite from '../IntegrationCredentialInvite.jsx';

const fetchIntegrationInviteMock = vi.hoisted(() => vi.fn());
const submitIntegrationInviteMock = vi.hoisted(() => vi.fn());

vi.mock('../../api/integrationInviteApi.js', () => ({
  fetchIntegrationInvite: fetchIntegrationInviteMock,
  submitIntegrationInvite: submitIntegrationInviteMock
}));

const inviteFixture = {
  id: 'invite-123',
  provider: 'openai',
  providerLabel: 'OpenAI',
  environment: 'production',
  alias: 'Content Studio Bot',
  rotationIntervalDays: 90,
  keyExpiresAt: '2025-03-10T12:00:00.000Z',
  requestedAt: '2025-02-25T12:00:00.000Z',
  expiresAt: '2025-02-27T12:00:00.000Z',
  notes: 'Supports marketing automation',
  reason: 'Initial onboarding',
  ownerEmail: 'ops@example.com'
};

function renderWithRouter(token = 'token-xyz') {
  return act(async () => {
    render(
      <MemoryRouter initialEntries={[`/integrations/credential-invite/${token}`]}>
        <Routes>
          <Route path="/integrations/credential-invite/:token" element={<IntegrationCredentialInvite />} />
        </Routes>
      </MemoryRouter>
    );
  });
}

describe('<IntegrationCredentialInvite />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchIntegrationInviteMock.mockResolvedValue(inviteFixture);
    submitIntegrationInviteMock.mockResolvedValue({ invite: inviteFixture, apiKey: { id: 10 } });
  });

  it('loads invite details and pre-fills contextual guidance', async () => {
    await renderWithRouter();

    await waitFor(() => {
      expect(fetchIntegrationInviteMock).toHaveBeenCalledWith({ token: 'token-xyz', signal: expect.any(AbortSignal) });
    });

    expect(await screen.findByText('Provide secure credential')).toBeInTheDocument();
    expect(screen.getByText(/Content Studio Bot/)).toBeInTheDocument();
    expect(screen.getByText('How this works')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ops@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(document.title).toContain('Provide OpenAI credential');
  });

  it('surfaces an error when the invitation cannot be retrieved', async () => {
    fetchIntegrationInviteMock.mockRejectedValueOnce(new Error('Invitation not found'));
    await renderWithRouter('missing');

    expect(await screen.findByText('Invitation not found')).toBeInTheDocument();
  });

  it('validates API key length before submitting', async () => {
    await renderWithRouter();
    await screen.findByText('Provide secure credential');

    await act(async () => {
      await userEvent.type(screen.getByLabelText('API key'), 'short');
      await userEvent.click(screen.getByRole('button', { name: 'Submit credential' }));
    });

    expect(await screen.findByText('API key must be at least 20 characters long.')).toBeInTheDocument();
    expect(submitIntegrationInviteMock).not.toHaveBeenCalled();
  });

  it('submits the credential and surfaces success messaging', async () => {
    await renderWithRouter();
    await screen.findByText('Provide secure credential');

    const key = 'sk-live-example-credential-123456';
    await act(async () => {
      await userEvent.clear(screen.getByLabelText('API key'));
      await userEvent.type(screen.getByLabelText('API key'), `${key}   `);
      await userEvent.clear(screen.getByLabelText('Key expiry (optional)'));
      await userEvent.type(screen.getByLabelText('Key expiry (optional)'), '2025-03-15');
      await userEvent.clear(screen.getByLabelText('Rotation cadence (days)'));
      await userEvent.type(screen.getByLabelText('Rotation cadence (days)'), '120');
      await userEvent.clear(screen.getByLabelText('Notes for operations (optional)'));
      await userEvent.type(screen.getByLabelText('Notes for operations (optional)'), 'Rotating to new org policy');
      await userEvent.click(screen.getByRole('button', { name: 'Submit credential' }));
    });

    await waitFor(() => {
      expect(submitIntegrationInviteMock).toHaveBeenCalledWith({
        token: 'token-xyz',
        key,
        rotationIntervalDays: '120',
        keyExpiresAt: '2025-03-15',
        actorEmail: 'ops@example.com',
        actorName: '',
        reason: 'Rotating to new org policy'
      });
    });

    expect(await screen.findByText('Credential received. Our operations team will verify encryption and confirm rotation.')).toBeInTheDocument();
    expect(screen.getByText('Next steps')).toBeInTheDocument();
  });
});

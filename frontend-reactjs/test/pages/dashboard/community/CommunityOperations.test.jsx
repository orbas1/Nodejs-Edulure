import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityOperations from '../../../../src/pages/dashboard/community/CommunityOperations.jsx';

const publishRunbookMock = vi.fn();
const acknowledgeEscalationMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../../../src/api/communityApi.js', () => ({
  publishCommunityRunbook: (...args) => publishRunbookMock(...args),
  acknowledgeCommunityEscalation: (...args) => acknowledgeEscalationMock(...args)
}));

vi.mock('../../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

describe('CommunityOperations', () => {
  const dashboard = {
    operations: {
      runbooks: [
        {
          id: 'runbook-1',
          communityId: 99,
          title: 'Incident response',
          owner: 'Ops Team',
          automationReady: true,
          tags: ['safety'],
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ],
      escalations: [
        {
          id: 'case-1',
          communityId: 42,
          title: 'Review flagged content',
          due: 'Tomorrow',
          status: 'Pending',
          community: 'DesignOps Collective',
          owner: 'Moderator crew'
        }
      ]
    },
    health: { moderators: [] }
  };

  beforeEach(() => {
    publishRunbookMock.mockReset();
    acknowledgeEscalationMock.mockReset();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'test-token' } } });
    vi.spyOn(window, 'prompt').mockImplementation(() => '');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes a runbook with optimistic feedback', async () => {
    publishRunbookMock.mockResolvedValue({
      data: {
        id: 'runbook-2',
        communityId: 99,
        title: 'Launch playbook',
        owner: 'Ops Team',
        automationReady: true,
        tags: [],
        updatedAt: '2024-01-02T00:00:00Z'
      }
    });

    const prompts = ['Launch playbook', 'Checklist for launches', 'Ops Team', 'https://runbook'];
    window.prompt
      .mockImplementationOnce(() => prompts[0])
      .mockImplementationOnce(() => prompts[1])
      .mockImplementationOnce(() => prompts[2])
      .mockImplementationOnce(() => prompts[3]);

    render(<CommunityOperations dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Publish runbook/i }));

    await waitFor(() => {
      expect(publishRunbookMock).toHaveBeenCalled();
    });

    const callArgs = publishRunbookMock.mock.calls[0][0];
    expect(callArgs.communityId).toBe(99);
    expect(callArgs.payload.title).toBe('Launch playbook');
    expect(screen.getByText('Launch playbook')).toBeInTheDocument();
  });

  it('shows an error when acknowledging escalation fails', async () => {
    acknowledgeEscalationMock.mockRejectedValue(new Error('network error'));
    window.prompt
      .mockImplementationOnce(() => 'Note for acknowledgement');

    render(<CommunityOperations dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Acknowledge/i }));

    await waitFor(() => {
      expect(acknowledgeEscalationMock).toHaveBeenCalled();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to acknowledge escalation');
  });

  it('prevents runbook publishing without authentication', async () => {
    useAuthMock.mockReturnValue({ session: null });
    window.prompt.mockReset();

    render(<CommunityOperations dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Publish runbook/i }));

    await waitFor(() => {
      expect(publishRunbookMock).not.toHaveBeenCalled();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('You must be signed in to publish runbooks.');
  });

  it('requires a community identifier before acknowledging escalations', async () => {
    const dashboardWithoutCommunities = {
      operations: { runbooks: [], escalations: [{ id: 'case-2', title: 'Resolve issue', status: 'pending' }] },
      health: { moderators: [] }
    };

    render(<CommunityOperations dashboard={dashboardWithoutCommunities} />);

    fireEvent.click(screen.getByRole('button', { name: /Acknowledge/i }));

    await waitFor(() => {
      expect(acknowledgeEscalationMock).not.toHaveBeenCalled();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Community identifier required to acknowledge.');
  });
});

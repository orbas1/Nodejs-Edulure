import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CommunitySafety from '../../../../src/pages/dashboard/community/CommunitySafety.jsx';

const resolveIncidentMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../../../src/api/communityApi.js', () => ({
  resolveCommunityIncident: (...args) => resolveIncidentMock(...args)
}));

vi.mock('../../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

describe('CommunitySafety', () => {
  const dashboard = {
    safety: {
      incidents: [
        {
          id: 'incident-1',
          communityId: 88,
          summary: 'Escalated harassment report',
          communityName: 'Ops Collective',
          severity: 'high',
          owner: 'Moderator team',
          openedAt: '2024-01-01T10:00:00Z'
        }
      ],
      backlog: [],
      moderators: []
    }
  };

  beforeEach(() => {
    resolveIncidentMock.mockReset();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token' } } });
    vi.spyOn(window, 'prompt').mockImplementation(() => '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves an incident and removes it from the list', async () => {
    resolveIncidentMock.mockResolvedValue({ data: { status: 'resolved' } });

    render(<CommunitySafety dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Resolve/i }));

    await waitFor(() => {
      expect(resolveIncidentMock).toHaveBeenCalled();
    });

    expect(resolveIncidentMock.mock.calls[0][0]).toMatchObject({
      communityId: 88,
      incidentId: 'incident-1'
    });
    expect(screen.queryByText('Escalated harassment report')).not.toBeInTheDocument();
  });

  it('prevents resolving incidents when unauthenticated', async () => {
    useAuthMock.mockReturnValue({ session: null });
    window.prompt.mockReset();

    render(<CommunitySafety dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Resolve/i }));

    await waitFor(() => {
      expect(resolveIncidentMock).not.toHaveBeenCalled();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('You must be signed in to resolve incidents.');
  });

  it('restores the incident when resolution fails upstream', async () => {
    resolveIncidentMock.mockRejectedValue(new Error('Resolution service offline'));

    render(<CommunitySafety dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Resolve/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Resolution service offline');
    expect(screen.getByText('Escalated harassment report')).toBeInTheDocument();
  });
});

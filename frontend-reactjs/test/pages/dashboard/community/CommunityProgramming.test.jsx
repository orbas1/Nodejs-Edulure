import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityProgramming from '../../../../src/pages/dashboard/community/CommunityProgramming.jsx';

const scheduleEventMock = vi.fn();

vi.mock('../../../../src/api/communityApi.js', () => ({
  scheduleCommunityEvent: (...args) => scheduleEventMock(...args)
}));

vi.mock('../../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { tokens: { accessToken: 'token' } } })
}));

describe('CommunityProgramming', () => {
  const dashboard = {
    programming: {
      upcomingEvents: [
        {
          id: 'event-1',
          communityId: 55,
          title: 'Weekly standup',
          date: 'Tomorrow',
          facilitator: 'Ops',
          seats: '20 seats',
          status: 'scheduled'
        }
      ],
      tutorPods: [],
      broadcasts: []
    }
  };

  beforeEach(() => {
    scheduleEventMock.mockReset();
    vi.spyOn(window, 'prompt').mockImplementation(() => '');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('schedules a new event with optimistic update', async () => {
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    scheduleEventMock.mockResolvedValue({
      data: {
        id: 'event-2',
        communityId: 55,
        title: 'Launch rehearsal',
        startAt: now,
        endAt: later,
        status: 'scheduled'
      }
    });

    window.prompt
      .mockImplementationOnce(() => 'Launch rehearsal')
      .mockImplementationOnce(() => now)
      .mockImplementationOnce(() => later);

    render(<CommunityProgramming dashboard={dashboard} />);

    fireEvent.click(screen.getByRole('button', { name: /Schedule event/i }));

    await waitFor(() => {
      expect(scheduleEventMock).toHaveBeenCalled();
    });

    expect(scheduleEventMock.mock.calls[0][0].communityId).toBe(55);
    expect(screen.getByText('Launch rehearsal')).toBeInTheDocument();
  });
});

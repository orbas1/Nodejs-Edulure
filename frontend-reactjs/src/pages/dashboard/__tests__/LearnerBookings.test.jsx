import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import LearnerBookings from '../LearnerBookings.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const createTutorBookingRequestMock = vi.hoisted(() => vi.fn());
const exportTutorScheduleMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  createTutorBookingRequest: createTutorBookingRequestMock,
  exportTutorSchedule: exportTutorScheduleMock
}));

describe('<LearnerBookings />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLearnerDashboardSectionMock.mockReturnValue({
      isLearner: true,
      section: {
        active: [
          {
            id: 'booking-1',
            status: 'Confirmed',
            topic: 'Portfolio review',
            mentor: 'Avery Mentor',
            date: 'June 30',
            rating: 5
          }
        ],
        history: []
      },
      refresh: vi.fn(),
      loading: false,
      error: null
    });
    useAuthMock.mockReturnValue({
      session: { tokens: { accessToken: 'token-123' } }
    });
    createTutorBookingRequestMock.mockResolvedValue({
      message: 'Tutor booking request created',
      data: {
        reference: 'booking-new',
        meta: { topic: 'Mentorship session', preferredDate: '2024-06-01T10:00:00.000Z' }
      }
    });
    exportTutorScheduleMock.mockResolvedValue({
      message: 'Export prepared',
      data: { meta: { downloadUrl: '/exports/schedule.ics' } }
    });
  });

  it('submits a new tutor booking request when the primary action is used', async () => {
    const user = userEvent.setup();
    render(<LearnerBookings />);

    await user.click(screen.getByRole('button', { name: /request new session/i }));

    await waitFor(() => {
      expect(createTutorBookingRequestMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({ topic: 'Mentorship session' })
      });
      expect(screen.getByRole('status')).toHaveTextContent(/tutor booking request created/i);
    });
  });

  it('exports the agenda when the export action is triggered', async () => {
    const user = userEvent.setup();
    render(<LearnerBookings />);

    await user.click(screen.getByRole('button', { name: /export agenda/i }));

    await waitFor(() => {
      expect(exportTutorScheduleMock).toHaveBeenCalledWith({ token: 'token-123' });
      expect(screen.getByRole('status')).toHaveTextContent(/agenda export ready/i);
    });
  });
});

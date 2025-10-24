import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import LearnerBookings from '../LearnerBookings.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const createTutorBookingRequestMock = vi.hoisted(() => vi.fn());
const exportTutorScheduleMock = vi.hoisted(() => vi.fn());
const updateTutorBookingMock = vi.hoisted(() => vi.fn());
const cancelTutorBookingMock = vi.hoisted(() => vi.fn());
const downloadTextFileMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  createTutorBookingRequest: createTutorBookingRequestMock,
  exportTutorSchedule: exportTutorScheduleMock,
  updateTutorBooking: updateTutorBookingMock,
  cancelTutorBooking: cancelTutorBookingMock
}));

vi.mock('../../../utils/download.js', () => ({
  downloadTextFile: downloadTextFileMock
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
            rawDate: '2024-06-30T10:00',
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
      message: 'Agenda export ready – 2 upcoming sessions',
      data: {
        meta: {
          ics: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Test\r\nEND:VEVENT\r\nEND:VCALENDAR',
          fileName: 'schedule.ics',
          events: 2
        }
      }
    });
    updateTutorBookingMock.mockResolvedValue({ message: 'Mentor booking updated.' });
    cancelTutorBookingMock.mockResolvedValue({ message: 'Booking cancelled.' });
    downloadTextFileMock.mockReturnValue(true);
  });

  it('submits a new tutor booking request via the booking form', async () => {
    const user = userEvent.setup();
    render(<LearnerBookings />);

    await user.click(screen.getByRole('button', { name: /request new session/i }));

    const focusInput = screen.getByLabelText(/session focus/i);
    const dateInput = screen.getByLabelText(/preferred date & time/i);

    await user.clear(focusInput);
    await user.type(focusInput, 'Product strategy deep-dive');
    await user.type(dateInput, '2025-05-12T12:00');

    await user.click(screen.getByRole('button', { name: /continue to preparation/i }));

    await user.click(screen.getByRole('button', { name: /submit booking request/i }));

    await waitFor(() => {
      expect(createTutorBookingRequestMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({ topic: 'Product strategy deep-dive', preferredDate: '2025-05-12T12:00' })
      });
      expect(screen.getByRole('status')).toHaveTextContent(/tutor booking request created/i);
    });
  });

  it('updates an existing booking when the reschedule flow is used', async () => {
    const user = userEvent.setup();
    render(<LearnerBookings />);

    await user.click(screen.getByRole('button', { name: /reschedule/i }));

    const focusInput = screen.getByLabelText(/session focus/i);
    const dateInput = screen.getByLabelText(/preferred date & time/i);

    await user.clear(focusInput);
    await user.type(focusInput, 'Portfolio follow-up workshop');
    await user.clear(dateInput);
    await user.type(dateInput, '2025-07-20T09:30');

    await user.click(screen.getByRole('button', { name: /continue to preparation/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateTutorBookingMock).toHaveBeenCalledWith({
        token: 'token-123',
        bookingId: 'booking-1',
        payload: expect.objectContaining({
          topic: 'Portfolio follow-up workshop',
          preferredDate: '2025-07-20T09:30'
        })
      });
      expect(screen.getByRole('status')).toHaveTextContent(/mentor booking updated/i);
    });
  });

  it('cancels a booking and shows confirmation messaging', async () => {
    const user = userEvent.setup();
    render(<LearnerBookings />);

    await user.click(screen.getByRole('button', { name: /cancel booking/i }));

    await waitFor(() => {
      expect(cancelTutorBookingMock).toHaveBeenCalledWith({
        token: 'token-123',
        bookingId: 'booking-1',
        payload: expect.any(Object)
      });
      expect(screen.getByRole('status')).toHaveTextContent(/has been cancelled/i);
    });
  });

  it('exports the agenda when the export action is triggered', async () => {
    const user = userEvent.setup();
    render(<LearnerBookings />);

    await user.click(screen.getByRole('button', { name: /export agenda/i }));

    await waitFor(() => {
      expect(exportTutorScheduleMock).toHaveBeenCalledWith({ token: 'token-123' });
      expect(downloadTextFileMock).toHaveBeenCalledWith({
        content: expect.stringContaining('BEGIN:VCALENDAR'),
        fileName: 'schedule.ics',
        mimeType: 'text/calendar;charset=utf-8'
      });
      expect(screen.getByRole('status')).toHaveTextContent(/agenda export downloaded/i);
    });
  });
});

import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import InstructorTutorSchedule from '../InstructorTutorSchedule.jsx';

const useOutletContextMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: useOutletContextMock
  };
});

describe('<InstructorTutorSchedule />', () => {
  const baseDashboard = {
    tutors: {
      availability: [
        {
          id: 'schedule-1',
          mentor: 'Avery Mentor',
          learners: 'Build guild',
          slots: '4 open slots',
          nextAvailability: 'Mon 9AM UTC',
          nextSession: 'Tue 3PM UTC',
          noteItems: ['Async recap', 'Capstone reviews'],
          timezone: 'Europe/London',
          location: 'Virtual studio',
          mediums: ['Zoom', 'Notion board']
        }
      ],
      notifications: [
        {
          id: 'alert-1',
          title: 'Coverage low for build guild',
          detail: 'Shift a mentor from the growth pod.',
          createdAt: '2024-02-01T09:00:00.000Z'
        }
      ]
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useOutletContextMock.mockReturnValue({
      dashboard: baseDashboard,
      refresh: vi.fn()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('creates a new availability window and persists it in the schedule grid', async () => {
    const user = userEvent.setup({ delay: null });
    render(<InstructorTutorSchedule />);

    await user.click(screen.getByRole('button', { name: /new availability/i }));

    const modal = screen.getByRole('form', { name: /tutor schedule/i });
    await user.type(within(modal).getByLabelText(/mentor name/i), 'Jordan Mentor');
    await user.type(within(modal).getByLabelText(/learner pod/i), 'Product guild');
    await user.type(within(modal).getByLabelText(/capacity summary/i), '6 open slots');
    await user.type(within(modal).getByLabelText(/next availability/i), 'Fri 10AM UTC');
    await user.type(within(modal).getByLabelText(/next confirmed session/i), 'Fri 3PM UTC');
    await user.type(within(modal).getByLabelText(/highlights/i), 'Async huddles');

    await user.click(within(modal).getByRole('button', { name: /save schedule/i }));

    await waitFor(() => {
      vi.advanceTimersByTime(300);
      expect(screen.getByText(/jordan mentor/i)).toBeInTheDocument();
      expect(screen.getByText(/product guild/i)).toBeInTheDocument();
      expect(screen.getByText(/6 open slots/i)).toBeInTheDocument();
    });
  });

  it('edits an existing schedule entry inline', async () => {
    const user = userEvent.setup({ delay: null });
    render(<InstructorTutorSchedule />);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const form = screen.getByRole('form', { name: /tutor schedule/i });
    const learnersField = within(form).getByLabelText(/learner pod/i);
    await user.clear(learnersField);
    await user.type(learnersField, 'Build guild · cohort b');
    await user.click(within(form).getByRole('button', { name: /save schedule/i }));

    await waitFor(() => {
      vi.advanceTimersByTime(300);
      expect(screen.getByText(/cohort b/i)).toBeInTheDocument();
    });
  });

  it('removes an entry and updates the ui immediately', async () => {
    const user = userEvent.setup({ delay: null });
    render(<InstructorTutorSchedule />);

    expect(screen.getByText(/avery mentor/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(screen.queryByText(/avery mentor/i)).not.toBeInTheDocument();
    });
  });

  it('publishes a new operational alert', async () => {
    const user = userEvent.setup({ delay: null });
    render(<InstructorTutorSchedule />);

    await user.clear(screen.getByLabelText(/alert title/i));
    await user.type(screen.getByLabelText(/alert title/i), 'Weekend sprints');
    await user.type(screen.getByLabelText(/detail/i), 'Open weekend slots for late-stage founders.');
    await user.click(screen.getByRole('button', { name: /publish alert/i }));

    expect(await screen.findByText(/weekend sprints/i)).toBeInTheDocument();
    expect(screen.getByText(/late-stage founders/i)).toBeInTheDocument();
  });
});

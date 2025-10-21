import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InstructorTutorBookings from '../../../../src/pages/dashboard/InstructorTutorBookings.jsx';

let contextValue;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => contextValue
  };
});

describe('InstructorTutorBookings', () => {
  const refresh = vi.fn();
  const routeTutorRequest = vi.fn().mockResolvedValue({ summary: 'Routing recalibrated' });

  beforeEach(() => {
    refresh.mockClear();
    routeTutorRequest.mockClear();
    contextValue = {
      dashboard: {
        bookings: {
          pipeline: [
            { id: 'req-1', status: 'pending', learner: 'Taylor', requested: '2h ago', topic: 'Design review' }
          ],
          confirmed: []
        },
        tutors: {
          roster: [],
          availability: [],
          notifications: []
        }
      },
      refresh,
      instructorOrchestration: {
        routeTutorRequest
      }
    };
  });

  it('updates routing rules from bookings actions', async () => {
    render(<InstructorTutorBookings />);

    const routingButton = screen.getByRole('button', { name: /Open routing rules/i });
    fireEvent.click(routingButton);

    expect(routingButton).toBeDisabled();
    await waitFor(() => expect(routeTutorRequest).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByText(/Tutor routing recalibrated/i)).toBeInTheDocument();
  });

  it('handles routing orchestration failures gracefully', async () => {
    routeTutorRequest.mockRejectedValueOnce(new Error('Automation offline'));

    render(<InstructorTutorBookings />);

    const routingButton = screen.getByRole('button', { name: /Open routing rules/i });
    fireEvent.click(routingButton);

    await waitFor(() => expect(routeTutorRequest).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Unable to update tutor routing.')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('surfaces an empty state when no tutor booking telemetry is available', () => {
    contextValue.dashboard.bookings = null;

    render(<InstructorTutorBookings />);

    expect(screen.getByText('No tutor booking data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InstructorTutorManagement from '../../../../src/pages/dashboard/InstructorTutorManagement.jsx';

let contextValue;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useOutletContext: () => contextValue
  };
});

describe('InstructorTutorManagement', () => {
  const refresh = vi.fn();
  const inviteMentor = vi.fn().mockResolvedValue({ summary: 'Invite dispatched' });
  const routeTutorRequest = vi.fn().mockResolvedValue({ summary: 'Routing updated' });

  beforeEach(() => {
    refresh.mockClear();
    inviteMentor.mockClear();
    routeTutorRequest.mockClear();
    contextValue = {
      role: 'instructor',
      dashboard: {
        tutors: {
          roster: [
            {
              id: 'mentor-1',
              name: 'Jordan Pike',
              email: 'jordan@example.com',
              status: 'Active',
              statusTone: 'success',
              focusAreas: ['Design'],
              rate: '£85/hr',
              rating: '4.9',
              responseTime: '2h',
              availability: 'Weekdays'
            }
          ],
          notifications: [],
          availability: []
        }
      },
      refresh,
      instructorOrchestration: {
        inviteMentor,
        routeTutorRequest
      }
    };
  });

  it('sends mentor invites and surfaces success feedback', async () => {
    render(<InstructorTutorManagement />);

    const inviteButton = screen.getByRole('button', { name: /Invite mentor/i });
    fireEvent.click(inviteButton);

    expect(inviteButton).toBeDisabled();
    await waitFor(() => expect(inviteMentor).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByText(/Mentor invite sent/i)).toBeInTheDocument();
  });

  it('recalibrates routing rules from the pods section', async () => {
    render(<InstructorTutorManagement />);

    fireEvent.click(screen.getByRole('button', { name: /Open routing rules/i }));
    await waitFor(() => expect(routeTutorRequest).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Tutor routing recalibrated/i)).toBeInTheDocument();
  });

  it('surfaces mentor invite failures with actionable feedback', async () => {
    inviteMentor.mockRejectedValueOnce(new Error('Email delivery failed'));

    render(<InstructorTutorManagement />);

    const inviteButton = screen.getByRole('button', { name: /Invite mentor/i });
    fireEvent.click(inviteButton);

    await waitFor(() => expect(inviteMentor).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Email delivery failed')).toBeInTheDocument();
    expect(inviteButton).not.toBeDisabled();
  });
});

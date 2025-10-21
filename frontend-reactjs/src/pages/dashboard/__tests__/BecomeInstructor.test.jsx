import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import BecomeInstructor from '../BecomeInstructor.jsx';

const mockUseLearnerDashboardSection = vi.hoisted(() => vi.fn());
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockFetchInstructorApplication = vi.hoisted(() => vi.fn());
const mockSaveInstructorApplication = vi.hoisted(() => vi.fn());
const mockSubmitInstructorApplication = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: mockUseLearnerDashboardSection
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: mockUseAuth
}));

vi.mock('../../api/learnerDashboardApi.js', () => ({
  fetchInstructorApplication: mockFetchInstructorApplication,
  saveInstructorApplication: mockSaveInstructorApplication,
  submitInstructorApplication: mockSubmitInstructorApplication
}));

describe('BecomeInstructor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mockUseLearnerDashboardSection.mockReturnValue({
      isLearner: true,
      section: { application: null, nextSteps: [] },
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    mockUseAuth.mockReturnValue({
      session: {
        tokens: { accessToken: 'token-123' },
        user: { id: 'user-1' }
      }
    });

    mockFetchInstructorApplication.mockRejectedValue({ status: 404 });
    mockSaveInstructorApplication.mockResolvedValue({ message: 'Application progress saved.' });
    mockSubmitInstructorApplication.mockResolvedValue({ message: 'Application submitted.' });
  });

  it('prevents navigation when the current step is incomplete', async () => {
    render(<BecomeInstructor />);

    await waitFor(() => expect(mockFetchInstructorApplication).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(
      await screen.findByText('Complete the highlighted fields before continuing.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/why do you want to teach/i), {
      target: { value: 'I want to guide operators through transformational learning journeys that scale.' }
    });
    fireEvent.change(screen.getByLabelText(/years of experience/i), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText(/teaching focus/i), {
      target: { value: 'Strategy leadership, Research systems' }
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText('Portfolio & proof')).toBeInTheDocument());
  });

  it('restores local drafts and saves valid progress', async () => {
    mockFetchInstructorApplication.mockRejectedValueOnce({ status: 404 });
    mockFetchInstructorApplication.mockResolvedValue({
      data: {
        id: 'app-1',
        motivation: 'I want to guide operators through transformational learning journeys that scale.',
        experienceYears: 6,
        teachingFocus: ['Strategy leadership', 'Research systems']
      }
    });

    window.localStorage.setItem(
      'edulure::instructor-application::user-1',
      JSON.stringify({
        motivation: 'I want to guide operators through transformational learning journeys that scale.',
        experienceYears: '6',
        teachingFocus: 'Strategy leadership, Research systems'
      })
    );

    render(<BecomeInstructor />);

    await waitFor(() =>
      expect(
        screen.getByDisplayValue(/guide operators through transformational learning journeys/i)
      ).toBeInTheDocument()
    );

    const saveButton = screen.getByRole('button', { name: /save progress/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(mockSaveInstructorApplication).toHaveBeenCalledTimes(1));
    expect(mockSaveInstructorApplication.mock.calls[0][0]).toMatchObject({
      token: 'token-123',
      payload: expect.objectContaining({ motivation: expect.stringContaining('transformational') })
    });

    expect(
      await screen.findByText(/Application progress saved/i)
    ).toBeInTheDocument();
  });
});


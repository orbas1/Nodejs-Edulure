import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TutorProfile from '../../../src/pages/TutorProfile.jsx';

const useAuthMock = vi.fn();
const listPublicTutorsMock = vi.fn();
const searchExplorerMock = vi.fn();
const createTutorBookingRequestMock = vi.fn();
const listTutorBookingsMock = vi.fn();
const updateTutorBookingMock = vi.fn();
const cancelTutorBookingMock = vi.fn();

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

vi.mock('../../../src/api/catalogueApi.js', () => ({
  listPublicTutors: (...args) => listPublicTutorsMock(...args)
}));

vi.mock('../../../src/api/explorerApi.js', () => ({
  searchExplorer: (...args) => searchExplorerMock(...args)
}));

vi.mock('../../../src/api/learnerDashboardApi.js', () => ({
  createTutorBookingRequest: (...args) => createTutorBookingRequestMock(...args),
  listTutorBookings: (...args) => listTutorBookingsMock(...args),
  updateTutorBooking: (...args) => updateTutorBookingMock(...args),
  cancelTutorBooking: (...args) => cancelTutorBookingMock(...args)
}));

vi.mock('../../../src/api/adminControlApi.js', () => ({
  default: {
    listTutors: vi.fn(),
    deleteTutor: vi.fn(),
    createTutor: vi.fn(),
    updateTutor: vi.fn()
  }
}));

vi.mock('../../../src/components/search/ExplorerSearchSection.jsx', () => ({
  default: () => <div data-testid="explorer-search" />
}));

vi.mock('../../../src/components/forms/FormStepper.jsx', () => ({
  default: ({ steps, currentStep, onSelect }) => (
    <div data-testid="form-stepper">
      {steps.map((step) => (
        <button key={step.id} type="button" onClick={() => onSelect?.(step.id)}>
          {step.title}
        </button>
      ))}
      <span>Current: {currentStep}</span>
    </div>
  )
}));

describe('Tutor profile catalogue fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: null, isAuthenticated: false });
    listPublicTutorsMock.mockImplementation(() => Promise.resolve({ data: [] }));
    createTutorBookingRequestMock.mockReset();
    listTutorBookingsMock.mockResolvedValue({ data: [] });
    updateTutorBookingMock.mockReset();
    cancelTutorBookingMock.mockReset();
  });

  it('falls back to public tutor data when explorer access is unavailable', async () => {
    listPublicTutorsMock.mockImplementation(({ params }) => {
      if (params?.limit === 6) {
        return Promise.resolve({
          data: [
            {
              id: 'tutor-highlight',
              displayName: 'Amina Patel',
              headline: 'Machine learning coach',
              bio: 'Guides operators through applied AI.',
              languages: ['en'],
              timezones: ['Etc/UTC'],
              country: 'UK',
              hourlyRateAmount: 200,
              hourlyRateCurrency: 'USD',
              skills: ['ml']
            }
          ]
        });
      }
      if (params?.limit === 8) {
        return Promise.resolve({
          data: [
            {
              id: 'tutor-featured',
              displayName: 'Miguel Chen',
              headline: 'Growth mentor',
              languages: ['en', 'es'],
              hourlyRateAmount: 125,
              hourlyRateCurrency: 'USD'
            }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(<TutorProfile />);

    await waitFor(() => {
      const limits = listPublicTutorsMock.mock.calls.map((call) => call[0]?.params?.limit);
      expect(limits).toContain(6);
      expect(limits).toContain(8);
    });

    expect(await screen.findByText('Amina Patel')).toBeInTheDocument();
    expect(await screen.findByText('Miguel Chen')).toBeInTheDocument();
    expect(searchExplorerMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Limited tutor results shown/i)).not.toBeInTheDocument();
  });

  it('requires authentication before requesting tutor sessions', async () => {
    listPublicTutorsMock.mockResolvedValue({
      data: [
        {
          id: 'tutor-1',
          displayName: 'Amina Patel',
          headline: 'Machine learning coach',
          languages: ['en'],
          hourlyRateAmount: 200,
          hourlyRateCurrency: 'USD'
        }
      ]
    });

    const user = userEvent.setup();
    render(<TutorProfile />);

    await user.click(await screen.findByRole('button', { name: /Request session/i }));

    expect(createTutorBookingRequestMock).not.toHaveBeenCalled();
    expect(await screen.findByText('Sign in to request a tutor session.')).toBeInTheDocument();
  });

  it('submits tutor booking requests for authenticated learners', async () => {
    useAuthMock.mockReturnValue({
      session: { tokens: { accessToken: 'token' }, user: { role: 'learner' } },
      isAuthenticated: true
    });
    listPublicTutorsMock.mockResolvedValue({
      data: [
        {
          id: 'tutor-2',
          displayName: 'Jordan Blake',
          headline: 'Growth mentor',
          languages: ['en'],
          hourlyRateAmount: 150,
          hourlyRateCurrency: 'USD'
        }
      ]
    });
    createTutorBookingRequestMock.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<TutorProfile />);

    await user.click(await screen.findByRole('button', { name: /Request session/i }));

    expect(createTutorBookingRequestMock).toHaveBeenCalledWith({
      token: 'token',
      payload: expect.objectContaining({ tutorId: 'tutor-2' })
    });
    expect(await screen.findByText('Tutor booking request submitted. We will confirm shortly.')).toBeInTheDocument();
  });

  it('notifies authenticated operators when tutor highlights rely on public data', async () => {
    useAuthMock.mockReturnValue({
      session: { tokens: { accessToken: 'token' }, user: { role: 'admin' } },
      isAuthenticated: true
    });

    const authError = Object.assign(new Error('Session expired'), { status: 403 });
    searchExplorerMock.mockRejectedValue(authError);
    listPublicTutorsMock.mockResolvedValue({
      data: [
        {
          id: 'public-tutor',
          displayName: 'Jordan Rivers',
          headline: 'Ops mentor',
          languages: ['en'],
          hourlyRateAmount: 180,
          hourlyRateCurrency: 'USD'
        }
      ]
    });

    render(<TutorProfile />);

    expect(await screen.findByText('Jordan Rivers')).toBeInTheDocument();
    expect(await screen.findByText(/Limited tutor results shown/i)).toBeInTheDocument();
  });
});

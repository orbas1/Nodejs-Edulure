import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TutorProfile from '../../../src/pages/TutorProfile.jsx';

const useAuthMock = vi.fn();
const listPublicTutorsMock = vi.fn();
const searchExplorerMock = vi.fn();
const createTutorBookingRequestMock = vi.fn();

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
  createTutorBookingRequest: (...args) => createTutorBookingRequestMock(...args)
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
});

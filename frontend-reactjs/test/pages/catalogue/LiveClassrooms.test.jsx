import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LiveClassrooms from '../../../src/pages/LiveClassrooms.jsx';

const useAuthMock = vi.fn();
const listPublicLiveClassroomsMock = vi.fn();
const joinLiveSessionMock = vi.fn();
const checkInToLiveSessionMock = vi.fn();

vi.mock('../../../src/context/AuthContext.jsx', () => ({
  useAuth: () => useAuthMock()
}));

vi.mock('../../../src/api/catalogueApi.js', () => ({
  listPublicLiveClassrooms: (...args) => listPublicLiveClassroomsMock(...args)
}));

vi.mock('../../../src/api/learnerDashboardApi.js', () => ({
  joinLiveSession: (...args) => joinLiveSessionMock(...args),
  checkInToLiveSession: (...args) => checkInToLiveSessionMock(...args)
}));

vi.mock('../../../src/api/adminControlApi.js', () => ({
  default: {
    listLiveStreams: vi.fn(),
    deleteLiveStream: vi.fn(),
    createLiveStream: vi.fn(),
    updateLiveStream: vi.fn()
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

describe('Live classrooms public catalogue behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: null, isAuthenticated: false });
    listPublicLiveClassroomsMock.mockResolvedValue({ data: [] });
  });

  it('loads live classrooms from the public catalogue for non-admin visitors', async () => {
    listPublicLiveClassroomsMock.mockResolvedValue({
      data: [
        {
          id: 'lc-1',
          title: 'Design Systems AMA',
          status: 'scheduled',
          startAt: '2024-09-01T10:00:00.000Z',
          capacity: 50,
          reservedSeats: 10,
          isTicketed: false,
          summary: 'Expert Q&A'
        }
      ]
    });

    render(<LiveClassrooms />);

    expect(await screen.findByText('Design Systems AMA')).toBeInTheDocument();
    expect(listPublicLiveClassroomsMock).toHaveBeenCalledWith({ params: { limit: 12 } });
  });

  it('displays a friendly error when the catalogue request fails', async () => {
    listPublicLiveClassroomsMock.mockRejectedValue(new Error('Catalogue offline'));

    render(<LiveClassrooms />);

    expect(await screen.findByText('Catalogue offline')).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerGrowth from '../LearnerGrowth.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const createGrowthInitiativeMock = vi.hoisted(() => vi.fn());
const updateGrowthInitiativeMock = vi.hoisted(() => vi.fn());
const deleteGrowthInitiativeMock = vi.hoisted(() => vi.fn());
const createGrowthExperimentMock = vi.hoisted(() => vi.fn());
const updateGrowthExperimentMock = vi.hoisted(() => vi.fn());
const deleteGrowthExperimentMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  createGrowthInitiative: createGrowthInitiativeMock,
  updateGrowthInitiative: updateGrowthInitiativeMock,
  deleteGrowthInitiative: deleteGrowthInitiativeMock,
  createGrowthExperiment: createGrowthExperimentMock,
  updateGrowthExperiment: updateGrowthExperimentMock,
  deleteGrowthExperiment: deleteGrowthExperimentMock
}));

describe('<LearnerGrowth />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLearnerDashboardSectionMock.mockReturnValue({
      isLearner: true,
      section: { metrics: [], initiatives: [] },
      loading: false,
      error: null,
      refresh: vi.fn()
    });
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-123' } } });
    createGrowthInitiativeMock.mockResolvedValue({ message: 'created' });
    createGrowthExperimentMock.mockResolvedValue({ message: 'experiment created' });
  });

  it('creates a new initiative via the workspace form', async () => {
    const user = userEvent.setup();
    render(<LearnerGrowth />);

    await user.click(screen.getByRole('button', { name: /new initiative/i }));
    await user.type(screen.getByLabelText(/slug/i), 'spring-surge');
    await user.type(screen.getByLabelText(/title/i), 'Spring Surge Growth');
    await user.click(screen.getByRole('button', { name: /save initiative/i }));

    await waitFor(() => {
      expect(createGrowthInitiativeMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({ slug: 'spring-surge', title: 'Spring Surge Growth' })
      });
      expect(screen.getAllByText(/growth initiative created/i)).not.toHaveLength(0);
    });
  });

  it('records a new experiment for an initiative', async () => {
    const refreshMock = vi.fn();
    useLearnerDashboardSectionMock.mockReturnValue({
      isLearner: true,
      section: {
        metrics: [],
        initiatives: [
          {
            id: 77,
            slug: 'summer-wave',
            title: 'Summer Wave',
            status: 'active',
            tags: [],
            experiments: []
          }
        ]
      },
      loading: false,
      error: null,
      refresh: refreshMock
    });

    const user = userEvent.setup();
    render(<LearnerGrowth />);

    await user.click(screen.getByRole('button', { name: /add experiment/i }));
    await user.type(screen.getByLabelText(/name/i), 'Messaging revamp');
    await user.type(screen.getByLabelText(/hypothesis/i), 'Refined messaging will lift conversions.');
    await user.click(screen.getByRole('button', { name: /save experiment/i }));

    await waitFor(() => {
      expect(createGrowthExperimentMock).toHaveBeenCalledWith({
        token: 'token-123',
        initiativeId: 77,
        payload: expect.objectContaining({ name: 'Messaging revamp' })
      });
      expect(screen.getAllByText(/experiment created/i)).not.toHaveLength(0);
    });
  });
});

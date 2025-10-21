import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import DashboardBookingsSwitch from '../DashboardBookingsSwitch.jsx';
import DashboardEbooksSwitch from '../DashboardEbooksSwitch.jsx';
import DashboardHome from '../DashboardHome.jsx';

const mockUseOutletContext = vi.hoisted(() => vi.fn());
const mockUseDashboard = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useOutletContext: mockUseOutletContext };
});

vi.mock('../../../context/DashboardContext.jsx', () => ({
  useDashboard: mockUseDashboard
}));

vi.mock('../instructor/InstructorOverview.jsx', () => ({
  default: () => <div data-testid="instructor-overview">Instructor view</div>
}));

vi.mock('../learner/LearnerOverview.jsx', () => ({
  default: ({ dashboard }) => (
    <div data-testid="learner-overview">Learner view: {dashboard?.summary ?? 'no-data'}</div>
  )
}));

vi.mock('../community/CommunityOverview.jsx', () => ({
  default: () => <div data-testid="community-overview">Community view</div>
}));

vi.mock('../LearnerBookings.jsx', () => ({
  default: () => <div data-testid="learner-bookings">Learner bookings</div>
}));

vi.mock('../InstructorTutorBookings.jsx', () => ({
  default: () => <div data-testid="instructor-bookings">Instructor bookings</div>
}));

vi.mock('../LearnerEbooks.jsx', () => ({
  default: () => <div data-testid="learner-ebooks">Learner e-books</div>
}));

vi.mock('../InstructorEbooks.jsx', () => ({
  default: () => <div data-testid="instructor-ebooks">Instructor e-books</div>
}));

describe('Dashboard role switches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOutletContext.mockReset();
    mockUseDashboard.mockReset();
  });

  it('surfaces a refresh prompt when dashboard data is missing', () => {
    mockUseOutletContext.mockReturnValue({ role: 'learner', dashboard: null, refresh: vi.fn() });
    mockUseDashboard.mockReturnValue({ profile: { id: 'user-1' } });

    render(<DashboardHome />);

    expect(screen.getByText('Dashboard data unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('prevents unsupported roles from viewing learner data in DashboardHome', () => {
    mockUseOutletContext.mockReturnValue({
      role: 'operator',
      dashboard: { summary: 'ready' },
      refresh: vi.fn()
    });
    mockUseDashboard.mockReturnValue({ profile: { id: 'user-1' } });

    render(<DashboardHome />);

    expect(screen.getByText('Role not supported')).toBeInTheDocument();
    expect(screen.queryByTestId('learner-overview')).not.toBeInTheDocument();
  });

  it('renders role-specific booking layouts and protects unsupported roles', () => {
    mockUseOutletContext.mockReturnValue({ role: 'instructor' });
    const { rerender } = render(<DashboardBookingsSwitch />);
    expect(screen.getByTestId('instructor-bookings')).toBeInTheDocument();

    mockUseOutletContext.mockReturnValue({ role: 'learner' });
    rerender(<DashboardBookingsSwitch />);
    expect(screen.getByTestId('learner-bookings')).toBeInTheDocument();

    mockUseOutletContext.mockReturnValue({ role: 'admin', refresh: vi.fn() });
    rerender(<DashboardBookingsSwitch />);
    expect(screen.getByText('Bookings workspace unavailable')).toBeInTheDocument();
  });

  it('returns the appropriate e-book experience per role', () => {
    mockUseOutletContext.mockReturnValue({ role: 'instructor' });
    const { rerender } = render(<DashboardEbooksSwitch />);
    expect(screen.getByTestId('instructor-ebooks')).toBeInTheDocument();

    mockUseOutletContext.mockReturnValue({ role: 'learner' });
    rerender(<DashboardEbooksSwitch />);
    expect(screen.getByTestId('learner-ebooks')).toBeInTheDocument();

    mockUseOutletContext.mockReturnValue({ role: 'community', refresh: vi.fn() });
    rerender(<DashboardEbooksSwitch />);
    expect(screen.getByText('Operational Learnspaces do not host e-books')).toBeInTheDocument();
  });
});

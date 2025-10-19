import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerBookings from '../LearnerBookings.jsx';
import LearnerCourses from '../LearnerCourses.jsx';
import LearnerEbooks from '../LearnerEbooks.jsx';
import LearnerFinancial from '../LearnerFinancial.jsx';
import LearnerLiveClasses from '../LearnerLiveClasses.jsx';
import LearnerCommunities from '../LearnerCommunities.jsx';

const useLearnerDashboardSectionMock = vi.fn();
const useAuthMock = vi.fn();
const learnerApiMocks = {
  requestTutorBooking: vi.fn(),
  exportTutorBookings: vi.fn(),
  syncCourseGoal: vi.fn(),
  syncCourseCalendar: vi.fn(),
  resumeEbook: vi.fn(),
  shareEbookHighlight: vi.fn(),
  downloadBillingStatement: vi.fn(),
  joinLiveSession: vi.fn(),
  checkInLiveSession: vi.fn(),
  createCommunityInitiative: vi.fn(),
  exportCommunityHealthReport: vi.fn(),
  createCommunityPipelineStage: vi.fn()
};

vi.mock('../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../api/learnerDashboardApi.js', () => learnerApiMocks);

function configureDashboard(sectionKey) {
  const refreshAfterAction = vi.fn(async (callback) => callback());
  if (sectionKey === 'tutorBookings') {
    return {
      isLearner: true,
      section: {
        active: [
          { id: 'booking-1', status: 'confirmed', topic: 'Career planning', mentor: 'Avery', date: 'Tomorrow', rating: 5 }
        ],
        history: []
      },
      refresh: vi.fn(),
      refreshAfterAction
    };
  }
  if (sectionKey === 'courses') {
    return {
      isLearner: true,
      section: { active: [], recommendations: [] },
      refresh: vi.fn(),
      refreshAfterAction
    };
  }
  if (sectionKey === 'ebooks') {
    return {
      isLearner: true,
      section: {
        library: [
          { id: 'ebook-1', title: 'Design Systems', format: 'PDF', lastOpened: 'Yesterday', progress: 42 }
        ],
        recommendations: []
      },
      refresh: vi.fn(),
      refreshAfterAction
    };
  }
  if (sectionKey === 'financial') {
    return {
      isLearner: true,
      section: {
        summary: [{ label: 'Credits', value: '$120', change: '+$20 growth' }],
        invoices: [{ id: 'invoice-1', label: 'Mentorship', amount: '$120', status: 'Paid', date: '2024-12-01' }]
      },
      refresh: vi.fn(),
      refreshAfterAction
    };
  }
  if (sectionKey === 'liveClassrooms') {
    return {
      isLearner: true,
      section: {
        metrics: [{ label: 'Attendance rate', value: '92%', change: '+4%', trend: 'up' }],
        active: [
          {
            id: 'session-1',
            stage: 'Live now',
            title: 'Product teardown',
            startLabel: 'Happening now',
            status: 'in-progress',
            callToAction: { action: 'join', label: 'Join session', enabled: true }
          },
          {
            id: 'session-2',
            stage: 'Lobby open',
            title: 'AMA with mentors',
            startLabel: 'Today 15:00',
            status: 'starting-soon',
            callToAction: { action: 'check-in', label: 'Check in', enabled: true }
          }
        ],
        upcoming: [],
        completed: [],
        groups: [],
        whiteboard: { snapshots: [], readiness: [] }
      },
      refresh: vi.fn(),
      refreshAfterAction
    };
  }
  if (sectionKey === 'communities') {
    return {
      isLearner: true,
      section: {
        managed: [
          {
            id: 'community-1',
            name: 'DesignOps Collective',
            members: 42,
            moderators: 3,
            health: 'Healthy',
            initiatives: ['Launch mentorship circle']
          }
        ],
        pipelines: [{ id: 'pipeline-1', title: 'Ambassador onboarding', owner: 'Jordan', progress: 65 }]
      },
      refresh: vi.fn(),
      refreshAfterAction
    };
  }
  return { isLearner: true, section: null, refresh: vi.fn(), refreshAfterAction };
}

describe('Learner dashboard actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-123' } } });
    useLearnerDashboardSectionMock.mockImplementation((sectionKey) => configureDashboard(sectionKey));
    Object.values(learnerApiMocks).forEach((mockFn) => mockFn.mockResolvedValue({}));
  });

  it('submits mentor session requests and exports agendas', async () => {
    learnerApiMocks.requestTutorBooking.mockResolvedValue({ booking: { id: 'booking-new' } });
    learnerApiMocks.exportTutorBookings.mockResolvedValue({ exportUrl: 'https://files/agenda.ics' });

    render(<LearnerBookings />);

    await userEvent.click(screen.getByRole('button', { name: 'Request new session' }));

    await waitFor(() => {
      expect(learnerApiMocks.requestTutorBooking).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'token-123' })
      );
    });

    expect(await screen.findByText(/Mentor session request submitted/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Export agenda' }));

    await waitFor(() => {
      expect(learnerApiMocks.exportTutorBookings).toHaveBeenCalledWith({ token: 'token-123' });
    });
    expect(await screen.findByText(/Agenda ready for download/)).toBeInTheDocument();
  });

  it('syncs learning goals and calendar connections', async () => {
    render(<LearnerCourses />);

    await userEvent.click(screen.getByRole('button', { name: 'Add learning goal' }));
    await waitFor(() => expect(learnerApiMocks.syncCourseGoal).toHaveBeenCalled());
    expect(await screen.findByText(/synced successfully/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sync calendar' }));
    await waitFor(() => expect(learnerApiMocks.syncCourseCalendar).toHaveBeenCalled());
    expect(await screen.findByText(/Calendar synced/)).toBeInTheDocument();
  });

  it('resumes and shares e-books from the learner library', async () => {
    learnerApiMocks.resumeEbook.mockResolvedValue({ resumeFrom: { chapter: 'Chapter 3' } });
    learnerApiMocks.shareEbookHighlight.mockResolvedValue({ shareUrl: 'https://share/link' });

    render(<LearnerEbooks />);

    await userEvent.click(screen.getByRole('button', { name: 'Continue reading' }));
    await waitFor(() => expect(learnerApiMocks.resumeEbook).toHaveBeenCalled());
    expect(await screen.findByText(/ready from Chapter 3/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Share highlight' }));
    await waitFor(() => expect(learnerApiMocks.shareEbookHighlight).toHaveBeenCalled());
    expect(await screen.findByText(/Highlights shared/)).toBeInTheDocument();
  });

  it('downloads billing statements for the learner', async () => {
    learnerApiMocks.downloadBillingStatement.mockResolvedValue({ downloadUrl: 'https://files/invoice.pdf' });

    render(<LearnerFinancial />);

    await userEvent.click(screen.getByRole('button', { name: 'Download statement' }));

    await waitFor(() =>
      expect(learnerApiMocks.downloadBillingStatement).toHaveBeenCalledWith({
        token: 'token-123',
        invoiceId: 'invoice-1'
      })
    );
    expect(await screen.findByText(/Statement ready/)).toBeInTheDocument();
  });

  it('joins live sessions and checks in learners', async () => {
    learnerApiMocks.joinLiveSession.mockResolvedValue({ joinUrl: 'https://live/session-1' });
    learnerApiMocks.checkInLiveSession.mockResolvedValue({ message: 'Check-in complete.' });

    render(<LearnerLiveClasses />);

    await userEvent.click(screen.getByRole('button', { name: 'Join session' }));
    await waitFor(() => expect(learnerApiMocks.joinLiveSession).toHaveBeenCalled());
    expect(await screen.findByText(/Join link ready/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Check in' }));
    await waitFor(() => expect(learnerApiMocks.checkInLiveSession).toHaveBeenCalled());
    expect(await screen.findByText(/Check-in complete/)).toBeInTheDocument();
  });

  it('creates initiatives, exports reports, and adds pipeline stages', async () => {
    learnerApiMocks.createCommunityInitiative.mockResolvedValue({ initiative: { id: 'init-101' } });
    learnerApiMocks.exportCommunityHealthReport.mockResolvedValue({ exportUrl: 'https://files/report.csv' });
    learnerApiMocks.createCommunityPipelineStage.mockResolvedValue({ pipelineStage: { id: 'stage-55' } });

    render(<LearnerCommunities />);

    await userEvent.click(screen.getByRole('button', { name: 'Create new initiative' }));
    await waitFor(() => expect(learnerApiMocks.createCommunityInitiative).toHaveBeenCalled());
    expect(await screen.findByText(/Initiative init-101 created/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Export health report' }));
    await waitFor(() => expect(learnerApiMocks.exportCommunityHealthReport).toHaveBeenCalled());
    expect(await screen.findByText(/Report ready/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add pipeline stage' }));
    await waitFor(() => expect(learnerApiMocks.createCommunityPipelineStage).toHaveBeenCalled());
    expect(await screen.findByText(/Pipeline stage stage-55 added/)).toBeInTheDocument();
  });
});

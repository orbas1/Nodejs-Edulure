import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const learnerDashboardServiceMock = {
  createBooking: vi.fn(),
  exportBookings: vi.fn(),
  syncCourseGoal: vi.fn(),
  syncCourseCalendar: vi.fn(),
  resumeEbook: vi.fn(),
  shareEbook: vi.fn(),
  downloadBillingStatement: vi.fn(),
  joinLiveSession: vi.fn(),
  checkInLiveSession: vi.fn(),
  createCommunityInitiative: vi.fn(),
  exportCommunityHealth: vi.fn(),
  createCommunityPipelineStage: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 'learner-42', role: 'learner' };
    return next();
  }
}));

vi.mock('../src/services/LearnerDashboardActionService.js', () => ({
  default: vi.fn().mockImplementation(() => learnerDashboardServiceMock)
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(learnerDashboardServiceMock).forEach((mockFn) => mockFn.mockResolvedValue({ ok: true }));
});

describe('Learner dashboard action routes', () => {
  it('creates tutor bookings for the authenticated learner', async () => {
    learnerDashboardServiceMock.createBooking.mockResolvedValueOnce({ booking: { id: 'booking_1' } });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/bookings')
      .set('Authorization', 'Bearer token')
      .send({ topic: 'Portfolio review' });

    expect(response.status).toBe(200);
    expect(learnerDashboardServiceMock.createBooking).toHaveBeenCalledWith({
      userId: 'learner-42',
      payload: { topic: 'Portfolio review' }
    });
    expect(response.body.data.booking.id).toBe('booking_1');
  });

  it('exports tutor booking agendas', async () => {
    learnerDashboardServiceMock.exportBookings.mockResolvedValueOnce({ exportUrl: 'https://files/export.ics' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/bookings/export')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(learnerDashboardServiceMock.exportBookings).toHaveBeenCalledWith({ userId: 'learner-42' });
    expect(response.body.data.exportUrl).toBe('https://files/export.ics');
  });

  it('shares ebook highlights', async () => {
    learnerDashboardServiceMock.shareEbook.mockResolvedValueOnce({ shareUrl: 'https://share' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/ebooks/ebook-9/share')
      .set('Authorization', 'Bearer token')
      .send({ recipients: ['mentor@example.com'] });

    expect(response.status).toBe(200);
    expect(learnerDashboardServiceMock.shareEbook).toHaveBeenCalledWith({
      userId: 'learner-42',
      ebookId: 'ebook-9',
      payload: { recipients: ['mentor@example.com'] }
    });
    expect(response.body.data.shareUrl).toBe('https://share');
  });

  it('issues join links for live sessions', async () => {
    learnerDashboardServiceMock.joinLiveSession.mockResolvedValueOnce({ joinUrl: 'https://live/join' });

    const response = await request(app)
      .post('/api/v1/dashboard/learner/live-sessions/session-7/join')
      .set('Authorization', 'Bearer token')
      .send({ skipLobby: true });

    expect(response.status).toBe(200);
    expect(learnerDashboardServiceMock.joinLiveSession).toHaveBeenCalledWith({
      userId: 'learner-42',
      sessionId: 'session-7',
      payload: { skipLobby: true }
    });
    expect(response.body.data.joinUrl).toBe('https://live/join');
  });

  it('creates community initiatives and pipeline stages', async () => {
    learnerDashboardServiceMock.createCommunityInitiative.mockResolvedValueOnce({
      initiative: { id: 'init-1' }
    });
    learnerDashboardServiceMock.createCommunityPipelineStage.mockResolvedValueOnce({
      pipelineStage: { id: 'stage-1' }
    });

    const initiativeResponse = await request(app)
      .post('/api/v1/dashboard/learner/communities/community-5/initiatives')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Launch mentorship cohort' });

    expect(initiativeResponse.status).toBe(200);
    expect(learnerDashboardServiceMock.createCommunityInitiative).toHaveBeenCalledWith({
      userId: 'learner-42',
      communityId: 'community-5',
      payload: { title: 'Launch mentorship cohort' }
    });

    const pipelineResponse = await request(app)
      .post('/api/v1/dashboard/learner/communities/pipelines')
      .set('Authorization', 'Bearer token')
      .send({ pipelineId: 'pipeline-1', title: 'Activate ambassadors' });

    expect(pipelineResponse.status).toBe(200);
    expect(learnerDashboardServiceMock.createCommunityPipelineStage).toHaveBeenCalledWith({
      userId: 'learner-42',
      payload: { pipelineId: 'pipeline-1', title: 'Activate ambassadors' }
    });
  });
});

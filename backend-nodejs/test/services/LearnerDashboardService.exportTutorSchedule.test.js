import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listByLearnerIdMock = vi.hoisted(() => vi.fn());
const listForLearnerMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/models/TutorBookingModel.js', () => ({
  default: {
    listByLearnerId: listByLearnerIdMock
  }
}));

vi.mock('../../src/models/LiveClassroomModel.js', () => ({
  default: {
    listForLearner: listForLearnerMock
  }
}));

vi.mock('../../src/config/logger.js', () => ({
  default: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
  }
}));

import LearnerDashboardService from '../../src/services/LearnerDashboardService.js';

describe('LearnerDashboardService.exportTutorSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-04-30T12:00:00Z'));
    listByLearnerIdMock.mockResolvedValue([
      {
        id: 1,
        publicId: 'booking-1',
        scheduledStart: new Date('2025-05-01T15:00:00Z'),
        scheduledEnd: new Date('2025-05-01T16:00:00Z'),
        durationMinutes: 60,
        status: 'confirmed',
        meetingUrl: 'https://example.test/session',
        metadata: { topic: 'Mentorship session', timezone: 'America/New_York' },
        tutorProfile: {
          displayName: 'Ava Mentor',
          user: { email: 'ava@example.test' },
          metadata: { timezone: 'America/New_York' }
        },
        learner: { firstName: 'Jordan', lastName: 'Lee', email: 'jordan@example.test' }
      }
    ]);
    listForLearnerMock.mockResolvedValue([
      {
        id: 2,
        publicId: 'classroom-1',
        title: 'Revenue Lab AMA',
        startAt: new Date('2025-05-02T17:00:00Z'),
        endAt: new Date('2025-05-02T18:30:00Z'),
        timezone: 'Europe/London',
        summary: 'Live AMA on revenue playbooks',
        description: 'Bring your questions.',
        type: 'workshop',
        topics: ['revenue'],
        metadata: { host: 'Revenue Guild', joinUrl: 'https://example.test/live', prepMaterials: ['Checklist'] }
      }
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates an ICS payload combining bookings and classrooms', async () => {
    const acknowledgement = await LearnerDashboardService.exportTutorSchedule(42);

    expect(acknowledgement.reference).toMatch(/^schedule_/);
    expect(acknowledgement.meta.events).toBe(2);
    expect(acknowledgement.meta.fileName).toMatch(/\.ics$/);
    expect(typeof acknowledgement.meta.ics).toBe('string');
    expect(acknowledgement.meta.ics).toContain('BEGIN:VEVENT');
    expect(acknowledgement.meta.ics).toContain('SUMMARY:Mentorship session · Ava Mentor');
    expect(acknowledgement.meta.ics).toContain('CATEGORIES:Mentorship');
    expect(acknowledgement.meta.ics).toContain('SUMMARY:Revenue Lab AMA');
    expect(acknowledgement.message).toMatch(/Tutor agenda export ready/);
  });

  it('requires a user identifier', async () => {
    await expect(LearnerDashboardService.exportTutorSchedule()).rejects.toThrow(
      'User identifier is required to export the tutor schedule'
    );
  });
});


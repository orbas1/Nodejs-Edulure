import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => {
  const start = vi.fn();
  const stop = vi.fn();
  const destroy = vi.fn();
  const schedule = vi.fn(() => ({ start, stop, destroy }));
  const validate = vi.fn().mockReturnValue(true);
  return {
    __esModule: true,
    default: {
      schedule,
      validate
    }
  };
});

vi.mock('../src/config/env.js', () => ({
  __esModule: true,
  env: {
    moderation: {
      followUps: {
        enabled: true,
        cronExpression: '* * * * *',
        timezone: 'Etc/UTC',
        batchSize: 50,
        escalateAfterMinutes: 120,
        escalationRoles: [],
        auditSeverity: 'notice',
        analyticsEnabled: true
      }
    }
  }
}));

vi.mock('../src/config/logger.js', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
  mockLogger.child = vi.fn(() => mockLogger);
  return {
    __esModule: true,
    default: mockLogger
  };
});

const { listDueMock, markCompletedMock, findCaseMock, findActionMock } = vi.hoisted(() => ({
  listDueMock: vi.fn(),
  markCompletedMock: vi.fn(),
  findCaseMock: vi.fn(),
  findActionMock: vi.fn()
}));

vi.mock('../src/models/ModerationFollowUpModel.js', () => ({
  __esModule: true,
  default: {
    listDue: listDueMock,
    markCompleted: markCompletedMock
  }
}));

vi.mock('../src/models/CommunityPostModerationCaseModel.js', () => ({
  __esModule: true,
  default: {
    findById: findCaseMock
  }
}));

vi.mock('../src/models/CommunityPostModerationActionModel.js', () => ({
  __esModule: true,
  default: {
    findById: findActionMock
  }
}));

vi.mock('../src/models/ModerationAnalyticsEventModel.js', () => ({
  __esModule: true,
  default: {
    record: vi.fn()
  }
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  __esModule: true,
  default: {
    record: vi.fn()
  }
}));

vi.mock('../src/services/AuditEventService.js', () => ({
  __esModule: true,
  default: class {
    constructor() {
      this.record = vi.fn();
    }
  }
}));

import { ModerationFollowUpJob } from '../src/jobs/moderationFollowUpJob.js';

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
});

describe('ModerationFollowUpJob', () => {
  beforeEach(() => {
    listDueMock.mockReset();
    markCompletedMock.mockReset();
    findActionMock.mockReset();
    findCaseMock.mockReset();
    markCompletedMock.mockResolvedValue();
    findActionMock.mockResolvedValue({ id: 1, actorId: 42, metadata: { note: 'action' } });
    findCaseMock.mockResolvedValue({
      id: 10,
      publicId: 'case-public-id',
      communityId: 7,
      postId: 101,
      severity: 'high',
      status: 'pending'
    });
  });

  it('dispatches and escalates overdue follow-ups, recording domain, analytics, and audit signals', async () => {
    const now = new Date('2025-04-01T12:00:00Z');
    listDueMock.mockResolvedValue([
      {
        id: 5,
        caseId: 10,
        actionId: 1,
        dueAt: new Date('2025-04-01T09:00:00Z'),
        assignedTo: 99,
        metadata: { reason: 'provide update' }
      }
    ]);

    const domainEventRecord = vi.fn().mockResolvedValue();
    const analyticsRecord = vi.fn().mockResolvedValue();
    const auditRecord = vi.fn().mockResolvedValue();

    const job = new ModerationFollowUpJob({
      enabled: true,
      batchSize: 5,
      escalationThresholdMinutes: 60,
      escalationRoles: ['compliance_manager'],
      nowProvider: () => now,
      loggerInstance: createLogger(),
      auditService: { record: auditRecord },
      analyticsModel: { record: analyticsRecord },
      analyticsEnabled: true,
      domainEventModel: { record: domainEventRecord }
    });

    const result = await job.runCycle('test');

    expect(result.processed).toBe(1);
    expect(result.escalated).toHaveLength(1);
    expect(result.dispatched[0]).toMatchObject({ followUpId: 5, escalated: true });
    expect(domainEventRecord).toHaveBeenCalledTimes(2);
    expect(analyticsRecord).toHaveBeenCalledTimes(2);
    expect(auditRecord).toHaveBeenCalledTimes(1);
    expect(auditRecord.mock.calls[0][0]).toMatchObject({
      eventType: 'moderation.follow_up.escalated',
      metadata: {
        followUpId: 5,
        escalationRoles: ['compliance_manager']
      }
    });
    expect(markCompletedMock).toHaveBeenCalledTimes(1);
    expect(markCompletedMock.mock.calls[0][1].metadata).toMatchObject({ escalated: true, overdueMinutes: 180 });
  });

  it('processes due follow-ups without escalation when below threshold', async () => {
    const now = new Date('2025-04-01T12:00:00Z');
    listDueMock.mockResolvedValue([
      {
        id: 6,
        caseId: 10,
        actionId: null,
        dueAt: new Date('2025-04-01T11:45:00Z'),
        assignedTo: null,
        metadata: {}
      }
    ]);

    const domainEventRecord = vi.fn().mockResolvedValue();
    const analyticsRecord = vi.fn().mockResolvedValue();
    const auditRecord = vi.fn().mockResolvedValue();

    const job = new ModerationFollowUpJob({
      enabled: true,
      batchSize: 5,
      escalationThresholdMinutes: 120,
      escalationRoles: ['moderator'],
      nowProvider: () => now,
      loggerInstance: createLogger(),
      auditService: { record: auditRecord },
      analyticsModel: { record: analyticsRecord },
      analyticsEnabled: true,
      domainEventModel: { record: domainEventRecord }
    });

    const result = await job.runCycle('manual');

    expect(result.processed).toBe(1);
    expect(result.escalated).toHaveLength(0);
    expect(result.dispatched[0]).toMatchObject({ followUpId: 6, escalated: false });
    expect(domainEventRecord).toHaveBeenCalledTimes(1);
    expect(analyticsRecord).toHaveBeenCalledTimes(1);
    expect(auditRecord).not.toHaveBeenCalled();
    expect(markCompletedMock.mock.calls[0][1].metadata).toMatchObject({ escalated: false });
  });
});

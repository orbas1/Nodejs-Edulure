import { act, renderHook } from '@testing-library/react';

jest.mock('../../api/learnerDashboardApi.js', () => ({
  fetchSupportTickets: jest.fn().mockResolvedValue({ data: { tickets: [] } })
}));

import useLearnerSupportCases from '../useLearnerSupportCases.js';

function createSession(id = 'tester-support') {
  return { user: { id }, tokens: { accessToken: 'token' } };
}

describe('useLearnerSupportCases', () => {
  it('normalises initial cases and computes metrics', () => {
    const initialCases = [
      {
        id: 'case-open',
        subject: 'Need help with billing',
        status: 'open',
        priority: 'high',
        createdAt: '2024-05-01T10:00:00.000Z',
        updatedAt: '2024-05-01T10:05:00.000Z',
        messages: [
          { id: 'm1', author: 'learner', body: 'Hello team', createdAt: '2024-05-01T10:00:00.000Z' },
          { id: 'm2', author: 'agent', body: 'Happy to help', createdAt: '2024-05-01T10:04:00.000Z' }
        ]
      },
      {
        id: 'case-closed',
        subject: 'Feature request',
        status: 'resolved',
        createdAt: '2024-04-20T09:00:00.000Z',
        updatedAt: '2024-04-22T09:00:00.000Z'
      }
    ];

    const { result } = renderHook(() =>
      useLearnerSupportCases(initialCases, { session: createSession('support-tester') })
    );

    expect(result.current.cases).toHaveLength(2);
    expect(result.current.cases[0].status).toBe('open');
    expect(result.current.stats.open).toBe(1);
    expect(result.current.stats.resolved).toBe(1);
    expect(result.current.stats.awaitingLearner).toBe(0);
    expect(result.current.stats.averageResponseMinutes).toBeGreaterThanOrEqual(0);
  });

  it('creates cases, appends messages, and updates status', () => {
    const { result } = renderHook(() =>
      useLearnerSupportCases([], { session: createSession('support-create') })
    );

    let created;
    act(() => {
      created = result.current.createCase({
        id: 'local-case',
        subject: 'Portal bug',
        priority: 'urgent',
        messages: [
          { id: 'msg-initial', author: 'learner', body: 'Attachment not uploading', createdAt: '2024-06-01T08:00:00.000Z' }
        ]
      });
    });

    expect(result.current.cases).toHaveLength(1);
    expect(result.current.cases[0].priority).toBe('urgent');

    act(() => {
      result.current.addMessage(created.id, {
        id: 'msg-follow-up',
        author: 'agent',
        body: 'Can you retry now?',
        createdAt: '2024-06-01T08:10:00.000Z'
      });
    });

    expect(result.current.cases[0].messageCount).toBe(2);

    act(() => {
      result.current.closeCase(created.id, 'Patched in latest release');
    });

    expect(result.current.cases[0].status).toBe('resolved');

    act(() => {
      result.current.reopenCase(created.id);
    });

    expect(result.current.cases[0].status).toBe('open');

    act(() => {
      result.current.deleteCase(created.id);
    });

    expect(result.current.cases).toHaveLength(0);
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useLearnerSupportCases from '../../src/hooks/useLearnerSupportCases.js';

const fetchSupportTicketsMock = vi.fn();

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ session: { tokens: { accessToken: 'token-abc' }, user: { id: 'user-1' } } })
}));

vi.mock('../../src/api/learnerDashboardApi.js', () => ({
  fetchSupportTickets: fetchSupportTicketsMock
}));

describe('useLearnerSupportCases', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchSupportTicketsMock.mockReset();
    fetchSupportTicketsMock.mockResolvedValue({ data: { tickets: [] } });
  });

  it('normalises incoming cases and exposes enriched stats', () => {
    const initialCases = [
      {
        id: 'case-1',
        status: 'waiting-on-learner',
        priority: 'High',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T05:00:00.000Z',
        knowledgeSuggestions: [{ id: 'kb-1', title: 'Billing playbook', minutes: 3 }],
        escalationBreadcrumbs: [
          { id: 'crumb-b', label: 'Escalated to ops', at: '2024-01-01T04:00:00.000Z' },
          { id: 'crumb-a', label: 'Ticket created', at: '2024-01-01T00:10:00.000Z' }
        ],
        followUpDueAt: '2024-01-02T00:00:00.000Z',
        aiSummary: 'Learner reported “Issue”. Priority: High.',
        messages: [
          { id: 'msg-1', author: 'learner', body: 'Need help', createdAt: '2024-01-01T00:30:00.000Z' },
          { id: 'msg-2', author: 'support', body: 'Looking into it', createdAt: '2024-01-01T01:00:00.000Z' }
        ]
      }
    ];

    const { result } = renderHook(() =>
      useLearnerSupportCases(initialCases, {
        session: { tokens: { accessToken: 'token-abc' }, user: { id: 'user-1' } }
      })
    );

    const normalised = result.current.cases[0];
    expect(normalised.status).toBe('waiting');
    expect(normalised.priority).toBe('high');
    expect(normalised.knowledgeSuggestions).toEqual([
      expect.objectContaining({ id: 'kb-1', title: 'Billing playbook', minutes: 3 })
    ]);
    expect(normalised.escalationBreadcrumbs.map((crumb) => crumb.label)).toEqual([
      'Ticket created',
      'Escalated to ops'
    ]);
    expect(normalised.aiSummary).toBe('Learner reported “Issue”. Priority: High.');
    expect(result.current.stats.awaitingLearner).toBe(1);
    expect(result.current.stats.latestUpdatedAt).toBe('2024-01-01T05:00:00.000Z');
  });

  it('creates cases and appends messages with derived metrics', () => {
    const { result } = renderHook(() =>
      useLearnerSupportCases([], {
        session: { tokens: { accessToken: 'token-abc' }, user: { id: 'user-2' } }
      })
    );

    let createdCase;
    act(() => {
      createdCase = result.current.createCase({
        id: 'local-1',
        subject: 'Offline ticket',
        priority: 'urgent',
        messages: [
          { id: 'msg-local-1', author: 'learner', body: 'Initial report', createdAt: '2024-03-01T10:00:00.000Z' }
        ]
      });
    });

    expect(result.current.cases).toHaveLength(1);
    expect(createdCase.status).toBe('open');

    act(() => {
      result.current.addMessage('local-1', {
        id: 'msg-local-2',
        author: 'support',
        body: 'Acknowledged',
        createdAt: '2024-03-01T10:15:00.000Z'
      });
    });

    expect(result.current.cases[0].messageCount).toBe(2);
    expect(result.current.stats.awaitingLearner).toBe(1);
  });

  it('merges remote tickets fetched from the API', async () => {
    fetchSupportTicketsMock.mockResolvedValue({
      data: {
        tickets: [
          {
            id: 'remote-1',
            status: 'resolved',
            priority: 'normal',
            updatedAt: '2024-04-01T12:00:00.000Z',
            messages: []
          }
        ]
      }
    });

    const { result } = renderHook(() =>
      useLearnerSupportCases([], {
        session: { tokens: { accessToken: 'token-abc' }, user: { id: 'user-3' } }
      })
    );

    await waitFor(() => expect(fetchSupportTicketsMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(result.current.cases.some((supportCase) => supportCase.id === 'remote-1')).toBe(true)
    );
    expect(result.current.stats.resolved).toBe(1);
  });
});

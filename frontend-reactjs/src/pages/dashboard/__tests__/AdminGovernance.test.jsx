import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminGovernance from '../AdminGovernance.jsx';

const fetchDsrQueueMock = vi.hoisted(() => vi.fn());
const fetchPolicyTimelineMock = vi.hoisted(() => vi.fn());
const updateDsrStatusMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('../../../api/complianceApi.js', () => ({
  fetchDsrQueue: fetchDsrQueueMock,
  fetchPolicyTimeline: fetchPolicyTimelineMock,
  updateDsrStatus: updateDsrStatusMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

describe('<AdminGovernance />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-123' } } });
    fetchDsrQueueMock.mockResolvedValue({
      data: [
        {
          id: 1,
          caseReference: 'DSR-001',
          requestType: 'access',
          status: 'in_review',
          dueAt: '2025-02-04T10:00:00.000Z',
          reporter: { displayName: 'Alex Morgan' }
        }
      ],
      total: 1,
      overdue: 0
    });
    fetchPolicyTimelineMock.mockResolvedValue([
      {
        key: 'privacy',
        version: '2025-02',
        title: 'Privacy Notice',
        summary: 'Updated retention windows to 30 days.',
        effectiveAt: '2025-02-01T00:00:00.000Z',
        status: 'published',
        contentHash: 'abc123def4567890'
      }
    ]);
    updateDsrStatusMock.mockResolvedValue({});
  });

  it('loads queue and policy data then renders summaries', async () => {
    render(<AdminGovernance />);

    await waitFor(() => {
      expect(fetchDsrQueueMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-123' }));
    });

    const queueArgs = fetchDsrQueueMock.mock.calls[0][0];
    if (typeof AbortSignal !== 'undefined') {
      expect(queueArgs.signal).toBeInstanceOf(AbortSignal);
    } else {
      expect(queueArgs.signal).toBeDefined();
    }

    expect(fetchPolicyTimelineMock).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-123' }));
    const policyArgs = fetchPolicyTimelineMock.mock.calls[0][0];
    if (typeof AbortSignal !== 'undefined') {
      expect(policyArgs.signal).toBeInstanceOf(AbortSignal);
    } else {
      expect(policyArgs.signal).toBeDefined();
    }

    expect(await screen.findByText('Governance control centre')).toBeInTheDocument();
    const queueCard = screen.getByText('Requests in queue').closest('div');
    expect(queueCard).not.toBeNull();
    expect(within(queueCard).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('DSR-001')).toBeInTheDocument();
    expect(screen.getByText('Policy timeline')).toBeInTheDocument();
    expect(screen.getByText(/Privacy Notice/)).toBeInTheDocument();
    expect(screen.queryByText('All caught up. No outstanding requests.')).not.toBeInTheDocument();
  });

  it('updates request status and refreshes the queue after action buttons are used', async () => {
    fetchDsrQueueMock.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          caseReference: 'DSR-001',
          requestType: 'access',
          status: 'in_review',
          dueAt: '2025-02-04T10:00:00.000Z'
        }
      ],
      total: 1,
      overdue: 0
    });

    render(<AdminGovernance />);

    await screen.findByText('DSR-001');

    fetchDsrQueueMock.mockResolvedValueOnce({ data: [], total: 0, overdue: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    await waitFor(() => {
      expect(updateDsrStatusMock).toHaveBeenCalledWith({ token: 'token-123', requestId: 1, status: 'completed' });
    });

    expect(fetchDsrQueueMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces API errors to operators', async () => {
    const error = new Error('Network down');
    fetchDsrQueueMock.mockRejectedValueOnce(error);
    fetchPolicyTimelineMock.mockResolvedValueOnce([]);

    render(<AdminGovernance />);

    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });
});

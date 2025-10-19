import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerFinancial from '../LearnerFinancial.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const downloadInvoiceMock = vi.hoisted(() => vi.fn());
const updateBillingPreferencesMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  downloadInvoice: downloadInvoiceMock,
  updateBillingPreferences: updateBillingPreferencesMock
}));

describe('<LearnerFinancial />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLearnerDashboardSectionMock.mockReturnValue({
      isLearner: true,
      section: {
        summary: [
          { label: 'Tuition balance', value: '$1,200', change: '+$200 upcoming' }
        ],
        invoices: [
          { id: 'inv-1', label: 'April Tuition', amount: '$600', status: 'Paid', date: 'Apr 1' },
          { id: 'inv-2', label: 'May Tuition', amount: '$600', status: 'Due', date: 'May 1' }
        ]
      },
      refresh: vi.fn(),
      loading: false,
      error: null
    });
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-456' } } });
    downloadInvoiceMock.mockResolvedValue({
      message: 'Invoice download prepared',
      data: { meta: { downloadUrl: '/billing/invoices/inv-1.pdf' } }
    });
    updateBillingPreferencesMock.mockResolvedValue({ message: 'Billing preferences updated' });
  });

  it('downloads the latest statement when requested', async () => {
    const user = userEvent.setup();
    render(<LearnerFinancial />);

    await user.click(screen.getByRole('button', { name: /download statement/i }));

    await waitFor(() => {
      expect(downloadInvoiceMock).toHaveBeenCalledWith({ token: 'token-456', invoiceId: 'inv-1' });
      expect(screen.getByRole('status')).toHaveTextContent(/statement download ready/i);
    });
  });

  it('updates billing preferences and displays a confirmation message', async () => {
    const user = userEvent.setup();
    render(<LearnerFinancial />);

    await user.click(screen.getByRole('button', { name: /update billing/i }));

    await waitFor(() => {
      expect(updateBillingPreferencesMock).toHaveBeenCalledWith({
        token: 'token-456',
        payload: expect.objectContaining({ autoRenew: true })
      });
      expect(screen.getByRole('status')).toHaveTextContent(/billing preferences updated/i);
    });
  });
});

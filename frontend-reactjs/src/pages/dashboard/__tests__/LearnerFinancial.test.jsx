import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerFinancial from '../LearnerFinancial.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const downloadInvoiceMock = vi.hoisted(() => vi.fn());
const updateBillingPreferencesMock = vi.hoisted(() => vi.fn());
const createPaymentMethodMock = vi.hoisted(() => vi.fn());
const updatePaymentMethodMock = vi.hoisted(() => vi.fn());
const removePaymentMethodMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  downloadInvoice: downloadInvoiceMock,
  updateBillingPreferences: updateBillingPreferencesMock,
  createPaymentMethod: createPaymentMethodMock,
  updatePaymentMethod: updatePaymentMethodMock,
  removePaymentMethod: removePaymentMethodMock
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
        ],
        paymentMethods: [
          { id: 'pm-1', label: 'Primary Visa', brand: 'Visa', last4: '4242', expiry: '2025-08', primary: true }
        ],
        billingContacts: [
          {
            id: 'contact-1',
            name: 'Existing finance partner',
            email: 'finance@example.com',
            phone: '+1 234 567 8910',
            company: 'Acme Schools'
          }
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
    createPaymentMethodMock.mockResolvedValue({
      message: 'Payment method added',
      data: { id: 'pm-2', label: 'Corporate Mastercard', brand: 'Mastercard', last4: '4444', expiry: '2026-09' }
    });
    updatePaymentMethodMock.mockResolvedValue({ message: 'Payment method updated' });
    removePaymentMethodMock.mockResolvedValue({ message: 'Payment method removed' });
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

  it('allows adding a payment method via the modal form', async () => {
    const user = userEvent.setup();
    render(<LearnerFinancial />);

    await user.click(screen.getByRole('button', { name: /add payment method/i }));

    await user.type(screen.getByLabelText(/label/i), 'Corporate Mastercard');
    await user.clear(screen.getByLabelText(/brand/i));
    await user.type(screen.getByLabelText(/brand/i), 'Mastercard');
    await user.type(screen.getByLabelText(/last four digits/i), '4444');
    await user.type(screen.getByLabelText(/expiry month/i), '2026-09');
    await user.click(screen.getByLabelText(/use as primary method/i));

    await user.click(screen.getByRole('button', { name: /add method/i }));

    await waitFor(() => {
      expect(createPaymentMethodMock).toHaveBeenCalledWith({
        token: 'token-456',
        payload: expect.objectContaining({
          label: 'Corporate Mastercard',
          brand: 'Mastercard',
          last4: '4444',
          expiry: '2026-09',
          primary: true
        })
      });
      expect(screen.getByRole('status')).toHaveTextContent(/added to your wallet/i);
    });
  });

  it('removes a payment method when the remove action is used', async () => {
    const user = userEvent.setup();
    render(<LearnerFinancial />);

    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(removePaymentMethodMock).toHaveBeenCalledWith({ token: 'token-456', methodId: 'pm-1' });
      expect(screen.getByRole('status')).toHaveTextContent(/removed/i);
    });
  });

  it('saves billing contact details without duplicating existing entries', async () => {
    const user = userEvent.setup();
    updateBillingPreferencesMock.mockResolvedValueOnce({});

    render(<LearnerFinancial />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const companyInput = screen.getByLabelText(/company/i);

    await user.clear(nameInput);
    await user.type(nameInput, 'Jordan CFO');
    await user.clear(emailInput);
    await user.type(emailInput, 'finance@example.com');
    await user.clear(phoneInput);
    await user.type(phoneInput, '+1 987 654 3210');
    await user.clear(companyInput);
    await user.type(companyInput, 'Acme Schools');

    await user.click(screen.getByRole('button', { name: /save contact/i }));

    await waitFor(() => {
      expect(updateBillingPreferencesMock).toHaveBeenCalledWith({
        token: 'token-456',
        payload: {
          billingContact: {
            name: 'Jordan CFO',
            email: 'finance@example.com',
            phone: '+1 987 654 3210',
            company: 'Acme Schools'
          }
        }
      });
      expect(screen.getByRole('status')).toHaveTextContent(/Jordan CFO updated as a billing contact/i);
    });

    expect(screen.getByText('Jordan CFO')).toBeInTheDocument();
    expect(screen.queryByText('Existing finance partner')).not.toBeInTheDocument();
  });

  it('shows a gating message when the viewer is not a learner', () => {
    useLearnerDashboardSectionMock.mockReturnValueOnce({
      isLearner: false,
      section: null,
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<LearnerFinancial />);

    expect(screen.getByText(/Learner Learnspace required/i)).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerSettings from '../LearnerSettings.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const updateSystemPreferencesMock = vi.hoisted(() => vi.fn());
const updateFinanceSettingsMock = vi.hoisted(() => vi.fn());
const createFinancePurchaseMock = vi.hoisted(() => vi.fn());
const updateFinancePurchaseMock = vi.hoisted(() => vi.fn());
const deleteFinancePurchaseMock = vi.hoisted(() => vi.fn());
const fetchSystemPreferencesMock = vi.hoisted(() => vi.fn());
const fetchFinanceSettingsMock = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useLearnerDashboard.js', () => ({
  useLearnerDashboardSection: useLearnerDashboardSectionMock
}));

vi.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: useAuthMock
}));

vi.mock('../../../api/learnerDashboardApi.js', () => ({
  updateSystemPreferences: updateSystemPreferencesMock,
  updateFinanceSettings: updateFinanceSettingsMock,
  createFinancePurchase: createFinancePurchaseMock,
  updateFinancePurchase: updateFinancePurchaseMock,
  deleteFinancePurchase: deleteFinancePurchaseMock,
  fetchSystemPreferences: fetchSystemPreferencesMock,
  fetchFinanceSettings: fetchFinanceSettingsMock
}));

describe('<LearnerSettings />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLearnerDashboardSectionMock.mockReturnValue({
      isLearner: true,
      loading: false,
      error: null,
      refresh: vi.fn(),
      section: {
        system: {
          language: 'en',
          region: 'US',
          timezone: 'UTC',
          notificationsEnabled: true,
          digestEnabled: true,
          autoPlayMedia: false,
          highContrast: false,
          reducedMotion: false,
          preferences: {
            interfaceDensity: 'comfortable',
            analyticsOptIn: true,
            subtitleLanguage: 'en',
            audioDescription: false
          }
        },
        finance: {
          profile: {
            currency: 'USD',
            taxId: '12345',
            invoiceDelivery: 'email',
            payoutSchedule: 'monthly',
            expensePolicyUrl: '',
            autoPayEnabled: true,
            reserveTarget: 500
          },
          alerts: {
            sendEmail: true,
            sendSms: false,
            escalationEmail: 'finance@example.com',
            notifyThresholdPercent: 80
          },
          reimbursements: {
            enabled: false,
            instructions: ''
          },
          purchases: [
            {
              id: 'purchase-1',
              reference: 'INV-100',
              description: 'Mentorship bundle',
              amountCents: 120000,
              currency: 'USD',
              status: 'paid',
              purchasedAtLabel: '1 Feb 2024',
              metadata: { receiptUrl: 'https://example.com/receipt.pdf' }
            }
          ],
          subscriptions: [
            {
              id: 'sub-1',
              status: 'active',
              cancelAtPeriodEnd: false,
              currentPeriodEndLabel: '1 Mar 2024',
              provider: 'stripe',
              plan: { name: 'Founders Club', billingInterval: 'monthly', priceFormatted: '$99.00' },
              community: { id: 1, name: 'Growth Guild', slug: 'growth-guild' }
            }
          ]
        }
      }
    });
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-123' } } });
    updateSystemPreferencesMock.mockResolvedValue({ message: 'System preferences updated' });
    updateFinanceSettingsMock.mockResolvedValue({ message: 'Finance settings updated' });
    createFinancePurchaseMock.mockResolvedValue({
      data: {
        id: 'purchase-2',
        reference: 'INV-200',
        description: 'Scholarships',
        amountCents: 250000,
        currency: 'USD',
        status: 'paid',
        purchasedAtLabel: '2 Feb 2024',
        metadata: { receiptUrl: 'https://example.com/receipt-200.pdf' }
      }
    });
    fetchSystemPreferencesMock.mockResolvedValue({
      data: {
        language: 'en',
        region: 'US',
        timezone: 'UTC',
        notificationsEnabled: true,
        digestEnabled: true,
        autoPlayMedia: false,
        highContrast: false,
        reducedMotion: false,
        preferences: {
          interfaceDensity: 'comfortable',
          analyticsOptIn: true,
          subtitleLanguage: 'en',
          audioDescription: false
        }
      }
    });
    fetchFinanceSettingsMock.mockResolvedValue({
      data: {
        profile: {
          currency: 'USD',
          taxId: '12345',
          invoiceDelivery: 'email',
          payoutSchedule: 'monthly',
          autoPayEnabled: true,
          reserveTarget: 500
        },
        alerts: {
          sendEmail: true,
          sendSms: false,
          escalationEmail: 'finance@example.com',
          notifyThresholdPercent: 80
        },
        reimbursements: { enabled: false, instructions: '' },
        purchases: [],
        subscriptions: []
      }
    });
  });

  it('renders learner settings with prefilled values', () => {
    render(<LearnerSettings />);

    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^language$/i)).toHaveValue('en');
    expect(screen.getByLabelText(/preferred currency/i)).toHaveValue('USD');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('submits system preferences form', async () => {
    const user = userEvent.setup();
    render(<LearnerSettings />);

    await user.selectOptions(screen.getByLabelText(/^language$/i), 'fr');
    await user.click(screen.getByRole('button', { name: /save system preferences/i }));

    await waitFor(() => {
      expect(updateSystemPreferencesMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({ language: 'fr' })
      });
    });
  });

  it('creates a new finance purchase from the modal form', async () => {
    const user = userEvent.setup();
    render(<LearnerSettings />);

    const [openPurchaseModalButton] = screen.getAllByRole('button', { name: /log purchase/i });
    await user.click(openPurchaseModalButton);
    await user.clear(screen.getByLabelText(/^reference$/i));
    await user.type(screen.getByLabelText(/^reference$/i), 'INV-200');
    await user.type(screen.getByLabelText(/^description$/i), 'Scholarships');
    await user.clear(screen.getByLabelText(/^amount$/i));
    await user.type(screen.getByLabelText(/^amount$/i), '2500');
    const [, submitPurchaseButton] = screen.getAllByRole('button', { name: /log purchase/i });
    await user.click(submitPurchaseButton);

    await waitFor(() => {
      expect(createFinancePurchaseMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({ reference: 'INV-200', amount: 2500 })
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/purchase recorded/i)).toBeInTheDocument();
  });

  it('submits finance preferences form', async () => {
    const user = userEvent.setup();
    render(<LearnerSettings />);

    await user.clear(screen.getByLabelText(/reserve target/i));
    await user.type(screen.getByLabelText(/reserve target/i), '600');
    await user.click(screen.getByRole('checkbox', { name: /sms alerts/i }));
    await user.click(screen.getByRole('button', { name: /save finance settings/i }));

    await waitFor(() => {
      expect(updateFinanceSettingsMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({
          reserveTarget: 600,
          alerts: expect.objectContaining({ sendSms: true })
        })
      });
    });

    expect(await screen.findByText(/finance settings updated/i)).toBeInTheDocument();
  });

  it('gates access when the viewer is not a learner', () => {
    useLearnerDashboardSectionMock.mockReturnValueOnce({
      isLearner: false,
      section: null,
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<LearnerSettings />);

    expect(screen.getByText(/Learner Learnspace required/i)).toBeInTheDocument();
  });
});

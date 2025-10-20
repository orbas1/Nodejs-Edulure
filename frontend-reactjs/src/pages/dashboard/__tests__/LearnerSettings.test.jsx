import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LearnerSettings from '../LearnerSettings.jsx';

const useLearnerDashboardSectionMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const updateSystemPreferencesMock = vi.hoisted(() => vi.fn());
const updateFinanceSettingsMock = vi.hoisted(() => vi.fn());
const createFinanceBudgetMock = vi.hoisted(() => vi.fn());
const updateFinanceBudgetMock = vi.hoisted(() => vi.fn());
const deleteFinanceBudgetMock = vi.hoisted(() => vi.fn());
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
  createFinanceBudget: createFinanceBudgetMock,
  updateFinanceBudget: updateFinanceBudgetMock,
  deleteFinanceBudget: deleteFinanceBudgetMock,
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
          budgets: [
            {
              id: 'budget-1',
              name: 'Mentorship',
              amountCents: 120000,
              currency: 'USD',
              period: 'monthly',
              alertsEnabled: true,
              alertThresholdPercent: 80,
              metadata: {}
            }
          ]
        }
      }
    });
    useAuthMock.mockReturnValue({ session: { tokens: { accessToken: 'token-123' } } });
    updateSystemPreferencesMock.mockResolvedValue({ message: 'System preferences updated' });
    updateFinanceSettingsMock.mockResolvedValue({ message: 'Finance settings updated' });
    createFinanceBudgetMock.mockResolvedValue({
      data: {
        id: 'budget-2',
        name: 'Scholarships',
        amountCents: 250000,
        currency: 'USD',
        period: 'monthly',
        alertsEnabled: true,
        alertThresholdPercent: 90,
        metadata: {}
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
        budgets: []
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

  it('creates a new finance budget from the modal form', async () => {
    const user = userEvent.setup();
    render(<LearnerSettings />);

    await user.click(screen.getByRole('button', { name: /add budget/i }));
    await user.type(screen.getByLabelText(/^name$/i), 'Scholarships');
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '2500');
    await user.click(screen.getByRole('button', { name: /create budget/i }));

    await waitFor(() => {
      expect(createFinanceBudgetMock).toHaveBeenCalledWith({
        token: 'token-123',
        payload: expect.objectContaining({ name: 'Scholarships', amount: 2500 })
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/budget created/i)).toBeInTheDocument();
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
});

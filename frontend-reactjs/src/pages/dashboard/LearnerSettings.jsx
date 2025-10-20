import { useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchFinanceSettings,
  fetchSystemPreferences,
  updateFinanceSettings,
  updateSystemPreferences,
  createFinanceBudget,
  updateFinanceBudget,
  deleteFinanceBudget
} from '../../api/learnerDashboardApi.js';

const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' }
];

const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Africa/Lagos',
  'Asia/Singapore',
  'Australia/Sydney'
];

const BUDGET_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one-time', label: 'One-off' }
];

const INTERFACE_DENSITIES = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
  { value: 'expanded', label: 'Expanded' }
];

const DEFAULT_SYSTEM_FORM = {
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
};

const DEFAULT_FINANCE_FORM = {
  currency: 'USD',
  taxId: '',
  invoiceDelivery: 'email',
  payoutSchedule: 'monthly',
  expensePolicyUrl: '',
  autoPayEnabled: false,
  reserveTarget: 0,
  alerts: {
    sendEmail: true,
    sendSms: false,
    escalationEmail: '',
    notifyThresholdPercent: 80
  },
  reimbursements: {
    enabled: false,
    instructions: ''
  }
};

const DEFAULT_BUDGET_FORM = {
  id: null,
  name: '',
  amount: '',
  currency: 'USD',
  period: 'monthly',
  alertsEnabled: true,
  alertThresholdPercent: 80,
  metadataCategory: ''
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatBudgetAmount(amountCents, currency = 'USD') {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(Number(amountCents ?? 0) / 100);
  } catch (_error) {
    return currencyFormatter.format(Number(amountCents ?? 0) / 100);
  }
}

export default function LearnerSettings() {
  const { isLearner, section: settings, loading, error, refresh } = useLearnerDashboardSection('settings');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [systemForm, setSystemForm] = useState(DEFAULT_SYSTEM_FORM);
  const [financeForm, setFinanceForm] = useState(DEFAULT_FINANCE_FORM);
  const [budgets, setBudgets] = useState([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState(DEFAULT_BUDGET_FORM);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!settings?.system || !settings?.finance) {
      return;
    }
    const normalisedSystem = {
      ...DEFAULT_SYSTEM_FORM,
      ...settings.system,
      preferences: {
        ...DEFAULT_SYSTEM_FORM.preferences,
        ...(settings.system.preferences ?? {})
      }
    };
    setSystemForm(normalisedSystem);

    const normalisedFinance = {
      ...DEFAULT_FINANCE_FORM,
      ...settings.finance.profile,
      alerts: { ...DEFAULT_FINANCE_FORM.alerts, ...(settings.finance.alerts ?? {}) },
      reimbursements: {
        ...DEFAULT_FINANCE_FORM.reimbursements,
        ...(settings.finance.reimbursements ?? {})
      }
    };
    normalisedFinance.expensePolicyUrl = settings.finance.profile?.expensePolicyUrl ?? '';
    normalisedFinance.taxId = settings.finance.profile?.taxId ?? '';
    normalisedFinance.reserveTarget = settings.finance.profile?.reserveTarget ?? 0;
    setFinanceForm(normalisedFinance);
    setBudgets(Array.isArray(settings.finance.budgets) ? settings.finance.budgets : []);
  }, [settings?.system, settings?.finance]);

  useEffect(() => {
    if (error) {
      setStatusMessage({ type: 'error', message: error.message ?? 'Unable to load settings.' });
    }
  }, [error]);

  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);

  const handleSystemInputChange = (event) => {
    const { name, type, checked, value } = event.target;
    if (name.startsWith('preferences.')) {
      const key = name.split('.')[1];
      setSystemForm((previous) => ({
        ...previous,
        preferences: {
          ...previous.preferences,
          [key]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }
    setSystemForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFinanceInputChange = (event) => {
    const { name, type, checked, value } = event.target;
    if (name.startsWith('alerts.')) {
      const key = name.split('.')[1];
      setFinanceForm((previous) => ({
        ...previous,
        alerts: {
          ...previous.alerts,
          [key]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }
    if (name.startsWith('reimbursements.')) {
      const key = name.split('.')[1];
      setFinanceForm((previous) => ({
        ...previous,
        reimbursements: {
          ...previous.reimbursements,
          [key]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }
    setFinanceForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBudgetFormChange = (event) => {
    const { name, type, checked, value } = event.target;
    setBudgetForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const refreshSystemPreferences = async () => {
    if (!token) return;
    const response = await fetchSystemPreferences({ token }).catch(() => null);
    if (response?.data) {
      const payload = response.data;
      setSystemForm({
        ...DEFAULT_SYSTEM_FORM,
        ...payload,
        preferences: {
          ...DEFAULT_SYSTEM_FORM.preferences,
          ...(payload.preferences ?? {})
        }
      });
    }
  };

  const refreshFinanceSettings = async () => {
    if (!token) return;
    const response = await fetchFinanceSettings({ token }).catch(() => null);
    if (response?.data) {
      const payload = response.data;
      setBudgets(Array.isArray(payload.budgets) ? payload.budgets : []);
      setFinanceForm({
        ...DEFAULT_FINANCE_FORM,
        ...payload.profile,
        alerts: { ...DEFAULT_FINANCE_FORM.alerts, ...(payload.alerts ?? {}) },
        reimbursements: {
          ...DEFAULT_FINANCE_FORM.reimbursements,
          ...(payload.reimbursements ?? {})
        }
      });
    }
  };

  const handleSystemSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to update your preferences.' });
      return;
    }
    try {
      setPendingAction('system');
      setStatusMessage({ type: 'pending', message: 'Saving system preferences…' });
      await updateSystemPreferences({
        token,
        payload: {
          language: systemForm.language,
          region: systemForm.region,
          timezone: systemForm.timezone,
          notificationsEnabled: systemForm.notificationsEnabled,
          digestEnabled: systemForm.digestEnabled,
          autoPlayMedia: systemForm.autoPlayMedia,
          highContrast: systemForm.highContrast,
          reducedMotion: systemForm.reducedMotion,
          preferences: systemForm.preferences
        }
      });
      await refreshSystemPreferences();
      refresh?.();
      setStatusMessage({ type: 'success', message: 'System preferences updated.' });
    } catch (submitError) {
      setStatusMessage({
        type: 'error',
        message:
          submitError instanceof Error
            ? submitError.message
            : 'We could not update your system preferences. Please try again.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleFinanceSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to update finance settings.' });
      return;
    }
    try {
      setPendingAction('finance');
      setStatusMessage({ type: 'pending', message: 'Saving finance settings…' });
      await updateFinanceSettings({
        token,
        payload: {
          currency: financeForm.currency,
          taxId: financeForm.taxId,
          invoiceDelivery: financeForm.invoiceDelivery,
          payoutSchedule: financeForm.payoutSchedule,
          expensePolicyUrl: financeForm.expensePolicyUrl,
          autoPayEnabled: financeForm.autoPayEnabled,
          reserveTarget: Number(financeForm.reserveTarget ?? 0),
          alerts: {
            sendEmail: financeForm.alerts.sendEmail,
            sendSms: financeForm.alerts.sendSms,
            escalationEmail: financeForm.alerts.escalationEmail,
            notifyThresholdPercent: Number(financeForm.alerts.notifyThresholdPercent ?? 80)
          },
          reimbursements: {
            enabled: Boolean(financeForm.reimbursements.enabled),
            instructions: financeForm.reimbursements.instructions
          }
        }
      });
      await refreshFinanceSettings();
      refresh?.();
      setStatusMessage({ type: 'success', message: 'Finance settings updated.' });
    } catch (submitError) {
      setStatusMessage({
        type: 'error',
        message:
          submitError instanceof Error
            ? submitError.message
            : 'We were unable to update your finance settings.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const openBudgetModal = (budget = null) => {
    if (budget) {
      setBudgetForm({
        id: budget.id,
        name: budget.name ?? '',
        amount: budget.amountCents ? Math.round(Number(budget.amountCents) / 100) : '',
        currency: budget.currency ?? 'USD',
        period: budget.period ?? 'monthly',
        alertsEnabled: Boolean(budget.alertsEnabled),
        alertThresholdPercent: budget.alertThresholdPercent ?? 80,
        metadataCategory: budget.metadata?.category ?? ''
      });
    } else {
      setBudgetForm(DEFAULT_BUDGET_FORM);
    }
    setBudgetModalOpen(true);
  };

  const closeBudgetModal = () => {
    setBudgetModalOpen(false);
    setBudgetForm(DEFAULT_BUDGET_FORM);
  };

  const handleBudgetSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to manage budgets.' });
      return;
    }
    try {
      const payload = {
        name: budgetForm.name,
        amount: Number(budgetForm.amount ?? 0),
        currency: budgetForm.currency,
        period: budgetForm.period,
        alertsEnabled: budgetForm.alertsEnabled,
        alertThresholdPercent: Number(budgetForm.alertThresholdPercent ?? 80),
        metadata: budgetForm.metadataCategory
          ? { category: budgetForm.metadataCategory }
          : undefined
      };
      setPendingAction('budget');
      const response = budgetForm.id
        ? await updateFinanceBudget({ token, budgetId: budgetForm.id, payload })
        : await createFinanceBudget({ token, payload });
      const updatedBudget = response?.data ?? response;
      setBudgets((previous) => {
        const list = Array.isArray(previous) ? [...previous] : [];
        if (budgetForm.id) {
          return list.map((entry) => (entry.id === budgetForm.id ? updatedBudget : entry));
        }
        return [updatedBudget, ...list];
      });
      closeBudgetModal();
      setStatusMessage({
        type: 'success',
        message: budgetForm.id ? 'Budget updated.' : 'Budget created.'
      });
      refresh?.();
    } catch (budgetError) {
      setStatusMessage({
        type: 'error',
        message:
          budgetError instanceof Error
            ? budgetError.message
            : 'We could not save your budget. Check the details and try again.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleBudgetDelete = async (budgetId) => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to manage budgets.' });
      return;
    }
    try {
      setPendingAction(`delete-budget-${budgetId}`);
      await deleteFinanceBudget({ token, budgetId });
      setBudgets((previous) => previous.filter((budget) => budget.id !== budgetId));
      setStatusMessage({ type: 'success', message: 'Budget removed.' });
      refresh?.();
    } catch (removeError) {
      setStatusMessage({
        type: 'error',
        message:
          removeError instanceof Error
            ? removeError.message
            : 'We were unable to remove that budget. Please retry.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner workspace required"
        description="Switch to the learner dashboard to configure your preferences."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading personalised settings"
        description="Fetching finance and system preferences tailored to your account."
      />
    );
  }

  if (!settings) {
    return (
      <DashboardStateMessage
        title="Settings unavailable"
        description="We could not load your learner settings. Refresh to try again."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Settings</h1>
          <p className="dashboard-subtitle">
            Optimise your learning experience with precise control over accessibility, notifications, and
            finance automation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="dashboard-pill"
            onClick={() => {
              refreshSystemPreferences();
              refreshFinanceSettings();
              refresh?.();
            }}
          >
            Sync from cloud
          </button>
          <button
            type="button"
            className="dashboard-pill"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Back to top
          </button>
        </div>
      </div>

      {statusMessage ? (
        <div
          role="status"
          className={`rounded-2xl border p-4 text-sm shadow-sm ${
            statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-primary/30 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      <section className="dashboard-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">System preferences</h2>
            <p className="text-sm text-slate-600">
              Configure accessibility, localisation, and notification cadence across the learner experience.
            </p>
          </div>
          <span className="dashboard-kicker text-primary">Personalised</span>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSystemSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Language
              <select
                name="language"
                value={systemForm.language}
                onChange={handleSystemInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SUPPORTED_LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Region
              <input
                name="region"
                value={systemForm.region}
                onChange={handleSystemInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Time zone
              <select
                name="timezone"
                value={systemForm.timezone}
                onChange={handleSystemInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SUPPORTED_TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Email notifications</p>
                <p className="text-xs text-slate-500">Receive workflow, finance, and community alerts.</p>
              </div>
              <input
                type="checkbox"
                name="notificationsEnabled"
                checked={systemForm.notificationsEnabled}
                onChange={handleSystemInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Weekly digest</p>
                <p className="text-xs text-slate-500">Summarise learning progress and recommendations.</p>
              </div>
              <input
                type="checkbox"
                name="digestEnabled"
                checked={systemForm.digestEnabled}
                onChange={handleSystemInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Auto-play media</p>
                <p className="text-xs text-slate-500">Automatically start videos and podcasts.</p>
              </div>
              <input
                type="checkbox"
                name="autoPlayMedia"
                checked={systemForm.autoPlayMedia}
                onChange={handleSystemInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">High contrast</p>
                <p className="text-xs text-slate-500">Enhance contrast for improved readability.</p>
              </div>
              <input
                type="checkbox"
                name="highContrast"
                checked={systemForm.highContrast}
                onChange={handleSystemInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Reduce motion</p>
                <p className="text-xs text-slate-500">Minimise animations for sensitive users.</p>
              </div>
              <input
                type="checkbox"
                name="reducedMotion"
                checked={systemForm.reducedMotion}
                onChange={handleSystemInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Interface density
              <select
                name="preferences.interfaceDensity"
                value={systemForm.preferences.interfaceDensity}
                onChange={handleSystemInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {INTERFACE_DENSITIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Subtitle language
              <select
                name="preferences.subtitleLanguage"
                value={systemForm.preferences.subtitleLanguage}
                onChange={handleSystemInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SUPPORTED_LANGUAGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Audio description</p>
                <p className="text-xs text-slate-500">Enable descriptive narration in supported lessons.</p>
              </div>
              <input
                type="checkbox"
                name="preferences.audioDescription"
                checked={systemForm.preferences.audioDescription}
                onChange={handleSystemInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
              {pendingAction === 'system' ? 'Saving…' : 'Save system preferences'}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Finance settings</h2>
            <p className="text-sm text-slate-600">
              Control autopay, reserve strategy, and finance alerts. Keep your tuition and reimbursements on track.
            </p>
          </div>
          <button type="button" className="dashboard-pill" onClick={() => openBudgetModal()}>
            Add budget
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleFinanceSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Preferred currency
              <input
                name="currency"
                value={financeForm.currency}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Tax ID
              <input
                name="taxId"
                value={financeForm.taxId}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Invoice delivery
              <select
                name="invoiceDelivery"
                value={financeForm.invoiceDelivery}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="email">Email</option>
                <option value="portal">Portal only</option>
                <option value="email+portal">Email & portal</option>
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Payout schedule
              <select
                name="payoutSchedule"
                value={financeForm.payoutSchedule}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Reserve target (USD)
              <input
                type="number"
                name="reserveTarget"
                min="0"
                value={financeForm.reserveTarget}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Enable autopay</p>
                <p className="text-xs text-slate-500">Automatically settle invoices using the primary method.</p>
              </div>
              <input
                type="checkbox"
                name="autoPayEnabled"
                checked={financeForm.autoPayEnabled}
                onChange={handleFinanceInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Escalation email
              <input
                name="alerts.escalationEmail"
                value={financeForm.alerts.escalationEmail}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Email alerts</p>
                <p className="text-xs text-slate-500">Notify when budgets approach thresholds.</p>
              </div>
              <input
                type="checkbox"
                name="alerts.sendEmail"
                checked={financeForm.alerts.sendEmail}
                onChange={handleFinanceInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">SMS alerts</p>
                <p className="text-xs text-slate-500">Send urgent SMS notifications to finance partners.</p>
              </div>
              <input
                type="checkbox"
                name="alerts.sendSms"
                checked={financeForm.alerts.sendSms}
                onChange={handleFinanceInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Alert threshold (%)
              <input
                type="number"
                name="alerts.notifyThresholdPercent"
                min="1"
                max="100"
                value={financeForm.alerts.notifyThresholdPercent}
                onChange={handleFinanceInputChange}
                className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Enable reimbursements</p>
                <p className="text-xs text-slate-500">Allow learners to submit expense claims.</p>
              </div>
              <input
                type="checkbox"
                name="reimbursements.enabled"
                checked={financeForm.reimbursements.enabled}
                onChange={handleFinanceInputChange}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Reimbursement instructions
              <textarea
                name="reimbursements.instructions"
                value={financeForm.reimbursements.instructions}
                onChange={handleFinanceInputChange}
                rows="3"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6">
            <h3 className="text-base font-semibold text-slate-900">Budget allocations</h3>
            <p className="text-sm text-slate-600">
              Track tuition, mentorship, and operations budgets. Alerts trigger when spend crosses thresholds.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Budget</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-left">Alerts</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {budgets.length ? (
                    budgets.map((budget) => (
                      <tr key={budget.id} className="hover:bg-primary/5">
                        <td className="px-4 py-3 font-medium text-slate-900">{budget.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatBudgetAmount(budget.amountCents, budget.currency)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{budget.period}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {budget.alertsEnabled
                            ? `Alerts at ${budget.alertThresholdPercent}%`
                            : 'Alerts off'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="dashboard-pill px-3 py-1"
                              onClick={() => openBudgetModal(budget)}
                              disabled={disableActions}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="dashboard-pill px-3 py-1 text-rose-600"
                              onClick={() => handleBudgetDelete(budget.id)}
                              disabled={disableActions}
                            >
                              {pendingAction === `delete-budget-${budget.id}` ? 'Removing…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">
                        No budgets configured yet. Create a budget to track learning investments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-base font-semibold text-slate-900">Finance enablement tutorial</h3>
            <p className="mt-2 text-sm text-slate-600">
              Explore the finance cockpit, autopay automation, and reimbursement workflows in this three minute
              orientation.
            </p>
            <video
              className="mt-4 w-full rounded-2xl shadow-lg"
              controls
              preload="metadata"
              poster="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80"
            >
              <source
                src="https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
              {pendingAction === 'finance' ? 'Saving…' : 'Save finance settings'}
            </button>
          </div>
        </form>
      </section>

      {budgetModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">Budget workspace</p>
                <h3 className="text-xl font-semibold text-slate-900">
                  {budgetForm.id ? 'Edit budget allocation' : 'Create new budget'}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Track per-program spend and trigger proactive alerts for overruns.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closeBudgetModal}>
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleBudgetSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Name
                <input
                  name="name"
                  value={budgetForm.name}
                  onChange={handleBudgetFormChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Mentorship stipend"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Amount (in currency)
                  <input
                    type="number"
                    name="amount"
                    min="0"
                    value={budgetForm.amount}
                    onChange={handleBudgetFormChange}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Currency
                  <input
                    name="currency"
                    value={budgetForm.currency}
                    onChange={handleBudgetFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Period
                <select
                  name="period"
                  value={budgetForm.period}
                  onChange={handleBudgetFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {BUDGET_PERIODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">Enable alerts</p>
                  <p className="text-xs text-slate-500">Notify when spending reaches the configured threshold.</p>
                </div>
                <input
                  type="checkbox"
                  name="alertsEnabled"
                  checked={budgetForm.alertsEnabled}
                  onChange={handleBudgetFormChange}
                  className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Alert threshold (%)
                <input
                  type="number"
                  name="alertThresholdPercent"
                  min="1"
                  max="100"
                  value={budgetForm.alertThresholdPercent}
                  onChange={handleBudgetFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Category (optional)
                <input
                  name="metadataCategory"
                  value={budgetForm.metadataCategory}
                  onChange={handleBudgetFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" className="dashboard-pill" onClick={closeBudgetModal}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
                  {pendingAction === 'budget' ? 'Saving…' : budgetForm.id ? 'Save changes' : 'Create budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

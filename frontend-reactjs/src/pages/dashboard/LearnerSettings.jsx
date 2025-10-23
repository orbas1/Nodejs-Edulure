import { useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import SettingsLayout from '../../components/settings/SettingsLayout.jsx';
import SettingsToggleField from '../../components/settings/SettingsToggleField.jsx';
import SettingsAccordion from '../../components/settings/SettingsAccordion.jsx';
import SystemPreferencesPanel from '../../components/settings/SystemPreferencesPanel.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import useSystemPreferencesForm, {
  DEFAULT_SYSTEM_FORM,
  normaliseRecommendationPreview,
  normaliseRecommendedTopics
} from '../../hooks/useSystemPreferencesForm.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchFinanceSettings,
  updateFinanceSettings,
  createFinancePurchase,
  updateFinancePurchase,
  deleteFinancePurchase
} from '../../api/learnerDashboardApi.js';

const PURCHASE_STATUSES = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' }
];

const STATUS_BADGE_STYLES = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  refunded: 'bg-sky-100 text-sky-700',
  cancelled: 'bg-rose-100 text-rose-700'
};

const SUBSCRIPTION_STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-sky-100 text-sky-700',
  incomplete: 'bg-amber-100 text-amber-700',
  incomplete_expired: 'bg-rose-100 text-rose-700',
  past_due: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-200 text-slate-600',
  canceled: 'bg-slate-200 text-slate-600'
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

const DEFAULT_PURCHASE_FORM = {
  id: null,
  reference: '',
  description: '',
  amount: '',
  currency: 'USD',
  status: 'paid',
  purchasedAt: '',
  receiptUrl: ''
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatCurrencyAmount(amountCents, currency = 'USD') {
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

function toInputDateTime(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 16);
  } catch (_error) {
    return '';
  }
}

export default function LearnerSettings() {
  const { isLearner, section: settings, loading, error, refresh } = useLearnerDashboardSection('settings');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [financeForm, setFinanceForm] = useState(DEFAULT_FINANCE_FORM);
  const [purchases, setPurchases] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(DEFAULT_PURCHASE_FORM);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const {
    form: systemForm,
    setForm: setSystemForm,
    saving: systemSaving,
    refresh: refreshSystemPreferences,
    persist: persistSystemPreferences,
    handleInputChange: handleSystemInputChange,
    updateSystemToggle,
    updatePreferenceToggle,
    handleAdPersonalisationChange,
    recommendationPreview,
    recommendedTopicsInputValue,
    adPersonalisationEnabled
  } = useSystemPreferencesForm({
    token,
    onStatus: setStatusMessage,
    onAfterSave: () => refresh?.()
  });

  useEffect(() => {
    if (!settings?.system || !settings?.finance) {
      return;
    }
    const preferencesFromSettings = settings.system.preferences ?? {};
    const mergedPreferences = {
      ...DEFAULT_SYSTEM_FORM.preferences,
      ...preferencesFromSettings,
      recommendedTopics: normaliseRecommendedTopics(preferencesFromSettings.recommendedTopics),
      recommendationPreview: normaliseRecommendationPreview(preferencesFromSettings.recommendationPreview)
    };
    const normalisedSystem = {
      ...DEFAULT_SYSTEM_FORM,
      ...settings.system,
      preferences: mergedPreferences
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
    setPurchases(Array.isArray(settings.finance.purchases) ? settings.finance.purchases : []);
    setSubscriptions(Array.isArray(settings.finance.subscriptions) ? settings.finance.subscriptions : []);
  }, [settings?.system, settings?.finance]);

  useEffect(() => {
    if (error) {
      setStatusMessage({ type: 'error', message: error.message ?? 'Unable to load settings.' });
    }
  }, [error]);

  const disableActions = useMemo(() => pendingAction !== null || systemSaving, [pendingAction, systemSaving]);

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

  const updateFinanceToggle = (field, nextValue) => {
    setFinanceForm((previous) => ({
      ...previous,
      [field]: Boolean(nextValue)
    }));
  };

  const updateFinanceAlertsToggle = (field, nextValue) => {
    setFinanceForm((previous) => ({
      ...previous,
      alerts: {
        ...previous.alerts,
        [field]: Boolean(nextValue)
      }
    }));
  };

  const updateFinanceReimbursementsToggle = (field, nextValue) => {
    setFinanceForm((previous) => ({
      ...previous,
      reimbursements: {
        ...previous.reimbursements,
        [field]: Boolean(nextValue)
      }
    }));
  };

  const handlePurchaseFormChange = (event) => {
    const { name, value } = event.target;
    setPurchaseForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const statusBanner = useMemo(() => {
    if (!statusMessage) return undefined;
    const mappedType =
      statusMessage.type === 'error'
        ? 'error'
        : statusMessage.type === 'success'
          ? 'success'
          : statusMessage.type === 'pending'
            ? 'pending'
            : 'info';
    return {
      type: mappedType,
      message: statusMessage.message,
      role: statusMessage.type === 'error' ? 'alert' : 'status',
      liveRegion: statusMessage.type === 'error' ? 'assertive' : 'polite'
    };
  }, [statusMessage]);

  const refreshFinanceSettings = async () => {
    if (!token) return;
    const response = await fetchFinanceSettings({ token }).catch(() => null);
    if (response?.data) {
      const payload = response.data;
      setPurchases(Array.isArray(payload.purchases) ? payload.purchases : []);
      setSubscriptions(Array.isArray(payload.subscriptions) ? payload.subscriptions : []);
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

  const persistSystemPreferencesAction = async () => {
    try {
      setPendingAction('system');
      await persistSystemPreferences();
    } catch (_submitError) {
      // Error messaging handled by useSystemPreferencesForm.
    } finally {
      setPendingAction(null);
    }
  };

  const handleSystemSubmit = async (event) => {
    event.preventDefault();
    await persistSystemPreferencesAction();
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

  const openPurchaseModal = (purchase = null) => {
    if (purchase) {
      setPurchaseForm({
        id: purchase.id,
        reference: purchase.reference ?? '',
        description: purchase.description ?? '',
        amount: purchase.amountCents ? Math.round(Number(purchase.amountCents) / 100) : '',
        currency: purchase.currency ?? 'USD',
        status: purchase.status ?? 'paid',
        purchasedAt: toInputDateTime(purchase.purchasedAt),
        receiptUrl: purchase.metadata?.receiptUrl ?? purchase.metadata?.invoiceUrl ?? ''
      });
    } else {
      setPurchaseForm(DEFAULT_PURCHASE_FORM);
    }
    setPurchaseModalOpen(true);
  };

  const closePurchaseModal = () => {
    setPurchaseModalOpen(false);
    setPurchaseForm(DEFAULT_PURCHASE_FORM);
  };

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to manage purchases.' });
      return;
    }
    try {
      const payload = {
        reference: purchaseForm.reference,
        description: purchaseForm.description,
        amount: Number(purchaseForm.amount ?? 0),
        currency: purchaseForm.currency,
        status: purchaseForm.status,
        purchasedAt: purchaseForm.purchasedAt ? new Date(purchaseForm.purchasedAt).toISOString() : undefined,
        metadata: purchaseForm.receiptUrl ? { receiptUrl: purchaseForm.receiptUrl } : undefined
      };
      setPendingAction('purchase');
      const response = purchaseForm.id
        ? await updateFinancePurchase({ token, purchaseId: purchaseForm.id, payload })
        : await createFinancePurchase({ token, payload });
      const updatedPurchase = response?.data ?? response;
      setPurchases((previous) => {
        const list = Array.isArray(previous) ? [...previous] : [];
        if (purchaseForm.id) {
          return list.map((entry) => (entry.id === purchaseForm.id ? updatedPurchase : entry));
        }
        return [updatedPurchase, ...list];
      });
      closePurchaseModal();
      setStatusMessage({
        type: 'success',
        message: purchaseForm.id ? 'Purchase updated.' : 'Purchase recorded.'
      });
      refresh?.();
    } catch (purchaseError) {
      setStatusMessage({
        type: 'error',
        message:
          purchaseError instanceof Error
            ? purchaseError.message
            : 'We could not save your purchase. Check the details and try again.'
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handlePurchaseDelete = async (purchaseId) => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to manage purchases.' });
      return;
    }
    try {
      setPendingAction(`delete-purchase-${purchaseId}`);
      await deleteFinancePurchase({ token, purchaseId });
      setPurchases((previous) => previous.filter((purchase) => purchase.id !== purchaseId));
      setStatusMessage({ type: 'success', message: 'Purchase removed.' });
      refresh?.();
    } catch (removeError) {
      setStatusMessage({
        type: 'error',
        message:
          removeError instanceof Error
            ? removeError.message
            : 'We were unable to remove that purchase. Please retry.'
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
    <>
      <SettingsLayout
        eyebrow="Learner"
        title="Settings"
        description="Optimise your learning experience with precise control over accessibility, notifications, and finance automation."
        actions={
          <>
            <button
              type="button"
              className="dashboard-pill"
              onClick={() => {
                refreshSystemPreferences();
                refreshFinanceSettings();
                refresh?.();
              }}
              disabled={disableActions}
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
          </>
        }
        status={statusBanner}
      >
        <SystemPreferencesPanel
          form={systemForm}
          recommendationPreview={recommendationPreview}
          recommendedTopicsInputValue={recommendedTopicsInputValue}
          adPersonalisationEnabled={adPersonalisationEnabled}
          onSubmit={handleSystemSubmit}
          onSavePersonalisation={persistSystemPreferencesAction}
          onInputChange={handleSystemInputChange}
          onSystemToggle={updateSystemToggle}
          onPreferenceToggle={updatePreferenceToggle}
          onAdPersonalisationChange={handleAdPersonalisationChange}
          disableActions={disableActions}
          isSaving={pendingAction === 'system' || systemSaving}
        />

        <SettingsAccordion
          id="learner-finance"
          title="Finance settings"
          description="Control autopay, reserve strategy, and finance alerts."
          actions={
            <button
              type="button"
              className="dashboard-pill"
              data-testid="learner-finance-open-purchase"
              onClick={() => openPurchaseModal()}
              disabled={disableActions}
            >
              Log purchase
            </button>
          }
        >
          <form className="space-y-6" onSubmit={handleFinanceSubmit}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Finance controls</h3>
                <p className="text-sm text-slate-600">
                  Control autopay, reserve strategy, and finance alerts. Keep your tuition and reimbursements on track.
                </p>
              </div>
              <button
                type="button"
                className="dashboard-pill sm:hidden"
                data-testid="learner-finance-open-purchase-mobile"
                onClick={() => openPurchaseModal()}
                disabled={disableActions}
              >
                Log purchase
              </button>
            </div>

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
            <SettingsToggleField
              name="autoPayEnabled"
              label="Enable autopay"
              description="Automatically settle invoices using the primary method."
              checked={financeForm.autoPayEnabled}
              onChange={(value) => updateFinanceToggle('autoPayEnabled', value)}
              disabled={disableActions}
            />
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
            <SettingsToggleField
              name="alerts.sendEmail"
              label="Email alerts"
              description="Notify when purchases clear or invoices are overdue."
              checked={financeForm.alerts.sendEmail}
              onChange={(value) => updateFinanceAlertsToggle('sendEmail', value)}
              disabled={disableActions}
            />
            <SettingsToggleField
              name="alerts.sendSms"
              label="SMS alerts"
              description="Send urgent SMS notifications to finance partners."
              checked={financeForm.alerts.sendSms}
              onChange={(value) => updateFinanceAlertsToggle('sendSms', value)}
              disabled={disableActions}
            />
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
            <SettingsToggleField
              name="reimbursements.enabled"
              label="Enable reimbursements"
              description="Allow learners to submit expense claims."
              checked={financeForm.reimbursements.enabled}
              onChange={(value) => updateFinanceReimbursementsToggle('enabled', value)}
              disabled={disableActions}
            />
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
            <h3 className="text-base font-semibold text-slate-900">Purchase history</h3>
            <p className="text-sm text-slate-600">
              Review learning purchases, reimbursements, and shared receipts to maintain audit-ready records.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Purchased on</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchases.length ? (
                    purchases.map((purchase) => {
                      const receiptUrl = purchase.metadata?.receiptUrl ?? purchase.metadata?.invoiceUrl ?? null;
                      const statusStyle = STATUS_BADGE_STYLES[purchase.status] ?? 'bg-slate-200 text-slate-600';
                      return (
                        <tr key={purchase.id} className="hover:bg-primary/5">
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-slate-900">{purchase.reference}</div>
                            <div className="text-xs text-slate-500">{purchase.description}</div>
                            {receiptUrl ? (
                              <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
                              >
                                View receipt
                              </a>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrencyAmount(purchase.amountCents, purchase.currency)}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}
                            >
                              {(purchase.status ?? 'pending').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{purchase.purchasedAtLabel ?? 'Pending confirmation'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="dashboard-pill px-3 py-1"
                                onClick={() => openPurchaseModal(purchase)}
                                disabled={disableActions}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="dashboard-pill px-3 py-1 text-rose-600"
                                onClick={() => handlePurchaseDelete(purchase.id)}
                                disabled={disableActions}
                              >
                                {pendingAction === `delete-purchase-${purchase.id}` ? 'Removing…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">
                        No purchases logged yet. Record a purchase to keep your finance workspace in sync.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/70 p-6">
            <h3 className="text-base font-semibold text-slate-900">Subscriptions</h3>
            <p className="text-sm text-slate-600">
              Monitor active community memberships, renewal cadences, and payment providers.
            </p>
            {subscriptions.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {subscriptions.map((subscription) => {
                  const badgeStyle = SUBSCRIPTION_STATUS_STYLES[subscription.status] ?? 'bg-slate-200 text-slate-600';
                  const communityHref = subscription.community?.slug
                    ? `/communities/${subscription.community.slug}`
                    : subscription.community?.id
                      ? `/communities/${subscription.community.id}`
                      : null;
                  return (
                    <article key={subscription.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {subscription.plan?.name ?? 'Subscription'}
                          </p>
                          {subscription.community ? (
                            <p className="text-xs text-slate-500">{subscription.community.name}</p>
                          ) : null}
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyle}`}>
                          {(subscription.status ?? 'active').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>{subscription.plan?.priceFormatted ?? '—'}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{subscription.plan?.billingInterval ?? 'flexible cadence'}</span>
                        {subscription.provider ? (
                          <span className="hidden sm:inline">•</span>
                        ) : null}
                        {subscription.provider ? <span>{subscription.provider}</span> : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        Renewal {subscription.currentPeriodEndLabel ?? 'pending confirmation'}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {communityHref ? (
                          <a href={communityHref} className="font-medium text-primary hover:underline">
                            Visit community
                          </a>
                        ) : null}
                        {subscription.cancelAtPeriodEnd ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                            Cancels at period end
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No subscriptions yet. Join a community or bundle to see renewal details here.
              </p>
            )}
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
              <button type="submit" className="dashboard-primary-pill" disabled={pendingAction === 'finance'}>
                {pendingAction === 'finance' ? 'Saving…' : 'Save finance settings'}
              </button>
            </div>
          </form>
        </SettingsAccordion>
      </SettingsLayout>

      {purchaseModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="learner-purchase-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">Purchase workspace</p>
                <h3 id="learner-purchase-modal-title" className="text-xl font-semibold text-slate-900">
                  {purchaseForm.id ? 'Edit purchase record' : 'Log new purchase'}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Capture learner purchases, reimbursements, and attachments for finance reporting.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closePurchaseModal}>
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handlePurchaseSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Reference
                <input
                  name="reference"
                  value={purchaseForm.reference}
                  onChange={handlePurchaseFormChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Invoice #INV-2049"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Description
                <textarea
                  name="description"
                  value={purchaseForm.description}
                  onChange={handlePurchaseFormChange}
                  required
                  rows="3"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="January tutoring bundle"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Amount
                  <input
                    type="number"
                    name="amount"
                    min="0"
                    value={purchaseForm.amount}
                    onChange={handlePurchaseFormChange}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Currency
                  <input
                    name="currency"
                    value={purchaseForm.currency}
                    onChange={handlePurchaseFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Status
                  <select
                    name="status"
                    value={purchaseForm.status}
                    onChange={handlePurchaseFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {PURCHASE_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Purchased at
                  <input
                    type="datetime-local"
                    name="purchasedAt"
                    value={purchaseForm.purchasedAt}
                    onChange={handlePurchaseFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Receipt URL (optional)
                <input
                  name="receiptUrl"
                  value={purchaseForm.receiptUrl}
                  onChange={handlePurchaseFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="https://receipts.example.com/inv-2049.pdf"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" className="dashboard-pill" onClick={closePurchaseModal}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
                  {pendingAction === 'purchase' ? 'Saving…' : purchaseForm.id ? 'Save changes' : 'Log purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

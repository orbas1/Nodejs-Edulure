import { useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import SettingsLayout from '../../components/settings/SettingsLayout.jsx';
import SettingsToggleField from '../../components/settings/SettingsToggleField.jsx';
import SettingsAccordion from '../../components/settings/SettingsAccordion.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchFinanceSettings,
  fetchSystemPreferences,
  updateFinanceSettings,
  updateSystemPreferences,
  createFinancePurchase,
  updateFinancePurchase,
  deleteFinancePurchase
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

const DEFAULT_RECOMMENDED_TOPICS = Object.freeze([
  'community-building',
  'learner-success',
  'automation'
]);

const FALLBACK_RECOMMENDATION_PREVIEW = Object.freeze([
  {
    id: 'course-async-leadership',
    title: 'Design async learning rituals',
    category: 'Course',
    descriptor: 'Course • 6 lessons',
    imageUrl:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'community-cohort-kickoff',
    title: 'Launch your next cohort with confidence',
    category: 'Playbook',
    descriptor: 'Guide • 12 steps',
    imageUrl:
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'ops-automation',
    title: 'Automate learner check-ins',
    category: 'Workflow',
    descriptor: 'Automation • 4 rules',
    imageUrl:
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80'
  }
]);

const ADS_DATA_USAGE_COPY =
  'Edulure Ads only uses engagement trends inside your academy to match sponsored resources. Disable personalisation to limit sponsors to broad categories.';

function normaliseRecommendedTopics(value) {
  if (!value) {
    return [...DEFAULT_RECOMMENDED_TOPICS];
  }
  if (Array.isArray(value)) {
    return value
      .map((topic) => String(topic ?? '').trim())
      .filter((topic) => topic.length > 0)
      .slice(0, 6);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 6);
  }
  return [...DEFAULT_RECOMMENDED_TOPICS];
}

function normaliseRecommendationPreview(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => ({
      id: item?.id ?? `recommendation-${index}`,
      title: item?.title ?? 'Recommended resource',
      category: item?.category ?? item?.type ?? 'Course',
      descriptor: item?.descriptor ?? item?.subtitle ?? '',
      imageUrl: item?.imageUrl ?? item?.coverImage ?? '',
      route: item?.route ?? item?.href ?? null
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.title))
    .slice(0, 6);
}

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
    audioDescription: false,
    adPersonalisation: true,
    sponsoredHighlights: true,
    adDataUsageAcknowledged: false,
    recommendedTopics: DEFAULT_RECOMMENDED_TOPICS,
    recommendationPreview: []
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

  const [systemForm, setSystemForm] = useState(DEFAULT_SYSTEM_FORM);
  const [financeForm, setFinanceForm] = useState(DEFAULT_FINANCE_FORM);
  const [purchases, setPurchases] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(DEFAULT_PURCHASE_FORM);
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

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

  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);

  const handleSystemInputChange = (event) => {
    const { name, type, checked, value } = event.target;
    if (name.startsWith('preferences.')) {
      const key = name.split('.')[1];
      if (key === 'recommendedTopics') {
        setSystemForm((previous) => ({
          ...previous,
          preferences: {
            ...previous.preferences,
            recommendedTopics: normaliseRecommendedTopics(value)
          }
        }));
        return;
      }
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

  const handlePurchaseFormChange = (event) => {
    const { name, value } = event.target;
    setPurchaseForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const updateSystemToggle = (field, value) => {
    setSystemForm((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const updatePreferenceToggle = (field, value) => {
    setSystemForm((previous) => ({
      ...previous,
      preferences: {
        ...previous.preferences,
        [field]: value
      }
    }));
  };

  const handleAdPersonalisationChange = (value) => {
    setSystemForm((previous) => ({
      ...previous,
      preferences: {
        ...previous.preferences,
        adPersonalisation: value,
        adDataUsageAcknowledged: value ? true : false
      }
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

  const recommendationPreview = useMemo(() => {
    const previewItems = systemForm.preferences?.recommendationPreview ?? [];
    if (Array.isArray(previewItems) && previewItems.length > 0) {
      return previewItems;
    }
    return FALLBACK_RECOMMENDATION_PREVIEW;
  }, [systemForm.preferences?.recommendationPreview]);

  const recommendedTopicsInputValue = useMemo(() => {
    const topics = systemForm.preferences?.recommendedTopics ?? [];
    return Array.isArray(topics) ? topics.join(', ') : '';
  }, [systemForm.preferences?.recommendedTopics]);

  const adPersonalisationEnabled = Boolean(systemForm.preferences?.adPersonalisation);

  const refreshSystemPreferences = async () => {
    if (!token) return;
    const response = await fetchSystemPreferences({ token }).catch(() => null);
    if (response?.data) {
      const payload = response.data;
      const preferencesFromPayload = payload.preferences ?? {};
      setSystemForm({
        ...DEFAULT_SYSTEM_FORM,
        ...payload,
        preferences: {
          ...DEFAULT_SYSTEM_FORM.preferences,
          ...preferencesFromPayload,
          recommendedTopics: normaliseRecommendedTopics(preferencesFromPayload.recommendedTopics),
          recommendationPreview: normaliseRecommendationPreview(preferencesFromPayload.recommendationPreview)
        }
      });
    }
  };

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

  const persistSystemPreferences = async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to update your preferences.' });
      return;
    }
    try {
      setPendingAction('system');
      setStatusMessage({ type: 'pending', message: 'Saving system preferences…' });
      const { recommendationPreview, ...preferencesPayload } = systemForm.preferences;
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
          preferences: {
            ...preferencesPayload,
            recommendedTopics: normaliseRecommendedTopics(preferencesPayload.recommendedTopics),
            adDataUsageAcknowledged: preferencesPayload.adPersonalisation
              ? true
              : Boolean(preferencesPayload.adDataUsageAcknowledged)
          }
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

  const handleSystemSubmit = async (event) => {
    event.preventDefault();
    await persistSystemPreferences();
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
        <SettingsAccordion
          id="learner-system-preferences"
          title="System preferences"
          description="Configure accessibility, localisation, and notification cadence across the learner experience."
          actions={<span className="dashboard-kicker text-primary hidden sm:inline">Personalised</span>}
          defaultOpen
        >
          <form className="space-y-6" onSubmit={handleSystemSubmit}>
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
              <SettingsToggleField
                name="notificationsEnabled"
                label="Email notifications"
                description="Receive workflow, finance, and community alerts."
                checked={systemForm.notificationsEnabled}
                onChange={(value) => updateSystemToggle('notificationsEnabled', value)}
                disabled={pendingAction === 'system'}
              />
              <SettingsToggleField
                name="digestEnabled"
                label="Weekly digest"
                description="Summarise learning progress and recommendations."
                checked={systemForm.digestEnabled}
                onChange={(value) => updateSystemToggle('digestEnabled', value)}
                disabled={pendingAction === 'system'}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SettingsToggleField
                name="autoPlayMedia"
                label="Auto-play media"
                description="Automatically start videos and podcasts."
                checked={systemForm.autoPlayMedia}
                onChange={(value) => updateSystemToggle('autoPlayMedia', value)}
                disabled={pendingAction === 'system'}
              />
              <SettingsToggleField
                name="highContrast"
                label="High contrast"
                description="Enhance contrast for improved readability."
                checked={systemForm.highContrast}
                onChange={(value) => updateSystemToggle('highContrast', value)}
                disabled={pendingAction === 'system'}
              />
              <SettingsToggleField
                name="reducedMotion"
                label="Reduce motion"
                description="Minimise animations for sensitive users."
                checked={systemForm.reducedMotion}
                onChange={(value) => updateSystemToggle('reducedMotion', value)}
                disabled={pendingAction === 'system'}
              />
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
              <div className="self-stretch">
                <SettingsToggleField
                  name="preferences.audioDescription"
                  label="Audio description"
                  description="Enable descriptive narration in supported lessons."
                  checked={Boolean(systemForm.preferences.audioDescription)}
                  onChange={(value) => updatePreferenceToggle('audioDescription', value)}
                  disabled={pendingAction === 'system'}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="dashboard-primary-pill" disabled={pendingAction === 'system'}>
                {pendingAction === 'system' ? 'Saving…' : 'Save system preferences'}
              </button>
            </div>
          </form>
        </SettingsAccordion>

        <SettingsAccordion
          id="learner-personalisation"
          title="Personalisation"
          description="Tune recommendations, analytics consent, and sponsor visibility."
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recommended preview</h3>
              <p className="mt-2 text-sm text-slate-600">
                Learner dashboards surface these sample items to demonstrate how your academy will highlight relevant content.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendationPreview.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="overflow-hidden rounded-xl bg-slate-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="h-32 w-full object-cover" />
                      ) : (
                        <div className="flex h-32 items-center justify-center text-xs font-medium text-slate-500">
                          Preview
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.category}</p>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      {item.descriptor ? (
                        <p className="mt-1 text-xs text-slate-500">{item.descriptor}</p>
                      ) : null}
                    </div>
                    {item.route ? (
                      <a href={item.route} className="text-xs font-semibold text-primary hover:underline">
                        Open
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SettingsToggleField
                name="preferences.analyticsOptIn"
                label="Analytics insights"
                description="Share anonymous usage analytics to improve study guidance and community programming."
                checked={Boolean(systemForm.preferences.analyticsOptIn)}
                onChange={(value) => updatePreferenceToggle('analyticsOptIn', value)}
                disabled={pendingAction === 'system'}
              />
              <SettingsToggleField
                name="preferences.adPersonalisation"
                label="Personalised sponsors"
                description="Allow Edulure Ads to align sponsors with your learning interests."
                checked={adPersonalisationEnabled}
                onChange={handleAdPersonalisationChange}
                disabled={pendingAction === 'system'}
              />
              <SettingsToggleField
                name="preferences.sponsoredHighlights"
                label="Sponsored highlights"
                description="Feature partner resources inside recommendation carousels."
                checked={Boolean(systemForm.preferences.sponsoredHighlights)}
                onChange={(value) => updatePreferenceToggle('sponsoredHighlights', value)}
                disabled={pendingAction === 'system'}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600">
              {ADS_DATA_USAGE_COPY}
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Preferred recommendation topics
              <input
                name="preferences.recommendedTopics"
                value={recommendedTopicsInputValue}
                onChange={handleSystemInputChange}
                placeholder="community-building, automation, retention"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                disabled={pendingAction === 'system'}
              />
              <span className="text-xs text-slate-500">
                Separate topics with commas to tailor the learning spotlight.
              </span>
            </label>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Saving personalisation updates applies the same system preference controls.
              </p>
              <button
                type="button"
                className="dashboard-primary-pill"
                onClick={persistSystemPreferences}
                disabled={disableActions}
              >
                {pendingAction === 'system' ? 'Saving…' : 'Save personalisation'}
              </button>
            </div>
          </div>
        </SettingsAccordion>

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
                <p className="text-xs text-slate-500">Notify when purchases clear or invoices are overdue.</p>
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

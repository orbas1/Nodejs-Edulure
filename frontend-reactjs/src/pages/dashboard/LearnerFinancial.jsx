import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import {
  downloadInvoice,
  updateBillingPreferences,
  createPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LearnerFinancial() {
  const { isLearner, section: financial, refresh, loading, error } = useLearnerDashboardSection('financial');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentFormVisible, setPaymentFormVisible] = useState(false);
  const [paymentFormMode, setPaymentFormMode] = useState('create');
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentFormErrors, setPaymentFormErrors] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    label: '',
    brand: 'Card',
    last4: '',
    expiry: '',
    primary: false
  });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [billingContacts, setBillingContacts] = useState([]);
  const [billingContactFormVisible, setBillingContactFormVisible] = useState(false);
  const [billingContactFormErrors, setBillingContactFormErrors] = useState([]);
  const [billingContactForm, setBillingContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [autoPayLoading, setAutoPayLoading] = useState(false);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [reserveTarget, setReserveTarget] = useState(500);

  useEffect(() => {
    if (error) {
      setStatusMessage({
        type: 'error',
        message: error.message ?? 'We were unable to load billing insights.'
      });
    }
  }, [error]);

  useEffect(() => {
    setPaymentMethods(Array.isArray(financial?.paymentMethods) ? financial.paymentMethods : []);
  }, [financial?.paymentMethods]);

  useEffect(() => {
    setBillingContacts(Array.isArray(financial?.billingContacts) ? financial.billingContacts : []);
  }, [financial?.billingContacts]);

  useEffect(() => {
    setAutoPayEnabled(Boolean(financial?.preferences?.autoPay?.enabled));
    if (financial?.preferences?.reserveTarget != null) {
      const parsed = Number(financial.preferences.reserveTarget);
      if (!Number.isNaN(parsed)) {
        setReserveTarget(parsed);
      }
    }
  }, [financial?.preferences?.autoPay?.enabled, financial?.preferences?.reserveTarget]);

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to access tuition insights and invoice history."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading billing overview"
        description="We are synchronising invoices, scholarships, and mentorship credits."
      />
    );
  }

  if (!financial) {
    return (
      <DashboardStateMessage
        title="Financial insights unavailable"
        description="Your tuition and credit summaries have not been generated yet. Refresh to sync billing records."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summary = financial.summary ?? [];
  const invoices = financial.invoices ?? [];
  const filteredInvoices = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();
    const status = invoiceStatusFilter.toLowerCase();
    return invoices.filter((invoice) => {
      const matchesStatus = status === 'all' || (invoice.status ?? '').toLowerCase() === status;
      if (!matchesStatus) {
        return false;
      }
      if (!search) {
        return true;
      }
      const haystack = [invoice.label, invoice.amount, invoice.date, invoice.status]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return haystack.some((value) => value.includes(search));
    });
  }, [invoiceSearch, invoiceStatusFilter, invoices]);
  const hasFilteredInvoices = filteredInvoices.length > 0;
  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);
  const billingInsights = useMemo(() => {
    const paid = invoices.filter((invoice) => (invoice.status ?? '').toLowerCase() === 'paid');
    const outstanding = invoices.filter((invoice) => (invoice.status ?? '').toLowerCase() !== 'paid');
    const sumNumeric = (collection, keyCandidates) =>
      collection.reduce((total, item) => {
        const value = keyCandidates.reduce((accumulator, key) => {
          if (accumulator != null) {
            return accumulator;
          }
          const raw = item[key];
          if (raw == null) {
            return null;
          }
          const numeric = Number.parseFloat(raw);
          return Number.isNaN(numeric) ? null : numeric;
        }, null);
        return total + (value ?? 0);
      }, 0);
    const totalPaid = sumNumeric(paid, ['amount', 'total', 'amountPaid']);
    const totalOutstanding = sumNumeric(outstanding, ['amountDue', 'balance', 'amount']);
    const uniqueMonths = new Set();
    paid.forEach((invoice) => {
      if (!invoice.date) {
        return;
      }
      const parsed = new Date(invoice.date);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      uniqueMonths.add(`${parsed.getFullYear()}-${parsed.getMonth() + 1}`);
    });
    const averageMonthlySpend = uniqueMonths.size
      ? totalPaid / uniqueMonths.size
      : paid.length
        ? totalPaid / paid.length
        : 0;
    return {
      totalPaid,
      totalOutstanding,
      paidCount: paid.length,
      outstandingCount: outstanding.length,
      averageMonthlySpend
    };
  }, [invoices]);
  const forecast = useMemo(() => {
    const monthsValue = Number.parseInt(forecastMonths, 10);
    const months = Number.isFinite(monthsValue) && monthsValue > 0 ? monthsValue : 6;
    const projectedSpend = (billingInsights.averageMonthlySpend ?? 0) * months;
    const recommendedReserve = projectedSpend / 3;
    const reserveGap = Math.max(0, recommendedReserve - reserveTarget);
    return {
      months,
      projectedSpend: Math.round(projectedSpend * 100) / 100,
      reserveGap: Math.round(reserveGap * 100) / 100,
      recommendedReserve: Math.round(recommendedReserve * 100) / 100
    };
  }, [billingInsights.averageMonthlySpend, forecastMonths, reserveTarget]);

  const resetPaymentForm = useCallback(() => {
    setPaymentForm({
      label: '',
      brand: 'Card',
      last4: '',
      expiry: '',
      primary: false
    });
    setEditingPaymentId(null);
    setPaymentFormMode('create');
    setPaymentFormErrors([]);
  }, []);

  const closePaymentForm = useCallback(() => {
    setPaymentFormVisible(false);
    resetPaymentForm();
  }, [resetPaymentForm]);

  const openPaymentCreateForm = useCallback(() => {
    resetPaymentForm();
    setPaymentFormMode('create');
    setPaymentFormVisible(true);
  }, [resetPaymentForm]);

  const openPaymentEditForm = useCallback((method) => {
    setPaymentFormMode('edit');
    setEditingPaymentId(method.id);
    setPaymentForm({
      label: method.label ?? '',
      brand: method.brand ?? method.type ?? 'Card',
      last4: method.last4 ?? '',
      expiry: method.expiry ?? '',
      primary: Boolean(method.primary)
    });
    setPaymentFormVisible(true);
  }, []);

  const handlePaymentFormChange = useCallback((event) => {
    const { name, type, checked, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const validatePaymentForm = useCallback(() => {
    const errors = [];
    if (!paymentForm.label || paymentForm.label.trim().length < 3) {
      errors.push('Provide a recognizable label for this payment method.');
    }
    if (!paymentForm.last4 || paymentForm.last4.trim().length < 4) {
      errors.push('Include the last four digits for verification.');
    }
    if (!paymentForm.expiry) {
      errors.push('Set an expiry month to stay compliant.');
    }
    setPaymentFormErrors(errors);
    return errors.length === 0;
  }, [paymentForm]);

  const handlePaymentFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage payment methods.' });
        return;
      }
      if (!validatePaymentForm()) {
        return;
      }

      const payload = {
        label: paymentForm.label.trim(),
        brand: paymentForm.brand.trim(),
        last4: paymentForm.last4.trim().slice(-4),
        expiry: paymentForm.expiry,
        primary: Boolean(paymentForm.primary)
      };

      if (paymentFormMode === 'create') {
        setPendingAction('payment-create');
        setStatusMessage({ type: 'pending', message: `Adding ${payload.label}…` });
        try {
          const response = await createPaymentMethod({ token, payload });
          const method = response?.data ?? {};
          const newMethod = {
            id: method.id ?? `method-${Date.now()}`,
            label: method.label ?? payload.label,
            brand: method.brand ?? payload.brand,
            last4: method.last4 ?? payload.last4,
            expiry: method.expiry ?? payload.expiry,
            primary: Boolean(method.primary ?? payload.primary)
          };
          setPaymentMethods((current) => {
            const next = payload.primary
              ? current.map((item) => ({ ...item, primary: false }))
              : current;
            return [newMethod, ...next];
          });
          setStatusMessage({ type: 'success', message: `${newMethod.label} added to your wallet.` });
          closePaymentForm();
        } catch (createError) {
          setStatusMessage({
            type: 'error',
            message: createError instanceof Error ? createError.message : 'Unable to add this payment method.'
          });
        } finally {
          setPendingAction(null);
        }
        return;
      }

      setPendingAction(`payment-update-${editingPaymentId}`);
      setStatusMessage({ type: 'pending', message: `Updating ${payload.label}…` });
      try {
        await updatePaymentMethod({ token, methodId: editingPaymentId, payload });
        setPaymentMethods((current) =>
          current.map((method) =>
            method.id === editingPaymentId
              ? {
                  ...method,
                  label: payload.label,
                  brand: payload.brand,
                  last4: payload.last4,
                  expiry: payload.expiry,
                  primary: payload.primary
                }
              : payload.primary
                ? { ...method, primary: false }
                : method
          )
        );
        setStatusMessage({ type: 'success', message: `${payload.label} updated.` });
        closePaymentForm();
      } catch (updateError) {
        setStatusMessage({
          type: 'error',
          message: updateError instanceof Error ? updateError.message : 'Unable to update this payment method.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [
      closePaymentForm,
      createPaymentMethod,
      editingPaymentId,
      paymentForm,
      paymentFormMode,
      setPaymentMethods,
      token,
      updatePaymentMethod,
      validatePaymentForm
    ]
  );

  const handleRemovePaymentMethod = useCallback(
    async (method) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage payment methods.' });
        return;
      }
      setPendingAction(`payment-remove-${method.id}`);
      setStatusMessage({ type: 'pending', message: `Removing ${method.label}…` });
      try {
        await removePaymentMethod({ token, methodId: method.id });
        setPaymentMethods((current) => current.filter((item) => item.id !== method.id));
        setStatusMessage({ type: 'success', message: `${method.label} removed.` });
      } catch (removeError) {
        setStatusMessage({
          type: 'error',
          message: removeError instanceof Error ? removeError.message : 'Unable to remove this payment method.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [removePaymentMethod, setPaymentMethods, token]
  );

  const handleSetPrimaryMethod = useCallback(
    async (method) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage payment methods.' });
        return;
      }
      setPendingAction(`payment-primary-${method.id}`);
      setStatusMessage({ type: 'pending', message: `Marking ${method.label} as primary…` });
      try {
        await updatePaymentMethod({ token, methodId: method.id, payload: { primary: true } });
        setPaymentMethods((current) =>
          current.map((item) => ({ ...item, primary: item.id === method.id }))
        );
        setStatusMessage({ type: 'success', message: `${method.label} is now your primary method.` });
      } catch (primaryError) {
        setStatusMessage({
          type: 'error',
          message: primaryError instanceof Error ? primaryError.message : 'Unable to set primary method.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [setPaymentMethods, token, updatePaymentMethod]
  );

  const handleToggleAutoPay = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to update auto-pay preferences.' });
      return;
    }
    const nextValue = !autoPayEnabled;
    setAutoPayLoading(true);
    setStatusMessage({
      type: 'pending',
      message: nextValue ? 'Enabling auto-pay for your tuition plan…' : 'Disabling auto-pay…'
    });
    try {
      await updateBillingPreferences({ token, payload: { autoPay: { enabled: nextValue } } });
      setAutoPayEnabled(nextValue);
      setStatusMessage({
        type: 'success',
        message: nextValue ? 'Auto-pay enabled. We will collect on the due date automatically.' : 'Auto-pay disabled.'
      });
    } catch (toggleError) {
      setStatusMessage({
        type: 'error',
        message: toggleError instanceof Error ? toggleError.message : 'Unable to update auto-pay preferences.'
      });
    } finally {
      setAutoPayLoading(false);
    }
  }, [autoPayEnabled, token, updateBillingPreferences]);

  const handleReserveTargetChange = useCallback((event) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setReserveTarget(value);
    }
  }, []);

  const handleDownloadStatement = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to download your statement.' });
      return;
    }
    const [latest] = invoices;
    if (!latest) {
      setStatusMessage({ type: 'error', message: 'No invoices available to download yet.' });
      return;
    }

    setPendingAction('statement');
    setStatusMessage({ type: 'pending', message: 'Preparing your latest invoice download…' });
    try {
      const response = await downloadInvoice({ token, invoiceId: latest.id });
      const url = response?.data?.meta?.downloadUrl ?? null;
      setStatusMessage({
        type: 'success',
        message: url ? `Statement download ready at ${url}.` : response?.message ?? 'Statement download prepared.'
      });
    } catch (downloadError) {
      setStatusMessage({
        type: 'error',
        message:
          downloadError instanceof Error ? downloadError.message : 'We were unable to prepare your statement download.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [invoices, token]);

  const handleUpdateBilling = useCallback(async () => {
    if (!token) {
      setStatusMessage({ type: 'error', message: 'Sign in again to update billing preferences.' });
      return;
    }

    setPendingAction('billing');
    setStatusMessage({ type: 'pending', message: 'Saving billing preferences…' });
    try {
      const response = await updateBillingPreferences({
        token,
        payload: { autoRenew: true, paymentMethod: 'primary-card' }
      });
      setStatusMessage({
        type: 'success',
        message: response?.message ?? 'Billing preferences updated.'
      });
    } catch (updateError) {
      setStatusMessage({
        type: 'error',
        message:
          updateError instanceof Error ? updateError.message : 'We were unable to update your billing preferences.'
      });
    } finally {
      setPendingAction(null);
    }
  }, [token]);

  const handleInvoiceDownload = useCallback(
    async (invoice) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to download invoices.' });
        return;
      }

      setPendingAction(invoice.id);
      setStatusMessage({ type: 'pending', message: `Preparing download for ${invoice.label}…` });
      try {
        const response = await downloadInvoice({ token, invoiceId: invoice.id });
        const url = response?.data?.meta?.downloadUrl ?? null;
        setStatusMessage({
          type: 'success',
          message: url ? `Invoice ready at ${url}.` : response?.message ?? 'Invoice download prepared.'
        });
      } catch (downloadError) {
        setStatusMessage({
          type: 'error',
          message:
            downloadError instanceof Error ? downloadError.message : 'We were unable to download this invoice.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [token]
  );

  const openBillingContactForm = useCallback(() => {
    setBillingContactForm({ name: '', email: '', phone: '', company: '' });
    setBillingContactFormErrors([]);
    setBillingContactFormVisible(true);
  }, []);

  const closeBillingContactForm = useCallback(() => {
    setBillingContactFormVisible(false);
    setBillingContactFormErrors([]);
  }, []);

  const handleBillingContactFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setBillingContactForm((current) => ({ ...current, [name]: value }));
  }, []);

  const validateBillingContactForm = useCallback(() => {
    const errors = [];
    if (!billingContactForm.name || billingContactForm.name.trim().length < 3) {
      errors.push('Provide a contact name so the finance team knows who to reach.');
    }
    if (!billingContactForm.email || !billingContactForm.email.includes('@')) {
      errors.push('Enter a valid billing email address.');
    }
    setBillingContactFormErrors(errors);
    return errors.length === 0;
  }, [billingContactForm]);

  const handleBillingContactFormSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage billing contacts.' });
        return;
      }
      if (!validateBillingContactForm()) {
        return;
      }
      const contactPayload = {
        name: billingContactForm.name.trim(),
        email: billingContactForm.email.trim(),
        phone: billingContactForm.phone?.trim() || undefined,
        company: billingContactForm.company?.trim() || undefined
      };
      setPendingAction('billing-contact');
      setStatusMessage({ type: 'pending', message: `Saving ${contactPayload.name} as billing contact…` });
      try {
        const response = await updateBillingPreferences({
          token,
          payload: { billingContact: contactPayload }
        });
        const normalizedEmail = contactPayload.email.toLowerCase();
        const existingContact = billingContacts.find(
          (contact) => (contact.email ?? '').toLowerCase() === normalizedEmail
        );
        const responseContact = (() => {
          if (response?.data?.contact) {
            return response.data.contact;
          }
          if (Array.isArray(response?.data?.contacts)) {
            return response.data.contacts.find(
              (contact) => (contact.email ?? '').toLowerCase() === normalizedEmail
            );
          }
          if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            const candidate = response.data;
            if ('email' in candidate || 'name' in candidate) {
              return candidate;
            }
          }
          return null;
        })();
        const fallbackIdBase = normalizedEmail.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const savedContact = {
          id:
            responseContact?.id ??
            existingContact?.id ??
            (fallbackIdBase ? `contact-${fallbackIdBase}` : `contact-${Date.now()}`),
          name: responseContact?.name?.trim?.() || contactPayload.name,
          email: responseContact?.email?.trim?.() || contactPayload.email,
          phone: responseContact?.phone?.trim?.() || contactPayload.phone,
          company: responseContact?.company?.trim?.() || contactPayload.company
        };
        setBillingContacts((current) => {
          const normalizedSavedEmail = (savedContact.email ?? '').toLowerCase();
          const remaining = current.filter((contact) => {
            const matchesId = savedContact.id && contact.id === savedContact.id;
            const matchesEmail =
              normalizedSavedEmail && (contact.email ?? '').toLowerCase() === normalizedSavedEmail;
            return !matchesId && !matchesEmail;
          });
          return [savedContact, ...remaining];
        });
        setStatusMessage({
          type: 'success',
          message:
            response?.message ??
            `${savedContact.name} ${existingContact ? 'updated' : 'added'} as a billing contact.`
        });
        closeBillingContactForm();
      } catch (error) {
        setStatusMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to store billing contact details.'
        });
      } finally {
        setPendingAction(null);
      }
    },
    [
      billingContacts,
      closeBillingContactForm,
      billingContactForm,
      token,
      updateBillingPreferences,
      validateBillingContactForm
    ]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Financial overview</h1>
          <p className="dashboard-subtitle">Track course investments, mentorship credits, and scholarships.</p>
        </div>
        <button
          type="button"
          className="dashboard-primary-pill"
          onClick={handleDownloadStatement}
          disabled={disableActions}
        >
          Download statement
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="dashboard-section">
            <p className="dashboard-kicker">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{item.value}</p>
            <p className="mt-2 text-sm text-slate-600">{item.change}</p>
          </div>
        ))}
      </section>

      <section className="dashboard-section">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
            <p className="dashboard-kicker text-primary">Auto-pay management</p>
            <h2 className="text-lg font-semibold text-slate-900">Recurring tuition autopay</h2>
            <p className="mt-2 text-sm text-slate-600">
              Stay current on tuition by letting us debit your primary method automatically on the due date.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  autoPayEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {autoPayEnabled ? 'Auto-pay active' : 'Auto-pay off'}
              </span>
              <button
                type="button"
                className="dashboard-primary-pill"
                onClick={handleToggleAutoPay}
                disabled={autoPayLoading || disableActions}
              >
                {autoPayLoading ? 'Updating…' : autoPayEnabled ? 'Pause auto-pay' : 'Enable auto-pay'}
              </button>
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              <li>Paid invoices · {billingInsights.paidCount.toLocaleString()}</li>
              <li>Outstanding invoices · {billingInsights.outstandingCount.toLocaleString()}</li>
              <li>Total outstanding · {billingInsights.totalOutstanding.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
            <p className="dashboard-kicker text-slate-500">Cash flow planner</p>
            <h2 className="text-lg font-semibold text-slate-900">Forecast & reserve</h2>
            <p className="mt-2 text-sm text-slate-600">
              Project spend for the next {forecast.months} months and ensure you have at least a third of that value in reserve.
            </p>
            <label className="mt-4 block text-xs font-medium text-slate-600">
              Forecast horizon · {forecast.months} months
              <input
                type="range"
                min="3"
                max="12"
                value={forecastMonths}
                onChange={(event) => setForecastMonths(event.target.value)}
                className="mt-2 w-full"
              />
            </label>
            <label className="mt-4 block text-xs font-medium text-slate-600">
              Reserve target (USD)
              <input
                type="number"
                min="0"
                value={reserveTarget}
                onChange={handleReserveTargetChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
              <p>Projected spend · {forecast.projectedSpend.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</p>
              <p className="mt-1">
                Recommended reserve · {forecast.recommendedReserve.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </p>
              <p className="mt-1">
                Reserve gap · {forecast.reserveGap.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Invoices & renewals</h2>
            <p className="text-sm text-slate-600">Manage receipts, payment statuses, and auto-renew preferences.</p>
          </div>
          <button
            type="button"
            className="dashboard-pill"
            onClick={handleUpdateBilling}
            disabled={disableActions}
          >
            Update billing
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Outstanding</p>
            <p className="mt-2 text-xl font-semibold text-rose-700">
              {billingInsights.totalOutstanding.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </p>
            <p className="mt-1 text-xs text-rose-700/80">Across {billingInsights.outstandingCount} invoices.</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Paid to date</p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">
              {billingInsights.totalPaid.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">All recorded settlements.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg monthly spend</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {billingInsights.averageMonthlySpend.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </p>
            <p className="mt-1 text-xs text-slate-500">Based on your paid invoices.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Search invoices
            <input
              type="search"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
              placeholder="Search label or amount"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-slate-600">
            Status filter
            <select
              value={invoiceStatusFilter}
              onChange={(event) => setInvoiceStatusFilter(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <div className="flex items-end justify-end">
            <button
              type="button"
              className="dashboard-pill w-full justify-center px-4 py-2 text-xs"
              onClick={() => {
                setInvoiceSearch('');
                setInvoiceStatusFilter('all');
              }}
            >
              Reset filters
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {hasFilteredInvoices ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{invoice.label}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.amount}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.status}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() => handleInvoiceDownload(invoice)}
                        disabled={disableActions && pendingAction !== invoice.id}
                      >
                        {pendingAction === invoice.id ? 'Preparing…' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">
                    No invoices match your filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payment methods</h2>
            <p className="text-sm text-slate-600">Control settlement preferences and wallet fallbacks.</p>
          </div>
          <button type="button" className="dashboard-pill" onClick={openPaymentCreateForm} disabled={disableActions}>
            Add payment method
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <article
                key={method.id}
                className={`rounded-3xl border px-5 py-4 text-sm shadow-sm ${
                  method.primary ? 'border-primary/40 bg-primary/5' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{method.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {method.brand} •••• {method.last4} · Expires {method.expiry}
                    </p>
                  </div>
                  {method.primary ? (
                    <span className="dashboard-pill bg-primary text-white">Primary</span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <button
                    type="button"
                    className="dashboard-pill px-3 py-1"
                    onClick={() => openPaymentEditForm(method)}
                  >
                    Edit
                  </button>
                  {!method.primary ? (
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1"
                      onClick={() => handleSetPrimaryMethod(method)}
                      disabled={disableActions}
                    >
                      {pendingAction === `payment-primary-${method.id}` ? 'Updating…' : 'Set primary'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="dashboard-pill bg-rose-50 text-rose-600 hover:bg-rose-100"
                    onClick={() => handleRemovePaymentMethod(method)}
                    disabled={disableActions}
                  >
                    {pendingAction === `payment-remove-${method.id}` ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
              No saved payment methods yet. Add a card or bank profile to speed up future checkouts.
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Billing contacts</h2>
            <p className="text-sm text-slate-600">Route invoices and statements to the right finance partners.</p>
          </div>
          <button type="button" className="dashboard-pill" onClick={openBillingContactForm}>
            Add contact
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {billingContacts.length ? (
            billingContacts.map((contact) => (
              <div key={contact.id ?? contact.email} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                <p className="mt-1 text-xs text-slate-500">{contact.company ?? 'Independent'}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>Email · {contact.email}</p>
                  {contact.phone ? <p>Phone · {contact.phone}</p> : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
              No billing contacts yet. Add a finance representative to receive statements and renewal notices.
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-section grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="dashboard-kicker text-primary">Finance lab</p>
          <h2 className="text-xl font-semibold text-slate-900">Optimise your learning budget</h2>
          <p className="mt-2 text-sm text-slate-600">
            Watch a two-minute walkthrough on how top learners blend scholarships, credits, and auto-pay to stay current without
            compromising cash flow.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-slate-600">
            <li>Set reserve targets that mirror your projected spend.</li>
            <li>Automate approvals with billing contacts and smart reminders.</li>
            <li>Export insights to share with your finance partner.</li>
          </ul>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-3xl border border-slate-200 shadow-inner">
          <iframe
            title="Financial wellness tutorial"
            src="https://www.youtube.com/embed/5U7bI7pJcHc"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {paymentFormVisible ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">
                  {paymentFormMode === 'create' ? 'Add payment method' : 'Update payment method'}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {paymentFormMode === 'create'
                    ? 'Securely store a card or account for renewals'
                    : 'Refresh this billing method'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Details are tokenised and encrypted in transit to maintain compliance.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closePaymentForm}>
                Close
              </button>
            </div>

            {paymentFormErrors.length ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <ul className="list-disc space-y-1 pl-5">
                  {paymentFormErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={handlePaymentFormSubmit}>
              <label className="block text-sm font-medium text-slate-900">
                Label
                <input
                  type="text"
                  name="label"
                  value={paymentForm.label}
                  onChange={handlePaymentFormChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Corporate Visa"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-900">
                  Brand
                  <input
                    type="text"
                    name="brand"
                    value={paymentForm.brand}
                    onChange={handlePaymentFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-900">
                  Last four digits
                  <input
                    type="text"
                    name="last4"
                    value={paymentForm.last4}
                    onChange={handlePaymentFormChange}
                    maxLength="4"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="1234"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-900">
                Expiry month
                <input
                  type="month"
                  name="expiry"
                  value={paymentForm.expiry}
                  onChange={handlePaymentFormChange}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="primary"
                  checked={paymentForm.primary}
                  onChange={handlePaymentFormChange}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                />
                Use as primary method
              </label>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" className="dashboard-pill" onClick={closePaymentForm}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-pill" disabled={disableActions}>
                  {paymentFormMode === 'create' ? 'Add method' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {billingContactFormVisible ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker text-primary-dark">Billing contact</p>
                <h2 className="text-xl font-semibold text-slate-900">Share statements with your finance team</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Store who should receive renewal notices, invoices, and payment confirmations.
                </p>
              </div>
              <button type="button" className="dashboard-pill" onClick={closeBillingContactForm}>
                Close
              </button>
            </div>

            {billingContactFormErrors.length ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <ul className="list-disc space-y-1 pl-5">
                  {billingContactFormErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={handleBillingContactFormSubmit}>
              <label className="block text-sm font-medium text-slate-900">
                Name
                <input
                  type="text"
                  name="name"
                  value={billingContactForm.name}
                  onChange={handleBillingContactFormChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Finance lead"
                />
              </label>
              <label className="block text-sm font-medium text-slate-900">
                Email
                <input
                  type="email"
                  name="email"
                  value={billingContactForm.email}
                  onChange={handleBillingContactFormChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="finance@example.com"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-900">
                  Phone (optional)
                  <input
                    type="tel"
                    name="phone"
                    value={billingContactForm.phone}
                    onChange={handleBillingContactFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-900">
                  Company (optional)
                  <input
                    type="text"
                    name="company"
                    value={billingContactForm.company}
                    onChange={handleBillingContactFormChange}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" className="dashboard-pill" onClick={closeBillingContactForm}>
                  Cancel
                </button>
                <button type="submit" className="dashboard-primary-pill" disabled={pendingAction === 'billing-contact'}>
                  {pendingAction === 'billing-contact' ? 'Saving…' : 'Save contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}
    </div>
  );
}

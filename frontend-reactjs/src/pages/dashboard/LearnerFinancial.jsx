import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';
import { downloadInvoice, updateBillingPreferences } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LearnerFinancial() {
  const { isLearner, section: financial, refresh, loading, error } = useLearnerDashboardSection('financial');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (error) {
      setStatusMessage({
        type: 'error',
        message: error.message ?? 'We were unable to load billing insights.'
      });
    }
  }, [error]);

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
  const disableActions = useMemo(() => pendingAction !== null, [pendingAction]);

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
              {invoices.map((invoice) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

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

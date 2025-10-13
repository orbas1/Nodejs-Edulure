import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

export default function LearnerFinancial() {
  const { dashboard, refresh } = useOutletContext();
  const financial = dashboard?.financial;

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Financial overview</h1>
          <p className="dashboard-subtitle">Track course investments, mentorship credits, and scholarships.</p>
        </div>
        <button type="button" className="dashboard-primary-pill">
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
          <button type="button" className="dashboard-pill">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-primary/5">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{invoice.label}</td>
                  <td className="px-4 py-3 text-slate-600">{invoice.amount}</td>
                  <td className="px-4 py-3 text-slate-600">{invoice.status}</td>
                  <td className="px-4 py-3 text-slate-600">{invoice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

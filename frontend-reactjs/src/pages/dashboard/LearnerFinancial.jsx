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
          <h1 className="text-2xl font-semibold text-white">Financial overview</h1>
          <p className="mt-2 text-sm text-slate-400">Track course investments, mentorship credits, and scholarships.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
        >
          Download statement
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-sm text-slate-400">{item.change}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Invoices & renewals</h2>
            <p className="text-sm text-slate-400">Manage receipts, payment statuses, and auto-renew preferences.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-primary/40 hover:text-white"
          >
            Update billing
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-900/60">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 text-sm font-medium text-white">{invoice.label}</td>
                  <td className="px-4 py-3 text-slate-400">{invoice.amount}</td>
                  <td className="px-4 py-3 text-slate-400">{invoice.status}</td>
                  <td className="px-4 py-3 text-slate-400">{invoice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

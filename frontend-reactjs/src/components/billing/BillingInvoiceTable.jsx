import PropTypes from 'prop-types';

import { formatCurrencyFromMinorUnits } from '../../utils/currency.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function BillingInvoiceTable({ invoices, loading }) {
  const hasInvoices = Array.isArray(invoices) && invoices.length > 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Invoice history</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Recent billing documents</h3>
        <p className="mt-2 text-xs text-slate-500">
          Download paid invoices and monitor outstanding balances for finance reconciliation.
        </p>
      </header>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading invoices…</div>
      ) : null}

      {!loading && !hasInvoices ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No invoices available yet. Charges will appear here once your first billing cycle completes.
        </div>
      ) : null}

      {hasInvoices ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 text-slate-900">
                    <div className="font-semibold">{invoice.number ?? invoice.id}</div>
                    {invoice.downloadUrl ? (
                      <a
                        href={invoice.downloadUrl}
                        className="text-xs font-semibold text-primary hover:text-primary-dark"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download PDF
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{formatDate(invoice.issuedAt)}</td>
                  <td className="px-4 py-3">{formatDate(invoice.dueAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {invoice.amountDueCents
                      ? formatCurrencyFromMinorUnits(invoice.amountDueCents, invoice.currency)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {invoice.statusLabel ?? invoice.status ?? 'Unknown'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

BillingInvoiceTable.propTypes = {
  invoices: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      number: PropTypes.string,
      issuedAt: PropTypes.string,
      dueAt: PropTypes.string,
      amountDueCents: PropTypes.number,
      currency: PropTypes.string,
      status: PropTypes.string,
      statusLabel: PropTypes.string,
      downloadUrl: PropTypes.string
    })
  ),
  loading: PropTypes.bool
};

BillingInvoiceTable.defaultProps = {
  invoices: [],
  loading: false
};

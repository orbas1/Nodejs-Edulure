import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { ensureArray, ensureString } from '../utils.js';

function normaliseCards(cards) {
  return ensureArray(cards).map((card, index) => {
    const label = ensureString(card?.label, `Metric ${index + 1}`);
    const value = ensureString(card?.value, '—');
    const helper = ensureString(card?.helper);
    return { label, value, helper: helper || null };
  });
}

function normaliseBreakdown(entries) {
  return ensureArray(entries).map((entry, index) => ({
    label: ensureString(entry?.label, `Entry ${index + 1}`),
    value: ensureString(entry?.value, '—')
  }));
}

export default function AdminRevenueSection({ revenueCards, paymentHealthBreakdown, onExport }) {
  const cards = useMemo(() => normaliseCards(revenueCards), [revenueCards]);
  const paymentBreakdown = useMemo(() => normaliseBreakdown(paymentHealthBreakdown), [paymentHealthBreakdown]);

  return (
    <section id="revenue" className="grid gap-6 xl:grid-cols-5">
      <div className="dashboard-section xl:col-span-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Revenue performance</h2>
            <p className="text-sm text-slate-600">Recurring monetisation velocity across subscriptions and payments.</p>
          </div>
          <button
            type="button"
            className="dashboard-pill disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onExport}
            disabled={!onExport}
          >
            Export report
          </button>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</dt>
              <dd className="mt-2 text-lg font-semibold text-slate-900">{card.value}</dd>
              {card.helper ? <p className="mt-1 text-xs text-slate-500">{card.helper}</p> : null}
            </div>
          ))}
        </dl>
      </div>
      <div className="dashboard-section xl:col-span-2">
        <h3 className="text-lg font-semibold text-slate-900">Payment health</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {paymentBreakdown.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No payment telemetry available yet.
            </li>
          ) : (
            paymentBreakdown.map((entry) => (
              <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span>{entry.label}</span>
                <span className="font-semibold text-slate-900">{entry.value}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

AdminRevenueSection.propTypes = {
  revenueCards: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      helper: PropTypes.string
    })
  ).isRequired,
  paymentHealthBreakdown: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired,
  onExport: PropTypes.func
};

AdminRevenueSection.defaultProps = {
  onExport: undefined
};

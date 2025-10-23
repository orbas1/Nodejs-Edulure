import PropTypes from 'prop-types';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

function formatCurrency(cents, currency = 'USD') {
  if (!Number.isFinite(Number(cents))) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(0);
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(cents) / 100);
}

function TrendPill({ trend }) {
  if (!trend) {
    return null;
  }

  const isPositive = trend.direction === 'up';
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  const tone = isPositive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {trend.label}
    </span>
  );
}

TrendPill.propTypes = {
  trend: PropTypes.shape({
    direction: PropTypes.oneOf(['up', 'down']).isRequired,
    label: PropTypes.string.isRequired
  })
};

TrendPill.defaultProps = {
  trend: null
};

export default function AnalyticsSummaryCard({
  title,
  primaryValue,
  currency,
  netValue,
  trend,
  meta,
  footer
}) {
  const formattedPrimary = typeof primaryValue === 'number' && currency
    ? formatCurrency(primaryValue, currency)
    : primaryValue;
  const formattedNet = typeof netValue === 'number' && currency ? formatCurrency(netValue, currency) : netValue;

  return (
    <article className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{title}</p>
        <div className="flex flex-wrap items-end gap-3 text-slate-900">
          <h3 className="text-3xl font-semibold">{formattedPrimary}</h3>
          {formattedNet ? <span className="text-sm font-semibold text-slate-500">Net {formattedNet}</span> : null}
          <TrendPill trend={trend} />
        </div>
      </header>

      {meta?.length ? (
        <dl className="space-y-2 text-sm text-slate-600">
          {meta.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <dt className="font-medium text-slate-500">{item.label}</dt>
              <dd className="font-semibold text-slate-800">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {footer ? <p className="text-xs text-slate-500">{footer}</p> : null}
    </article>
  );
}

AnalyticsSummaryCard.propTypes = {
  title: PropTypes.string.isRequired,
  primaryValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  currency: PropTypes.string,
  netValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  trend: PropTypes.shape({
    direction: PropTypes.oneOf(['up', 'down']).isRequired,
    label: PropTypes.string.isRequired
  }),
  meta: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  ),
  footer: PropTypes.string
};

AnalyticsSummaryCard.defaultProps = {
  currency: null,
  netValue: null,
  trend: null,
  meta: [],
  footer: null
};

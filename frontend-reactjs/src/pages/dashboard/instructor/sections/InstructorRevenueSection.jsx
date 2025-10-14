import PropTypes from 'prop-types';

const PROGRESS_GRADIENTS = [
  'from-primary via-primary-dark to-primary-light',
  'from-emerald-500 via-emerald-400 to-emerald-300',
  'from-accent via-orange-500 to-amber-400',
  'from-indigo-500 via-sky-500 to-cyan-400'
];

function RevenueSliceRow({ slice, index }) {
  const gradient = PROGRESS_GRADIENTS[index % PROGRESS_GRADIENTS.length];
  const safePercent = Number.isFinite(slice.percent) ? Math.max(0, Math.min(100, slice.percent)) : 0;

  return (
    <li className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-inset ring-slate-100">
      <div className="flex items-center justify-between text-sm font-medium text-slate-900">
        <span>{slice.name}</span>
        <span className="text-slate-500">{slice.value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{ width: `${safePercent}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>Share of revenue</span>
        <span className="font-semibold text-slate-700">{safePercent}%</span>
      </div>
    </li>
  );
}

RevenueSliceRow.propTypes = {
  slice: PropTypes.shape({
    name: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    percent: PropTypes.number
  }).isRequired,
  index: PropTypes.number.isRequired
};

export default function InstructorRevenueSection({ revenueSlices }) {
  return (
    <section className="dashboard-section flex h-full flex-col justify-between lg:col-span-2">
      <div>
        <p className="dashboard-kicker">Revenue composition</p>
        <p className="mt-2 text-sm text-slate-600">
          Track how each monetisation stream contributes to your instructor run-rate across the last 30 days.
        </p>
      </div>

      {revenueSlices.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {revenueSlices.map((slice, index) => (
            <RevenueSliceRow key={slice.name} slice={slice} index={index} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          Connect Stripe or upload revenue exports to benchmark course sales, retainers, and sponsorship income.
        </div>
      )}
    </section>
  );
}

InstructorRevenueSection.propTypes = {
  revenueSlices: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  )
};

InstructorRevenueSection.defaultProps = {
  revenueSlices: []
};

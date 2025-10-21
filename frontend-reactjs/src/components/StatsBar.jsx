import PropTypes from 'prop-types';
import clsx from 'clsx';

const DEFAULT_STATS = [
  { label: 'Communities thriving', value: '168+' },
  { label: 'Creators monetising', value: '12k+' },
  { label: 'Average retention lift', value: '38%' },
  { label: 'Daily knowledge exchanges', value: '54k' }
];

export default function StatsBar({ stats = DEFAULT_STATS, className, eyebrow, headline }) {
  const resolvedStats = Array.isArray(stats) && stats.length ? stats : DEFAULT_STATS;

  return (
    <section
      className={clsx('border-y border-slate-200 bg-white', className)}
      aria-label="Edulure impact metrics"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
        {(eyebrow || headline) && (
          <header className="max-w-3xl space-y-1">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
            ) : null}
            {headline ? (
              <h2 className="text-2xl font-semibold text-slate-900">{headline}</h2>
            ) : null}
          </header>
        )}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {resolvedStats.map((stat) => (
            <div key={`${stat.label}-${stat.value}`} className="space-y-2">
              <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
              {stat.helper ? (
                <p className="text-xs text-slate-500">{stat.helper}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

StatsBar.propTypes = {
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      helper: PropTypes.string
    })
  ),
  className: PropTypes.string,
  eyebrow: PropTypes.string,
  headline: PropTypes.string
};

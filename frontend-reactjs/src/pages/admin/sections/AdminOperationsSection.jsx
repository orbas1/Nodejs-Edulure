import PropTypes from 'prop-types';

function StatList({ title, emptyLabel, entries }) {
  return (
    <div className="dashboard-section">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {entries.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            {emptyLabel}
          </li>
        ) : (
          entries.map((entry) => (
            <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span>{entry.label}</span>
              <span className="font-semibold text-slate-900">{entry.value}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

StatList.propTypes = {
  title: PropTypes.string.isRequired,
  emptyLabel: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired
};

export default function AdminOperationsSection({ sectionId, supportStats, riskStats, platformStats }) {
  return (
    <section id={sectionId} className="grid gap-6 lg:grid-cols-3">
      <StatList title="Support load" emptyLabel="No pending support indicators." entries={supportStats} />
      <StatList title="Risk &amp; trust" emptyLabel="No risk signals detected." entries={riskStats} />
      <StatList title="Platform snapshot" emptyLabel="No aggregate platform metrics available." entries={platformStats} />
    </section>
  );
}

AdminOperationsSection.propTypes = {
  sectionId: PropTypes.string,
  supportStats: PropTypes.arrayOf(PropTypes.object).isRequired,
  riskStats: PropTypes.arrayOf(PropTypes.object).isRequired,
  platformStats: PropTypes.arrayOf(PropTypes.object).isRequired
};

AdminOperationsSection.defaultProps = {
  sectionId: undefined
};

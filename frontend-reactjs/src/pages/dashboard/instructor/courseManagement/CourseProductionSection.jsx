import PropTypes from 'prop-types';

export default function CourseProductionSection({ production }) {
  const rows = Array.isArray(production)
    ? production.map((asset) => ({
        ...asset,
        owner: asset.owner ?? 'Production'
      }))
    : [];

  if (rows.length === 0) {
    return null;
  }

  const handleProductionAction = (asset) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('edulure:production-task', {
        detail: { taskId: asset.id, owner: asset.owner }
      })
    );
  };

  return (
    <section className="dashboard-section">
      <h2 className="text-lg font-semibold text-slate-900">Production sprint</h2>
      <ul className="mt-4 space-y-4">
        {rows.map((asset) => (
          <li key={asset.id} className="dashboard-card-muted p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{asset.status}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.asset}</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p>Owner {asset.owner}</p>
                <button
                  type="button"
                  className="mt-2 dashboard-pill px-3 py-1 hover:border-primary/50"
                  onClick={() => handleProductionAction(asset)}
                >
                  Open task
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

CourseProductionSection.propTypes = {
  production: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      status: PropTypes.string,
      asset: PropTypes.string,
      owner: PropTypes.string
    })
  )
};

CourseProductionSection.defaultProps = {
  production: []
};

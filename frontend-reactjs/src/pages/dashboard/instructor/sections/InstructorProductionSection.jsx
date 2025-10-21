import PropTypes from 'prop-types';
import { ArrowTopRightOnSquareIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const productionItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  owner: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  asset: PropTypes.string.isRequired,
  workspaceUrl: PropTypes.string
});

function resolveWorkspaceUrl(url) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.edulure.com';
    const parsed = new URL(url, origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch (error) {
    return null;
  }
}

function ProductionCard({ asset }) {
  const workspaceUrl = resolveWorkspaceUrl(asset.workspaceUrl);
  const canOpenWorkspace = Boolean(workspaceUrl);

  return (
    <li className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-inset ring-slate-100">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
        <span className="inline-flex items-center gap-1 text-slate-500">
          <UserCircleIcon className="h-4 w-4" />
          {asset.owner}
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">{asset.status}</span>
      </div>
      <p className="mt-3 text-base font-semibold text-slate-900">{asset.asset}</p>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-primary-dark disabled:cursor-not-allowed disabled:text-slate-400"
        onClick={() => {
          if (canOpenWorkspace) {
            window.open(workspaceUrl, '_blank', 'noopener');
          }
        }}
        disabled={!canOpenWorkspace}
      >
        Open Learnspace
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

ProductionCard.propTypes = {
  asset: productionItemPropType.isRequired
};

export default function InstructorProductionSection({ production }) {
  return (
    <section className="dashboard-section flex h-full flex-col">
      <div>
        <p className="dashboard-kicker">Production board</p>
        <p className="mt-2 text-sm text-slate-600">Give every asset owner clarity on deliverables, due dates, and approvals.</p>
      </div>

      {production.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {production.map((asset) => (
            <ProductionCard key={asset.id ?? asset.asset} asset={asset} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
          Assign production tasks from your course blueprint to orchestrate lesson filming, editing, and QA.
        </div>
      )}
    </section>
  );
}

InstructorProductionSection.propTypes = {
  production: PropTypes.arrayOf(productionItemPropType)
};

InstructorProductionSection.defaultProps = {
  production: []
};

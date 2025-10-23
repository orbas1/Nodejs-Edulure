import PropTypes from 'prop-types';

function ActionButton({ label, onAction, disabled }) {
  if (!onAction) {
    return null;
  }
  return (
    <button
      type="button"
      className="dashboard-pill px-3 py-1 text-xs"
      onClick={onAction}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

ActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  onAction: PropTypes.func,
  disabled: PropTypes.bool
};

ActionButton.defaultProps = {
  onAction: undefined,
  disabled: false
};

export default function CommunityDirectory({ communities, onAction, disabled }) {
  if (!Array.isArray(communities) || communities.length === 0) {
    return (
      <div className="dashboard-section">
        <p className="text-sm font-semibold text-slate-900">No communities assigned yet</p>
        <p className="mt-2 text-sm text-slate-600">
          Invite your team or switch roles to start curating learning communities for this Learnspace.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {communities.map((community) => (
        <article key={community.id} className="dashboard-section space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>{community.members} members</span>
            <span>Moderators {community.moderators}</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
              Health · {community.health}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{community.name}</h2>
            <p className="mt-2 text-sm text-slate-600">Operational initiatives keeping this community energised.</p>
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {Array.isArray(community.initiatives) && community.initiatives.length > 0 ? (
              community.initiatives.map((initiative) => (
                <li key={initiative} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {initiative}
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                No initiatives recorded yet
              </li>
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <ActionButton
              label="View analytics"
              onAction={onAction ? () => onAction(community, 'view-analytics') : undefined}
              disabled={disabled}
            />
            <ActionButton
              label="Automations"
              onAction={onAction ? () => onAction(community, 'automations') : undefined}
              disabled={disabled}
            />
            <ActionButton
              label="Export health report"
              onAction={onAction ? () => onAction(community, 'export-health-report') : undefined}
              disabled={disabled}
            />
            <ActionButton
              label="Open chat"
              onAction={onAction ? () => onAction(community, 'chat') : undefined}
              disabled={disabled}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

CommunityDirectory.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      members: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      moderators: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      health: PropTypes.string,
      initiatives: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  onAction: PropTypes.func,
  disabled: PropTypes.bool
};

CommunityDirectory.defaultProps = {
  communities: [],
  onAction: undefined,
  disabled: false
};

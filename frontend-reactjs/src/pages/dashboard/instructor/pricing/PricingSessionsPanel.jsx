import PropTypes from 'prop-types';

export default function PricingSessionsPanel({ sessions, onEditSessions }) {
  return (
    <div className="dashboard-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Live session pricing</h2>
        <button type="button" className="dashboard-pill px-3 py-1" onClick={onEditSessions}>
          Edit sessions
        </button>
      </div>
      {sessions.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {sessions.map((session) => (
            <li key={session.id} className="dashboard-card-muted p-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{session.status}</span>
                <span>{session.date}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{session.name}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span>Price {session.price}</span>
                <span>{session.seats}</span>
              </div>
              <div className="mt-4 flex gap-3 text-xs text-slate-600">
                <button type="button" className="dashboard-pill px-3 py-1">
                  Promote session
                </button>
                <button type="button" className="dashboard-pill px-3 py-1">
                  View roster
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No paid live sessions are scheduled.</p>
      )}
    </div>
  );
}

PricingSessionsPanel.propTypes = {
  sessions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      status: PropTypes.string,
      date: PropTypes.string,
      name: PropTypes.string,
      price: PropTypes.string,
      seats: PropTypes.string
    })
  ),
  onEditSessions: PropTypes.func
};

PricingSessionsPanel.defaultProps = {
  sessions: [],
  onEditSessions: undefined
};

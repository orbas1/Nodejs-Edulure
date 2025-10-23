import PropTypes from 'prop-types';

import SeverityBadge from './SeverityBadge.jsx';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function renderTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-slate-400">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function ModerationQueue({
  items,
  selectedId,
  onSelect,
  onQuickAction,
  loading,
  title,
  emptyState
}) {
  const queue = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{queue.length} cases</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-3">Severity</th>
              <th scope="col" className="px-4 py-3">Subject</th>
              <th scope="col" className="px-4 py-3">Reporter</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Updated</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {queue.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  {loading ? 'Loading moderation queue…' : emptyState}
                </td>
              </tr>
            ) : (
              queue.map((item) => (
                <tr
                  key={item.id}
                  className={classNames(
                    'cursor-pointer transition hover:bg-slate-50',
                    selectedId === item.id ? 'bg-slate-100' : ''
                  )}
                  onClick={() => onSelect?.(item)}
                >
                  <td className="px-4 py-4">
                    <SeverityBadge severity={item.severity}>{item.severity?.toUpperCase()}</SeverityBadge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">{item.subject}</p>
                      {item.summary ? <p className="text-xs text-slate-500">{item.summary}</p> : null}
                      {renderTags(item.tags)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">{item.reporter?.name ?? 'Member'}</p>
                      {item.reporter?.email ? (
                        <p className="text-slate-500">{item.reporter.email}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{item.updatedAt ?? item.createdAt ?? '—'}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {(item.quickActions ?? []).map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className={classNames(
                            'rounded-full px-3 py-1 text-xs font-semibold transition',
                            action.variant === 'primary'
                              ? 'bg-sky-600 text-white hover:bg-sky-700'
                              : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            onQuickAction?.(action.id, item);
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ModerationQueue.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      subject: PropTypes.string.isRequired,
      summary: PropTypes.string,
      reporter: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string
      }),
      severity: PropTypes.string,
      status: PropTypes.string,
      updatedAt: PropTypes.string,
      createdAt: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      quickActions: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          variant: PropTypes.oneOf(['primary', 'default'])
        })
      )
    })
  ),
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func,
  onQuickAction: PropTypes.func,
  loading: PropTypes.bool,
  title: PropTypes.string,
  emptyState: PropTypes.string
};

ModerationQueue.defaultProps = {
  items: [],
  selectedId: null,
  onSelect: undefined,
  onQuickAction: undefined,
  loading: false,
  title: 'Moderation queue',
  emptyState: 'No cases waiting for review.'
};

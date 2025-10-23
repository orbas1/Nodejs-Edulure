import PropTypes from 'prop-types';

import SeverityBadge from './SeverityBadge.jsx';

function renderLink(url) {
  if (!url) {
    return null;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
    >
      View policy
      <span aria-hidden="true">↗</span>
    </a>
  );
}

export default function ModerationChecklist({ items, onToggle, title }) {
  const checklist = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-500">{checklist.length} items</span>
      </div>
      {checklist.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
          No checklist items available.
        </p>
      ) : (
        <ul className="space-y-3">
          {checklist.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <label className="flex flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={Boolean(item.completedAt || item.done)}
                    onChange={() => onToggle?.(item)}
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      {item.severity ? <SeverityBadge severity={item.severity} /> : null}
                    </div>
                    {item.description ? (
                      <p className="text-xs text-slate-600">{item.description}</p>
                    ) : null}
                    {renderLink(item.url)}
                  </div>
                </label>
                {item.owner ? (
                  <div className="text-right text-xs text-slate-500">
                    <p className="font-medium text-slate-700">{item.owner}</p>
                    <p>Policy owner</p>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

ModerationChecklist.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      url: PropTypes.string,
      severity: PropTypes.string,
      owner: PropTypes.string,
      completedAt: PropTypes.string,
      done: PropTypes.bool
    })
  ),
  onToggle: PropTypes.func,
  title: PropTypes.string
};

ModerationChecklist.defaultProps = {
  items: [],
  onToggle: undefined,
  title: 'Policy checklist'
};

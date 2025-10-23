import PropTypes from 'prop-types';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function FilterChips({ groups, onToggle }) {
  if (!groups?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        if (!group.options?.length) {
          return null;
        }
        return (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                {group.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.options.slice(0, group.limit ?? 5).map((option) => (
                <button
                  key={`${group.key}-${option.value}`}
                  type="button"
                  onClick={() => onToggle(group.key, option.value)}
                  className={classNames(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition',
                    option.active
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary'
                  )}
                >
                  <span>{option.label}</span>
                  {typeof option.count === 'number' ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {option.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

FilterChips.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      limit: PropTypes.number,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          label: PropTypes.string.isRequired,
          count: PropTypes.number,
          active: PropTypes.bool
        })
      )
    })
  ),
  onToggle: PropTypes.func
};

FilterChips.defaultProps = {
  groups: [],
  onToggle: () => {}
};


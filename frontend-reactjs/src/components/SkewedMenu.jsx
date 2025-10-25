import PropTypes from 'prop-types';
import clsx from 'clsx';

const menuStates = {
  all: ['Communities', 'Classrooms', 'E-Books', 'Tutors', 'Dashboard'],
  community: ['Community', 'Classroom', 'Calendar', 'Members', 'Map', 'Leaderboards', 'About']
};

function resolveStateKey(state) {
  if (state && Object.hasOwn(menuStates, state)) {
    return state;
  }
  return 'all';
}

export default function SkewedMenu({ activeState = 'all', onSelect, activeItem, items }) {
  const stateKey = resolveStateKey(activeState);
  const resolvedItems = items?.length ? items : menuStates[stateKey];
  const ariaLabel = `${stateKey} navigation`;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/70">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 -skew-x-12 bg-primary/10" aria-hidden />
      <nav className="relative flex gap-3 overflow-x-auto py-4" aria-label={ariaLabel}>
        {resolvedItems.map((item) => {
          const isActive = activeItem === item;
          return (
            <button
              key={item}
              onClick={() => onSelect?.(item)}
              aria-pressed={isActive ? 'true' : 'false'}
              className={clsx(
                'rounded-full px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isActive ? 'bg-primary text-white shadow-card' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary'
              )}
            >
              {item}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

SkewedMenu.propTypes = {
  activeState: PropTypes.oneOfType([PropTypes.oneOf(Object.keys(menuStates)), PropTypes.string]),
  onSelect: PropTypes.func,
  activeItem: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.string)
};

SkewedMenu.defaultProps = {
  activeState: 'all',
  onSelect: undefined,
  activeItem: undefined,
  items: undefined
};

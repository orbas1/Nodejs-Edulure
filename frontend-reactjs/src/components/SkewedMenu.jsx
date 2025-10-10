import PropTypes from 'prop-types';
import clsx from 'clsx';

const menuStates = {
  all: ['Communities', 'Classrooms', 'E-Books', 'Tutors', 'Dashboard'],
  community: ['Community', 'Classroom', 'Calendar', 'Members', 'Map', 'Leaderboards', 'About']
};

export default function SkewedMenu({ activeState = 'all', onSelect, activeItem }) {
  const items = menuStates[activeState];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1/5 -skew-x-12 bg-primary/10" aria-hidden />
      <nav className="relative flex flex-wrap gap-3 py-4">
        {items.map((item) => {
          const isActive = activeItem === item;
          return (
            <button
              key={item}
              onClick={() => onSelect?.(item)}
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
  activeState: PropTypes.oneOf(Object.keys(menuStates)),
  onSelect: PropTypes.func,
  activeItem: PropTypes.string
};

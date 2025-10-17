import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

const itemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  end: PropTypes.bool
});

function DrawerSection({ section, isOpen, onToggle, onNavigate }) {
  return (
    <div key={section.id} className="space-y-2">
      <button
        type="button"
        className={`group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          isOpen ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
        onClick={() => onToggle(section.id)}
        aria-expanded={isOpen}
        aria-controls={`drawer-${section.id}`}
      >
        <span className="flex items-center gap-3">
          {section.icon ? (
            <section.icon className={`h-5 w-5 ${isOpen ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}`} />
          ) : null}
          {section.name}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-500 group-hover:text-slate-700'}`}
        />
      </button>
      <div
        id={`drawer-${section.id}`}
        className={`${
          isOpen ? 'max-h-[999px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        } overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200`}
      >
        <ul className="flex flex-col gap-1 px-2 py-3">
          {section.children.map((child) => {
            const Icon = child.icon;
            return (
              <li key={child.id}>
                <NavLink
                  to={child.to}
                  end={child.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-primary/5 hover:text-primary'
                    }`
                  }
                >
                  {Icon ? <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
                  <span>{child.name}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

DrawerSection.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    children: PropTypes.arrayOf(itemShape).isRequired
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onNavigate: PropTypes.func
};

DrawerSection.defaultProps = {
  onNavigate: undefined
};

export default function DashboardNavigation({ navigation, onNavigate }) {
  const location = useLocation();

  const drawerItems = useMemo(() => navigation.filter((item) => item.type === 'section'), [navigation]);
  const linkItems = useMemo(() => navigation.filter((item) => item.type === 'link'), [navigation]);

  const initialOpenState = useMemo(() => {
    const current = {};
    drawerItems.forEach((section) => {
      const isActive = section.children.some((child) =>
        matchPath({ path: child.to, end: child.end ?? false }, location.pathname)
      );
      current[section.id] = isActive;
    });
    return current;
  }, [drawerItems, location.pathname]);

  const [openSections, setOpenSections] = useState(initialOpenState);

  useEffect(() => {
    setOpenSections((state) => ({ ...state, ...initialOpenState }));
  }, [initialOpenState]);

  const handleToggle = (id) => {
    setOpenSections((state) => ({ ...state, [id]: !state[id] }));
  };

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-6">
      <div className="space-y-2">
        {linkItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`
              }
            >
              {Icon ? <Icon className={`h-5 w-5 ${item.iconTone ?? 'text-slate-500 group-hover:text-slate-700'}`} /> : null}
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
      <div className="space-y-4">
        {drawerItems.map((section) => (
          <DrawerSection
            key={section.id}
            section={section}
            isOpen={Boolean(openSections[section.id])}
            onToggle={handleToggle}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

DashboardNavigation.propTypes = {
  navigation: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['link', 'section']).isRequired,
      id: PropTypes.string.isRequired
    })
  ).isRequired,
  onNavigate: PropTypes.func
};

DashboardNavigation.defaultProps = {
  onNavigate: undefined
};

import PropTypes from 'prop-types';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bars3Icon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function AppSidebar({
  navigation,
  collapsed,
  onToggle,
  onNavigate,
  activePath,
  statusByRoute,
  pinnedIds
}) {
  const navigate = useNavigate();
  const handleNavigate = (path) => {
    if (!path) return;
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const renderLink = (item) => {
    return (
      <NavLink
        key={item.id}
        to={item.to}
        end={item.end}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey) return;
          event.preventDefault();
          handleNavigate(item.to);
        }}
        className={({ isActive }) =>
          clsx(
            'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            isActive || activePath.startsWith(item.to)
              ? 'bg-primary/10 text-primary'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          )
        }
        aria-current={activePath.startsWith(item.to) ? 'page' : undefined}
      >
        {item.icon ? <item.icon className="h-5 w-5" aria-hidden="true" /> : <Bars3Icon className="h-5 w-5" />}
        {!collapsed ? <span className="flex-1 truncate">{item.name}</span> : null}
        {!collapsed && statusByRoute[item.id] ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            {statusByRoute[item.id]}
          </span>
        ) : null}
      </NavLink>
    );
  };

  return (
    <aside
      className={clsx(
        'relative flex h-full flex-col border-r border-slate-200 bg-white/80 px-3 py-4 shadow-sm backdrop-blur',
        collapsed ? 'w-20' : 'w-72'
      )}
      aria-label="Workspace navigation"
    >
      <div className="flex items-center justify-between px-1">
        {!collapsed ? <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p> : null}
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
        >
          {collapsed ? <ChevronDoubleRightIcon className="h-4 w-4" /> : <ChevronDoubleLeftIcon className="h-4 w-4" />}
        </button>
      </div>
      <nav className="mt-4 space-y-6" aria-label="Workspace sections">
        {navigation.map((item) => {
          if (item.type === 'link') {
            return renderLink(item);
          }
          if (item.type === 'section') {
            const pinned = Array.isArray(pinnedIds) && pinnedIds.includes(item.id);
            return (
              <div key={item.id}>
                {!collapsed ? (
                  <div className="mb-2 flex items-center justify-between px-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.name}</p>
                    {pinned ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Pinned</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-1">
                  {item.children?.map((child) => renderLink(child))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </nav>
    </aside>
  );
}

AppSidebar.propTypes = {
  navigation: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['link', 'section']).isRequired,
      name: PropTypes.string,
      to: PropTypes.string,
      end: PropTypes.bool,
      icon: PropTypes.elementType,
      children: PropTypes.array
    })
  ).isRequired,
  collapsed: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onNavigate: PropTypes.func,
  activePath: PropTypes.string,
  statusByRoute: PropTypes.object,
  pinnedIds: PropTypes.arrayOf(PropTypes.string)
};

AppSidebar.defaultProps = {
  collapsed: false,
  onNavigate: null,
  activePath: '/',
  statusByRoute: {},
  pinnedIds: []
};


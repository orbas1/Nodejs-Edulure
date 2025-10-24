import { Fragment, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Menu, Transition } from '@headlessui/react';

const badgeShape = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.shape({
    label: PropTypes.node,
    tone: PropTypes.oneOf(['info', 'notice', 'success', 'alert', 'critical'])
  })
]);

const itemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  end: PropTypes.bool,
  badge: badgeShape
});

function resolveBadge(badge) {
  if (!badge) {
    return null;
  }
  if (typeof badge === 'string') {
    return { label: badge, tone: 'notice' };
  }
  return {
    label: badge.label ?? null,
    tone: badge.tone ?? 'notice'
  };
}

function toneToClassName(tone) {
  switch (tone) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'alert':
      return 'bg-amber-100 text-amber-700';
    case 'success':
      return 'bg-emerald-100 text-emerald-700';
    case 'notice':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function Badge({ badge }) {
  const resolved = resolveBadge(badge);
  if (!resolved?.label) {
    return null;
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneToClassName(resolved.tone)}`}>
      {resolved.label}
    </span>
  );
}

Badge.propTypes = {
  badge: badgeShape
};

Badge.defaultProps = {
  badge: null
};

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
                  <span className="flex flex-1 items-center gap-2">
                    {Icon ? <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
                    <span className="flex-1 truncate">{child.name}</span>
                    <Badge badge={child.badge} />
                  </span>
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
    badge: badgeShape,
    children: PropTypes.arrayOf(itemShape).isRequired
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onNavigate: PropTypes.func
};

DrawerSection.defaultProps = {
  onNavigate: undefined
};

function CollapsedDrawerSection({ section, onNavigate }) {
  const Icon = section.icon;
  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="group flex h-12 w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
        aria-label={section.name}
        title={section.name}
      >
        {Icon ? (
          <Icon className="h-6 w-6 text-slate-500 group-hover:text-slate-700" aria-hidden="true" />
        ) : (
          <span className="text-sm font-semibold">{section.name.charAt(0)}</span>
        )}
        <span className="sr-only">{section.name}</span>
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition duration-150 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-100 ease-in"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <Menu.Items className="absolute left-full top-1/2 z-50 w-64 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{section.name}</p>
            <Badge badge={section.badge} />
          </div>
          <div className="flex flex-col gap-1">
            {section.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <Menu.Item key={child.id}>
                  {({ close }) => (
                    <NavLink
                      to={child.to}
                      end={child.end}
                      onClick={() => {
                        if (typeof onNavigate === 'function') {
                          onNavigate();
                        }
                        close();
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 hover:bg-primary/5 hover:text-primary'
                        }`
                      }
                    >
                      <span className="flex flex-1 items-center gap-2">
                        {ChildIcon ? <ChildIcon className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
                        <span className="flex-1 truncate">{child.name}</span>
                        <Badge badge={child.badge} />
                      </span>
                    </NavLink>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

CollapsedDrawerSection.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    badge: badgeShape,
    children: PropTypes.arrayOf(itemShape).isRequired
  }).isRequired,
  onNavigate: PropTypes.func
};

CollapsedDrawerSection.defaultProps = {
  onNavigate: undefined
};

export default function DashboardNavigation({ navigation, onNavigate, isCollapsed }) {
  const drawerItems = useMemo(() => navigation.filter((item) => item.type === 'section'), [navigation]);
  const linkItems = useMemo(() => navigation.filter((item) => item.type === 'link'), [navigation]);

  const initialOpenState = useMemo(() => {
    const next = {};
    drawerItems.forEach((section) => {
      next[section.id] = true;
    });
    return next;
  }, [drawerItems]);

  const [openSections, setOpenSections] = useState(initialOpenState);

  useEffect(() => {
    setOpenSections(() => {
      const next = {};
      drawerItems.forEach((section) => {
        next[section.id] = true;
      });
      return next;
    });
  }, [drawerItems]);

  const handleToggle = (id) => {
    setOpenSections((state) => ({ ...state, [id]: !state[id] }));
  };

  const allOpen = useMemo(() => drawerItems.every((section) => openSections[section.id]), [
    drawerItems,
    openSections
  ]);

  const handleToggleAll = () => {
    setOpenSections(() => {
      const next = {};
      drawerItems.forEach((section) => {
        next[section.id] = !allOpen;
      });
      return next;
    });
  };

  const containerPadding = isCollapsed ? 'px-2 py-6' : 'px-4 py-6';
  const linkGap = isCollapsed ? 'gap-0 justify-center' : 'gap-3';
  const linkPadding = isCollapsed ? 'px-0 py-0 h-12' : 'px-4 py-3';

  return (
    <div className={`flex flex-1 flex-col gap-3 overflow-y-auto ${containerPadding}`}>
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
                `group flex w-full items-center ${linkGap} rounded-2xl ${linkPadding} text-sm font-semibold transition ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`
              }
              title={isCollapsed ? item.name : undefined}
            >
              {Icon ? (
                <Icon
                  className={`${
                    isCollapsed ? 'h-6 w-6' : 'h-5 w-5'
                  } ${item.iconTone ?? 'text-slate-500 group-hover:text-slate-700'}`}
                />
              ) : null}
              <span className={isCollapsed ? 'sr-only' : ''}>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
      {drawerItems.length > 0 && !isCollapsed ? (
        <div className="flex items-center justify-end px-1">
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs font-semibold text-primary transition hover:text-primary-dark"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      ) : null}
      <div className="space-y-4">
        {drawerItems.map((section) =>
          isCollapsed ? (
            <CollapsedDrawerSection key={section.id} section={section} onNavigate={onNavigate} />
          ) : (
            <DrawerSection
              key={section.id}
              section={section}
              isOpen={Boolean(openSections[section.id])}
              onToggle={handleToggle}
              onNavigate={onNavigate}
            />
          )
        )}
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
  onNavigate: PropTypes.func,
  isCollapsed: PropTypes.bool
};

DashboardNavigation.defaultProps = {
  onNavigate: undefined,
  isCollapsed: false
};

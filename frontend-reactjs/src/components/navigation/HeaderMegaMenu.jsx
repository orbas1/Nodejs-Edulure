import { Fragment, useMemo } from 'react';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router-dom';
import { Popover, Transition, Tab } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon, PlayCircleIcon } from '@heroicons/react/20/solid';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const megaMenuItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  to: PropTypes.string,
  end: PropTypes.bool,
  href: PropTypes.string,
  external: PropTypes.bool,
  icon: PropTypes.elementType,
  onClick: PropTypes.func,
  badge: PropTypes.string
});

function MegaMenuLink({ item }) {
  const linkContent = (isActive = false) => {
    const Icon = item.icon;
    return (
      <>
        {Icon ? (
          <Icon
            className={classNames(
              'h-5 w-5 flex-shrink-0 transition duration-200',
              isActive ? 'text-primary' : 'text-primary/60 group-hover:text-primary'
            )}
            aria-hidden="true"
          />
        ) : null}
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold">
            {item.name}
            {item.badge ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {item.badge}
              </span>
            ) : null}
          </span>
          {item.description ? (
            <span className="mt-1 text-xs text-slate-500 group-hover:text-slate-600">
              {item.description}
            </span>
          ) : null}
        </div>
        <ChevronRightIcon
          className={classNames(
            'ml-auto h-4 w-4 flex-shrink-0 transition duration-200',
            isActive ? 'text-primary' : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-primary'
          )}
          aria-hidden="true"
        />
      </>
    );
  };

  if (item.to) {
    return (
      <Popover.Button
        key={item.id ?? item.name}
        as={NavLink}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          classNames(
            'group flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
            isActive
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-slate-200 bg-white/80 text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
          )
        }
      >
        {({ isActive }) => linkContent(isActive)}
      </Popover.Button>
    );
  }

  if (item.href) {
    return (
      <Popover.Button
        key={item.id ?? item.name}
        as="a"
        href={item.href}
        target={item.external ? '_blank' : undefined}
        rel={item.external ? 'noreferrer' : undefined}
        className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {linkContent(false)}
      </Popover.Button>
    );
  }

  if (typeof item.onClick === 'function') {
    return (
      <Popover.Button
        key={item.id ?? item.name}
        as="button"
        type="button"
        onClick={item.onClick}
        className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {linkContent(false)}
      </Popover.Button>
    );
  }

  return null;
}

MegaMenuLink.propTypes = {
  item: megaMenuItemPropType.isRequired
};

const megaMenuSectionPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  caption: PropTypes.string,
  items: PropTypes.arrayOf(megaMenuItemPropType).isRequired
});

const megaMenuSectionsPropType = PropTypes.arrayOf(megaMenuSectionPropType);

function MegaMenuSections({ sections }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
            {section.caption ? <p className="mt-1 text-sm text-slate-500">{section.caption}</p> : null}
          </div>
          <div className="grid gap-2">
            {section.items.map((item) => (
              <MegaMenuLink key={item.id ?? item.name} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

MegaMenuSections.propTypes = {
  sections: megaMenuSectionsPropType.isRequired
};

const megaMenuQuickActionPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  to: PropTypes.string,
  href: PropTypes.string,
  external: PropTypes.bool,
  onClick: PropTypes.func,
  icon: PropTypes.elementType,
  badge: PropTypes.string,
  disabled: PropTypes.bool
});

function MegaMenuQuickActions({ actions }) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quick actions</p>
      <div className="grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              {Icon ? (
                <Icon
                  className={classNames(
                    'h-5 w-5 flex-shrink-0 transition duration-200',
                    action.disabled ? 'text-slate-400' : 'text-primary/70 group-hover:text-primary'
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-800">
                  {action.label}
                  {action.badge ? (
                    <span className="ml-2 inline-flex items-center rounded-full bg-slate-900/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                      {action.badge}
                    </span>
                  ) : null}
                </span>
                {action.description ? (
                  <span className="mt-1 text-xs text-slate-500">
                    {action.description}
                  </span>
                ) : null}
              </div>
              <ChevronRightIcon className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </>
          );

          if (action.to) {
            return (
              <Popover.Button
                key={action.id}
                as={NavLink}
                to={action.to}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {content}
              </Popover.Button>
            );
          }

          if (action.href) {
            return (
              <Popover.Button
                key={action.id}
                as="a"
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noreferrer' : undefined}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {content}
              </Popover.Button>
            );
          }

          return (
            <Popover.Button
              key={action.id}
              as="button"
              type="button"
              disabled={action.disabled}
              onClick={action.disabled ? undefined : action.onClick}
              className={classNames(
                'group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                action.disabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
              )}
            >
              {content}
            </Popover.Button>
          );
        })}
      </div>
    </div>
  );
}

MegaMenuQuickActions.propTypes = {
  actions: PropTypes.arrayOf(megaMenuQuickActionPropType)
};

MegaMenuQuickActions.defaultProps = {
  actions: []
};

function MegaMenuSpotlight({ spotlight }) {
  if (!spotlight) {
    return null;
  }

  const media = spotlight.media;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-2xl">
      <div className="relative aspect-video w-full">
        {media?.type === 'video' ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={media.poster}
          >
            <source src={media.src} type="video/mp4" />
          </video>
        ) : (
          <img src={media?.src} alt={media?.alt ?? spotlight.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
          {spotlight.label ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
              <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
              {spotlight.label}
            </span>
          ) : null}
          <p className="text-lg font-semibold leading-tight">{spotlight.title}</p>
          {spotlight.description ? (
            <p className="text-xs text-white/70">{spotlight.description}</p>
          ) : null}
          {spotlight.cta ? (
            <Popover.Button
              as={NavLink}
              to={spotlight.cta.to}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              {spotlight.cta.label}
            </Popover.Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

MegaMenuSpotlight.propTypes = {
  spotlight: PropTypes.shape({
    label: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    media: PropTypes.shape({
      type: PropTypes.oneOf(['image', 'video']),
      src: PropTypes.string,
      alt: PropTypes.string,
      poster: PropTypes.string
    }),
    cta: PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired
    })
  })
};

MegaMenuSpotlight.defaultProps = {
  spotlight: null
};

const tabShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  helper: PropTypes.string,
  sections: megaMenuSectionsPropType.isRequired
});

export default function HeaderMegaMenu({ item }) {
  const location = useLocation();
  const matches = item.matches ?? [];
  const isActive = useMemo(
    () => matches.some((matcher) => location.pathname.startsWith(matcher)),
    [matches, location.pathname]
  );

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={classNames(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition',
              open || isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
            )}
          >
            <span>{item.label}</span>
            <ChevronDownIcon
              className={classNames(
                'h-4 w-4 transition',
                open ? 'rotate-180 text-primary' : 'text-slate-400'
              )}
              aria-hidden="true"
            />
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute left-0 z-50 mt-6 w-[min(100vw-3rem,960px)] origin-top overflow-hidden rounded-4xl border border-slate-200 bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur 2xl:left-1/2 2xl:-translate-x-1/2">
              <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                  <div className="space-y-2">
                    {item.summary ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                        {item.summary}
                      </p>
                    ) : null}
                    <h3 className="text-2xl font-semibold text-slate-900">{item.heading ?? item.label}</h3>
                    {item.description ? (
                      <p className="text-sm text-slate-600">{item.description}</p>
                    ) : null}
                  </div>
                  {item.tabs && item.tabs.length > 0 ? (
                    <Tab.Group defaultIndex={0}>
                      <div className="space-y-4">
                        <Tab.List className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1 text-xs font-semibold text-slate-500">
                          {item.tabs.map((tab) => (
                            <Tab
                              key={tab.id}
                              className={({ selected }) =>
                                classNames(
                                  'rounded-full px-4 py-2 transition',
                                  selected
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'hover:bg-white/60 hover:text-primary'
                                )
                              }
                            >
                              {tab.label}
                            </Tab>
                          ))}
                        </Tab.List>
                        <Tab.Panels className="space-y-6">
                          {item.tabs.map((tab) => (
                            <Tab.Panel key={tab.id} className="space-y-4">
                              {tab.helper ? (
                                <p className="text-xs text-slate-500">{tab.helper}</p>
                              ) : null}
                              <MegaMenuSections sections={tab.sections} />
                            </Tab.Panel>
                          ))}
                        </Tab.Panels>
                      </div>
                    </Tab.Group>
                  ) : (
                    <MegaMenuSections sections={item.sections ?? []} />
                  )}
                </div>
                <div className="space-y-6">
                  <MegaMenuQuickActions actions={item.quickActions ?? []} />
                  <MegaMenuSpotlight spotlight={item.spotlight} />
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

HeaderMegaMenu.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    heading: PropTypes.string,
    summary: PropTypes.string,
    description: PropTypes.string,
    sections: megaMenuSectionsPropType,
    tabs: PropTypes.arrayOf(tabShape),
    quickActions: PropTypes.arrayOf(megaMenuQuickActionPropType),
    spotlight: MegaMenuSpotlight.propTypes.spotlight,
    matches: PropTypes.arrayOf(PropTypes.string)
  }).isRequired
};

import { useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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
  onClick: PropTypes.func,
  icon: PropTypes.elementType,
  badge: PropTypes.string,
  disabled: PropTypes.bool
});

const megaMenuSectionPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string.isRequired,
  caption: PropTypes.string,
  items: PropTypes.arrayOf(megaMenuItemPropType).isRequired
});

const megaMenuQuickActionPropType = megaMenuItemPropType;

function MobileMenuList({ sections, onNavigate }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">{section.title}</p>
            {section.caption ? (
              <p className="text-xs text-slate-500">{section.caption}</p>
            ) : null}
          </div>
          <ul className="space-y-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              const key = item.id ?? item.name;
              const content = (
                <div className="flex items-start gap-3">
                  {Icon ? <Icon className="h-5 w-5 flex-shrink-0 text-primary/60" aria-hidden="true" /> : null}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-800">
                      {item.name}
                      {item.badge ? (
                        <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {item.badge}
                        </span>
                      ) : null}
                    </p>
                    {item.description ? (
                      <p className="text-xs text-slate-500">{item.description}</p>
                    ) : null}
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </div>
              );

              if (item.to) {
                return (
                  <li key={key}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      onClick={() => onNavigate?.()}
                    >
                      {content}
                    </NavLink>
                  </li>
                );
              }

              if (item.href) {
                return (
                  <li key={key}>
                    <a
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noreferrer' : undefined}
                      className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      onClick={() => onNavigate?.()}
                    >
                      {content}
                    </a>
                  </li>
                );
              }

              if (typeof item.onClick === 'function') {
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.disabled) return;
                        item.onClick();
                        onNavigate?.();
                      }}
                      disabled={item.disabled}
                      className={classNames(
                        'flex w-full items-center rounded-2xl border px-4 py-3 text-sm transition',
                        item.disabled
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      {content}
                    </button>
                  </li>
                );
              }

              return null;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

MobileMenuList.propTypes = {
  sections: PropTypes.arrayOf(megaMenuSectionPropType).isRequired,
  onNavigate: PropTypes.func
};

MobileMenuList.defaultProps = {
  onNavigate: undefined
};

export default function MobileMegaMenu({ item, onNavigate }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((value) => !value);

  const sections = item.tabs && item.tabs.length > 0 ? item.tabs : null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
        aria-expanded={open}
      >
        <span>{item.label}</span>
        <ChevronDownIcon className={classNames('h-5 w-5 transition', open ? 'rotate-180 text-primary' : 'text-slate-400')} />
      </button>
      {open ? (
        <div className="mt-4 space-y-6">
          {item.summary ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{item.summary}</p>
          ) : null}
          {item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}
          {sections ? (
            sections.map((tab) => (
              <div key={tab.id} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{tab.label}</p>
                  {tab.helper ? <p className="text-xs text-slate-400">{tab.helper}</p> : null}
                </div>
                <MobileMenuList sections={tab.sections} onNavigate={onNavigate} />
              </div>
            ))
          ) : (
            <MobileMenuList sections={item.sections ?? []} onNavigate={onNavigate} />
          )}
          {item.quickActions && item.quickActions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</p>
              <div className="space-y-2">
                {item.quickActions.map((action) => {
                  const Icon = action.icon;
                  const content = (
                    <>
                      {Icon ? <Icon className="h-5 w-5 text-primary/70" aria-hidden="true" /> : null}
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                        {action.description ? (
                          <p className="text-xs text-slate-500">{action.description}</p>
                        ) : null}
                      </div>
                    </>
                  );

                  if (action.to) {
                    return (
                      <NavLink
                        key={action.id}
                        to={action.to}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        onClick={() => onNavigate?.()}
                      >
                        {content}
                      </NavLink>
                    );
                  }

                  if (action.href) {
                    return (
                      <a
                        key={action.id}
                        href={action.href}
                        target={action.external ? '_blank' : undefined}
                        rel={action.external ? 'noreferrer' : undefined}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        onClick={() => onNavigate?.()}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        if (action.disabled) return;
                        if (typeof action.onClick === 'function') {
                          action.onClick();
                        }
                        onNavigate?.();
                      }}
                      disabled={action.disabled}
                      className={classNames(
                        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition',
                        action.disabled
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {item.spotlight ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white">
              {item.spotlight.media?.type === 'video' ? (
                <video className="h-full w-full" autoPlay loop muted playsInline poster={item.spotlight.media.poster}>
                  <source src={item.spotlight.media.src} type="video/mp4" />
                </video>
              ) : (
                <img src={item.spotlight.media?.src} alt={item.spotlight.media?.alt ?? item.spotlight.title} className="h-full w-full object-cover" />
              )}
              <div className="space-y-2 p-4">
                <p className="text-sm font-semibold">{item.spotlight.title}</p>
                {item.spotlight.description ? (
                  <p className="text-xs text-white/70">{item.spotlight.description}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

MobileMegaMenu.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    summary: PropTypes.string,
    description: PropTypes.string,
    sections: PropTypes.arrayOf(megaMenuSectionPropType),
    tabs: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        helper: PropTypes.string,
        sections: PropTypes.arrayOf(megaMenuSectionPropType).isRequired
      })
    ),
    quickActions: PropTypes.arrayOf(megaMenuQuickActionPropType),
    spotlight: PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      media: PropTypes.shape({
        type: PropTypes.oneOf(['image', 'video']),
        src: PropTypes.string,
        alt: PropTypes.string,
        poster: PropTypes.string
      })
    })
  }).isRequired,
  onNavigate: PropTypes.func
};

MobileMegaMenu.defaultProps = {
  onNavigate: undefined
};

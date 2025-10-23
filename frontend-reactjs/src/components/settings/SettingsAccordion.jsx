import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function SettingsAccordion({
  id,
  title,
  description,
  actions,
  defaultOpen,
  leading,
  children
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  const titleContent = useMemo(() => {
    if (typeof title === 'string') {
      return <p className="text-base font-semibold text-slate-900">{title}</p>;
    }
    return title;
  }, [title]);

  return (
    <section id={id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:px-8"
          aria-expanded={open}
        >
          <div className="flex flex-1 items-start gap-3">
            {leading ? <div className="mt-1 flex-shrink-0">{leading}</div> : null}
            <div className="space-y-1">
              {titleContent}
              {description ? (
                typeof description === 'string' ? (
                  <p className="text-sm text-slate-600">{description}</p>
                ) : (
                  description
                )
              ) : null}
            </div>
          </div>
          <ChevronDownIcon
            className={clsx(
              'h-5 w-5 text-slate-500 transition-transform',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 px-6 pb-4 sm:pb-0 sm:pr-8 sm:pt-0">
            {actions}
          </div>
        ) : null}
      </header>
      {open ? (
        <div className="border-t border-slate-200 px-6 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      ) : null}
    </section>
  );
}

SettingsAccordion.propTypes = {
  id: PropTypes.string,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
  defaultOpen: PropTypes.bool,
  leading: PropTypes.node,
  children: PropTypes.node.isRequired
};

SettingsAccordion.defaultProps = {
  id: undefined,
  description: undefined,
  actions: undefined,
  defaultOpen: false,
  leading: undefined
};

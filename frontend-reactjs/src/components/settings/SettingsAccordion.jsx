import { useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function SettingsAccordion({
  id,
  title,
  description,
  actions,
  defaultOpen,
  children
}) {
  const autoId = useId();
  const sectionId = useMemo(() => id ?? `settings-accordion-${autoId}`, [id, autoId]);
  const headerId = `${sectionId}-header`;
  const panelId = `${sectionId}-panel`;
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <section
      id={sectionId}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      data-state={open ? 'open' : 'closed'}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:px-8"
          aria-expanded={open}
          aria-controls={panelId}
          id={headerId}
          data-state={open ? 'open' : 'closed'}
        >
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-900">{title}</p>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
          <ChevronDownIcon
            className={clsx(
              'h-5 w-5 text-slate-500 transition-transform',
              open ? 'rotate-180' : 'rotate-0'
            )}
          />
        </button>
        {actions ? (
          <div
            className={clsx(
              'flex flex-wrap items-center gap-2 px-6 pb-4 text-sm font-medium text-primary sm:self-stretch sm:border-l sm:pb-0 sm:pl-6 sm:pr-8',
              open ? 'sm:border-primary/20' : 'sm:border-slate-200'
            )}
            aria-label={`${title} actions`}
          >
            {actions}
          </div>
        ) : null}
      </header>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-slate-200 px-6 py-6 sm:px-8 sm:py-8"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

SettingsAccordion.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
  defaultOpen: PropTypes.bool,
  children: PropTypes.node.isRequired
};

SettingsAccordion.defaultProps = {
  id: undefined,
  description: undefined,
  actions: undefined,
  defaultOpen: false
};

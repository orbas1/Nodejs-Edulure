import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { useNavigationMetadata } from '../../context/NavigationMetadataContext.jsx';

function SectionCard({ section }) {
  const { id, label, initiative, originIds, quickAccess } = section;
  const operations = initiative.operations ?? { tasks: [] };
  const design = initiative.design ?? { tokens: [], qa: [], references: [] };
  const strategy = initiative.strategy ?? { narratives: [], metrics: [] };
  const product = initiative.product ?? { epicId: label, summary: '', impactedFiles: [] };

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur"
    >
      <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Annex anchor</p>
          <h2 id={`${id}-title`} className="text-2xl font-semibold text-slate-900">
            {label}
          </h2>
          {product.summary ? <p className="mt-2 text-sm text-slate-600">{product.summary}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {product.epicId}
            </span>
            {Array.from(originIds).map((originId) => (
              <span
                key={originId}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
                {originId}
              </span>
            ))}
          </div>
        </div>
        {quickAccess ? (
          <Link
            to={quickAccess}
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Open surface
          </Link>
        ) : null}
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product backlog</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-700">Epic:</span> {product.epicId}
              </li>
              {product.impactedFiles?.length ? (
                <li>
                  <span className="font-semibold text-slate-700">Impacted files:</span>
                  <ul className="mt-1 space-y-1 text-xs text-slate-500">
                    {product.impactedFiles.map((file) => (
                      <li key={file} className="truncate">
                        {file}
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
              {product.backlogRef ? (
                <li>
                  <Link className="font-semibold text-primary" to={product.backlogRef}>
                    Execution plan
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operations</h3>
            <ul className="mt-2 space-y-3 text-sm text-slate-600">
              {operations.tasks?.map((task) => (
                <li key={task.id} className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                  <p className="font-semibold text-slate-900">{task.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">Cadence: {task.cadence}</p>
                  {task.href ? (
                    <Link className="mt-2 inline-flex items-center text-xs font-semibold text-primary" to={task.href}>
                      Runbook
                    </Link>
                  ) : null}
                </li>
              ))}
              {operations.tasks?.length ? null : (
                <li className="rounded-2xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                  No operational follow-ups recorded.
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Design system</h3>
            {design.tokens?.length ? (
              <div className="flex flex-wrap gap-2">
                {design.tokens.map((token) => (
                  <code key={token} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow">
                    {token}
                  </code>
                ))}
              </div>
            ) : null}
            {design.qa?.length ? (
              <ul className="mt-3 space-y-2 text-xs text-slate-500">
                {design.qa.map((qa, index) => (
                  <li key={`${id}-qa-${index}`} className="leading-snug">
                    {qa}
                  </li>
                ))}
              </ul>
            ) : null}
            {design.references?.length ? (
              <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-400">
                References: {design.references.join(', ')}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strategy narrative</h3>
            <p className="text-sm text-slate-600">{strategy.narrative}</p>
            {strategy.metrics?.length ? (
              <ul className="mt-3 space-y-2 text-xs text-slate-500">
                {strategy.metrics.map((metric) => (
                  <li key={metric.id} className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-600">{metric.label}</span>
                    <span className="text-slate-500">
                      {metric.baseline} → {metric.target} {metric.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

SectionCard.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
    initiative: PropTypes.shape({
      product: PropTypes.object,
      operations: PropTypes.object,
      design: PropTypes.object,
      strategy: PropTypes.object
    }).isRequired,
    originIds: PropTypes.instanceOf(Set).isRequired,
    quickAccess: PropTypes.string
  }).isRequired
};

export default function NavigationAnnex() {
  const { initiatives, status, refresh } = useNavigationMetadata();
  const isLoading = status === 'loading';
  const hasError = status === 'error';

  const sections = useMemo(() => {
    const items = [...initiatives.primary, ...initiatives.quickActions, ...initiatives.dashboard];
    const sectionMap = new Map();

    items.forEach((item) => {
      if (!item?.initiative) {
        return;
      }
      const productRef = item.initiative.product?.backlogRef;
      const refHash = productRef && productRef.includes('#') ? productRef.split('#')[1] : null;
      const operationsAnchor = item.initiative.operations?.runbookSection;
      const slug = refHash ?? operationsAnchor ?? item.id;
      if (!sectionMap.has(slug)) {
        sectionMap.set(slug, {
          id: slug,
          label: item.label ?? item.name,
          initiative: item.initiative,
          originIds: new Set([item.id]),
          quickAccess: item.to
        });
      } else {
        sectionMap.get(slug).originIds.add(item.id);
      }
    });

    return Array.from(sectionMap.values());
  }, [initiatives]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-3 text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Annex A53–A56</p>
        <h1 className="text-3xl font-semibold text-slate-900">Navigation remediation annex</h1>
        <p className="text-sm text-slate-600">
          This handbook centralises the product, operations, design, and stakeholder mapping for the navigation and shell
          remediation programme described in <code>user_experience.md</code>.
        </p>
      </header>
      {isLoading ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
          Loading navigation annex records…
        </div>
      ) : null}
      {hasError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-600">
          Unable to load annex records.{' '}
          <button
            type="button"
            onClick={refresh}
            className="font-semibold text-rose-700 underline-offset-4 transition hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}
      <nav aria-label="Quick links" className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Anchors</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a className="text-sm font-semibold text-primary transition hover:text-primary/80" href={`#${section.id}`}>
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-8">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

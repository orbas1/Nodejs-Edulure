import PropTypes from 'prop-types';
import clsx from 'clsx';

function LearnerQuickAction({ action }) {
  const { label, description, href, ctaLabel } = action;
  const safeHref = typeof href === 'string' && href.length > 0 ? href : null;

  return (
    <div className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>

      {safeHref ? (
        <a
          href={safeHref}
          className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-dark"
        >
          {ctaLabel ?? 'Open'}
          <span aria-hidden="true" className="text-base leading-none">→</span>
        </a>
      ) : (
        <span className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-400">
          {ctaLabel ?? 'Unavailable'}
        </span>
      )}
    </div>
  );
}

LearnerQuickAction.propTypes = {
  action: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    href: PropTypes.string,
    ctaLabel: PropTypes.string
  }).isRequired
};

export default function LearnerQuickActionsSection({ actions, className }) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null;
  }

  return (
    <section className={clsx('dashboard-section rounded-3xl border border-slate-200/70 bg-slate-50/60 p-6', className)}>
      <p className="dashboard-kicker">Quick actions</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Jump back into your learning flow</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <li key={action.id} className="h-full">
            <LearnerQuickAction action={action} />
          </li>
        ))}
      </ul>
    </section>
  );
}

LearnerQuickActionsSection.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      href: PropTypes.string,
      ctaLabel: PropTypes.string
    })
  ),
  className: PropTypes.string
};

LearnerQuickActionsSection.defaultProps = {
  actions: [],
  className: ''
};

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const VARIANT_BG = {
  indigo: 'from-slate-950 via-indigo-950 to-slate-900',
  slate: 'from-slate-950 via-slate-900 to-slate-800'
};

function ActionButton({ action, variant }) {
  if (!action || !action.label) {
    return null;
  }

  const { to, href, onClick, label, icon: Icon, rel, target, ariaLabel } = action;
  const baseClass =
    'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-white shadow-[0_20px_40px_-24px_rgba(79,70,229,0.9)] hover:bg-primary-dark'
      : variant === 'secondary'
        ? 'border border-white/40 text-white hover:border-white hover:bg-white/10'
        : 'border border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25';

  const content = (
    <span className="inline-flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={clsx(baseClass, variantClass)} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href ?? '#'}
      onClick={onClick}
      className={clsx(baseClass, variantClass)}
      rel={rel}
      target={target}
      aria-label={ariaLabel}
    >
      {content}
    </a>
  );
}

ActionButton.propTypes = {
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    href: PropTypes.string,
    onClick: PropTypes.func,
    rel: PropTypes.string,
    target: PropTypes.string,
    icon: PropTypes.elementType,
    ariaLabel: PropTypes.string
  }),
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary']).isRequired
};

ActionButton.defaultProps = {
  action: undefined
};

export default function PrimaryHero({
  eyebrow,
  title,
  description,
  pills,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  headerSlot,
  mediaSlot,
  backgroundVariant,
  analyticsId
}) {
  const backgroundClass = VARIANT_BG[backgroundVariant] ?? VARIANT_BG.indigo;
  const pillItems = Array.isArray(pills) ? pills.filter(Boolean) : [];

  return (
    <section
      className={clsx(
        'relative overflow-hidden bg-gradient-to-br text-white',
        backgroundClass,
        analyticsId ? `analytics-section-${analyticsId}` : null
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 right-12 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/25 blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col gap-10 lg:w-1/2">
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] text-white/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {eyebrow ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.7rem] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {eyebrow}
              </span>
            ) : null}
            {headerSlot ? <div className="sm:ml-auto">{headerSlot}</div> : null}
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
            {description ? (
              <p className="max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8">{description}</p>
            ) : null}
          </div>
          {pillItems.length ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80 sm:gap-3">
              {pillItems.map((pill) => {
                const pillLabel = typeof pill === 'string' ? pill : pill?.label;
                if (!pillLabel) return null;
                return (
                  <span
                    key={pillLabel}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                    {pillLabel}
                  </span>
                );
              })}
            </div>
          ) : null}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <ActionButton action={primaryAction} variant="primary" />
            <ActionButton action={secondaryAction} variant="secondary" />
            <ActionButton action={tertiaryAction} variant="tertiary" />
          </div>
        </div>
        <div className="relative w-full lg:w-1/2">
          <div className="relative mx-auto max-w-xl">
            <span className="sr-only">Marketing illustration</span>
            <div className="absolute -left-16 -top-20 h-36 w-36 rounded-full bg-primary/40 blur-3xl" aria-hidden="true" />
            <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-emerald-500/30 blur-[140px]" aria-hidden="true" />
            <div className="absolute left-12 top-12 h-16 w-16 rounded-full border border-white/20" aria-hidden="true" />
            <div className="absolute right-10 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 shadow-lg backdrop-blur-md" aria-hidden="true">
              Flow
            </div>
            <div className="relative grid gap-6 rounded-[3rem] border border-white/10 bg-white/5 p-6 shadow-[0_40px_80px_-32px_rgba(15,23,42,0.7)] backdrop-blur-xl sm:p-8">
              {mediaSlot}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

PrimaryHero.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  pills: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({ label: PropTypes.string })])),
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    href: PropTypes.string,
    onClick: PropTypes.func,
    icon: PropTypes.elementType,
    rel: PropTypes.string,
    target: PropTypes.string,
    ariaLabel: PropTypes.string
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    href: PropTypes.string,
    onClick: PropTypes.func,
    icon: PropTypes.elementType,
    rel: PropTypes.string,
    target: PropTypes.string,
    ariaLabel: PropTypes.string
  }),
  tertiaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    to: PropTypes.string,
    href: PropTypes.string,
    onClick: PropTypes.func,
    icon: PropTypes.elementType,
    rel: PropTypes.string,
    target: PropTypes.string,
    ariaLabel: PropTypes.string
  }),
  headerSlot: PropTypes.node,
  mediaSlot: PropTypes.node,
  backgroundVariant: PropTypes.oneOf(['indigo', 'slate']),
  analyticsId: PropTypes.string
};

PrimaryHero.defaultProps = {
  eyebrow: undefined,
  description: undefined,
  pills: undefined,
  primaryAction: undefined,
  secondaryAction: undefined,
  tertiaryAction: undefined,
  headerSlot: null,
  mediaSlot: null,
  backgroundVariant: 'indigo',
  analyticsId: undefined
};

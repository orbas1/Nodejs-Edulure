import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

import { trackMarketingCta } from '../../lib/analytics.js';

const VARIANT_STYLES = {
  dark: {
    section: 'relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white',
    headline: 'text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl',
    subhead: 'mt-6 max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8',
    chip: 'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur',
    chipDot: 'h-2.5 w-2.5 rounded-full bg-emerald-400/90',
    badge: 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.7rem] font-semibold text-white/80',
    badgeDot: 'h-1.5 w-1.5 rounded-full bg-emerald-400',
    eyebrow: 'text-xs font-semibold uppercase tracking-[0.3em] text-white/60',
    primaryCta:
      'inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-24px_rgba(79,70,229,0.9)] transition hover:bg-primary-dark sm:w-auto',
    secondaryCta:
      'inline-flex w-full items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 sm:w-auto',
    tertiaryCta:
      'inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 sm:w-auto',
    meta: 'text-xs uppercase tracking-[0.2em] text-white/70',
    footer: 'relative border-t border-white/10 bg-white/5 px-6 py-6 text-sm text-white/80 backdrop-blur'
  },
  light: {
    section: 'relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900',
    headline: 'text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl',
    subhead: 'mt-6 max-w-xl text-base leading-7 text-slate-600 md:text-lg md:leading-8',
    chip: 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm',
    chipDot: 'h-2.5 w-2.5 rounded-full bg-emerald-500/80',
    badge: 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[0.7rem] font-semibold text-slate-600 shadow-sm',
    badgeDot: 'h-1.5 w-1.5 rounded-full bg-emerald-500/80',
    eyebrow: 'text-xs font-semibold uppercase tracking-[0.3em] text-slate-500',
    primaryCta:
      'inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark sm:w-auto',
    secondaryCta:
      'inline-flex w-full items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary sm:w-auto',
    tertiaryCta:
      'inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 sm:w-auto',
    meta: 'text-xs uppercase tracking-[0.2em] text-slate-500',
    footer: 'relative border-t border-slate-200 bg-white px-6 py-6 text-sm text-slate-600'
  }
};

function resolveVariant(variant) {
  return VARIANT_STYLES[variant] ?? VARIANT_STYLES.dark;
}

function CTA({ cta, surface, defaultClass, fallbackLabel, fallbackAction }) {
  if (!cta) {
    return null;
  }

  const { label, to, href, onClick, icon: Icon, analytics = {}, disabled, tone } = cta;
  const resolvedLabel = label ?? fallbackLabel;
  const classes = `${defaultClass}${tone ? ` ${tone}` : ''}`;

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    trackMarketingCta({
      surface,
      action: analytics.action ?? 'click',
      label: analytics.label ?? resolvedLabel,
      plan: analytics.plan,
      addon: analytics.addon,
      meta: analytics.meta
    });
    if (typeof onClick === 'function') {
      onClick(event);
    }
    if (typeof fallbackAction === 'function') {
      fallbackAction(event);
    }
  };

  if (to) {
    return (
      <Link to={to} className={classes} onClick={handleClick} aria-disabled={disabled}>
        {Icon ? <Icon className="mr-2 h-4 w-4" aria-hidden="true" /> : null}
        {resolvedLabel}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={handleClick}
        aria-disabled={disabled}
        target={cta.target ?? (href.startsWith('http') ? '_blank' : undefined)}
        rel={cta.rel ?? (href.startsWith('http') ? 'noopener noreferrer' : undefined)}
      >
        {Icon ? <Icon className="mr-2 h-4 w-4" aria-hidden="true" /> : null}
        {resolvedLabel}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={handleClick} disabled={disabled}>
      {Icon ? <Icon className="mr-2 h-4 w-4" aria-hidden="true" /> : null}
      {resolvedLabel}
    </button>
  );
}

CTA.propTypes = {
  cta: PropTypes.shape({
    label: PropTypes.string,
    to: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string,
    rel: PropTypes.string,
    onClick: PropTypes.func,
    icon: PropTypes.elementType,
    analytics: PropTypes.object,
    disabled: PropTypes.bool,
    tone: PropTypes.string
  }),
  surface: PropTypes.string.isRequired,
  defaultClass: PropTypes.string.isRequired,
  fallbackLabel: PropTypes.string,
  fallbackAction: PropTypes.func
};

CTA.defaultProps = {
  cta: null,
  fallbackLabel: 'Learn more',
  fallbackAction: undefined
};

export default function PrimaryHero({
  surface = 'home',
  variant = 'dark',
  eyebrow,
  badge,
  title,
  subtitle,
  chips = [],
  primaryCta,
  secondaryCta,
  tertiaryCta,
  onTertiaryAction,
  media,
  className = '',
  footer,
  meta,
  metaClassName,
  analytics = {}
}) {
  const styles = resolveVariant(variant);
  const mergedAnalytics = { surface, ...analytics };
  const metaClasses = metaClassName ?? styles.meta;

  return (
    <section className={`${styles.section} ${className}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 right-12 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/30 blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center">
        <div className="flex w-full flex-col gap-10 lg:w-1/2">
          <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {meta ? <div className={metaClasses}>{meta}</div> : null}
            {badge ? (
              <span className={styles.badge}>
                <span className={styles.badgeDot} />
                {badge}
              </span>
            ) : null}
          </div>
          <div>
            {eyebrow ? (
              <p className={styles.eyebrow}>{eyebrow}</p>
            ) : null}
            <h1 className={styles.headline}>{title}</h1>
            {subtitle ? <p className={styles.subhead}>{subtitle}</p> : null}
          </div>
          {chips.length ? (
            <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
              {chips.map((chip) => {
                const content = typeof chip === 'string' ? chip : chip?.label;
                if (!content) {
                  return null;
                }
                return (
                  <span key={content} className={styles.chip}>
                    <span className={styles.chipDot} />
                    {content}
                  </span>
                );
              })}
            </div>
          ) : null}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <CTA
              cta={primaryCta}
              surface={surface}
              defaultClass={styles.primaryCta}
              fallbackLabel="Get started"
              fallbackAction={() => trackMarketingCta({ ...mergedAnalytics, action: 'click', label: 'primary_cta' })}
            />
            <CTA
              cta={secondaryCta}
              surface={surface}
              defaultClass={styles.secondaryCta}
              fallbackLabel="Preview"
              fallbackAction={() => trackMarketingCta({ ...mergedAnalytics, action: 'click', label: 'secondary_cta' })}
            />
            <CTA
              cta={tertiaryCta}
              surface={surface}
              defaultClass={styles.tertiaryCta}
              fallbackLabel="Tell me more"
              fallbackAction={onTertiaryAction}
            />
          </div>
        </div>
        <div className="relative w-full lg:w-1/2">
          <div className="relative mx-auto max-w-xl">
            {media}
          </div>
        </div>
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}

PrimaryHero.propTypes = {
  surface: PropTypes.string,
  variant: PropTypes.oneOf(Object.keys(VARIANT_STYLES)),
  eyebrow: PropTypes.string,
  badge: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  chips: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({ label: PropTypes.string.isRequired })
    ])
  ),
  primaryCta: PropTypes.object,
  secondaryCta: PropTypes.object,
  tertiaryCta: PropTypes.object,
  onTertiaryAction: PropTypes.func,
  media: PropTypes.node,
  className: PropTypes.string,
  footer: PropTypes.node,
  meta: PropTypes.node,
  metaClassName: PropTypes.string,
  analytics: PropTypes.object
};

PrimaryHero.defaultProps = {
  surface: 'home',
  variant: 'dark',
  eyebrow: null,
  badge: null,
  subtitle: null,
  chips: [],
  primaryCta: null,
  secondaryCta: null,
  tertiaryCta: null,
  onTertiaryAction: undefined,
  media: null,
  className: '',
  footer: null,
  meta: null,
  metaClassName: null,
  analytics: {}
};

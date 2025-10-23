import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import HomeSection from '../home/HomeSection.jsx';

export default function MarketingHero({
  eyebrow,
  statusLabel,
  languageSelector,
  chips,
  headline,
  subheadline,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  rightPanel
}) {
  const chipItems = Array.isArray(chips) ? chips.filter(Boolean) : [];

  return (
    <section className="marketing-hero">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-0 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-40 right-12 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/30 blur-[160px]" />
        <div className="absolute bottom-10 left-1/3 h-60 w-60 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <HomeSection className="relative flex flex-col gap-12 lg:flex-row lg:items-center" size="wide">
        <div className="flex w-full flex-col gap-10 lg:w-1/2">
          {(statusLabel || languageSelector?.desktop) && (
            <div className="flex flex-col gap-3 text-xs uppercase tracking-[0.2em] text-white/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              {statusLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[0.7rem] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {statusLabel}
                </span>
              ) : null}
              {languageSelector?.desktop ? (
                <span className="hidden sm:inline-flex">{languageSelector.desktop}</span>
              ) : null}
            </div>
          )}
          {languageSelector?.mobile ? (
            <div className="sm:hidden">{languageSelector.mobile}</div>
          ) : null}
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">{eyebrow}</p>
            ) : null}
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{headline}</h1>
            {subheadline ? (
              <p className="mt-6 max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8">{subheadline}</p>
            ) : null}
          </div>
          {chipItems.length ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80 sm:gap-3">
              {chipItems.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            {primaryAction ? (
              <Link
                to={primaryAction.to}
                className={clsx('cta-button cta-button--primary w-full sm:w-auto')}
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                className={clsx('cta-button cta-button--secondary w-full sm:w-auto')}
              >
                {secondaryAction.label}
              </Link>
            ) : null}
            {tertiaryAction ? (
              <a
                href={tertiaryAction.href}
                className={clsx('cta-button cta-button--tertiary w-full sm:w-auto text-xs')}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {tertiaryAction.label}
              </a>
            ) : null}
          </div>
        </div>
        <div className="relative w-full lg:w-1/2">
          {rightPanel}
        </div>
      </HomeSection>
    </section>
  );
}

MarketingHero.propTypes = {
  eyebrow: PropTypes.string,
  statusLabel: PropTypes.string,
  languageSelector: PropTypes.shape({
    desktop: PropTypes.node,
    mobile: PropTypes.node
  }),
  chips: PropTypes.arrayOf(PropTypes.string),
  headline: PropTypes.string.isRequired,
  subheadline: PropTypes.string,
  primaryAction: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  }),
  secondaryAction: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  }),
  tertiaryAction: PropTypes.shape({
    href: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired
  }),
  rightPanel: PropTypes.node
};

MarketingHero.defaultProps = {
  eyebrow: undefined,
  statusLabel: undefined,
  languageSelector: null,
  chips: undefined,
  subheadline: undefined,
  primaryAction: null,
  secondaryAction: null,
  tertiaryAction: null,
  rightPanel: null
};

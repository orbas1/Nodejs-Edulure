import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import HomeSection from '../home/HomeSection.jsx';
import HeroMediaPanel from './HeroMediaPanel.jsx';

function resolveAction(action, type = 'link') {
  if (!action) {
    return null;
  }
  if (typeof action === 'string') {
    return type === 'link' ? { to: action, label: action } : { href: action, label: action };
  }
  const label = action.label ?? action.text ?? '';
  if (!label) {
    return null;
  }
  if (type === 'link') {
    const to = action.to ?? action.href ?? null;
    return to ? { to, label } : null;
  }
  const href = action.href ?? action.to ?? null;
  return href ? { href, label } : null;
}

export default function PrimaryHero({ block, languageSelector, rightPanel, media, mediaAlt, mediaCaption, ...overrides }) {
  const data = block ?? {};
  const eyebrow = overrides.eyebrow ?? data.eyebrow;
  const statusLabel = overrides.statusLabel ?? data.statusLabel;
  const headline = overrides.headline ?? data.title ?? '';
  const subheadline = overrides.subheadline ?? data.subtitle;
  const chips = Array.isArray(overrides.chips) ? overrides.chips : Array.isArray(data.chips) ? data.chips : [];
  const primaryAction = overrides.primaryAction ?? resolveAction(data.primaryCta, 'link');
  const secondaryAction = overrides.secondaryAction ?? resolveAction(data.secondaryCta, 'link');
  const tertiaryAction = overrides.tertiaryAction ?? resolveAction(data.tertiaryCta, 'anchor');
  const heroMedia = media ?? overrides.media ?? data.media ?? null;
  const heroMediaCaption = mediaCaption ?? overrides.mediaCaption ?? heroMedia?.caption ?? data.media?.caption ?? null;
  const heroMediaAlt = mediaAlt ?? overrides.mediaAlt ?? heroMedia?.alt ?? data.media?.alt ?? subheadline ?? '';
  const resolvedRightPanel =
    rightPanel ??
    (heroMedia ? (
      <HeroMediaPanel media={{ ...heroMedia, caption: heroMediaCaption ?? heroMedia?.caption }} fallbackAlt={heroMediaAlt} />
    ) : null);

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
          {languageSelector?.mobile ? <div className="sm:hidden">{languageSelector.mobile}</div> : null}
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">{eyebrow}</p>
            ) : null}
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{headline}</h1>
            {subheadline ? (
              <p className="mt-6 max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8">{subheadline}</p>
            ) : null}
          </div>
          {chips.length ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/80 sm:gap-3">
              {chips.map((label) => (
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
                onClick={primaryAction.onClick}
                className={clsx('cta-button cta-button--primary w-full sm:w-auto')}
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                onClick={secondaryAction.onClick}
                className={clsx('cta-button cta-button--secondary w-full sm:w-auto')}
              >
                {secondaryAction.label}
              </Link>
            ) : null}
            {tertiaryAction ? (
              <a
                href={tertiaryAction.href}
                onClick={tertiaryAction.onClick}
                className={clsx('cta-button cta-button--tertiary w-full sm:w-auto text-xs')}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {tertiaryAction.label}
              </a>
            ) : null}
          </div>
        </div>
        <div className="relative w-full lg:w-1/2">{resolvedRightPanel}</div>
      </HomeSection>
    </section>
  );
}

PrimaryHero.propTypes = {
  block: PropTypes.shape({
    eyebrow: PropTypes.string,
    statusLabel: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    chips: PropTypes.arrayOf(PropTypes.string),
    primaryCta: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    secondaryCta: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    tertiaryCta: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    media: PropTypes.object
  }),
  languageSelector: PropTypes.shape({
    desktop: PropTypes.node,
    mobile: PropTypes.node
  }),
  rightPanel: PropTypes.node,
  eyebrow: PropTypes.string,
  statusLabel: PropTypes.string,
  chips: PropTypes.arrayOf(PropTypes.string),
  headline: PropTypes.string,
  subheadline: PropTypes.string,
  primaryAction: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }),
  secondaryAction: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }),
  tertiaryAction: PropTypes.shape({
    href: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func
  }),
  media: PropTypes.object,
  mediaAlt: PropTypes.string,
  mediaCaption: PropTypes.string
};

PrimaryHero.defaultProps = {
  block: null,
  languageSelector: null,
  rightPanel: null,
  eyebrow: undefined,
  statusLabel: undefined,
  chips: undefined,
  headline: undefined,
  subheadline: undefined,
  primaryAction: null,
  secondaryAction: null,
  tertiaryAction: null,
  media: null,
  mediaAlt: '',
  mediaCaption: undefined
};

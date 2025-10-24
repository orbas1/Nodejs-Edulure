import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { announcePolite, useFocusTrap } from '../../utils/a11y.js';
import {
  ICONS,
  buildBadgeLabels,
  extractImageUrl,
  extractMetrics,
  getEntityIcon
} from './resultFormatting.js';

const { CurrencyDollarIcon, StarIcon, SparklesIcon, GlobeAltIcon } = ICONS;

function MetricTile({ icon: Icon, label, value, tone = 'slate' }) {
  if (!value) return null;

  const toneStyles = {
    slate: 'bg-slate-50 text-slate-700',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    primary: 'bg-primary/10 text-primary-dark'
  };

  const labelTone = {
    slate: 'text-slate-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    primary: 'text-primary'
  };

  return (
    <div className={`rounded-2xl ${toneStyles[tone]} p-4`}>
      <p
        className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${labelTone[tone]}`}
      >
        <Icon className="h-4 w-4" /> {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

MetricTile.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  tone: PropTypes.oneOf(['slate', 'amber', 'emerald', 'primary'])
};

MetricTile.defaultProps = {
  value: null,
  tone: 'slate'
};

export default function ExplorerPreviewDrawer({ open, onClose, hit, entityType }) {
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [shareStatus, setShareStatus] = useState('idle');
  useFocusTrap(containerRef, { enabled: open, initialFocus: closeButtonRef });

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setShareStatus('idle');
    }
  }, [open]);

  useEffect(() => {
    if (open && hit) {
      announcePolite(`${hit.title ?? hit.name ?? 'Explorer result'} preview loaded`);
    }
  }, [hit, open]);

  const badges = useMemo(() => buildBadgeLabels(hit), [hit]);
  const imageUrl = useMemo(() => extractImageUrl(hit), [hit]);
  const { price, rating, enrolments, readingTime, location, availability } = useMemo(
    () => extractMetrics(hit),
    [hit]
  );
  const Icon = useMemo(() => getEntityIcon(entityType), [entityType]);
  const entityLabel = useMemo(() => (entityType ?? 'result').replace(/-/g, ' '), [entityType]);

  if (!open || !hit) return null;

  const primaryAction = hit.actions?.[0];
  const secondaryActions = hit.actions?.slice(1) ?? [];
  const description = hit.longDescription ?? hit.description ?? hit.preview?.summary;
  const targetHref =
    hit.href ??
    hit.url ??
    hit.permalink ??
    (hit.slug ? `/${entityType}/${hit.slug}` : null);

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      const shareUrl = targetHref ? new URL(targetHref, window.location.origin).toString() : window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (error) {
      console.warn('Unable to copy explorer link', error);
      setShareStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl" ref={containerRef}>
        <header className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white/95 p-6 backdrop-blur">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                <Icon className="h-4 w-4" /> {entityLabel}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">{hit.title ?? hit.name}</h2>
            {hit.subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{hit.subtitle}</p> : null}
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Close preview"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-8 p-6">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {imageUrl ? (
              <img src={imageUrl} alt="Preview" className="w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20 text-primary">
                <Icon className="h-10 w-10" />
                <span className="text-sm font-semibold">Preview asset not available</span>
              </div>
            )}
          </div>

          {badges.length ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}`}
                  className={
                    badge.tone === 'amber'
                      ? 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-600'
                      : badge.tone === 'indigo'
                        ? 'inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600'
                        : 'inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white'
                  }
                >
                  <SparklesIcon className="h-3.5 w-3.5" /> {badge.label}
                </span>
              ))}
            </div>
          ) : null}

          {description ? (
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          ) : null}

          {hit.highlights?.length ? (
            <ul className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              {hit.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full bg-primary" aria-hidden />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricTile icon={CurrencyDollarIcon} label="Price" value={price} />
            <MetricTile icon={StarIcon} label="Rating" value={rating} tone="amber" />
            <MetricTile icon={GlobeAltIcon} label="Location" value={location} />
            <MetricTile icon={ClockIcon} label="Next session" value={availability} tone="emerald" />
            <MetricTile icon={ClockIcon} label="Duration" value={readingTime} tone="primary" />
            <MetricTile icon={Icon} label="Members" value={enrolments} tone="primary" />
          </div>

          {targetHref ? (
            <a
              href={targetHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
            >
              View full details
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          ) : null}

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
          >
            Share quick link
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {shareStatus === 'copied' ? 'Copied' : shareStatus === 'error' ? 'Retry' : 'Copy'}
            </span>
          </button>
          <span className="sr-only" aria-live="polite">
            {shareStatus === 'copied'
              ? 'Link copied to clipboard'
              : shareStatus === 'error'
                ? 'Unable to copy link'
                : ''}
          </span>

          {primaryAction && (!targetHref || primaryAction.href !== targetHref) ? (
            <a
              href={primaryAction.href ?? '#'}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 px-5 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
            >
              {primaryAction.label ?? 'Open'}
            </a>
          ) : null}

          {secondaryActions.length ? (
            <div className="space-y-2">
              {secondaryActions.map((action) => (
                <a
                  key={action.href ?? action.id ?? action.label}
                  href={action.href ?? '#'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  {action.label}
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

ExplorerPreviewDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  hit: PropTypes.object,
  entityType: PropTypes.string
};

ExplorerPreviewDrawer.defaultProps = {
  hit: null,
  entityType: 'result'
};

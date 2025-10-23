import PropTypes from 'prop-types';
import clsx from 'clsx';

import MediaPreviewSlot from './MediaPreviewSlot.jsx';

function normaliseActions(actions, onPrimaryAction) {
  const safeActions = Array.isArray(actions) ? actions : [];
  if (onPrimaryAction) {
    return [
      ...safeActions,
      {
        id: 'primary-action',
        label: typeof onPrimaryAction === 'object' ? onPrimaryAction.label : 'Select',
        onClick: typeof onPrimaryAction === 'object' ? onPrimaryAction.onClick : onPrimaryAction,
        variant: typeof onPrimaryAction === 'object' ? onPrimaryAction.variant ?? 'primary' : 'primary'
      }
    ];
  }
  return safeActions;
}

function ActionButton({ action }) {
  const className = clsx(
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
    action.variant === 'primary'
      ? 'border border-primary bg-primary text-white hover:bg-primary/90'
      : 'border border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
  );

  if (typeof action.onClick === 'function') {
    return (
      <button type="button" onClick={action.onClick} className={className}>
        {action.icon ? <action.icon className="h-4 w-4" aria-hidden="true" /> : null}
        {action.label}
      </button>
    );
  }

  const href = action.href ?? '#';
  return (
    <a href={href} className={className}>
      {action.icon ? <action.icon className="h-4 w-4" aria-hidden="true" /> : null}
      {action.label}
    </a>
  );
}

ActionButton.propTypes = {
  action: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
    icon: PropTypes.elementType
  }).isRequired
};

export default function EntityCard({ entity, onPrimaryAction, className }) {
  const {
    title,
    subtitle,
    description,
    badges = [],
    tags = [],
    metrics = [],
    media = {},
    actions = []
  } = entity;

  const resolvedActions = normaliseActions(actions, onPrimaryAction);

  return (
    <article
      className={clsx(
        'flex flex-col gap-5 rounded-4xl border border-slate-200 bg-white/95 p-6 shadow-sm transition hover:border-primary/40 hover:shadow-lg',
        className
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          {badges.length ? (
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
              {badges.map((badge) => (
                <span key={badge.id ?? badge} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                  {badge.icon ? <badge.icon className="h-4 w-4" aria-hidden="true" /> : null}
                  {badge.label ?? badge}
                </span>
              ))}
            </div>
          ) : null}
          <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-sm font-medium text-slate-500">{subtitle}</p> : null}
          {description ? <p className="text-sm leading-relaxed text-slate-600">{description}</p> : null}
          {metrics.length ? (
            <dl className="mt-2 grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div key={metric.id ?? metric.label} className="flex items-center gap-2">
                  <dt className="text-slate-400">{metric.label}</dt>
                  <dd className={clsx(metric.tone === 'success' ? 'text-emerald-600' : 'text-slate-700')}>
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {media?.thumbnailUrl || media?.videoUrl ? (
          <MediaPreviewSlot
            thumbnailUrl={media.thumbnailUrl}
            videoUrl={media.videoUrl}
            label={media.label ?? title}
            aspectRatio={media.aspectRatio}
            icon={media.icon}
          />
        ) : null}
      </div>
      {tags.length ? (
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      {resolvedActions.length ? (
        <div className="flex flex-wrap gap-3">
          {resolvedActions.map((action) => (
            <ActionButton key={action.id ?? action.label} action={action} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

EntityCard.propTypes = {
  entity: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    description: PropTypes.string,
    badges: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
        icon: PropTypes.elementType
      })
    ),
    tags: PropTypes.arrayOf(PropTypes.string),
    metrics: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        tone: PropTypes.oneOf(['default', 'success'])
      })
    ),
    media: PropTypes.shape({
      thumbnailUrl: PropTypes.string,
      videoUrl: PropTypes.string,
      label: PropTypes.string,
      aspectRatio: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      icon: PropTypes.elementType
    }),
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string.isRequired,
        href: PropTypes.string,
        onClick: PropTypes.func,
        variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
        icon: PropTypes.elementType
      })
    )
  }).isRequired,
  onPrimaryAction: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ label: PropTypes.string, onClick: PropTypes.func, variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']) })]),
  className: PropTypes.string
};

EntityCard.defaultProps = {
  onPrimaryAction: null,
  className: ''
};

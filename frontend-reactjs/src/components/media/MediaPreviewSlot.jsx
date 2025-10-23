import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';

function normaliseAspectRatio(value) {
  if (!value) {
    return 16 / 9;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const [width, height] = value.split(':').map((token) => Number.parseFloat(token));
    if (Number.isFinite(width) && Number.isFinite(height) && height > 0) {
      return width / height;
    }
  }
  return 16 / 9;
}

const FALLBACK_ILLUSTRATIONS = {
  course: {
    background: 'from-indigo-500/10 via-slate-200 to-indigo-500/10',
    glyph: '🎓'
  },
  tutor: {
    background: 'from-emerald-500/10 via-slate-200 to-emerald-500/10',
    glyph: '🧑‍🏫'
  },
  feed: {
    background: 'from-primary/10 via-slate-100 to-primary/10',
    glyph: '✨'
  }
};

export default function MediaPreviewSlot({
  thumbnailUrl,
  hoverVideoUrl,
  fallbackIllustration,
  aspectRatio,
  caption,
  badges,
  metadata,
  onPlay,
  onPause
}) {
  const [isHovering, setIsHovering] = useState(false);
  const resolvedAspectRatio = useMemo(() => normaliseAspectRatio(aspectRatio), [aspectRatio]);
  const fallback = useMemo(() => {
    if (fallbackIllustration && typeof fallbackIllustration === 'object') {
      return fallbackIllustration;
    }
    if (typeof fallbackIllustration === 'string' && FALLBACK_ILLUSTRATIONS[fallbackIllustration]) {
      return FALLBACK_ILLUSTRATIONS[fallbackIllustration];
    }
    return FALLBACK_ILLUSTRATIONS.course;
  }, [fallbackIllustration]);

  const shouldRenderVideo = Boolean(isHovering && hoverVideoUrl);

  return (
    <figure
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner"
      onMouseEnter={() => {
        setIsHovering(true);
        if (hoverVideoUrl && typeof onPlay === 'function') {
          onPlay();
        }
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        if (hoverVideoUrl && typeof onPause === 'function') {
          onPause();
        }
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: resolvedAspectRatio }}>
        {shouldRenderVideo ? (
          <video
            key={hoverVideoUrl}
            src={hoverVideoUrl}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt={caption ?? 'Media preview thumbnail'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${fallback.background} text-4xl`}
            aria-hidden="true"
          >
            {fallback.glyph}
          </div>
        )}
        {Array.isArray(badges) && badges.length > 0 ? (
          <ul className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
            {badges.slice(0, 3).map((badge) => (
              <li
                key={badge}
                className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-white shadow"
              >
                {badge}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {caption || metadata ? (
        <figcaption className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
          {caption ? <p className="font-semibold text-slate-700">{caption}</p> : null}
          {metadata ? (
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
              {metadata.source ? `${metadata.source} · ` : ''}
              {metadata.freshnessLabel ?? 'Synced from Edulure Search'}
            </p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

MediaPreviewSlot.propTypes = {
  thumbnailUrl: PropTypes.string,
  hoverVideoUrl: PropTypes.string,
  fallbackIllustration: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      background: PropTypes.string,
      glyph: PropTypes.string
    })
  ]),
  aspectRatio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  caption: PropTypes.string,
  badges: PropTypes.arrayOf(PropTypes.string),
  metadata: PropTypes.shape({
    source: PropTypes.string,
    freshnessLabel: PropTypes.string
  }),
  onPlay: PropTypes.func,
  onPause: PropTypes.func
};

MediaPreviewSlot.defaultProps = {
  thumbnailUrl: null,
  hoverVideoUrl: null,
  fallbackIllustration: 'course',
  aspectRatio: '16:9',
  caption: null,
  badges: undefined,
  metadata: undefined,
  onPlay: undefined,
  onPause: undefined
};

import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const ASPECT_RATIO_MAP = {
  square: 1,
  '1:1': 1,
  landscape: 16 / 9,
  '16:9': 16 / 9,
  portrait: 3 / 4,
  '3:4': 3 / 4,
  '4:3': 4 / 3,
  '21:9': 21 / 9
};

function resolveAspectRatio(value) {
  if (!value) return 16 / 9;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  const key = String(value).toLowerCase();
  if (ASPECT_RATIO_MAP[key]) {
    return ASPECT_RATIO_MAP[key];
  }
  if (key.includes(':')) {
    const [width, height] = key.split(':').map(Number);
    if (Number.isFinite(width) && Number.isFinite(height) && height > 0) {
      return width / height;
    }
  }
  return 16 / 9;
}

export default function MediaPreviewSlot({
  thumbnailUrl,
  videoUrl,
  icon: Icon,
  label,
  aspectRatio,
  className,
  border = true,
  showOverlay = true,
  fallback
}) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const resolvedAspectRatio = useMemo(() => resolveAspectRatio(aspectRatio), [aspectRatio]);

  const resolvedFallback = useMemo(() => {
    if (fallback) return fallback;
    if (Icon) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900/90 text-slate-200">
          <Icon className="h-8 w-8" aria-hidden="true" />
          {label ? <span className="text-xs font-semibold uppercase tracking-wide">{label}</span> : null}
        </div>
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-900/90 text-xs font-semibold uppercase tracking-wide text-slate-200">
        {label ?? 'Preview unavailable'}
      </div>
    );
  }, [Icon, fallback, label]);

  return (
    <div
      className={clsx(
        'group relative isolate overflow-hidden rounded-3xl bg-slate-900/90 text-white',
        border && 'border border-slate-800/60 shadow-inner',
        className
      )}
      style={{ aspectRatio: resolvedAspectRatio }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={label ?? 'Media preview'}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        resolvedFallback
      )}

      {videoUrl ? (
        <video
          src={videoUrl}
          preload="metadata"
          playsInline
          muted
          loop
          className={clsx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            isVideoLoaded && isHovering ? 'opacity-100' : 'opacity-0'
          )}
          onCanPlay={() => setIsVideoLoaded(true)}
        />
      ) : null}

      {showOverlay ? (
        <div
          className={clsx(
            'pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 via-black/0 to-transparent p-3 text-xs font-semibold uppercase tracking-wide',
            (label || videoUrl) && 'text-slate-100'
          )}
        >
          {label ? <span>{label}</span> : null}
          {videoUrl ? (
            <span className="text-[10px] font-medium text-slate-300">Hover to preview</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

MediaPreviewSlot.propTypes = {
  thumbnailUrl: PropTypes.string,
  videoUrl: PropTypes.string,
  icon: PropTypes.elementType,
  label: PropTypes.string,
  aspectRatio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  border: PropTypes.bool,
  showOverlay: PropTypes.bool,
  fallback: PropTypes.node
};

MediaPreviewSlot.defaultProps = {
  thumbnailUrl: '',
  videoUrl: '',
  icon: null,
  label: '',
  aspectRatio: 16 / 9,
  className: '',
  border: true,
  showOverlay: true,
  fallback: null
};

import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

import clsx from 'clsx';

function MediaPreviewItem({ item }) {
  const [errored, setErrored] = useState(false);
  const previewUrl = item.thumbnailUrl ?? item.url ?? item.preview;
  const label = item.label ?? item.type ?? 'Attachment';

  if (!previewUrl || errored) {
    return (
      <div className="flex h-28 w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{label}</span>
        <span>Preview unavailable</span>
      </div>
    );
  }

  if (item.type?.startsWith('video')) {
    return (
      <video
        className="h-28 w-full rounded-2xl border border-slate-200 object-cover"
        controls
        onError={() => setErrored(true)}
      >
        <source src={previewUrl} type={item.type ?? 'video/mp4'} />
        <track kind="captions" />
      </video>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={label}
      className="h-28 w-full rounded-2xl border border-slate-200 object-cover"
      onError={() => setErrored(true)}
    />
  );
}

MediaPreviewItem.propTypes = {
  item: PropTypes.shape({
    url: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    preview: PropTypes.string,
    label: PropTypes.string,
    type: PropTypes.string
  }).isRequired
};

export default function ModerationMediaPreview({ media }) {
  const items = useMemo(() => (Array.isArray(media) ? media : []), [media]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-sm text-slate-500">
        No media attachments linked to this case.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Media preview
      </p>
      <div
        className={clsx(
          'grid gap-3',
          items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}
      >
        {items.map((item) => (
          <MediaPreviewItem key={item.id ?? item.url ?? item.thumbnailUrl} item={item} />
        ))}
      </div>
    </div>
  );
}

ModerationMediaPreview.propTypes = {
  media: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      url: PropTypes.string,
      thumbnailUrl: PropTypes.string,
      preview: PropTypes.string,
      label: PropTypes.string,
      type: PropTypes.string
    })
  )
};

ModerationMediaPreview.defaultProps = {
  media: []
};

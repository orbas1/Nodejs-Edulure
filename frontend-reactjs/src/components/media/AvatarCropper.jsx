import { useEffect, useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const CANVAS_SIZE = 320;

function normalisePreview(preview) {
  if (!preview) return '';
  if (typeof preview === 'string') return preview;
  return '';
}

export default function AvatarCropper({ label, helperText, value, onChange, onReset }) {
  const fileInputId = useId();
  const [source, setSource] = useState(value ?? '');
  const [zoom, setZoom] = useState(1.1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [preview, setPreview] = useState(() => normalisePreview(value));
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreview('');
      setSource('');
      return;
    }
    if (value === preview) {
      return;
    }
    setPreview(normalisePreview(value));
    setSource(value);
  }, [value, preview]);

  useEffect(() => {
    if (!source) {
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (cancelled) return;
      setLoadError(false);
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      context.fillStyle = '#f8fafc';
      context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const scaledWidth = image.width * zoom;
      const scaledHeight = image.height * zoom;

      const maxShiftX = Math.max(0, (scaledWidth - CANVAS_SIZE) / 2);
      const maxShiftY = Math.max(0, (scaledHeight - CANVAS_SIZE) / 2);

      const centerX = CANVAS_SIZE / 2 - offsetX * maxShiftX;
      const centerY = CANVAS_SIZE / 2 - offsetY * maxShiftY;

      const drawX = centerX - scaledWidth / 2;
      const drawY = centerY - scaledHeight / 2;

      context.save();
      context.beginPath();
      context.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
      context.restore();

      const dataUrl = canvas.toDataURL('image/png');
      setPreview(dataUrl);
      if (dataUrl !== value) {
        onChange?.(dataUrl, { zoom, offsetX, offsetY });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setLoadError(true);
      }
    };
    image.src = source;
    return () => {
      cancelled = true;
    };
  }, [source, zoom, offsetX, offsetY, value, onChange]);

  const hasPreview = useMemo(() => Boolean(preview), [preview]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        return;
      }
      setSource(result);
      setZoom(1.1);
      setOffsetX(0);
      setOffsetY(0);
      setLoadError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setPreview('');
    setSource('');
    setZoom(1.1);
    setOffsetX(0);
    setOffsetY(0);
    setLoadError(false);
    onReset?.();
    onChange?.('', { zoom: 1.1, offsetX: 0, offsetY: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={fileInputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-3">
          <div
            className={clsx(
              'flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner',
              hasPreview ? 'bg-white' : 'bg-slate-100'
            )}
          >
            {hasPreview ? (
              <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-slate-500">No avatar yet</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary/50 hover:text-primary">
              Upload image
              <input
                id={fileInputId}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              Reset
            </button>
          </div>
          {loadError ? (
            <p className="text-xs text-rose-600">We could not load this image. Try another file.</p>
          ) : null}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
              Zoom
              <span className="text-slate-400">{zoom.toFixed(2)}x</span>
            </label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                Horizontal
                <span className="text-slate-400">{offsetX.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.02"
                value={offsetX}
                onChange={(event) => setOffsetX(Number(event.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vertical
                <span className="text-slate-400">{offsetY.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.02"
                value={offsetY}
                onChange={(event) => setOffsetY(Number(event.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Edulure stores the cropped square as your avatar. Larger images are scaled down automatically while keeping fine detail.
          </p>
        </div>
      </div>
    </div>
  );
}

AvatarCropper.propTypes = {
  label: PropTypes.string.isRequired,
  helperText: PropTypes.node,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onReset: PropTypes.func
};

AvatarCropper.defaultProps = {
  helperText: undefined,
  value: '',
  onChange: undefined,
  onReset: undefined
};

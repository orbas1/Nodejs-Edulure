import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const PREVIEW_SIZE = 240;
const DEFAULT_OUTPUT_SIZE = 512;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load selected image.'));
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.src = url;
  });
}

function clampOffset(image, scale, offset) {
  if (!image) {
    return offset;
  }
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const limitX = Math.max(0, (scaledWidth - PREVIEW_SIZE) / 2);
  const limitY = Math.max(0, (scaledHeight - PREVIEW_SIZE) / 2);

  return {
    x: Math.min(Math.max(offset.x, -limitX), limitX),
    y: Math.min(Math.max(offset.y, -limitY), limitY)
  };
}

async function exportCropToBlob(image, scale, offset, outputSize = DEFAULT_OUTPUT_SIZE) {
  if (!image) {
    throw new Error('No image available to crop.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported in this environment.');
  }

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scaleRatio = outputSize / PREVIEW_SIZE;
  const scaledWidth = image.width * scale * scaleRatio;
  const scaledHeight = image.height * scale * scaleRatio;
  const drawX = canvas.width / 2 - scaledWidth / 2 + offset.x * scaleRatio;
  const drawY = canvas.height / 2 - scaledHeight / 2 + offset.y * scaleRatio;

  context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to export cropped avatar.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}

export default function AvatarCropper({
  currentImage,
  onSave,
  disabled,
  busy,
  outputSize,
  instructions,
  accept
}) {
  const [source, setSource] = useState(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const canvasRef = useRef(null);

  const acceptedTypes = useMemo(() => accept ?? ACCEPTED_IMAGE_TYPES.join(','), [accept]);

  const revokeSource = useCallback((value) => {
    if (value?.url) {
      URL.revokeObjectURL(value.url);
    }
  }, []);

  useEffect(() => () => revokeSource(source), [revokeSource, source]);

  useEffect(() => {
    if (!source?.file) {
      setImage(null);
      return;
    }

    let cancelled = false;
    loadImage(source.url)
      .then((loaded) => {
        if (cancelled) return;
        setImage(loaded);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error(loadError);
        setError(loadError.message ?? 'Unable to open selected image.');
        setSource(null);
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    if (!image) {
      setScale(1);
      setMinScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const minimum = Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
    setMinScale(minimum);
    setScale(minimum);
    setOffset({ x: 0, y: 0 });
  }, [image]);

  useEffect(() => {
    if (!image) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#E2E8F0';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!image) {
      return;
    }

    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const drawX = canvas.width / 2 - scaledWidth / 2 + offset.x;
    const drawY = canvas.height / 2 - scaledHeight / 2 + offset.y;

    context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);

    context.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  }, [image, scale, offset]);

  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      if (!(file.type && file.type.startsWith('image/'))) {
        setError('Unsupported image type. Use JPEG, PNG, or WebP.');
        return;
      }
      revokeSource(source);
      setSource({ file, url: URL.createObjectURL(file) });
      setError(null);
      event.target.value = '';
    },
    [accept, revokeSource, source]
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (!image || disabled || busy) {
        return;
      }
      event.preventDefault();
      isDraggingRef.current = true;
      dragOriginRef.current = { x: event.clientX, y: event.clientY };
      activePointerIdRef.current = event.pointerId ?? null;
      if (event.currentTarget.setPointerCapture && event.pointerId !== undefined) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [image, disabled, busy]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDraggingRef.current || !image || disabled || busy) {
        return;
      }
      event.preventDefault();
      const deltaX = event.clientX - dragOriginRef.current.x;
      const deltaY = event.clientY - dragOriginRef.current.y;
      dragOriginRef.current = { x: event.clientX, y: event.clientY };
      setOffset((previous) => clampOffset(image, scale, { x: previous.x + deltaX, y: previous.y + deltaY }));
    },
    [image, scale, disabled, busy]
  );

  const releasePointer = useCallback((event) => {
    if (event?.currentTarget?.releasePointerCapture && activePointerIdRef.current !== null) {
      try {
        event.currentTarget.releasePointerCapture(activePointerIdRef.current);
      } catch (_error) {
        // Ignore pointer release errors triggered when the pointer is already released.
      }
    }
    activePointerIdRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const handlePointerUp = useCallback(
    (event) => {
      releasePointer(event);
    },
    [releasePointer]
  );

  const handlePointerCancel = useCallback(
    (event) => {
      releasePointer(event);
    },
    [releasePointer]
  );

  const handleScaleChange = useCallback(
    (event) => {
      const value = Number(event.target.value);
      const nextScale = Number.isFinite(value) ? Math.max(value, minScale) : minScale;
      setScale(nextScale);
      setOffset((previous) => clampOffset(image, nextScale, previous));
    },
    [minScale, image]
  );

  const handleCancel = useCallback(() => {
    revokeSource(source);
    setSource(null);
    setOffset({ x: 0, y: 0 });
    setScale(minScale);
    setError(null);
  }, [revokeSource, source, minScale]);

  const handleSave = useCallback(async () => {
    if (!image || !source?.file || disabled || busy) {
      return;
    }
    try {
      const blob = await exportCropToBlob(image, scale, offset, outputSize);
      const extension = source.file.type === 'image/png' ? 'png' : 'jpg';
      const filename = `avatar-${Date.now()}.${extension}`;
      const file = new File([blob], filename, { type: blob.type });
      await onSave(file, { blob, previewUrl: URL.createObjectURL(blob) });
      revokeSource(source);
      setSource(null);
      setOffset({ x: 0, y: 0 });
      setScale(minScale);
      setError(null);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError?.message ?? 'We could not save your cropped avatar.');
    }
  }, [image, source, scale, offset, outputSize, onSave, disabled, busy, revokeSource, minScale]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
          {currentImage ? (
            <img src={currentImage} alt="Current avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No avatar</div>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary">
          Upload new avatar
          <input
            type="file"
            accept={acceptedTypes}
            onChange={handleFileChange}
            disabled={disabled || busy}
            className="hidden"
          />
        </label>
      </div>

      {source ? (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Fine-tune your avatar crop</p>
          <div
            className="relative mx-auto flex h-60 w-60 cursor-move items-center justify-center overflow-hidden rounded-3xl bg-slate-100 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            role="presentation"
          >
            <canvas
              ref={canvasRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="h-full w-full"
            />
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Zoom
            <input
              type="range"
              min={minScale}
              max={minScale * 3}
              step={0.01}
              value={scale}
              onChange={handleScaleChange}
              disabled={disabled || busy}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-500"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-primary/60"
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Save avatar'}
            </button>
          </div>
          {instructions ? <p className="text-xs text-slate-500">{instructions}</p> : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

AvatarCropper.propTypes = {
  currentImage: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  busy: PropTypes.bool,
  outputSize: PropTypes.number,
  instructions: PropTypes.node,
  accept: PropTypes.string
};

AvatarCropper.defaultProps = {
  currentImage: null,
  disabled: false,
  busy: false,
  outputSize: DEFAULT_OUTPUT_SIZE,
  instructions: 'Images are optimised to 512×512 and shared across communities, courses, and live sessions.',
  accept: null
};

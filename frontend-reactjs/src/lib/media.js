function normaliseVideoSource(source) {
  if (!source || typeof source.src !== 'string' || source.src.length === 0) {
    return null;
  }
  const resolution = Number.parseInt(source.resolution ?? source.width ?? source.size ?? 0, 10);
  return {
    src: source.src,
    type: typeof source.type === 'string' ? source.type : 'video/mp4',
    resolution: Number.isFinite(resolution) && resolution > 0 ? resolution : undefined,
    media: typeof source.media === 'string' ? source.media : undefined
  };
}

function normaliseImageSource(source) {
  if (!source || typeof source.src !== 'string' || source.src.length === 0) {
    return null;
  }
  const width = Number.parseInt(source.width ?? source.w ?? source.resolution ?? 0, 10);
  return {
    src: source.src,
    width: Number.isFinite(width) && width > 0 ? width : undefined,
    type: typeof source.type === 'string' ? source.type : undefined,
    media: typeof source.media === 'string' ? source.media : undefined
  };
}

export function buildSrcSet(sources = []) {
  const cleaned = sources
    .map(normaliseImageSource)
    .filter((entry) => entry && entry.width)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  if (!cleaned.length) {
    return '';
  }
  return cleaned.map((entry) => `${entry.src} ${entry.width}w`).join(', ');
}

export function normaliseMarketingMedia(media) {
  if (!media) {
    return null;
  }
  const type = media.type ?? (Array.isArray(media.videoSources) && media.videoSources.length ? 'video' : 'image');
  const poster = typeof media.poster === 'string' ? media.poster : undefined;
  const caption = typeof media.caption === 'string' ? media.caption : undefined;
  const alt = typeof media.alt === 'string' ? media.alt : undefined;
  const aspectRatio = Number.isFinite(media.aspectRatio) ? media.aspectRatio : undefined;

  const videoSourcesRaw = Array.isArray(media.videoSources)
    ? media.videoSources
    : Array.isArray(media.sources)
      ? media.sources
      : [];
  const imageSourcesRaw = Array.isArray(media.imageSources)
    ? media.imageSources
    : Array.isArray(media.sources)
      ? media.sources
      : [];

  const videoSources = videoSourcesRaw.map(normaliseVideoSource).filter(Boolean);
  const imageSources = imageSourcesRaw.map(normaliseImageSource).filter(Boolean);

  const fallbackImage = typeof media.fallback === 'string' ? media.fallback : undefined;
  const placeholder = typeof media.placeholder === 'string' ? media.placeholder : undefined;

  return {
    type,
    poster: poster ?? fallbackImage ?? imageSources.at(-1)?.src ?? placeholder,
    videoSources,
    imageSources,
    caption,
    alt,
    aspectRatio,
    placeholder
  };
}

export function selectBestImageSource(media) {
  const payload = normaliseMarketingMedia(media);
  if (!payload) {
    return null;
  }
  if (payload.imageSources.length) {
    const sorted = [...payload.imageSources].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    return sorted[0];
  }
  if (payload.poster) {
    return { src: payload.poster };
  }
  return null;
}

export function shouldStreamVideo(media, { preferStatic = false } = {}) {
  const payload = normaliseMarketingMedia(media);
  if (!payload) {
    return false;
  }
  if (preferStatic) {
    return false;
  }
  return payload.type === 'video' && payload.videoSources.length > 0;
}

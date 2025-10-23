const imageCache = new Map();

export function preloadImage(url) {
  if (!url || typeof url !== 'string') {
    return Promise.resolve(false);
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return Promise.resolve(false);
  }

  if (imageCache.has(trimmed)) {
    return imageCache.get(trimmed);
  }

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = trimmed;
  });

  imageCache.set(trimmed, promise);
  return promise;
}

export function hasImage(url) {
  if (!url) return false;
  return imageCache.has(url.trim());
}

export function clearMediaCache() {
  imageCache.clear();
}

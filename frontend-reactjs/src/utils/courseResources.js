function parseCourseMetadata(value) {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object') {
    return Object.values(value);
  }
  return [value];
}

function normalizeCourseDownloads(metadata = {}, fallback = {}) {
  const sources = [
    metadata.downloads,
    metadata.resources,
    metadata.attachments,
    metadata.files,
    fallback.downloads,
    fallback.resources,
    fallback.attachments
  ];

  const aggregated = sources.flatMap((source) => toArray(source));

  if (fallback.syllabusUrl) {
    aggregated.push({ label: 'Syllabus', href: fallback.syllabusUrl });
  }
  if (fallback.syllabusDownloadUrl) {
    aggregated.push({ label: 'Syllabus download', href: fallback.syllabusDownloadUrl });
  }

  const normalised = aggregated
    .map((item, index) => {
      if (!item) {
        return null;
      }
      if (typeof item === 'string') {
        return { label: `Resource ${index + 1}`, href: item };
      }
      if (typeof item === 'object') {
        const href = item.href ?? item.url ?? item.downloadUrl ?? item.link ?? null;
        return {
          label: item.label ?? item.title ?? item.name ?? `Resource ${index + 1}`,
          href,
          description: item.description ?? item.subtitle ?? item.type ?? null,
          download: item.download
        };
      }
      return null;
    })
    .filter((item) => item && (item.href || item.description));

  const seen = new Set();
  return normalised.filter((item) => {
    const key = `${item.label}|${item.href ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeUpsellBadges(metadata = {}, fallback = {}) {
  const aggregated = [
    metadata.upsellBadges,
    metadata.promotions,
    metadata.badges,
    fallback.upsellBadges,
    fallback.promotions,
    fallback.badges
  ].flatMap((entry) => toArray(entry));

  return aggregated
    .map((item, index) => {
      if (!item) {
        return null;
      }
      if (typeof item === 'string') {
        return { label: item, tone: 'monetisation' };
      }
      if (typeof item === 'object') {
        return {
          label: item.label ?? item.title ?? item.name ?? `Badge ${index + 1}`,
          tone: item.tone ?? item.variant ?? item.intent ?? 'monetisation',
          icon: item.icon,
          description: item.description ?? null
        };
      }
      return null;
    })
    .filter((badge) => badge && badge.label);
}

function normalizeCourseTags(metadata = {}, fallback = {}) {
  const tags = new Set();
  toArray(metadata.tags).forEach((tag) => {
    if (tag) {
      tags.add(String(tag).trim());
    }
  });
  toArray(metadata.skills).forEach((tag) => {
    if (tag) {
      tags.add(String(tag).trim());
    }
  });
  toArray(fallback.tags).forEach((tag) => {
    if (tag) {
      tags.add(String(tag).trim());
    }
  });
  toArray(fallback.skills).forEach((tag) => {
    if (tag) {
      tags.add(String(tag).trim());
    }
  });
  return Array.from(tags).filter(Boolean);
}

function normalizeCoursePreview(metadata = {}, fallback = {}) {
  const previewSources = [
    metadata.preview,
    metadata.nextLesson,
    metadata.lessonPreview,
    fallback.preview,
    fallback.lessonPreview
  ];

  let preview = previewSources.find((entry) => entry) ?? {};
  if (Array.isArray(preview)) {
    [preview] = preview;
  }

  if (!preview || typeof preview !== 'object') {
    preview = {};
  }

  const thumbnailUrl =
    preview.thumbnailUrl ??
    preview.poster ??
    preview.image ??
    fallback.previewThumbnailUrl ??
    fallback.thumbnailUrl ??
    null;

  const url =
    preview.url ??
    preview.href ??
    preview.watchUrl ??
    fallback.previewUrl ??
    fallback.promoVideoUrl ??
    fallback.trailerUrl ??
    null;

  const title = preview.title ?? preview.lessonTitle ?? fallback.nextLesson ?? fallback.title ?? null;
  const duration = preview.duration ?? preview.length ?? preview.runtime ?? fallback.previewDuration ?? null;
  const previewAction = typeof preview.onPreview === 'function' ? preview.onPreview : fallback.previewAction;

  return { thumbnailUrl, url, title, duration, action: previewAction };
}

function normalizeCourseRating(source = {}, metadata = {}) {
  const candidates = [
    source.rating,
    source.ratingAverage,
    source.averageRating,
    source.metrics?.rating,
    source.metrics?.ratingAverage,
    metadata.rating,
    metadata.ratingAverage,
    metadata.averageRating
  ];
  const rating = candidates.map(Number).find((value) => Number.isFinite(value)) ?? null;

  const countCandidates = [
    source.ratingCount,
    source.metrics?.ratingCount,
    source.metrics?.reviews,
    metadata.ratingCount,
    metadata.reviewCount
  ];
  const ratingCount = countCandidates.map(Number).find((value) => Number.isFinite(value)) ?? null;

  return { rating, ratingCount };
}

function normalizeCourseProgress(source = {}, metadata = {}) {
  const candidates = [
    source.progress,
    source.progressPercent,
    source.metrics?.progress,
    metadata.progress,
    metadata.progressPercent,
    metadata.completion
  ];
  const progress = candidates.map(Number).find((value) => Number.isFinite(value)) ?? null;
  if (progress === null) {
    return null;
  }
  return Math.max(0, Math.min(100, progress));
}

export {
  parseCourseMetadata,
  normalizeCourseDownloads,
  normalizeUpsellBadges,
  normalizeCourseTags,
  normalizeCoursePreview,
  normalizeCourseRating,
  normalizeCourseProgress
};

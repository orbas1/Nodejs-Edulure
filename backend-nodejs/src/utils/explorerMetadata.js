const DEFAULT_PREVIEW_LIMIT = 48;
const DEFAULT_ENTITY_PREVIEW_LIMIT = 24;
const DEFAULT_PLACEMENT_LIMIT = 12;
const DEFAULT_MARKER_LIMIT = 50;

function toStringValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  const stringified = String(value);
  return stringified.trim().length ? stringified.trim() : null;
}

export function normaliseStringList(input, { limit = DEFAULT_PREVIEW_LIMIT } = {}) {
  const values = Array.isArray(input) ? input : input === undefined || input === null ? [] : [input];
  const seen = new Set();
  const result = [];
  for (const candidate of values) {
    const stringValue = toStringValue(candidate);
    if (!stringValue || seen.has(stringValue)) {
      continue;
    }
    seen.add(stringValue);
    result.push(stringValue);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function normaliseFacetSummary(facets) {
  if (!facets || typeof facets !== 'object') {
    return {};
  }
  const summary = {};
  for (const [key, value] of Object.entries(facets)) {
    if (value && typeof value === 'object') {
      summary[key] = value;
    }
  }
  return summary;
}

export function normaliseMarkers(markers, { limit = DEFAULT_MARKER_LIMIT } = {}) {
  if (!Array.isArray(markers)) {
    return [];
  }
  const result = [];
  for (const marker of markers) {
    if (!marker || typeof marker !== 'object') {
      continue;
    }
    const latitude = Number(
      marker.latitude ?? marker.lat ?? marker.latDeg ?? marker.latDegrees ?? marker.y ?? marker.latitudeDegrees
    );
    const longitude = Number(
      marker.longitude ?? marker.lng ?? marker.lon ?? marker.long ?? marker.x ?? marker.longitudeDegrees
    );
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    const entry = {
      latitude,
      longitude
    };
    const label = toStringValue(marker.label);
    if (label) {
      entry.label = label;
    }
    const country = toStringValue(marker.country ?? marker.countryCode ?? marker.region);
    if (country) {
      entry.country = country;
    }
    const context = toStringValue(marker.context ?? marker.type);
    if (context) {
      entry.context = context;
    }
    result.push(entry);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function normaliseAdsPlacements(placements, { limit = DEFAULT_PLACEMENT_LIMIT } = {}) {
  if (!Array.isArray(placements)) {
    return [];
  }
  const result = [];
  const seen = new Set();
  for (const placement of placements) {
    if (!placement || typeof placement !== 'object') {
      continue;
    }
    const placementId = toStringValue(placement.placementId ?? placement.id);
    const campaignId = toStringValue(placement.campaignId);
    const slot = toStringValue(placement.slot);
    const dedupeKey = placementId ?? `${campaignId ?? ''}:${slot ?? ''}:${placement.position ?? ''}`;
    if (dedupeKey && seen.has(dedupeKey)) {
      continue;
    }
    if (dedupeKey) {
      seen.add(dedupeKey);
    }
    const normalised = {
      placementId,
      campaignId,
      slot,
      position: Number.isFinite(Number(placement.position)) ? Number(placement.position) : result.length + 1,
      headline: toStringValue(placement.headline),
      description: toStringValue(placement.description),
      ctaUrl: toStringValue(placement.ctaUrl),
      advertiser: toStringValue(placement.advertiser),
      objective: toStringValue(placement.objective),
      disclosure: toStringValue(placement.disclosure)
    };
    if (placement.tracking) {
      if (typeof placement.tracking === 'string') {
        const url = toStringValue(placement.tracking);
        if (url) {
          normalised.tracking = { impression: url };
        }
      } else if (typeof placement.tracking === 'object') {
        const trackingEntries = Object.entries(placement.tracking).reduce((acc, [key, value]) => {
          const stringValue = toStringValue(value);
          if (stringValue) {
            acc[key] = stringValue;
          }
          return acc;
        }, {});
        if (Object.keys(trackingEntries).length) {
          normalised.tracking = trackingEntries;
        }
      }
    }
    result.push(normalised);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function normaliseTotalsMap(totals) {
  if (!totals || typeof totals !== 'object') {
    return {};
  }
  const mapped = {};
  for (const [key, value] of Object.entries(totals)) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      mapped[key] = number;
    }
  }
  return mapped;
}

export function prepareExplorerEventMetadata(metadata = {}) {
  const base = {};
  if (metadata && typeof metadata === 'object') {
    for (const [key, value] of Object.entries(metadata)) {
      base[key] = value;
    }
  }

  base.previewImages = normaliseStringList(
    metadata.previewImages ?? metadata.preloadImageUrls ?? metadata.previews ?? [],
    { limit: DEFAULT_PREVIEW_LIMIT }
  );
  base.facets = normaliseFacetSummary(metadata.facets ?? {});
  base.adsPlacements = normaliseAdsPlacements(metadata.adsPlacements ?? metadata.placements ?? [], {
    limit: DEFAULT_PLACEMENT_LIMIT
  });
  base.markers = normaliseMarkers(metadata.markers ?? metadata.geo ?? [], { limit: DEFAULT_MARKER_LIMIT });
  base.totals = normaliseTotalsMap(metadata.totals ?? {});
  base.entityOrder = normaliseStringList(metadata.entityOrder ?? metadata.entities ?? [], { limit: 12 });

  if (metadata.savedSearchId !== undefined) {
    const savedSearchId = Number(metadata.savedSearchId);
    base.savedSearchId = Number.isFinite(savedSearchId) ? savedSearchId : null;
  }

  return base;
}

export function prepareExplorerEntityMetadata(metadata = {}) {
  const base = {};
  if (metadata && typeof metadata === 'object') {
    for (const [key, value] of Object.entries(metadata)) {
      base[key] = value;
    }
  }

  base.previewImages = normaliseStringList(
    metadata.previewImages ?? metadata.preloadImageUrls ?? [],
    { limit: DEFAULT_ENTITY_PREVIEW_LIMIT }
  );
  base.markers = normaliseMarkers(metadata.markers ?? [], { limit: DEFAULT_MARKER_LIMIT });
  base.facets = normaliseFacetSummary(metadata.facets ?? {});

  return base;
}

export default {
  normaliseStringList,
  normaliseFacetSummary,
  normaliseMarkers,
  normaliseAdsPlacements,
  normaliseTotalsMap,
  prepareExplorerEventMetadata,
  prepareExplorerEntityMetadata
};

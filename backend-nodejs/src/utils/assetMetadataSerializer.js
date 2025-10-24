function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => (isPlainObject(entry) ? cloneValue(entry) : entry));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function mergeObjects(target, updates) {
  const result = isPlainObject(target) ? { ...target } : {};
  if (!isPlainObject(updates)) {
    return result;
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    if (isPlainObject(value)) {
      const nextBase = isPlainObject(result[key]) ? result[key] : {};
      result[key] = mergeObjects(nextBase, value);
      continue;
    }

    result[key] = cloneValue(value);
  }

  return result;
}

export function mergeAssetMetadata(existingMetadata, updates = {}) {
  const base = isPlainObject(existingMetadata) ? cloneValue(existingMetadata) : {};
  if (!updates || typeof updates !== 'object') {
    return base;
  }
  return mergeObjects(base, updates);
}

export function withIngestionStage(existingMetadata, stage, attributes = {}) {
  const metadata = mergeAssetMetadata(existingMetadata, {});
  const ingestionAttributes = { ...attributes };
  if (stage) {
    ingestionAttributes.stage = stage;
  }
  return mergeAssetMetadata(metadata, { ingestion: ingestionAttributes });
}

export function withAntivirusMetadata(existingMetadata, antivirusMetadata = {}) {
  if (!antivirusMetadata || typeof antivirusMetadata !== 'object') {
    return mergeAssetMetadata(existingMetadata, {});
  }
  return mergeAssetMetadata(existingMetadata, { antivirus: antivirusMetadata });
}

export default {
  mergeAssetMetadata,
  withIngestionStage,
  withAntivirusMetadata
};

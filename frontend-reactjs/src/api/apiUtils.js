export function assertToken(token, action) {
  if (!token) {
    throw new Error(`Authentication token is required to ${action}`);
  }
  return token;
}

export function assertId(value, label) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${label} is required`);
  }
  return value;
}

export function ensureObject(value, fallback = {}) {
  return typeof value === 'object' && value !== null ? value : fallback;
}

export function normaliseListResponse(response, { defaultData = [], defaultMeta = {} } = {}) {
  const safeResponse = response ?? {};
  const data = Array.isArray(safeResponse?.data)
    ? safeResponse.data
    : Array.isArray(safeResponse)
    ? safeResponse
    : defaultData;
  const meta = ensureObject(safeResponse.meta, defaultMeta);
  const paginationSource = ensureObject(safeResponse.pagination, meta.pagination);
  const pagination =
    paginationSource && Object.keys(paginationSource).length > 0 ? { ...paginationSource } : null;

  return { data, meta, pagination };
}

export function createListCacheConfig(tag, { ttl = 15_000, varyByToken = true } = {}) {
  if (!tag) {
    return undefined;
  }
  const tags = Array.isArray(tag) ? tag : [tag];
  return {
    ttl,
    tags,
    varyByToken
  };
}

export function createInvalidationConfig(tags) {
  if (!tags) {
    return undefined;
  }
  const list = Array.isArray(tags) ? tags : [tags];
  return {
    invalidateTags: list
  };
}

function normaliseStatusCode(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  if (parsed < 100 || parsed > 599) {
    return fallback;
  }

  return parsed;
}

function respond(res, { success, status, message, data, meta, errors }) {
  const payload = {
    success,
    message: message ?? null
  };

  if (success || data !== undefined) {
    payload.data = data ?? null;
  }

  if (meta !== undefined) {
    payload.meta = meta;
  }

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(status).json(payload);
}

export function success(res, { data, message, meta, status = 200 } = {}) {
  const resolvedStatus = normaliseStatusCode(status, 200);
  return respond(res, {
    success: true,
    status: resolvedStatus,
    message,
    data,
    meta
  });
}

export function created(res, options = {}) {
  return success(res, { ...options, status: normaliseStatusCode(options.status, 201) });
}

export function accepted(res, options = {}) {
  return success(res, { ...options, status: normaliseStatusCode(options.status, 202) });
}

export function noContent(res, options = {}) {
  const resolvedStatus = normaliseStatusCode(options.status, 204);
  return respond(res, {
    success: true,
    status: resolvedStatus,
    message: options.message,
    data: options.data ?? null,
    meta: options.meta
  });
}

export function paginated(res, { data, pagination, message, status = 200, meta = {} }) {
  const paginationPayload = {
    page: Number(pagination?.page ?? 1),
    perPage: Number(pagination?.perPage ?? pagination?.limit ?? 0),
    limit: Number(pagination?.limit ?? pagination?.perPage ?? 0),
    total: Number(pagination?.total ?? 0),
    totalPages: Number(pagination?.totalPages ?? 0),
    offset: Number(pagination?.offset ?? 0)
  };

  return success(res, {
    data,
    message,
    meta: {
      ...meta,
      pagination: paginationPayload
    },
    status
  });
}

export function failure(res, { message, errors, meta, status = 400 } = {}) {
  const resolvedStatus = normaliseStatusCode(status, 400);
  return respond(res, {
    success: false,
    status: resolvedStatus,
    message,
    data: undefined,
    meta,
    errors
  });
}

export function error(res, options = {}) {
  const resolvedStatus = normaliseStatusCode(options?.status ?? options?.code, 500);
  return respond(res, {
    success: false,
    status: resolvedStatus,
    message: options?.message,
    data: undefined,
    meta: options?.meta,
    errors: options?.errors
  });
}

export default {
  success,
  created,
  accepted,
  noContent,
  paginated,
  failure,
  error
};

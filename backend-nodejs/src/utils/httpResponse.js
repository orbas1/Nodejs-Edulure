const DEFAULT_SUCCESS_STATUS = 200;
const CREATED_STATUS = 201;
const ACCEPTED_STATUS = 202;
const NO_CONTENT_STATUS = 204;
const DEFAULT_ERROR_STATUS = 500;
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';

function applyHeaders(res, headers) {
  if (!headers || typeof headers !== 'object') {
    return;
  }

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      res.set?.(key, value);
    }
  });
}

function normaliseMeta(meta) {
  if (meta === undefined || meta === null) {
    return undefined;
  }

  if (typeof meta !== 'object') {
    return meta;
  }

  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return undefined;
  }

  return entries.reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
}

function buildPayload({ success, message, data, errors, code, meta }) {
  const payload = {
    success,
    message: message ?? null
  };

  if (code) {
    payload.code = code;
  }

  if (data !== undefined) {
    payload.data = data ?? null;
  } else if (success) {
    payload.data = null;
  }

  if (Array.isArray(errors) && errors.length > 0) {
    payload.errors = errors;
  }

  const normalisedMeta = normaliseMeta(meta);
  if (normalisedMeta !== undefined) {
    payload.meta = normalisedMeta;
  }

  return payload;
}

function respond(res, { status, success, message, data, errors, code, meta, headers }) {
  applyHeaders(res, headers);
  const finalStatus = status ?? (success ? DEFAULT_SUCCESS_STATUS : DEFAULT_ERROR_STATUS);
  const payload = buildPayload({ success, message, data, errors, code, meta });
  return res.status(finalStatus).json(payload);
}

export function success(
  res,
  { data, message, meta, status = DEFAULT_SUCCESS_STATUS, headers, code } = {}
) {
  return respond(res, {
    success: true,
    status,
    message,
    data,
    meta,
    headers,
    code
  });
}

export function created(res, options = {}) {
  return success(res, { ...options, status: options.status ?? CREATED_STATUS });
}

export function accepted(res, options = {}) {
  return success(res, { ...options, status: options.status ?? ACCEPTED_STATUS });
}

export function noContent(res, { headers } = {}) {
  applyHeaders(res, headers);
  if (typeof res.send === 'function') {
    return res.status(NO_CONTENT_STATUS).send();
  }
  return res.status(NO_CONTENT_STATUS).end?.();
}

export function paginated(
  res,
  { data, pagination, message, status = DEFAULT_SUCCESS_STATUS, meta = {}, headers, code }
) {
  const safePagination = pagination && typeof pagination === 'object' ? pagination : {};
  const paginationMeta = Object.fromEntries(
    Object.entries({
      limit: safePagination.limit,
      offset: safePagination.offset,
      page: safePagination.page,
      perPage: safePagination.perPage,
      total: safePagination.total,
      totalPages: safePagination.totalPages
    }).filter(([, value]) => value !== undefined && value !== null)
  );

  return success(res, {
    data,
    message,
    status,
    headers,
    code,
    meta: {
      ...meta,
      ...(Object.keys(paginationMeta).length ? { pagination: paginationMeta } : {})
    }
  });
}

export function error(
  res,
  { message = DEFAULT_ERROR_MESSAGE, status = DEFAULT_ERROR_STATUS, code, errors, meta, headers, data }
) {
  return respond(res, {
    success: false,
    status,
    message,
    code,
    errors,
    meta,
    headers,
    data
  });
}

export function validationError(res, { message = 'Validation failed.', errors = [], meta, headers, code } = {}) {
  const formattedErrors = Array.isArray(errors)
    ? errors.map((errorItem) => {
        if (!errorItem || typeof errorItem !== 'object') {
          return { field: null, message: String(errorItem), code: null, details: {} };
        }
        const { field, message: errorMessage, code: errorCode, ...rest } = errorItem;
        const details = rest.details ?? rest;
        return {
          field: field ?? rest.path ?? null,
          message: errorMessage ?? rest.message ?? 'Invalid value.',
          code: errorCode ?? rest.code ?? null,
          details: details && typeof details === 'object' ? details : {}
        };
      })
    : [];

  return error(res, {
    status: 422,
    message,
    errors: formattedErrors,
    meta,
    headers,
    code: code ?? 'validation_error'
  });
}

export function fromError(res, errorInput, { statusMap = {}, meta, headers } = {}) {
  if (!errorInput || typeof errorInput !== 'object') {
    return error(res, {
      message: DEFAULT_ERROR_MESSAGE,
      status: DEFAULT_ERROR_STATUS,
      meta,
      headers
    });
  }

  const errorName = errorInput.name ?? 'Error';
  const mappedStatus = statusMap[errorName] ?? statusMap.default;
  const status = Number.isInteger(mappedStatus) ? mappedStatus : errorInput.status ?? errorInput.statusCode;
  const errors = Array.isArray(errorInput.errors) ? errorInput.errors : [];
  const code = errorInput.code ?? errorInput.type;

  return error(res, {
    status: status ?? DEFAULT_ERROR_STATUS,
    message: errorInput.expose ? errorInput.message : errorInput.publicMessage ?? DEFAULT_ERROR_MESSAGE,
    errors,
    meta,
    headers,
    code,
    data: errorInput.data
  });
}

export default {
  success,
  created,
  accepted,
  noContent,
  paginated,
  error,
  validationError,
  fromError
};

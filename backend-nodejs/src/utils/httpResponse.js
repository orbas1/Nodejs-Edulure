export function success(res, { data, message, meta, status = 200 }) {
  return res.status(status).json({
    success: true,
    message: message ?? null,
    data: data ?? null,
    meta: meta ?? undefined
  });
}

export function paginated(res, { data, pagination, message, status = 200 }) {
  return success(res, {
    data,
    message,
    meta: {
      pagination
    },
    status
  });
}

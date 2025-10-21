const numberFormatter = new Intl.NumberFormat('en-US');
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto'
});

export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numberFormatter.format(numeric);
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return dateTimeFormatter.format(date);
}

export function formatRelativeTime(value, reference = new Date()) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const referenceDate = reference instanceof Date ? reference : new Date(reference);
  const diffMs = date.getTime() - referenceDate.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (Math.abs(diffMinutes) >= 60 * 24 * 7) {
    return dateTimeFormatter.format(date);
  }

  if (Math.abs(diffMinutes) >= 60) {
    const diffHours = Math.round(diffMinutes / 60);
    return relativeTimeFormatter.format(diffHours, 'hour');
  }

  if (Math.abs(diffMinutes) >= 1) {
    return relativeTimeFormatter.format(diffMinutes, 'minute');
  }

  return 'just now';
}

export function getSeverityStyles(severity) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'info':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function cloneDeep(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

export function isDeepEqual(a, b) {
  if (a === b) {
    return true;
  }

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    return a === b;
  }
}

export function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined);
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [value];
}

export function ensureString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

export function coerceNumber(
  value,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, fallback = 0, precision } = {}
) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  let result = numeric;
  if (Number.isFinite(min)) {
    result = Math.max(result, min);
  }
  if (Number.isFinite(max)) {
    result = Math.min(result, max);
  }

  if (Number.isInteger(precision) && precision >= 0 && precision <= 10) {
    const factor = 10 ** precision;
    result = Math.round(result * factor) / factor;
  }

  return result;
}

export function takeItems(value, limit = Number.POSITIVE_INFINITY) {
  const list = ensureArray(value);
  if (!Number.isFinite(limit) || limit < 0) {
    return list;
  }
  if (limit === Number.POSITIVE_INFINITY) {
    return list.slice();
  }
  return list.slice(0, limit);
}

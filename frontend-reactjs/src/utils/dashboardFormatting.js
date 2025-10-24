const DEFAULT_LOCALE =
  typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

function normaliseDateInput(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function parseDashboardDate(value) {
  return normaliseDateInput(value);
}

export function formatDashboardDate(value, options = {}) {
  const date = normaliseDateInput(value);
  if (!date) {
    return options.fallback ?? 'TBC';
  }
  try {
    const formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      month: 'short',
      day: 'numeric',
      ...options
    });
    return formatter.format(date);
  } catch (_error) {
    return date.toDateString();
  }
}

export function formatDashboardTime(value, options = {}) {
  const date = normaliseDateInput(value);
  if (!date) {
    return options.fallback ?? '—';
  }
  try {
    const formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      hour: 'numeric',
      minute: '2-digit',
      ...options
    });
    return formatter.format(date);
  } catch (_error) {
    return date.toTimeString().slice(0, 5);
  }
}

export function formatDashboardDateTime(value, options = {}) {
  const date = normaliseDateInput(value);
  if (!date) {
    return options.fallback ?? 'Just now';
  }
  try {
    const formatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...options
    });
    return formatter.format(date);
  } catch (_error) {
    return date.toLocaleString();
  }
}

function resolveRelativeUnit(diffMs) {
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (absMs < minute) return { unit: 'second', value: Math.round(diffMs / 1000) };
  if (absMs < hour) return { unit: 'minute', value: Math.round(diffMs / minute) };
  if (absMs < day) return { unit: 'hour', value: Math.round(diffMs / hour) };
  if (absMs < week) return { unit: 'day', value: Math.round(diffMs / day) };
  return { unit: 'week', value: Math.round(diffMs / week) };
}

export function formatDashboardRelative(value, { baseDate = new Date(), numeric = 'auto' } = {}) {
  const date = normaliseDateInput(value);
  if (!date) {
    return 'moments ago';
  }
  try {
    const diffMs = date.getTime() - baseDate.getTime();
    const { unit, value } = resolveRelativeUnit(diffMs);
    const formatter = new Intl.RelativeTimeFormat(DEFAULT_LOCALE, { numeric });
    return formatter.format(value, unit);
  } catch (_error) {
    const diffSeconds = Math.round((baseDate.getTime() - date.getTime()) / 1000);
    if (diffSeconds <= 30) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }
}

export function formatDashboardWindow(start, end, { timezone, fallback = 'Schedule pending' } = {}) {
  const startDate = normaliseDateInput(start);
  const endDate = normaliseDateInput(end);
  if (!startDate && !endDate) {
    return fallback;
  }
  const dateLabel = formatDashboardDate(startDate ?? endDate, { fallback });
  const startLabel = formatDashboardTime(startDate, { fallback: null });
  const endLabel = formatDashboardTime(endDate, { fallback: null });
  const timePart = startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel || endLabel || '';
  const zonePart = timezone ? ` ${timezone}` : '';
  return timePart ? `${dateLabel} • ${timePart}${zonePart}` : `${dateLabel}${zonePart}`;
}

export function getDashboardUrgency(value, { baseDate = new Date(), soonThresholdHours = 48 } = {}) {
  const date = normaliseDateInput(value);
  if (!date) {
    return 'unknown';
  }
  const diffMs = date.getTime() - baseDate.getTime();
  if (diffMs < 0) {
    return 'overdue';
  }
  if (diffMs <= soonThresholdHours * 60 * 60 * 1000) {
    return 'soon';
  }
  return 'future';
}

export function describeDashboardUrgency(value, options) {
  const urgency = getDashboardUrgency(value, options);
  if (urgency === 'overdue') return 'Overdue';
  if (urgency === 'soon') return 'Coming up soon';
  if (urgency === 'future') return 'Scheduled';
  return 'Schedule pending';
}

export function formatDashboardCount(value, { fallback = '0' } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 1 }).format(numeric);
  } catch (_error) {
    return String(numeric);
  }
}

export function formatDashboardCompactCount(value, { fallback = '0' } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return fallback;
  }
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(numeric);
  } catch (_error) {
    return String(numeric);
  }
}

export function formatDashboardDurationMinutes(value, { fallback = null } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  if (numeric >= 60) {
    const hours = Math.floor(numeric / 60);
    const minutes = Math.round(numeric % 60);
    if (minutes === 0) {
      return `${hours} hr${hours === 1 ? '' : 's'}`;
    }
    return `${hours} hr${hours === 1 ? '' : 's'} ${minutes} min${minutes === 1 ? '' : 's'}`;
  }
  const rounded = Math.round(numeric);
  return `${rounded} min${rounded === 1 ? '' : 's'}`;
}

export default {
  parseDashboardDate,
  formatDashboardDate,
  formatDashboardTime,
  formatDashboardDateTime,
  formatDashboardRelative,
  formatDashboardWindow,
  getDashboardUrgency,
  describeDashboardUrgency,
  formatDashboardCount,
  formatDashboardCompactCount,
  formatDashboardDurationMinutes
};

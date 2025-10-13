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

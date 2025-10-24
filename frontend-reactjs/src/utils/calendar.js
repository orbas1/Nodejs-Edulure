function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toICSDate(value) {
  const date = normalizeDate(value);
  if (!date) return '';
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function escapeICS(text = '') {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

function buildICSEvent(event, nowStamp) {
  const startStamp = toICSDate(event.startAt);
  const endStamp = toICSDate(event.endAt ?? event.startAt);
  if (!startStamp || !endStamp) {
    return null;
  }

  const lines = ['BEGIN:VEVENT'];
  const uid = event.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  lines.push(`UID:${escapeICS(uid)}@edulure`);
  lines.push(`DTSTAMP:${nowStamp}`);
  lines.push(`DTSTART:${startStamp}`);
  lines.push(`DTEND:${endStamp}`);
  lines.push(`SUMMARY:${escapeICS(event.title ?? 'Session')}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${escapeICS(event.url)}`);
  }
  if (Array.isArray(event.categories) && event.categories.length) {
    lines.push(`CATEGORIES:${escapeICS(event.categories.join(','))}`);
  }
  lines.push('END:VEVENT');
  return lines.join('\n');
}

export function downloadCalendarEvents(events, options = {}) {
  const { filename = 'edulure-events.ics', prodId = '-//Edulure//Scheduling//EN' } = options;
  const nowStamp = toICSDate(new Date());
  const payload = Array.isArray(events) ? events : [];
  const vevents = payload
    .map((event) => buildICSEvent(event, nowStamp))
    .filter(Boolean);

  if (vevents.length === 0) {
    return false;
  }

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${prodId}`, ...vevents, 'END:VCALENDAR'];
  const blob = new Blob([lines.join('\n')], { type: 'text/calendar;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export function resolveRelativeTime(value) {
  const date = normalizeDate(value);
  if (!date) return null;
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

export function formatDateTime(value, { timeZone } = {}) {
  const date = normalizeDate(value);
  if (!date) return null;
  const options = { dateStyle: 'medium', timeStyle: 'short' };
  if (timeZone && timeZone !== 'local') {
    options.timeZone = timeZone;
  }
  try {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch (_error) {
    const fallbackOptions = { dateStyle: 'medium', timeStyle: 'short' };
    return new Intl.DateTimeFormat(undefined, fallbackOptions).format(date);
  }
}

export function ensureFilename(input, extension) {
  const name = input?.toString().trim() || 'edulure-export';
  if (name.toLowerCase().endsWith(`.${extension}`)) {
    return name;
  }
  const sanitized = name
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${sanitized || 'edulure-export'}.${extension}`;
}

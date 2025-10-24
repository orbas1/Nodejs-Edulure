function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function escapeIcsText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldIcsLine(line) {
  if (!line || line.length <= 75) {
    return line;
  }
  const segments = [];
  for (let index = 0; index < line.length; index += 75) {
    const chunk = line.slice(index, index + 75);
    segments.push(index === 0 ? chunk : ` ${chunk}`);
  }
  return segments.join('\r\n');
}

export function listSupportedTimezones() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch (_error) {
      // fall through to defaults
    }
  }
  return [
    'Etc/UTC',
    'America/Los_Angeles',
    'America/New_York',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
}

function formatIcsDate(value, timezone) {
  const date = toDate(value);
  if (!date) return null;

  if (timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
      }, {});
      const stamp = `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
      return { value: stamp, timezone };
    } catch (_error) {
      // Fall back to UTC
    }
  }

  const iso = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return { value: iso, timezone: null };
}

function buildEventLines(event, { stamp }) {
  const lines = ['BEGIN:VEVENT'];
  const uid = escapeIcsText(event.uid ?? `event-${Date.now()}`);
  lines.push(`UID:${uid}`);
  lines.push(`DTSTAMP:${stamp}`);

  const start = formatIcsDate(event.startAt, event.timezone);
  const end = formatIcsDate(event.endAt, event.timezone);
  if (start) {
    if (start.timezone) {
      lines.push(`DTSTART;TZID=${escapeIcsText(start.timezone)}:${start.value}`);
    } else {
      lines.push(`DTSTART:${start.value}`);
    }
  }
  if (end) {
    if (end.timezone) {
      lines.push(`DTEND;TZID=${escapeIcsText(end.timezone)}:${end.value}`);
    } else {
      lines.push(`DTEND:${end.value}`);
    }
  }

  if (event.summary) {
    lines.push(`SUMMARY:${escapeIcsText(event.summary)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${escapeIcsText(event.url)}`);
  }
  if (Array.isArray(event.categories) && event.categories.length) {
    lines.push(`CATEGORIES:${escapeIcsText(event.categories.join(','))}`);
  }
  if (event.organizer) {
    const name = escapeIcsText(event.organizer.name ?? 'Organizer');
    const email = event.organizer.email ? `MAILTO:${escapeIcsText(event.organizer.email)}` : '';
    const organizerLine = email ? `ORGANIZER;CN=${name}:${email}` : `ORGANIZER;CN=${name}`;
    lines.push(organizerLine);
  }
  if (Array.isArray(event.attendees)) {
    event.attendees
      .filter(Boolean)
      .forEach((attendee) => {
        const name = escapeIcsText(attendee.name ?? attendee.email ?? 'Participant');
        const email = attendee.email ? `MAILTO:${escapeIcsText(attendee.email)}` : '';
        const role = attendee.role ? `;ROLE=${escapeIcsText(attendee.role)}` : '';
        const status = attendee.status ? `;PARTSTAT=${escapeIcsText(attendee.status)}` : '';
        lines.push(`ATTENDEE;CN=${name}${role}${status}:${email || name}`);
      });
  }
  if (Array.isArray(event.reminders)) {
    event.reminders
      .filter((reminder) => Number.isFinite(Number(reminder?.minutesBefore)))
      .forEach((reminder) => {
        lines.push('BEGIN:VALARM');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:${escapeIcsText(reminder.description ?? 'Reminder')}`);
        lines.push(`TRIGGER:-PT${Math.max(1, Math.floor(reminder.minutesBefore))}M`);
        lines.push('END:VALARM');
      });
  }

  lines.push('END:VEVENT');
  return lines.map(foldIcsLine);
}

export function buildIcsCalendar(events, { prodId = '-//Edulure//Calendar//EN', name, timezone } = {}) {
  const safeEvents = Array.isArray(events) ? events : [];
  const nowStamp = formatIcsDate(new Date()).value;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${escapeIcsText(prodId)}`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (name) {
    lines.push(`X-WR-CALNAME:${escapeIcsText(name)}`);
  }
  if (timezone) {
    lines.push(`X-WR-TIMEZONE:${escapeIcsText(timezone)}`);
  }
  safeEvents.forEach((event) => {
    buildEventLines(event, { stamp: nowStamp }).forEach((line) => {
      lines.push(line);
    });
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function describeEventDuration(start, end) {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return null;
  const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  if (minutes >= 120) {
    const hours = (minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1);
    return `${hours} hours`;
  }
  if (minutes >= 60) {
    return `${Math.round(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
  }
  return `${minutes} minutes`;
}

const calendarUtils = {
  buildIcsCalendar,
  listSupportedTimezones,
  describeEventDuration,
  escapeIcsText
};

export default calendarUtils;


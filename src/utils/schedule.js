// Date helpers for the (simulated) publication scheduler. Pure functions, local time.
//
// IMPORTANT: StorySphere has no server yet. A "scheduled" story is only released by the app
// itself, when it is open at or after the chosen time. See CreatorContext.releaseDue.

export const MIN_LEAD_MS = 30 * 1000; // a schedule must be at least 30 seconds ahead
export const MAX_LEAD_DAYS = 730; // and no more than two years ahead

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Move one field of a date by `delta` steps and return a new Date.
// day rolls over months, hour wraps inside the day, minute moves in 5-minute steps.
export function stepDate(date, field, delta) {
  const d = new Date(date.getTime());
  d.setSeconds(0, 0);
  const step = delta < 0 ? -1 : 1;
  switch (field) {
    case 'year':
    case 'month': {
      const months = field === 'year' ? step * 12 : step;
      const total = d.getFullYear() * 12 + d.getMonth() + months;
      const year = Math.floor(total / 12);
      const month = ((total % 12) + 12) % 12;
      const day = Math.min(d.getDate(), daysInMonth(year, month));
      d.setDate(1);
      d.setFullYear(year, month, day);
      break;
    }
    case 'day':
      d.setDate(d.getDate() + step);
      break;
    case 'hour':
      d.setHours((d.getHours() + step + 24) % 24);
      break;
    case 'minute': {
      const base = Math.floor(d.getMinutes() / 5) * 5;
      d.setMinutes((((base + step * 5) % 60) + 60) % 60);
      break;
    }
    case 'meridiem':
      d.setHours((d.getHours() + 12) % 24);
      break;
    default:
      break;
  }
  return d;
}

export function hour12(date) {
  const h = date.getHours() % 12;
  return h === 0 ? 12 : h;
}

export function meridiem(date) {
  return date.getHours() >= 12 ? 'PM' : 'AM';
}

const pad = (n) => (n < 10 ? `0${n}` : String(n));

export function formatTime(date) {
  return `${hour12(date)}:${pad(date.getMinutes())} ${meridiem(date)}`;
}

export function formatDate(date) {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return 'an unknown date';
  return `${formatDate(d)} at ${formatTime(d)}`;
}

export function monthName(date) {
  return MONTHS[date.getMonth()];
}

function atHour(base, dayOffset, hour) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, 0, 0, 0);
  return d;
}

// One-tap schedule suggestions.
export function quickOptions(now = new Date()) {
  const inMinutes = (m) => {
    const d = new Date(now.getTime() + m * 60 * 1000);
    d.setSeconds(0, 0);
    return d;
  };
  const daysToMonday = ((8 - now.getDay()) % 7) || 7;
  return [
    { key: 'test', label: 'In 2 minutes (test)', date: inMinutes(2) },
    { key: 'hour', label: 'In 1 hour', date: inMinutes(60) },
    { key: 'tomorrow', label: 'Tomorrow, 9:00 AM', date: atHour(now, 1, 9) },
    { key: 'monday', label: 'Next Monday, 9:00 AM', date: atHour(now, daysToMonday, 9) },
  ];
}

// A sensible starting point for the picker: tomorrow morning.
export function defaultSchedule(now = new Date()) {
  return atHour(now, 1, 9);
}

export function validateSchedule(value, now = new Date()) {
  const d = toDate(value);
  if (!d) return { ok: false, message: 'Pick a valid date and time.' };
  const lead = d.getTime() - now.getTime();
  if (lead < MIN_LEAD_MS) return { ok: false, message: 'Pick a time in the future (at least 30 seconds from now).' };
  if (lead > MAX_LEAD_DAYS * DAY_MS) return { ok: false, message: 'Pick a date within the next two years.' };
  return { ok: true, message: '' };
}

export function isDue(work, now = new Date()) {
  if (!work || work.status !== 'scheduled') return false;
  const d = toDate(work.scheduledFor);
  return Boolean(d) && d.getTime() <= now.getTime();
}

// "in 2 days", "in 3 hours", "in 5 minutes", "any moment now"
export function describeCountdown(value, now = new Date()) {
  const d = toDate(value);
  if (!d) return '';
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return 'any moment now';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'in under a minute';
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}

// "just now", "12 min ago", "3 h ago", "Oct 12"
export function editedLabel(value, now = new Date()) {
  const d = toDate(value);
  if (!d) return '';
  const ms = now.getTime() - d.getTime();
  if (ms < 60 * 1000) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

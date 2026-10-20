// iMessage-style time labels. `now` and `timeZone` are inputs so the server render
// and the tests give stable output; the browser passes neither and gets local time.

type TimeOptions = { now?: Date; timeZone?: string };

const DAY_MS = 24 * 60 * 60 * 1000;

// Newer ICU versions put a narrow no-break space before AM/PM. Use a normal space.
const tidy = (value: string) => value.replace(/ /g, ' ');

function calendarDayIndex(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Math.round(Date.UTC(get('year'), get('month') - 1, get('day')) / DAY_MS);
}

function daysAgo(date: Date, { now = new Date(), timeZone }: TimeOptions) {
  return calendarDayIndex(now, timeZone) - calendarDayIndex(date, timeZone);
}

function format(date: Date, timeZone: string | undefined, options: Intl.DateTimeFormatOptions) {
  return tidy(new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(date));
}

const clock = (date: Date, timeZone?: string) =>
  format(date, timeZone, { hour: 'numeric', minute: '2-digit' });

/** Right-hand label on a conversation row: "9:05 AM", "Yesterday", "Thursday", "11/26/25". */
export function formatListTime(iso: string, options: TimeOptions = {}) {
  const date = new Date(iso);
  const age = daysAgo(date, options);
  if (age <= 0) return clock(date, options.timeZone);
  if (age === 1) return 'Yesterday';
  if (age < 7) return format(date, options.timeZone, { weekday: 'long' });
  return formatShortDate(iso, options);
}

/** "11/26/25". Does not depend on the current time, so the server can render it. */
export function formatShortDate(iso: string, { timeZone }: TimeOptions = {}) {
  return format(new Date(iso), timeZone, { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/** "Nov 26, 2025" + "2:00 PM". Does not depend on the current time, so the server can render it. */
export function formatDatedStamp(iso: string, { timeZone }: TimeOptions = {}) {
  const date = new Date(iso);
  return {
    day: format(date, timeZone, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: clock(date, timeZone),
  };
}

/** Centered separator above a group of messages: "<b>Wed, Mar 4</b> 2:00 PM". */
export function formatStamp(iso: string, options: TimeOptions = {}) {
  const date = new Date(iso);
  const now = options.now ?? new Date();
  const age = daysAgo(date, options);
  const time = clock(date, options.timeZone);
  if (age <= 0) return { day: 'Today', time };
  if (age === 1) return { day: 'Yesterday', time };
  if (age < 7) return { day: format(date, options.timeZone, { weekday: 'long' }), time };
  const sameYear =
    format(date, options.timeZone, { year: 'numeric' }) ===
    format(now, options.timeZone, { year: 'numeric' });
  if (!sameYear) return formatDatedStamp(iso, options);
  return { day: format(date, options.timeZone, { weekday: 'short', month: 'short', day: 'numeric' }), time };
}

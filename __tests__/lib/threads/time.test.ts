import { formatListTime, formatStamp } from '@/lib/threads/time';

// All cases pin both "now" and the time zone so results do not depend on the machine.
const tz = 'America/Chicago';
const now = new Date('2026-10-19T17:00:00.000Z'); // Mon Oct 19, 12:00 PM in Chicago

describe('formatListTime (conversation list, iMessage style)', () => {
  it('shows the clock time for messages from today', () => {
    expect(formatListTime('2026-10-19T14:05:00.000Z', { now, timeZone: tz })).toBe('9:05 AM');
  });

  it('shows "Yesterday" for messages from the day before', () => {
    expect(formatListTime('2026-10-18T20:00:00.000Z', { now, timeZone: tz })).toBe('Yesterday');
  });

  it('shows the weekday for messages from the last week', () => {
    expect(formatListTime('2026-10-15T20:00:00.000Z', { now, timeZone: tz })).toBe('Thursday');
  });

  it('shows a short date for older messages', () => {
    expect(formatListTime('2025-11-26T20:00:00.000Z', { now, timeZone: tz })).toBe('11/26/25');
  });
});

describe('formatStamp (centered separator above a message group)', () => {
  it('uses "Today" for messages from today', () => {
    expect(formatStamp('2026-10-19T14:05:00.000Z', { now, timeZone: tz })).toEqual({
      day: 'Today',
      time: '9:05 AM',
    });
  });

  it('uses the weekday and date for messages from this year', () => {
    expect(formatStamp('2026-03-04T20:00:00.000Z', { now, timeZone: tz })).toEqual({
      day: 'Wed, Mar 4',
      time: '2:00 PM',
    });
  });

  it('includes the year for messages from an earlier year', () => {
    expect(formatStamp('2025-11-26T20:00:00.000Z', { now, timeZone: tz })).toEqual({
      day: 'Nov 26, 2025',
      time: '2:00 PM',
    });
  });
});

describe('time labels that the server renders before the browser takes over', () => {
  it('formatShortDate and formatDatedStamp do not depend on the current time', () => {
    const { formatShortDate, formatDatedStamp } = jest.requireActual('@/lib/threads/time');
    expect(formatShortDate('2026-10-19T14:05:00.000Z', { timeZone: tz })).toBe('10/19/26');
    expect(formatDatedStamp('2026-10-19T14:05:00.000Z', { timeZone: tz })).toEqual({
      day: 'Oct 19, 2026',
      time: '9:05 AM',
    });
  });
});

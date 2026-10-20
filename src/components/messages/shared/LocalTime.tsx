'use client';

import { formatDatedStamp, formatListTime, formatShortDate, formatStamp } from '@/lib/threads/time';
import { useHydrated } from '@/components/messages/shared/useHydrated';

// The cached server page can be hours old and in another time zone, so the server
// renders a fixed date. After hydration the browser shows "Today", "Yesterday", etc.
const SERVER_TIME_ZONE = 'America/Chicago';

export function ListTime({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso}>
      {hydrated ? formatListTime(iso) : formatShortDate(iso, { timeZone: SERVER_TIME_ZONE })}
    </time>
  );
}

export function StampTime({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  const { day, time } = hydrated ? formatStamp(iso) : formatDatedStamp(iso, { timeZone: SERVER_TIME_ZONE });
  return (
    <time dateTime={iso}>
      <b>{day}</b> {time}
    </time>
  );
}

'use client';

import { track } from '@vercel/analytics/react';

let sessionId: string | null = null;
let sessionStartedAt = Date.now();

function generateSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

export function getAnalyticsSessionId() {
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStartedAt = Date.now();
  }
  return sessionId;
}

export function getMsSinceSessionStart() {
  return Date.now() - sessionStartedAt;
}

export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean | null | undefined>
) {
  track(name, { sessionId: getAnalyticsSessionId(), ...props });
}

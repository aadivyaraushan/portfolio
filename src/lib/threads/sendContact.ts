import { getMsSinceSessionStart, trackEvent } from '@/lib/analytics';

// Same limit as the server check in src/app/api/contact/route.ts.
export const MIN_MESSAGE_LENGTH = 10;

export type SendResult =
  | { status: 'delivered' }
  | { status: 'failed' }
  | { status: 'rate-limited'; retryAfter: number | null };

/** Returns the reason a draft cannot be sent yet, or null when it can. */
export function draftProblem(text: string, email: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return 'Add your email so I can reply.';
  }
  if (text.trim().length < MIN_MESSAGE_LENGTH) {
    return `Write at least ${MIN_MESSAGE_LENGTH} characters.`;
  }
  return null;
}

type SendInput = { text: string; threadTitle: string; email: string; botField: string };

export async function sendContact({ text, threadTitle, email, botField }: SendInput): Promise<SendResult> {
  const context = { thread: threadTitle, msSinceVisit: getMsSinceSessionStart() };
  trackEvent('contact_send_attempt', { ...context, hasEmail: Boolean(email) });
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, threadTitle, fromEmail: email.trim(), bot_field: botField }),
    });
    if (res.ok) {
      trackEvent('contact_send_success', context);
      return { status: 'delivered' };
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After'));
      trackEvent('contact_send_rate_limited', { ...context, retryAfter });
      return { status: 'rate-limited', retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null };
    }
    console.warn('[contact] send failed', { status: res.status, thread: threadTitle });
    trackEvent('contact_send_failed', { ...context, status: res.status });
    return { status: 'failed' };
  } catch (error) {
    console.warn('[contact] send failed: network', { thread: threadTitle, error });
    trackEvent('contact_send_failed', { ...context, status: 'network' });
    return { status: 'failed' };
  }
}

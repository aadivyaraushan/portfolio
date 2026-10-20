import type { ThreadMessage } from '@/lib/threads/types';

export type DeliveryState = 'sending' | 'delivered' | 'failed' | 'rate-limited';

/** A message the visitor sent from this page. It lives only in browser memory. */
export type VisitorMessage = {
  id: string;
  text: string;
  sentAt: string;
  delivery: DeliveryState;
  retryAfter: number | null;
};

export type ShownMessage =
  | (ThreadMessage & { from: 'me' })
  | (VisitorMessage & { from: 'visitor'; attachment: null });

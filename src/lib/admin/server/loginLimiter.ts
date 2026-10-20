import 'server-only';

type Entry = { failures: number; first: number };

/**
 * Slows down password guessing: after maxFailures wrong passwords from one address,
 * that address must wait until windowMs has passed since its first failure.
 * It lives in server memory, so each server instance counts on its own.
 */
export function createLoginLimiter({ maxFailures, windowMs }: { maxFailures: number; windowMs: number }) {
  const entries = new Map<string, Entry>();

  const current = (key: string, now: number) => {
    const entry = entries.get(key);
    if (entry && now - entry.first >= windowMs) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    check(key: string, now: number): { allowed: true } | { allowed: false; retryAfterS: number } {
      const entry = current(key, now);
      if (!entry || entry.failures < maxFailures) return { allowed: true };
      return { allowed: false, retryAfterS: Math.ceil((entry.first + windowMs - now) / 1000) };
    },
    recordFailure(key: string, now: number) {
      const entry = current(key, now);
      entries.set(key, entry ? { ...entry, failures: entry.failures + 1 } : { failures: 1, first: now });
    },
    reset(key: string) {
      entries.delete(key);
    },
  };
}

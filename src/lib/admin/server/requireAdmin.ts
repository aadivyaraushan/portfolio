import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, sessionSecret, verifySession } from '@/lib/admin/server/session';

/** True only when this request carries a valid, unexpired admin session cookie. */
export async function isAdmin() {
  const secret = sessionSecret();
  if (!secret) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token, Date.now(), secret);
}

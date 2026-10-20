import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// The admin signs in once at /admin. The server then sets two cookies:
// - admin_session: "<expiry ms>.<HMAC>", httpOnly, so page scripts cannot read or steal it.
// - admin_hint: "1", readable by the page. It only tells the public page to ask
//   /api/admin/session if this browser is the admin, so visitors never make that request.

export const SESSION_COOKIE = 'admin_session';
export const HINT_COOKIE = 'admin_hint';
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

type Env = Record<string, string | undefined>;

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * The signing key comes from the admin password and the Supabase service key, so no new
 * setting is needed. A new password signs out every device. The service key keeps the
 * key secret even if the password is weak.
 */
export function sessionSecret(env: Env = process.env): string | null {
  const pass = env.ADMIN_BASIC_PASS;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pass || !serviceKey) return null;
  return sha256(`admin-session|${pass}|${serviceKey}`).toString('hex');
}

const mac = (expires: string, secret: string) => createHmac('sha256', secret).update(expires).digest('hex');

export function signSession(nowMs: number, secret: string) {
  const expires = String(nowMs + SESSION_MAX_AGE_S * 1000);
  return `${expires}.${mac(expires, secret)}`;
}

export function verifySession(token: string | undefined, nowMs: number, secret: string) {
  const [expires, given, ...rest] = (token ?? '').split('.');
  if (!expires || !given || rest.length || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= nowMs) return false;
  const expected = Buffer.from(mac(expires, secret), 'hex');
  const actual = Buffer.from(given, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Compares hashes, so the time taken does not show how much of a guess was right. */
export function credentialsMatch(user: string, pass: string, env: Env = process.env) {
  const wantUser = env.ADMIN_BASIC_USER;
  const wantPass = env.ADMIN_BASIC_PASS;
  if (!wantUser || !wantPass) return false;
  const userOk = timingSafeEqual(sha256(user), sha256(wantUser));
  const passOk = timingSafeEqual(sha256(pass), sha256(wantPass));
  return userOk && passOk;
}

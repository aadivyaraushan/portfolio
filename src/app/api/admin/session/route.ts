import { NextResponse, type NextRequest } from 'next/server';
import { isAdmin } from '@/lib/admin/server/requireAdmin';
import { createLoginLimiter } from '@/lib/admin/server/loginLimiter';
import {
  credentialsMatch,
  HINT_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  sessionSecret,
  signSession,
} from '@/lib/admin/server/session';

// GET: is this browser signed in as the admin? POST: sign in. DELETE: sign out.

export const dynamic = 'force-dynamic';

// Each address gets 10 tries. All addresses together get 30, so an attacker who keeps
// changing address still cannot guess much. The owner can wait out a lockout.
const WINDOW_MS = 15 * 60 * 1000;
const ALL = '*';
const perAddress = createLoginLimiter({ maxFailures: 10, windowMs: WINDOW_MS });
const everyone = createLoginLimiter({ maxFailures: 30, windowMs: WINDOW_MS });
const noStore = { 'Cache-Control': 'no-store' };

const clientIp = (req: NextRequest) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

const cookieBase = {
  path: '/',
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const now = Date.now();
  const forAddress = perAddress.check(ip, now);
  const forAll = everyone.check(ALL, now);
  const gate = !forAddress.allowed ? forAddress : forAll;
  if (!gate.allowed) {
    console.warn('[admin] sign-in blocked, too many failures', {
      ip,
      scope: forAddress.allowed ? 'all addresses' : 'this address',
      retryAfterS: gate.retryAfterS,
    });
    const minutes = Math.ceil(gate.retryAfterS / 60);
    return NextResponse.json(
      { error: `Too many tries. Wait ${minutes} min, then try again.` },
      { status: 429, headers: { ...noStore, 'Retry-After': String(gate.retryAfterS) } },
    );
  }

  const secret = sessionSecret();
  if (!secret) {
    console.error('[admin] sign-in is not configured: ADMIN_BASIC_PASS or SUPABASE_SERVICE_ROLE_KEY is missing');
    return NextResponse.json({ error: 'Sign-in is not set up on the server.' }, { status: 503, headers: noStore });
  }

  const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!credentialsMatch(username, password)) {
    perAddress.recordFailure(ip, now);
    everyone.recordFailure(ALL, now);
    console.warn('[admin] sign-in failed', { ip });
    return NextResponse.json({ error: 'Wrong username or password.' }, { status: 401, headers: noStore });
  }

  perAddress.reset(ip);
  console.info('[admin] signed in', { ip });
  const res = NextResponse.json({ admin: true }, { headers: noStore });
  res.cookies.set(SESSION_COOKIE, signSession(now, secret), { ...cookieBase, httpOnly: true, maxAge: SESSION_MAX_AGE_S });
  res.cookies.set(HINT_COOKIE, '1', { ...cookieBase, httpOnly: false, maxAge: SESSION_MAX_AGE_S });
  return res;
}

export async function DELETE() {
  console.info('[admin] signed out');
  const res = NextResponse.json({ admin: false }, { headers: noStore });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieBase, httpOnly: true, maxAge: 0 });
  res.cookies.set(HINT_COOKIE, '', { ...cookieBase, httpOnly: false, maxAge: 0 });
  return res;
}

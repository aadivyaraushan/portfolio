import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_USER = process.env.ADMIN_BASIC_USER;
const ADMIN_PASS = process.env.ADMIN_BASIC_PASS;

const unauthorized = (message = 'Unauthorized', status = 401) =>
  new NextResponse(message, {
    status,
    headers: { 'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"' },
  });

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = pathname.startsWith('/api/admin');
  if (!needsAuth) return NextResponse.next();

  if (!ADMIN_USER || !ADMIN_PASS) {
    return unauthorized('Admin auth not configured', 503);
  }

  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const decoded = atob(auth.split(' ')[1] ?? '');
    const [user, pass] = decoded.split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      return NextResponse.next();
    }
    return unauthorized();
  } catch {
    return unauthorized();
  }
}

export const config = {
  matcher: ['/api/admin/:path*'],
};

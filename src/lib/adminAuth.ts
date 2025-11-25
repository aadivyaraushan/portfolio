import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_USER = process.env.ADMIN_BASIC_USER;
const ADMIN_PASS = process.env.ADMIN_BASIC_PASS;

const challengeHeaders = { 'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"' };

export function requireAdminAuth(req: Request | NextRequest) {
  if (!ADMIN_USER || !ADMIN_PASS) {
    return NextResponse.json({ error: 'admin authentication is not configured' }, { status: 503, headers: challengeHeaders });
  }

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const base64 = auth.split(' ')[1] ?? '';
    const decoded = typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf8');
    const [user, pass] = decoded.split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      return null;
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}

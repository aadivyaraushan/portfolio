import { NextResponse } from 'next/server';

import { requireAdminAuth } from '@/lib/adminAuth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

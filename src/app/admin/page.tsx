import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SignInForm from '@/components/messages/admin/SignInForm';
import { isAdmin } from '@/lib/admin/server/requireAdmin';

// The admin signs in here once. After that, the main page shows the edit controls.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign In', robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (await isAdmin()) redirect('/');
  return <SignInForm />;
}

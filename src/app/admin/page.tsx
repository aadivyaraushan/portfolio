import './admin.css';
import AdminDashboard from './AdminDashboard';
import { EmojiClientProvider } from '@/components/EmojiClientProvider';

export const dynamic = 'force-dynamic';

async function AdminPage() {
  return (
    <EmojiClientProvider>
      <AdminDashboard />
    </EmojiClientProvider>
  );
}

export default AdminPage;

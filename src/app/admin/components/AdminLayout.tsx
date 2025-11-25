import { ReactNode } from 'react';

import ErrorBanner from './ErrorBanner';

type AdminLayoutProps = {
  children: ReactNode;
  onLogout: () => void;
  error?: string | null;
  title?: string;
};

function AdminLayout({ children, onLogout, error, title = 'dm backend — append messages' }: AdminLayoutProps) {
  return (
    <div className="app-shell" style={{ alignItems: 'flex-start' }}>
      <div className="admin-panel">
        <div className="admin-title" style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '10px' }}>
          <span>{title}</span>
          <button
            type="button"
            className="admin-delete"
            style={{ marginLeft: 'auto' }}
            onClick={onLogout}
          >
            log out
          </button>
        </div>
        <ErrorBanner message={error} />
        {children}
      </div>
    </div>
  );
}

export default AdminLayout;

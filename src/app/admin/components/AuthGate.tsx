import { ReactNode } from 'react';

import { AuthState } from '../hooks/useAdminAuth';

type AuthGateProps = {
  authState: AuthState;
  fallback: ReactNode;
  children: ReactNode;
};

function AuthGate({ authState, fallback, children }: AuthGateProps) {
  if (authState !== 'authed') {
    return (
      <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="admin-panel" style={{ maxWidth: '520px', width: '100%' }}>
          {fallback}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGate;

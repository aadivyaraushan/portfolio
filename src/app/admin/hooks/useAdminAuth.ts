import { useCallback, useEffect, useState } from 'react';

export type AuthState = 'unauthenticated' | 'pending' | 'authed';

type UseAdminAuthOptions = {
  onError?: (message: string | null) => void;
};

export function useAdminAuth({ onError }: UseAdminAuthOptions = {}) {
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>('unauthenticated');

  const addAuth = useCallback(
    (init: RequestInit = {}): RequestInit => {
      const headers = new Headers(init.headers || {});
      if (authHeader) headers.set('Authorization', authHeader);
      return { ...init, headers };
    },
    [authHeader],
  );

  const verifyAuth = useCallback(async (header: string) => {
    const res = await fetch('/api/admin/auth', {
      cache: 'no-store',
      headers: { Authorization: header, Accept: 'application/json' },
    });
    if (res.ok) return true;
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error(body.error || 'username or password is incorrect');
    if (res.status === 503) throw new Error(body.error || 'admin authentication is not configured on the server');
    throw new Error(body.error || `sign-in failed (status ${res.status})`);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('admin-basic-auth');
    if (stored) {
      setAuthHeader(stored);
      setAuthState('pending');
      verifyAuth(stored)
        .then(() => setAuthState('authed'))
        .catch(() => {
          setAuthHeader(null);
          setAuthState('unauthenticated');
          localStorage.removeItem('admin-basic-auth');
        });
    }
  }, [verifyAuth]);

  useEffect(() => {
    if (authState === 'authed' && authHeader) {
      // load() is handled in useConversations, but we need to ensure authHeader is set
    }
  }, [authState, authHeader]);

  const handleAuthSubmit = useCallback(async () => {
    if (!adminUser || !adminPass) {
      onError?.('admin username and password are required');
      return;
    }
    let success = false;
    try {
      const header = `Basic ${btoa(`${adminUser}:${adminPass}`)}`;
      setAuthState('pending');
      await verifyAuth(header);
      setAuthHeader(header);
      localStorage.setItem('admin-basic-auth', header);
      onError?.(null);
      setAuthState('authed');
      success = true;
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'username or password is incorrect');
      setAuthHeader(null);
      setAuthState('unauthenticated');
    } finally {
      if (!success) {
        setAuthState('unauthenticated');
      }
    }
  }, [adminUser, adminPass, verifyAuth, onError]);

  const handleLogout = useCallback(() => {
    setAuthHeader(null);
    setAdminUser('');
    setAdminPass('');
    setAuthState('unauthenticated');
    localStorage.removeItem('admin-basic-auth');
    onError?.(null);
  }, [onError]);

  const invalidateAuth = useCallback(() => {
    setAuthHeader(null);
    setAuthState('unauthenticated');
  }, []);

  return {
    adminUser,
    adminPass,
    setAdminUser,
    setAdminPass,
    authHeader,
    authState,
    addAuth,
    handleAuthSubmit,
    handleLogout,
    invalidateAuth,
  };
}

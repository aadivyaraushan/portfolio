'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadAdminUi, type AdminUi } from '@/components/messages/admin/loadAdminUi';

const HINT = 'admin_hint=1';

/**
 * Is this browser signed in as the admin? Only browsers with the admin_hint cookie ask
 * the server, so a visitor's page makes no extra request and stays fully cached.
 * Returns the admin components once they are loaded, or null when not an admin.
 */
export function useAdminSession() {
  const [ui, setUi] = useState<AdminUi | null>(null);

  useEffect(() => {
    if (!document.cookie.split('; ').includes(HINT)) return;
    let live = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((res) => res.json())
      .then(async (body: { admin?: boolean }) => {
        const isAdmin = body.admin === true;
        console.info('[admin] session checked', { admin: isAdmin });
        if (!isAdmin) {
          // The session expired but the hint stayed: clear it, so later visits skip the check.
          void fetch('/api/admin/session', { method: 'DELETE' });
          return;
        }
        const loaded = await loadAdminUi();
        if (live) setUi(loaded);
      })
      .catch((error) => console.warn('[admin] session check failed', { error: String(error) }));
    return () => {
      live = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/admin/session', { method: 'DELETE' }).catch((error) =>
      console.warn('[admin] sign-out request failed', { error: String(error) }),
    );
    setUi(null);
  }, []);

  return { ui, signOut };
}

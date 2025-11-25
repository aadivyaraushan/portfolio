'use client';

import { createAuthClient } from 'better-auth/react';

// Shared Better Auth client for all React components.
// Using the React entrypoint gives us hooks like useSession.
// Provide basePath instead of baseURL so Better Auth can derive the full URL
// from NEXT_PUBLIC_BETTER_AUTH_URL (or window origin in the browser).
export const authClient = createAuthClient({
  basePath: '/api/auth',
});

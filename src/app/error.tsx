'use client';

import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';

export default function HomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error('[home] render failed', { message: error.message, digest: error.digest });
  }, [error]);

  // reset() alone re-renders without fetching again, so a failed server load would fail again.
  // router.refresh() fetches the server data again first.
  const tryAgain = () => {
    console.info('[home] retry after load failure');
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <main className='load-error'>
      <p>Messages could not load.</p>
      <button type='button' onClick={tryAgain}>
        Try Again
      </button>
    </main>
  );
}

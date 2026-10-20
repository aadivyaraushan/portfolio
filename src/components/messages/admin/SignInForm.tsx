'use client';

import '@/components/messages/messages.css';
import './admin.css';
import Link from 'next/link';
import { useState } from 'react';

/** The /admin page: one sign-in, then back to the main page with the edit controls on. */
export default function SignInForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        window.location.assign('/');
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `Sign-in failed (status ${res.status}).`);
    } catch (err) {
      console.warn('[admin] sign-in request failed', { error: String(err) });
      setError('Could not reach the server. Try again.');
    }
    setPending(false);
  };

  return (
    <main className='messages-app sign-in'>
      <form
        className='sign-in__card'
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h1>Sign In</h1>
        <p className='sign-in__lead'>Sign in to edit your messages on the site.</p>
        <div className='details__group'>
          <label className='details__field'>
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete='username' required />
          </label>
          <label className='details__field'>
            <span>Password</span>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete='current-password'
              required
            />
          </label>
        </div>
        {error ? (
          <p className='admin-error' role='alert'>
            {error}
          </p>
        ) : null}
        <button type='submit' className='admin-button sign-in__submit' disabled={pending || !username || !password}>
          {pending ? 'Signing In…' : 'Sign In'}
        </button>
        <Link className='sign-in__back' href='/'>
          Back to Messages
        </Link>
      </form>
    </main>
  );
}

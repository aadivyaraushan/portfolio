'use client';

import './admin.css';
import { useState, useTransition } from 'react';
import { createThread } from '@/lib/admin/actions';

type NewThreadPaneProps = { onCreated: (id: string) => void; onCancel: () => void };

/** Takes the place of the open thread while the admin starts a new conversation. */
export default function NewThreadPane({ onCreated, onCancel }: NewThreadPaneProps) {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      setError('');
      const result = await createThread({ title, tagline });
      if (!result.ok) return setError(result.error);
      onCreated(result.value.id);
    });

  return (
    <section className='thread' aria-label='Conversation'>
      <div className='thread__scroll'>
        <header className='thread-header'>
          <button type='button' className='thread-header__back' aria-label='All conversations' onClick={onCancel}>
            <svg viewBox='0 0 12 20' aria-hidden='true'>
              <path d='M10 2 2 10l8 8' />
            </svg>
          </button>
          <div className='thread-header__who'>
            <h2 className='thread-header__name'>New Conversation</h2>
          </div>
        </header>
        <form
          className='new-thread'
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className='details__group'>
            <label className='details__field'>
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} autoFocus />
            </label>
            <label className='details__field'>
              <span>Tagline</span>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
            </label>
          </div>
          {error ? (
            <p className='admin-error' role='alert'>
              {error}
            </p>
          ) : null}
          <div className='new-thread__actions'>
            <button type='button' className='details__link' onClick={onCancel}>
              Cancel
            </button>
            <button type='submit' className='admin-button' disabled={pending || !title.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

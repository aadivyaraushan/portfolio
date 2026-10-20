'use client';

import './admin.css';
import { useState, useTransition, type ReactNode } from 'react';
import { deleteMessage, editMessage } from '@/lib/admin/actions';
import type { ThreadMessage } from '@/lib/threads/types';

/** Wraps one of the owner's messages with Edit and Delete for the admin. */
export default function AdminMessage({ message, children }: { message: ThreadMessage; children: ReactNode }) {
  const [mode, setMode] = useState<'idle' | 'editing' | 'confirm-delete'>('idle');
  const [text, setText] = useState(message.text);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  // Screen readers hear which message a button changes, not only "Edit message".
  const summary = (message.text.trim() || message.attachment?.name || 'attachment').slice(0, 40);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError('');
      const result = await action();
      if (!result.ok) return setError(result.error ?? 'Could not save.');
      setMode('idle');
    });

  return (
    <>
      {mode === 'editing' ? (
        <form
          className='admin-edit'
          onSubmit={(e) => {
            e.preventDefault();
            run(() => editMessage({ id: message.id, text }));
          }}
        >
          <textarea
            aria-label='Edit message text'
            value={text}
            rows={Math.min(12, Math.max(3, text.split('\n').length + 1))}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <span className='admin-tools'>
            <button
              type='button'
              onClick={() => {
                setText(message.text);
                setMode('idle');
              }}
            >
              Cancel
            </button>
            <button type='submit' className='admin-tools__primary' disabled={pending || (!text.trim() && !message.attachment)}>
              Save
            </button>
          </span>
        </form>
      ) : (
        children
      )}
      {mode === 'idle' ? (
        <span className='admin-tools'>
          <button type='button' aria-label={`Edit message: ${summary}`} onClick={() => setMode('editing')}>
            Edit
          </button>
          <button type='button' aria-label={`Delete message: ${summary}`} onClick={() => setMode('confirm-delete')}>
            Delete
          </button>
        </span>
      ) : null}
      {mode === 'confirm-delete' ? (
        <span className='admin-tools'>
          <button type='button' onClick={() => setMode('idle')}>
            Cancel
          </button>
          <button
            type='button'
            className='admin-tools__danger'
            disabled={pending}
            onClick={() => run(() => deleteMessage({ id: message.id }))}
          >
            Confirm Delete
          </button>
        </span>
      ) : null}
      {error ? (
        <p className='admin-error' role='alert'>
          {error}
        </p>
      ) : null}
    </>
  );
}

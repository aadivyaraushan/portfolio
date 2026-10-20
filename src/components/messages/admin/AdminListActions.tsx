'use client';

import './admin.css';

/** The admin's buttons in the conversation list header. */
export default function AdminListActions({ onNew, onSignOut }: { onNew: () => void; onSignOut: () => void }) {
  return (
    <span className='list-actions'>
      <button type='button' className='list-actions__text' onClick={onSignOut}>
        Sign Out
      </button>
      <button type='button' className='list-actions__compose' aria-label='New Conversation' onClick={onNew}>
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M17.6 3.6a1.9 1.9 0 0 1 2.8 2.8L12 14.8l-3.6.8.8-3.6 8.4-8.4Z' />
          <path d='M10.5 5h-4A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 0 6.5 20h10a2.5 2.5 0 0 0 2.5-2.5v-4' />
        </svg>
      </button>
    </span>
  );
}

'use client';

import './admin.css';
import { useEffect, useRef, useState, useTransition } from 'react';
import { deleteThread, updateThread } from '@/lib/admin/actions';
import type { Thread } from '@/lib/threads/types';
import ThreadAvatar from '@/components/messages/shared/ThreadAvatar';

type DetailsSheetProps = { thread: Thread; onClose: () => void; onDeleted: () => void };

/** The admin's details sheet for one conversation, like the info panel in iMessage. */
export default function DetailsSheet({ thread, onClose, onDeleted }: DetailsSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(thread.title);
  const [tagline, setTagline] = useState(thread.tagline);
  const [icon, setIcon] = useState(thread.iconName);
  const [pinned, setPinned] = useState(thread.pinned);
  const [order, setOrder] = useState(String(thread.order));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const save = () =>
    startTransition(async () => {
      setError('');
      const result = await updateThread({ id: thread.id, title, tagline, icon, pinned, order: order.trim() ? Number(order) : Number.NaN });
      if (!result.ok) return setError(result.error);
      onClose();
    });

  const remove = () =>
    startTransition(async () => {
      setError('');
      const result = await deleteThread({ id: thread.id });
      if (!result.ok) return setError(result.error);
      onDeleted();
    });

  return (
    <dialog
      ref={dialogRef}
      className='details'
      aria-label='Details'
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose(); // a click on the dim backdrop
      }}
    >
      <form
        className='details__body'
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <header className='details__header'>
          <button type='button' className='details__link' onClick={onClose}>
            Cancel
          </button>
          <h2>Details</h2>
          <button type='submit' className='details__link details__link--strong' disabled={pending}>
            Save
          </button>
        </header>

        <div className='details__who'>
          <ThreadAvatar thread={thread} size={72} />
        </div>

        <div className='details__group'>
          <label className='details__field'>
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
          </label>
          <label className='details__field'>
            <span>Tagline</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} />
          </label>
          <label className='details__field'>
            <span>Icon</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder='Apple emoji name, e.g. Rocket' />
          </label>
        </div>

        <div className='details__group'>
          <label className='details__field details__field--switch'>
            <span>Pinned</span>
            <input type='checkbox' role='switch' checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          </label>
          <label className='details__field'>
            <span>Order</span>
            <input type='number' step={1} value={order} onChange={(e) => setOrder(e.target.value)} />
          </label>
        </div>
        <p className='details__note'>Pinned conversations show in order, lowest number first.</p>

        {error ? (
          <p className='admin-error' role='alert'>
            {error}
          </p>
        ) : null}

        <div className='details__group'>
          {confirmDelete ? (
            <div className='details__confirm'>
              <button type='button' className='details__danger' onClick={remove} disabled={pending}>
                Confirm Delete
              </button>
              <button type='button' className='details__link' onClick={() => setConfirmDelete(false)}>
                Keep It
              </button>
            </div>
          ) : (
            <button type='button' className='details__danger' onClick={() => setConfirmDelete(true)}>
              Delete Conversation
            </button>
          )}
        </div>
        {confirmDelete ? <p className='details__note'>This deletes the conversation and all its messages.</p> : null}
      </form>
    </dialog>
  );
}

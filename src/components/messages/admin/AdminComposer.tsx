'use client';

import './admin.css';
import { useEffect, useRef, useState, useTransition } from 'react';
import { addMessage } from '@/lib/admin/actions';
import { uploadAttachment } from '@/components/messages/admin/uploadAttachment';

const MAX_TEXTAREA_PX = 140;

/** The composer when the admin is signed in: it posts to the thread as the owner. */
export default function AdminComposer({ threadId }: { threadId: string }) {
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [draft]);

  const canSend = (draft.trim().length > 0 || file !== null) && !pending;

  const send = () => {
    if (!canSend) return;
    setError('');
    startTransition(async () => {
      let attachment = null;
      if (file) {
        const upload = await uploadAttachment(threadId, file);
        if (!upload.ok) return setError(upload.error);
        attachment = upload.value;
      }
      const result = await addMessage({ threadId, text: draft, attachment });
      if (!result.ok) return setError(result.error);
      setDraft('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  return (
    <form
      className='composer composer--admin'
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {file ? (
        <p className='admin-file'>
          <span className='admin-file__name'>{file.name}</span>
          <button
            type='button'
            className='admin-file__remove'
            aria-label='Remove attachment'
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
          >
            ×
          </button>
        </p>
      ) : null}
      <div className='composer__row'>
        <label className='admin-attach' title='Attach an image or a PDF'>
          <input
            ref={fileRef}
            type='file'
            aria-label='Attach File'
            accept='image/png,image/jpeg,image/gif,image/webp,image/avif,application/pdf'
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError('');
            }}
          />
          <svg viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M7.3 2h1.4v5.3H14v1.4H8.7V14H7.3V8.7H2V7.3h5.3V2Z' />
          </svg>
        </label>
        <div className='composer__field'>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder='iMessage'
            aria-label='Message'
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              const finePointer = window.matchMedia?.('(pointer: fine)').matches;
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && finePointer) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button type='submit' className='composer__send' aria-label='Send' disabled={!canSend}>
            <svg viewBox='0 0 16 16' aria-hidden='true'>
              <path d='M8 2.5 3.2 7.3l1 1L7.3 5.2V13.5h1.4V5.2l3.1 3.1 1-1L8 2.5Z' />
            </svg>
          </button>
        </div>
      </div>
      {error ? (
        <p className='composer__hint' role='alert'>
          {error}
        </p>
      ) : null}
      {pending ? <p className='admin-pending'>Sending…</p> : null}
    </form>
  );
}

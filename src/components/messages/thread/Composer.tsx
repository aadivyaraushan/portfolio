'use client';

import { useEffect, useRef, useState } from 'react';
import { draftProblem } from '@/lib/threads/sendContact';

type ComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  onSend: (text: string, botField: string) => void;
};

const MAX_TEXTAREA_PX = 140;

export default function Composer({ draft, onDraftChange, email, onEmailChange, onSend }: ComposerProps) {
  const [problem, setProblem] = useState('');
  const [botField, setBotField] = useState(''); // honeypot: people never see it, bots fill it
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the field with its text, as iMessage does, up to a few lines.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [draft]);

  const submit = () => {
    if (!draft.trim()) return;
    const reason = draftProblem(draft, email);
    setProblem(reason ?? '');
    if (reason) return;
    onSend(draft.trim(), botField);
  };

  return (
    <form
      className='composer'
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className='composer__from'>
        <span className='composer__from-label'>From:</span>
        <input
          type='email'
          inputMode='email'
          autoComplete='email'
          aria-label='Your email'
          placeholder='your email, so I can reply'
          value={email}
          onChange={(e) => {
            onEmailChange(e.target.value);
            setProblem('');
          }}
        />
      </label>
      <div className='composer__field'>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder='iMessage'
          aria-label='Message'
          value={draft}
          onChange={(e) => {
            onDraftChange(e.target.value);
            setProblem('');
          }}
          onKeyDown={(e) => {
            // Enter sends on desktop; on touch keyboards it adds a new line, as in iMessage.
            const finePointer = window.matchMedia?.('(pointer: fine)').matches;
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && finePointer) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type='submit' className='composer__send' aria-label='Send' disabled={!draft.trim()}>
          <svg viewBox='0 0 16 16' aria-hidden='true'>
            <path d='M8 2.5 3.2 7.3l1 1L7.3 5.2V13.5h1.4V5.2l3.1 3.1 1-1L8 2.5Z' />
          </svg>
        </button>
      </div>
      <input
        type='text'
        name='company'
        className='composer__honeypot'
        value={botField}
        onChange={(e) => setBotField(e.target.value)}
        tabIndex={-1}
        autoComplete='off'
        aria-hidden='true'
      />
      <p className='composer__hint' role='status'>
        {problem}
      </p>
    </form>
  );
}

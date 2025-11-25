'use client';

import React, { useMemo, useState } from 'react';
import ChatMessageInput from '@/components/conversations/ChatMessageInput';
import ChatSendButton from '@/components/conversations/ChatSendButton';
import ChatSendStatus from '@/components/conversations/ChatSendStatus';
import ChatSignIn from '@/components/conversations/ChatSignIn';

export type SendState = 'idle' | 'ok' | 'fail' | 'rate-limit';

type ChatComposerProps = {
  conversationTitle?: string;
  disabled?: boolean;
};

const ChatComposer = ({
  conversationTitle,
  disabled = false,
}: ChatComposerProps) => {
  const [email, setEmail] = useState('');
  const [composer, setComposer] = useState('');
  const [sending, setSending] = useState(false);
  const [sentState, setSentState] = useState<SendState>('idle');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [botField, setBotField] = useState(''); // honeypot
  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const emailMissing = !trimmedEmail || !trimmedEmail.includes('@');

  const trimmedComposer = useMemo(() => composer.trim(), [composer]);
  const messageTooShort = trimmedComposer.length < 10;
  const sendDisabled =
    sending || messageTooShort || disabled || !conversationTitle || emailMissing;

  const handleSend = () => {
    if (sendDisabled || !conversationTitle) return;
    const text = trimmedComposer;
    setSending(true);
    setRetryAfter(null);
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        threadTitle: conversationTitle,
        bot_field: botField,
        fromEmail: trimmedEmail,
      }),
    })
      .then(async (res) => {
        await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 429) {
            const retrySeconds = Number(res.headers.get('Retry-After'));
            setRetryAfter(Number.isFinite(retrySeconds) ? retrySeconds : null);
            setSentState('rate-limit');
          } else {
            setSentState('fail');
          }
          return;
        }
        setSentState('ok');
        setComposer('');
      })
      .catch(() => {
        setSentState('fail');
      })
      .finally(() => setSending(false));
  };

  return (
    <>
      <div className='composer composer--ready'>
        <div className='composer-fields'>
          <ChatSignIn
            email={email}
            onEmailChange={(value) => {
              setEmail(value);
              setSentState('idle');
            }}
          />
          <ChatMessageInput
            value={composer}
            onChange={(value) => {
              setComposer(value);
              setSentState('idle');
            }}
            disabled={sending || disabled}
          />
        </div>
        <input
          type='text'
          value={botField}
          onChange={(e) => setBotField(e.target.value)}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            height: 0,
            width: 0,
          }}
          tabIndex={-1}
          aria-hidden='true'
        />
        <ChatSendButton disabled={sendDisabled} onSend={handleSend} />
      </div>
      <ChatSendStatus state={sentState} retryAfter={retryAfter} />
    </>
  );
};

export default ChatComposer;

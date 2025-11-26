'use client';

import React from 'react';
import type { SendState } from '@/components/conversations/ChatComposer';

type ChatSendStatusProps = {
  state: SendState;
  retryAfter?: number | null;
};

const ChatSendStatus = ({ state, retryAfter }: ChatSendStatusProps) => {
  if (state === 'ok') {
    return (
      <div className='composer-status composer-status--ok'>
        sent. i’ll read it soon.
      </div>
    );
  }
  if (state === 'fail') {
    return (
      <div className='composer-status composer-status--fail'>
        couldn’t send. try again?
      </div>
    );
  }
  if (state === 'rate-limit') {
    const seconds =
      typeof retryAfter === 'number' && Number.isFinite(retryAfter)
        ? Math.max(0, Math.round(retryAfter))
        : null;
    return (
      <div className='composer-status composer-status--warn'>
        too many messages. {seconds ? `you can send again in ${seconds}s.` : 'try again soon.'}
      </div>
    );
  }
  return null;
};

export default ChatSendStatus;

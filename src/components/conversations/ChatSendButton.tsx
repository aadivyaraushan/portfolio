'use client';

import React from 'react';

type ChatSendButtonProps = {
  disabled?: boolean;
  onSend: () => void;
};

const ChatSendButton = ({ disabled = false, onSend }: ChatSendButtonProps) => (
  <button className='send-btn' aria-label='send' disabled={disabled} onClick={onSend}>
    ➤
  </button>
);

export default ChatSendButton;

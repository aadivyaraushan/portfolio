'use client';

import React from 'react';

type ChatMessageInputProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const ChatMessageInput = ({
  value,
  disabled = false,
  onChange,
}: ChatMessageInputProps) => (
  <label className='composer-field composer-field--message'>
    <span>message</span>
    <textarea
      className='composer-box composer-box--message'
      placeholder='reach out if you find any of this work interesting... (i’ll receive this message directly btw)'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
    />
  </label>
);

export default ChatMessageInput;

'use client';

import React from 'react';

type ChatSignInProps = {
  email: string;
  onEmailChange: (value: string) => void;
};

// Minimal email capture to replace removed Better Auth flow.
const ChatSignIn = ({ email, onEmailChange }: ChatSignInProps) => {
  return (
    <div className='composer-field composer-field--from'>
      <span>identity</span>
      <div className='identity-chip identity-chip--input'>
        <input
          type='email'
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder='you@example.com'
          className='identity-input'
        />
      </div>
      <div className='identity-helper'>
        Add your email so replies can reach you.
      </div>
    </div>
  );
};

export default ChatSignIn;

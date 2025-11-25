'use client';

import React from 'react';
import { EmojiProvider } from 'react-apple-emojis';
import emojiData from 'react-apple-emojis/src/data.json';

export function EmojiClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <EmojiProvider data={emojiData}>{children}</EmojiProvider>
    </div>
  );
}

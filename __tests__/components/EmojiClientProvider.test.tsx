import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-apple-emojis', () => ({
  EmojiProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="emoji-provider">{children}</div>
  ),
}));

import { EmojiClientProvider } from '../../src/components/EmojiClientProvider';

describe('EmojiClientProvider', () => {
  it('renders its children inside the emoji context', () => {
    render(
      <EmojiClientProvider>
        <div>Emoji friendly content</div>
      </EmojiClientProvider>,
    );

    expect(screen.getByText('Emoji friendly content')).toBeInTheDocument();
  });
});

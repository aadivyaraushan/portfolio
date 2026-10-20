import { resolveEmoji } from '@/lib/threads/server/emoji';

describe('resolveEmoji', () => {
  it('maps an admin icon name in any case to the Apple image and the native character', () => {
    expect(resolveEmoji('Bust in Silhouette')).toEqual({
      src: expect.stringMatching(/bust-in-silhouette_1f464\.png$/),
      alt: '👤',
    });
    expect(resolveEmoji('ROCKET')?.alt).toBe('🚀');
  });

  it('returns null for an empty or unknown name', () => {
    expect(resolveEmoji(undefined)).toBeNull();
    expect(resolveEmoji('not a real emoji')).toBeNull();
  });
});

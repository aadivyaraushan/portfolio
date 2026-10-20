import { formatAgo } from '../../src/lib/conversationStore';

describe('formatAgo', () => {
  it('formatAgo provides friendly time strings', () => {
    expect(formatAgo(new Date(Date.now() - 30 * 1000))).toBe('just now');
    expect(formatAgo(new Date(Date.now() - 10 * 60 * 1000))).toBe('10m');
    expect(formatAgo(new Date(Date.now() - 4 * 60 * 60 * 1000))).toBe('4h');
  });
});

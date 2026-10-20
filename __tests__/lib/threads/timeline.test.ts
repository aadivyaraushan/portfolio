import { buildTimeline } from '@/lib/threads/timeline';

const msg = (id: string, sentAt: string, from: 'me' | 'visitor' = 'me') => ({ id, sentAt, from });

describe('buildTimeline', () => {
  it('puts a stamp before the first message and a tail on the last bubble', () => {
    const items = buildTimeline([msg('a', '2025-11-26T10:00:00.000Z')]);
    expect(items).toEqual([
      { kind: 'stamp', key: 'stamp-a', sentAt: '2025-11-26T10:00:00.000Z' },
      { kind: 'message', key: 'a', message: msg('a', '2025-11-26T10:00:00.000Z'), tail: true, showSender: true },
    ]);
  });

  it('groups close messages from one sender: one tail, one sender label', () => {
    const items = buildTimeline([
      msg('a', '2025-11-26T10:00:00.000Z'),
      msg('b', '2025-11-26T10:01:00.000Z'),
    ]);
    const bubbles = items.filter((i) => i.kind === 'message');
    expect(bubbles.map((b) => b.kind === 'message' && [b.tail, b.showSender])).toEqual([
      [false, true],
      [true, false],
    ]);
    expect(items.filter((i) => i.kind === 'stamp')).toHaveLength(1);
  });

  it('starts a new group with a stamp after a gap of more than one hour', () => {
    const items = buildTimeline([
      msg('a', '2025-11-26T10:00:00.000Z'),
      msg('b', '2025-11-26T12:00:00.000Z'),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['stamp', 'message', 'stamp', 'message']);
    expect(items.filter((i) => i.kind === 'message').every((i) => i.kind === 'message' && i.tail)).toBe(true);
  });

  it('ends a group when the sender changes, without a new stamp', () => {
    const items = buildTimeline([
      msg('a', '2025-11-26T10:00:00.000Z'),
      msg('b', '2025-11-26T10:00:30.000Z', 'visitor'),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['stamp', 'message', 'message']);
    expect(items.filter((i) => i.kind === 'message').every((i) => i.kind === 'message' && i.tail)).toBe(true);
  });
});

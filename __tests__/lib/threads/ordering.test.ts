import { orderThreads, searchThreads } from '@/lib/threads/ordering';
import type { Thread } from '@/lib/threads/types';

const thread = (id: string, pinned: boolean, lastAt: string, text = 'hello'): Thread => ({
  id,
  title: id,
  tagline: `${id} tagline`,
  pinned,
  iconName: '',
  order: 0,
  icon: null,
  messages: [{ id: `${id}-m`, text, sentAt: lastAt, attachment: null }],
});

describe('orderThreads', () => {
  it('keeps pinned threads in their given order, then the rest by newest message', () => {
    const ordered = orderThreads([
      thread('old', false, '2024-01-01T00:00:00.000Z'),
      thread('pin-b', true, '2020-01-01T00:00:00.000Z'),
      thread('new', false, '2024-06-01T00:00:00.000Z'),
      thread('pin-a', true, '2020-01-01T00:00:00.000Z'),
    ]);
    expect(ordered.map((t) => t.id)).toEqual(['pin-b', 'pin-a', 'new', 'old']);
  });
});

describe('searchThreads', () => {
  const threads = [
    thread('projects', true, '2024-01-01T00:00:00.000Z', 'LessonGPT: AI lesson planner'),
    thread('music', false, '2024-01-01T00:00:00.000Z', 'Fav albums: Currents'),
  ];

  it('returns all threads for an empty query', () => {
    expect(searchThreads(threads, '  ')).toHaveLength(2);
  });

  it('matches the title, the tagline, or the message text without case', () => {
    expect(searchThreads(threads, 'MUSIC').map((t) => t.id)).toEqual(['music']);
    expect(searchThreads(threads, 'lessongpt').map((t) => t.id)).toEqual(['projects']);
    expect(searchThreads(threads, 'projects tagline').map((t) => t.id)).toEqual(['projects']);
  });
});

import type { Thread } from '@/lib/threads/types';

const initials = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

type ThreadAvatarProps = { thread: Pick<Thread, 'title' | 'icon'>; size: number };

export default function ThreadAvatar({ thread, size }: ThreadAvatarProps) {
  const glyph = Math.round(size * 0.52);
  return (
    <span className='avatar' style={{ width: size, height: size }} aria-hidden='true'>
      {thread.icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- tiny CDN emoji; next/image adds nothing here
        <img src={thread.icon.src} alt={thread.icon.alt} width={glyph} height={glyph} decoding='async' />
      ) : (
        <span className='avatar__initials' style={{ fontSize: Math.round(size * 0.4) }}>
          {initials(thread.title)}
        </span>
      )}
    </span>
  );
}

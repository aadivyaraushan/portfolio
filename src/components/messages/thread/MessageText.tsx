import { linkify } from '@/lib/threads/linkify';

export default function MessageText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((segment, index) =>
        segment.kind === 'text' ? (
          segment.text
        ) : (
          <a key={index} href={segment.href} target='_blank' rel='noopener noreferrer'>
            {segment.label}
          </a>
        ),
      )}
    </>
  );
}

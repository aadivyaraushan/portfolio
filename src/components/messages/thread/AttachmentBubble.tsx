import type { Attachment } from '@/lib/threads/types';

const kindLabel = (name: string) => {
  const extension = name.split('.').at(-1)?.toUpperCase();
  return extension && extension !== name.toUpperCase() ? `${extension} Document` : 'Document';
};

export default function AttachmentBubble({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === 'image') {
    return (
      <a className='image-bubble' href={attachment.url} target='_blank' rel='noopener noreferrer'>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded image of unknown size */}
        <img src={attachment.url} alt={attachment.name} loading='lazy' decoding='async' />
      </a>
    );
  }
  return (
    <a className='file-bubble' href={attachment.url} target='_blank' rel='noopener noreferrer'>
      <svg className='file-bubble__icon' viewBox='0 0 32 40' aria-hidden='true'>
        <path d='M4 1h17l10 10v25a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Z' className='file-bubble__page' />
        <path d='M21 1v7a3 3 0 0 0 3 3h7' className='file-bubble__fold' />
        <text x='16' y='31' textAnchor='middle' className='file-bubble__ext'>
          {attachment.name.split('.').at(-1)?.toUpperCase().slice(0, 4)}
        </text>
      </svg>
      <span className='file-bubble__text'>
        <span className='file-bubble__name'>{attachment.name}</span>
        <span className='file-bubble__kind'>{kindLabel(attachment.name)}</span>
      </span>
    </a>
  );
}

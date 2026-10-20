import { linkify } from '@/lib/threads/linkify';

describe('linkify', () => {
  it('returns plain text unchanged as one segment', () => {
    expect(linkify('Hi! I am Aadivya.')).toEqual([{ kind: 'text', text: 'Hi! I am Aadivya.' }]);
  });

  it('finds URLs and keeps trailing punctuation outside the link', () => {
    expect(linkify('Paper is here: https://example.com/a.pdf. Thanks')).toEqual([
      { kind: 'text', text: 'Paper is here: ' },
      { kind: 'link', href: 'https://example.com/a.pdf', label: 'example.com/a.pdf' },
      { kind: 'text', text: '. Thanks' },
    ]);
  });

  it('keeps a closing parenthesis outside the link when the URL is inside parentheses', () => {
    const segments = linkify('(paper here: https://docs.google.com/document/d/1nGW/edit?usp=sharing).');
    expect(segments[1]).toEqual({
      kind: 'link',
      href: 'https://docs.google.com/document/d/1nGW/edit?usp=sharing',
      label: 'docs.google.com/document/d/1nGW/edit…',
    });
    expect(segments[2]).toEqual({ kind: 'text', text: ').' });
  });

  it('shortens long labels and removes "www." and a trailing slash', () => {
    const [segment] = linkify('https://www.instagram.com/aadivyaaaaaar/');
    expect(segment).toEqual({
      kind: 'link',
      href: 'https://www.instagram.com/aadivyaaaaaar/',
      label: 'instagram.com/aadivyaaaaaar',
    });
  });

  it('links email addresses with mailto', () => {
    expect(linkify('Email: raushan2@illinois.edu')).toEqual([
      { kind: 'text', text: 'Email: ' },
      { kind: 'link', href: 'mailto:raushan2@illinois.edu', label: 'raushan2@illinois.edu' },
    ]);
  });

  it('links bare domains with a known ending', () => {
    expect(linkify('Prototype available at plan-tain.com')).toEqual([
      { kind: 'text', text: 'Prototype available at ' },
      { kind: 'link', href: 'https://plan-tain.com', label: 'plan-tain.com' },
    ]);
  });

  it('does not link words that only look like file names or versions', () => {
    expect(linkify('Next.js, 4:44 and v1.2')).toEqual([{ kind: 'text', text: 'Next.js, 4:44 and v1.2' }]);
  });
});

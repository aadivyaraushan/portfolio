import { attachmentKind, parseMessageText, parseThreadDetails, uploadPath, MAX_UPLOAD_BYTES } from '@/lib/admin/inputs';

const knownIcons = new Set(['rocket', 'bust in silhouette']);
const iconExists = (name: string) => knownIcons.has(name.toLowerCase());

describe('parseMessageText', () => {
  it('trims the text and needs text or a file', () => {
    expect(parseMessageText('  hi  ', false)).toEqual({ ok: true, value: 'hi' });
    expect(parseMessageText('   ', true)).toEqual({ ok: true, value: '' });
    expect(parseMessageText('   ', false)).toEqual({ ok: false, error: 'Type a message or attach a file.' });
    expect(parseMessageText(42, false).ok).toBe(false);
  });

  it('refuses text too long for one bubble', () => {
    expect(parseMessageText('x'.repeat(20_001), false).ok).toBe(false);
  });
});

describe('parseThreadDetails', () => {
  const good = { title: ' Projects ', tagline: " What I've worked on ", pinned: true, icon: 'ROCKET', order: 2 };

  it('returns trimmed details ready to save', () => {
    expect(parseThreadDetails(good, iconExists)).toEqual({
      ok: true,
      value: { title: 'Projects', tagline: "What I've worked on", pinned: true, icon: 'ROCKET', order: 2 },
    });
  });

  it('allows no icon and no tagline', () => {
    expect(parseThreadDetails({ ...good, icon: ' ', tagline: '' }, iconExists)).toMatchObject({
      ok: true,
      value: { icon: null, tagline: '' },
    });
  });

  it('names the field that is wrong', () => {
    expect(parseThreadDetails({ ...good, title: ' ' }, iconExists)).toEqual({ ok: false, error: 'Title cannot be empty.' });
    expect(parseThreadDetails({ ...good, icon: 'not an emoji' }, iconExists)).toEqual({
      ok: false,
      error: 'No Apple emoji is named "not an emoji". Use a name like "Rocket".',
    });
    expect(parseThreadDetails({ ...good, order: 1.5 }, iconExists).ok).toBe(false);
    expect(parseThreadDetails({ ...good, pinned: 'yes' }, iconExists).ok).toBe(false);
    expect(parseThreadDetails(null, iconExists).ok).toBe(false);
  });
});

describe('uploads', () => {
  it('keeps the real file name, safe for a URL, in a folder for each upload', () => {
    expect(uploadPath('t1', 'My Resume (2026).pdf', 1700000000000)).toBe('t1/1700000000000/My-Resume-2026.pdf');
    expect(uploadPath('t1', '../../etc/passwd', 5)).toBe('t1/5/passwd');
    expect(uploadPath('t1', '...', 5)).toBe('t1/5/file');
  });

  it('accepts images and documents only, up to the size limit', () => {
    expect(attachmentKind('image/png', 10)).toBe('image');
    expect(attachmentKind('application/pdf', 10)).toBe('file');
    expect(attachmentKind('text/html', 10)).toBeNull();
    expect(attachmentKind('image/svg+xml', 10)).toBeNull();
    // Most browsers cannot show HEIC. Without it in the list, an iPhone sends a JPEG.
    expect(attachmentKind('image/heic', 10)).toBeNull();
    expect(attachmentKind('application/pdf', MAX_UPLOAD_BYTES + 1)).toBeNull();
  });
});

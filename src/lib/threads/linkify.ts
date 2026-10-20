// Splits message text into plain text and links, so the bubble can render links
// as React elements instead of injecting HTML.

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; href: string; label: string };

const URL_PATTERN = String.raw`https?:\/\/[^\s<]+`;
const EMAIL_PATTERN = String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}`;
// Bare domains only for common endings, so "Next.js" or "v1.2" stay plain text.
const DOMAIN_PATTERN = String.raw`\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|ai|dev|app|co|me|edu)\b(?:\/[^\s<]*)?`;

const LINK = new RegExp(`(${URL_PATTERN})|(${EMAIL_PATTERN})|(${DOMAIN_PATTERN})`, 'gi');

const LABEL_LIMIT = 44;

function trimTrailingPunctuation(raw: string) {
  let value = raw;
  for (;;) {
    const last = value.at(-1);
    if (!last) return value;
    if (last === ')') {
      const opens = value.split('(').length - 1;
      const closes = value.split(')').length - 1;
      if (closes <= opens) return value;
    } else if (!'.,!?;:\'"]'.includes(last)) {
      return value;
    }
    value = value.slice(0, -1);
  }
}

function shortLabel(href: string) {
  const bare = href.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  if (bare.length <= LABEL_LIMIT) return bare;
  const head = bare.slice(0, LABEL_LIMIT);
  const cut = Math.max(head.lastIndexOf('/'), head.lastIndexOf('?'));
  return `${cut > 20 ? head.slice(0, cut) : head}…`;
}

export function linkify(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  const pushText = (value: string) => {
    if (!value) return;
    const previous = segments.at(-1);
    if (previous?.kind === 'text') previous.text += value;
    else segments.push({ kind: 'text', text: value });
  };

  for (const match of text.matchAll(LINK)) {
    const start = match.index ?? 0;
    const [raw, url, email] = match;
    const value = email ? raw : trimTrailingPunctuation(raw);
    pushText(text.slice(cursor, start));
    if (email) {
      segments.push({ kind: 'link', href: `mailto:${value}`, label: value });
    } else {
      const href = url ? value : `https://${value}`;
      segments.push({ kind: 'link', href, label: url ? shortLabel(value) : value });
    }
    cursor = start + value.length;
  }
  pushText(text.slice(cursor));
  return segments;
}

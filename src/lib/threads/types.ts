// Shapes the public page works with. The server builds these from Supabase rows
// (see server/loadThreads.ts), so the client never sees database columns.

export type Attachment = {
  url: string;
  kind: 'image' | 'file';
  /** Name shown on the file bubble, e.g. "Resume.pdf". */
  name: string;
};

export type ThreadMessage = {
  id: string;
  text: string;
  /** ISO 8601 string, so the value survives the server → client handoff. */
  sentAt: string;
  attachment: Attachment | null;
};

/** An Apple emoji image plus the native character as its fallback text. */
export type ThreadIcon = { src: string; alt: string };

export type Thread = {
  id: string;
  title: string;
  tagline: string;
  pinned: boolean;
  icon: ThreadIcon | null;
  messages: ThreadMessage[];
};

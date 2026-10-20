import 'server-only';
import emojiData from 'react-apple-emojis/src/data.json';
import type { ThreadIcon } from '@/lib/threads/types';

// The admin stores icons by Apple emoji name ("Bust in Silhouette", "ROCKET").
// We resolve them here, on the server, so the 386 KB name table never reaches the browser.

const data = emojiData as { baseUrl: string; emojis: Record<string, string> };

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

export function resolveEmoji(name: string | null | undefined): ThreadIcon | null {
  if (!name?.trim()) return null;
  const file = data.emojis[normalize(name)];
  if (!file) return null;
  // File names end in the code points, e.g. "classical-building_1f3db-fe0f.png".
  const codePoints = file.replace(/\.png$/, '').split('_').at(-1) ?? '';
  const alt = String.fromCodePoint(...codePoints.split('-').map((hex) => parseInt(hex, 16)));
  return { src: `${data.baseUrl}${file}`, alt };
}

export const normalizeEmojiName = (name?: string) =>
  name ? name.trim().toLowerCase().replace(/\s+/g, '-') : '';
